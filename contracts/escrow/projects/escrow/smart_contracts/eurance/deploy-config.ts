import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { EuranceEscrowFactory } from '../artifacts/eurance/EuranceEscrowClient'

// ─────────────────────────────────────────────────────────────────────────────
// VERSION SWITCH
// Set EURANCE_MODE in your .env file:
//   EURANCE_MODE=usdc   → Algorand Testnet USDC (Circle, immediate availability)
//   EURANCE_MODE=eurd   → Quantoz EURD / EURQ   (MiCA-compliant, Quantoz testnet)
// ─────────────────────────────────────────────────────────────────────────────

const MODE = (process.env.EURANCE_MODE ?? 'usdc') as 'usdc' | 'eurd'

// ── Version 1: USDC  (skip EURD — use for immediate testnet demo) ─────────────
// Circle Testnet USDC on Algorand Testnet.  Get free tokens at faucet.circle.com
const USDC_CONFIG = {
  label: 'USDC (Circle, Algorand Testnet)',
  asaId: 10458941n,
  decimals: 6,
  symbol: 'USDC',
}

// ── Version 2: EURD  (MiCA-compliant Euro stablecoin by Quantoz) ─────────────
// EURD / EURQ on Algorand.  Obtain via Quantoz portal or hackathon faucet.
// Replace ASA_ID with the live EURD ASA ID once confirmed by Quantoz.
const EURD_CONFIG = {
  label: 'EURD (Quantoz, MiCA-compliant)',
  asaId: BigInt(process.env.EURD_ASA_ID ?? '0'),
  decimals: 6,
  symbol: 'EURD',
}

const ASA = MODE === 'eurd' ? EURD_CONFIG : USDC_CONFIG

export async function deploy() {
  console.log(`\n=== Deploying EuranceEscrow [${ASA.label}] ===\n`)

  if (MODE === 'eurd' && ASA.asaId === 0n) {
    throw new Error(
      'Set EURD_ASA_ID in .env before deploying in EURD mode.\n' +
      'Contact Quantoz or check their portal for the Testnet ASA ID.'
    )
  }

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(EuranceEscrowFactory, {
    defaultSender: deployer.addr,
  })

  // ── 1. Deploy ────────────────────────────────────────────────────────────
  const { appClient, result } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  console.log(`App ID      : ${appClient.appClient.appId}`)
  console.log(`App address : ${appClient.appAddress}`)

  const isNewDeploy = ['create', 'replace'].includes(result.operationPerformed)

  // ── 2. Fund contract for MBR ─────────────────────────────────────────────
  // 0.1 ALGO  ASA opt-in MBR
  // 0.0025 + 0.0004 × ~130 bytes ≈ 0.054 ALGO per task box  (×8 tasks = 0.43)
  // Total: 0.6 ALGO covers ~8 concurrent tasks; add more as the platform grows.
  if (isNewDeploy) {
    await algorand.send.payment({
      amount: microAlgos(600_000),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
    console.log('Funded contract: 0.6 ALGO')
  }

  // ── 3. Opt contract into stablecoin ASA ──────────────────────────────────
  if (isNewDeploy) {
    await appClient.send.optInAsa({ args: { asa: ASA.asaId } })
    console.log(`Opted into ${ASA.symbol} ASA ${ASA.asaId}`)
  }

  // ── 4. KYC whitelist for test wallets  [MiCA placeholder] ────────────────
  // In production: replace with VASP / oracle callback after AML/KYC checks.
  const clientAddress = process.env.AVM_CLIENT_ADDRESS
  const serverAddress = process.env.AVM_SERVER_ADDRESS

  if (clientAddress) {
    await appClient.send.setKycStatus({
      args: { address: clientAddress, verified: true },
    })
    console.log(`KYC verified: client  ${clientAddress}`)
  }

  if (serverAddress) {
    await appClient.send.setKycStatus({
      args: { address: serverAddress, verified: true },
    })
    console.log(`KYC verified: server  ${serverAddress}`)
  }

  console.log(`\n=== Deployment complete [${ASA.symbol}] ===`)
  console.log(`App ID : ${appClient.appClient.appId}`)
}
