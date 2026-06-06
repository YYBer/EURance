from algopy import (
    ARC4Contract,
    Asset,
    BoxMap,
    Global,
    GlobalState,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    subroutine,
)
from algopy.arc4 import abimethod

# ─────────────────────────────────────────────────────────────────────────────
# Task status (stored as arc4.UInt8 inside TaskData)
# ─────────────────────────────────────────────────────────────────────────────
# 0  ACTIVE    – funds locked, work in progress
# 1  COMPLETE  – freelancer delivered, awaiting client approval
# 2  RELEASED  – EURD sent to freelancer
# 3  REFUNDED  – EURD returned to client
# 4  DISPUTED  – frozen, waiting for admin arbitration


class TaskData(arc4.Struct):
    """
    On-chain task record persisted in a Box.
    Amounts are in the ASA's smallest unit (e.g. micro-EURD / micro-USDC).
    """

    client: arc4.Address      # European user who locked funds
    freelancer: arc4.Address  # AI-agent wallet that receives payment
    amount: arc4.UInt64       # locked amount (smallest unit)
    asa_id: arc4.UInt64       # EURD or USDC ASA ID
    status: arc4.UInt8        # see constants above
    created_at: arc4.UInt64   # Unix timestamp


class EuranceEscrow(ARC4Contract):
    """
    MiCA-compliant x402 Escrow Contract for EURance Agentic Commerce.

    Flow
    ────
    1. Admin deploys → calls opt_in_asa() to accept the stablecoin ASA.
    2. Admin whitelists client wallets via set_kyc_status() (MiCA gate).
    3. Client submits atomic group:  [AssetTransfer EURD→contract]  +  [create_task()]
    4. Freelancer (AI agent) calls mark_complete() after delivering work.
    5. Client calls release_payment() → contract sends ASA to freelancer.
    6. Either party may dispute; admin resolves via admin_resolve().

    MiCA Note
    ─────────
    kyc_verified mapping + _require_kyc() guard model MiCA Article 68 /
    FATF Travel Rule compliance.  In production: wire a KYC oracle (Sumsub,
    Jumio, Quantoz VASP API) to call set_kyc_status() after AML verification.
    """

    def __init__(self) -> None:
        # Contract admin — set to deployer; transfer to multisig/DAO later
        self.admin: GlobalState[arc4.Address] = GlobalState(arc4.Address(Txn.sender))

        # Monotonically increasing task counter (serves as task ID)
        self.task_counter: GlobalState[UInt64] = GlobalState(UInt64(0))

        # task_id → TaskData  (box storage, ~130 bytes per entry)
        self.tasks: BoxMap[UInt64, TaskData] = BoxMap(
            UInt64, TaskData, key_prefix=b"t_"
        )

        # ── MiCA / KYC Compliance Placeholder ──────────────────────────────
        # address → verified?   Only admin may write; checked before locking funds.
        self.kyc_verified: BoxMap[arc4.Address, arc4.Bool] = BoxMap(
            arc4.Address, arc4.Bool, key_prefix=b"kyc_"
        )

    # =========================================================================
    # Admin
    # =========================================================================

    @abimethod
    def opt_in_asa(self, asa: Asset) -> None:
        """
        Opt the contract account into the stablecoin ASA (EURD or USDC).
        Call once after deployment.  Contract must hold ≥ 0.1 ALGO for the MBR.
        """
        self._only_admin()
        itxn.AssetTransfer(
            xfer_asset=asa,
            asset_receiver=Global.current_application_address,
            asset_amount=0,
        ).submit()

    @abimethod
    def transfer_admin(self, new_admin: arc4.Address) -> None:
        """Transfer admin role to a multisig or DAO address."""
        self._only_admin()
        self.admin.value = new_admin.copy()

    # =========================================================================
    # MiCA / KYC — Regulated Wallet Status
    # =========================================================================

    @abimethod
    def set_kyc_status(self, address: arc4.Address, verified: arc4.Bool) -> None:
        """
        [MiCA Placeholder — Regulated Wallet Mapping]

        Records whether a wallet has passed KYC/AML verification.
        Admin-only.  In production, call this from your VASP / KYC oracle
        backend after MiCA Article 68 / FATF Travel Rule checks.
        """
        self._only_admin()
        self.kyc_verified[address] = verified

    @abimethod(readonly=True)
    def is_kyc_verified(self, address: arc4.Address) -> arc4.Bool:
        """Return KYC status of an address (False if never set)."""
        if address in self.kyc_verified:
            return self.kyc_verified[address]
        return arc4.Bool(False)

    # =========================================================================
    # Task Lifecycle
    # =========================================================================

    @abimethod
    def create_task(
        self,
        payment: gtxn.AssetTransferTransaction,
        freelancer: arc4.Address,
    ) -> arc4.UInt64:
        """
        Lock stablecoin funds in escrow and register a new task.

        Caller must compose an atomic group:
          [i-1]  AssetTransfer  — stablecoin from client → contract address
          [i]    ApplicationCall — this method

        Returns the assigned task ID.
        Reverts if client wallet is not KYC-verified (MiCA compliance).
        """
        # ── MiCA compliance gate ─────────────────────────────────────────────
        self._require_kyc(arc4.Address(Txn.sender))

        # ── Validate atomic-group payment ────────────────────────────────────
        assert (
            payment.asset_receiver == Global.current_application_address
        ), "Stablecoin must be sent to contract"
        assert payment.asset_amount > UInt64(0), "Locked amount must be > 0"
        assert freelancer != arc4.Address(Txn.sender), "Client and freelancer must differ"

        # ── Assign task ID ───────────────────────────────────────────────────
        task_id = self.task_counter.value
        self.task_counter.value = task_id + UInt64(1)

        self.tasks[task_id] = TaskData(
            client=arc4.Address(Txn.sender),
            freelancer=freelancer.copy(),
            amount=arc4.UInt64(payment.asset_amount),
            asa_id=arc4.UInt64(payment.xfer_asset.id),
            status=arc4.UInt8(0),  # ACTIVE
            created_at=arc4.UInt64(Global.latest_timestamp),
        )

        return arc4.UInt64(task_id)

    @abimethod
    def mark_complete(self, task_id: arc4.UInt64) -> None:
        """
        Freelancer (AI agent) signals that the deliverable is ready for review.
        ACTIVE → COMPLETE.
        """
        assert task_id.native in self.tasks, "Task not found"
        task = self.tasks[task_id.native].copy()

        assert task.status == arc4.UInt8(0), "Task must be ACTIVE"
        assert arc4.Address(Txn.sender) == task.freelancer, "Only the assigned freelancer"

        task.status = arc4.UInt8(1)  # COMPLETE
        self.tasks[task_id.native] = task.copy()

    @abimethod
    def release_payment(self, task_id: arc4.UInt64) -> None:
        """
        Client approves the work and releases stablecoin to the freelancer.
        This is the x402 settlement leg: contract → freelancer wallet.
        COMPLETE → RELEASED.
        """
        assert task_id.native in self.tasks, "Task not found"
        task = self.tasks[task_id.native].copy()

        assert task.status == arc4.UInt8(1), "Task must be COMPLETE"
        assert arc4.Address(Txn.sender) == task.client, "Only the client can release"

        itxn.AssetTransfer(
            xfer_asset=Asset(task.asa_id.native),
            asset_receiver=task.freelancer.native,
            asset_amount=task.amount.native,
        ).submit()

        task.status = arc4.UInt8(2)  # RELEASED
        self.tasks[task_id.native] = task.copy()

    @abimethod
    def dispute_task(self, task_id: arc4.UInt64) -> None:
        """
        Either party raises a dispute, freezing funds until admin arbitrates.
        Allowed from ACTIVE or COMPLETE. → DISPUTED.
        """
        assert task_id.native in self.tasks, "Task not found"
        task = self.tasks[task_id.native].copy()

        is_active = task.status == arc4.UInt8(0)
        is_complete = task.status == arc4.UInt8(1)
        assert is_active or is_complete, "Task must be ACTIVE or COMPLETE to dispute"

        sender_addr = arc4.Address(Txn.sender)
        is_client = sender_addr == task.client
        is_freelancer = sender_addr == task.freelancer
        assert is_client or is_freelancer, "Only task parties can raise a dispute"

        task.status = arc4.UInt8(4)  # DISPUTED
        self.tasks[task_id.native] = task.copy()

    @abimethod
    def admin_resolve(
        self,
        task_id: arc4.UInt64,
        release_to_freelancer: arc4.Bool,
    ) -> None:
        """
        Admin arbitrates a DISPUTED task.
        release_to_freelancer=True  → pay freelancer (RELEASED).
        release_to_freelancer=False → refund client  (REFUNDED).
        """
        self._only_admin()

        assert task_id.native in self.tasks, "Task not found"
        task = self.tasks[task_id.native].copy()

        assert task.status == arc4.UInt8(4), "Task must be DISPUTED"

        if release_to_freelancer.native:
            itxn.AssetTransfer(
                xfer_asset=Asset(task.asa_id.native),
                asset_receiver=task.freelancer.native,
                asset_amount=task.amount.native,
            ).submit()
            task.status = arc4.UInt8(2)  # RELEASED
        else:
            itxn.AssetTransfer(
                xfer_asset=Asset(task.asa_id.native),
                asset_receiver=task.client.native,
                asset_amount=task.amount.native,
            ).submit()
            task.status = arc4.UInt8(3)  # REFUNDED

        self.tasks[task_id.native] = task.copy()

    @abimethod
    def admin_refund(self, task_id: arc4.UInt64) -> None:
        """
        Admin cancels an ACTIVE task and returns funds to the client.
        Use when the freelancer is unresponsive or the task is withdrawn.
        """
        self._only_admin()

        assert task_id.native in self.tasks, "Task not found"
        task = self.tasks[task_id.native].copy()

        assert task.status == arc4.UInt8(0), "Only ACTIVE tasks can be admin-refunded"

        itxn.AssetTransfer(
            xfer_asset=Asset(task.asa_id.native),
            asset_receiver=task.client.native,
            asset_amount=task.amount.native,
        ).submit()

        task.status = arc4.UInt8(3)  # REFUNDED
        self.tasks[task_id.native] = task.copy()

    # =========================================================================
    # Read-only queries
    # =========================================================================

    @abimethod(readonly=True)
    def get_task(self, task_id: arc4.UInt64) -> TaskData:
        """Return the full task record. Used by frontend and AI agents."""
        assert task_id.native in self.tasks, "Task not found"
        return self.tasks[task_id.native].copy()

    @abimethod(readonly=True)
    def get_task_count(self) -> arc4.UInt64:
        """Total tasks ever created (includes completed and refunded)."""
        return arc4.UInt64(self.task_counter.value)

    # =========================================================================
    # Internal helpers
    # =========================================================================

    @subroutine
    def _only_admin(self) -> None:
        assert arc4.Address(Txn.sender) == self.admin.value, "Admin only"

    @subroutine
    def _require_kyc(self, address: arc4.Address) -> None:
        """
        MiCA compliance gate.  Reverts if address is not KYC-verified.
        Production: replace with oracle attestation or on-chain NFT check.
        """
        assert address in self.kyc_verified, "Wallet not KYC-verified (MiCA)"
        assert self.kyc_verified[address].native, "Wallet not KYC-verified (MiCA)"
