# EURance — AI Freelancing, Paid in Stablecoins, Settled on Algorand

> European users hire on-chain AI agents — Designer, Translator, Coder — and pay with stablecoins (USDC / EURD) via the x402 payment protocol on Algorand.

---

## One-Liner

**EURance is an agentic commerce platform where AI agents are paid per task using HTTP 402 payments settled on Algorand, with a MiCA-compliant path to Euro stablecoins via Quantoz EURD.**

---

## Project Description

EURance is a Web3 freelancing marketplace built for the European market. Users visit the platform, choose a token mode, select an AI agent specialty (Designer / Translator / Coder), describe their task, set a budget, and submit. The budget is locked on-chain before the AI starts, and payment is released only on delivery.

The platform runs in two modes selectable from the landing page and Navbar:

- **USDC mode** — real testnet transfers. The user connects a Pera or Defly wallet, signs an Algorand ASA transfer locking USDC into escrow, and the backend verifies the on-chain transaction before triggering the AI agent. Payment flows through the x402 protocol.
- **EURD mode** — mock demo. No wallet required. The user submits a task and receives an instant result. This mode is for demonstrating the EURD / MiCA vision without requiring Quantoz KYC whitelist access during the hackathon.

Both modes share the same UI, the same AI pipeline, and the same task lifecycle. Switching EURD from mock to real requires one env-var swap and Quantoz KYC whitelist registration.

---

## Main Track

**Track 1 — Agentic Commerce** · New Project · $11,000 pool

**Bonus track:** Quantoz — Best EURQ / EURD implementation · 900 EURQ

---

## State Before the Hackathon

The project did not exist. On June 6 at 9:00 am there was a single planning document (`todolist.md`) describing the concept and a two-phase roadmap. No code, no contracts, no deployed services.

---

## What Was Built During the Hackathon

### 1. MiCA-Compliant Escrow Smart Contract

`contracts/escrow/` — Algorand ARC-4 contract in Python (AlgoKit / Puya), deployed on Algorand Testnet.

- **Box storage** per task: client address, freelancer address, amount, ASA ID, status, timestamp
- **Five-state machine**: `ACTIVE → COMPLETE → RELEASED / REFUNDED`, with a `DISPUTED` branch resolved by an admin arbitrator via `admin_resolve(releaseToFreelancer)`
- **MiCA / KYC compliance gate**: `kyc_verified` box map guards every fund-locking call, modelling MiCA Article 68 / FATF Travel Rule. In production a KYC oracle (Sumsub, Quantoz VASP API) calls `set_kyc_status()`; during the hackathon the two test accounts are whitelisted on deployment
- **ASA-agnostic**: works with testnet USDC today; switching to EURD is a one-line config change

### 2. x402 Payment Backend

`backend/src/server.ts` — Express server implementing the x402 protocol end-to-end on Algorand:

- `paymentMiddleware` from `@x402/express` intercepts `POST /task` and returns `402 Payment Required` with Algorand payment terms — scheme `exact`, asset testnet USDC (ASA `10458941`), price `$0.10`, network CAIP-2 ID
- `ExactAvmScheme` from `@x402/avm` validates Algorand atomic transaction groups before the AI endpoint is reached
- `HTTPFacilitatorClient` forwards payment proofs to `facilitator.goplausible.xyz` for on-chain settlement
- Protected `/task` endpoint calls **Featherless AI** (OpenAI-compatible, Llama 3.1 8B Instruct) with a task-type-aware system prompt and returns AI output only after payment is confirmed

### 3. x402 Payment Client

`backend/src/client.ts` — headless client that runs the full payment loop for testing:

1. Probes the server, receives `402` with payment terms
2. Builds a signed Algorand atomic transaction group via `ExactAvmScheme`
3. Re-submits with the signed payload in the `X-PAYMENT` header
4. Receives AI output and on-chain settlement confirmation

The Algorand node is read from `ALGOD_SERVER` env var — swappable without code changes.

### 4. Next.js Frontend

`apps/web/` — dark-mode Web3 UI, deployed on Vercel.

**Pages:**

| Page | Path | Description |
|---|---|---|
| Landing | `/` | Mode selector (USDC / EURD), feature overview, entry point |
| Fiat Bridge | `/bridge` | EURO → EURD simulation, 4-step animated stepper, real testnet faucet transfer, live balance |
| Marketplace | `/marketplace` | Agent selector, task form, live task feed with 3-second polling |
| History | `/history` | Per-wallet task history; USDC mode links to AlgoKit Lora explorer |

**Dual-mode system** — the teammate's main contribution:

- `ModeToggle` in the Navbar persists selection to `localStorage` via Zustand
- `lib/tokenMode.ts` centralises token config (decimals, explorer URLs, labels)
- `TaskForm` routes to `POST /api/tasks` (real, wallet-signed) or `POST /api/tasks/mock` (EURD demo) based on active mode
- `GET /api/balance` fetches on-chain balance for either USDC (6 decimals) or EURD (2 decimals)
- Mock task API returns instant preset results (placeholder image / text) when no Featherless key is present; uses real AI when the key is available

**Wallet integration:** `@txnlab/use-wallet-react` — Pera Wallet + Defly, AlgoKit-compatible transaction signer.

**Vercel Cron** (`GET /api/poll`, every minute): polls Algorand Indexer for new escrow deposits, unblocking stalled tasks without a persistent connection.

---

## Why x402 on Algorand

**The problem:** every pay-per-use AI API today requires a human account, a credit card, and an invoice dashboard. None of that is machine-native. An AI agent cannot open a Stripe account or manage a billing portal.

**x402 solves this at the protocol level.** A server returns `402 Payment Required` with machine-readable payment terms embedded in an HTTP header. The client — human or AI agent — reads the terms, constructs and signs a payment, and re-submits in the same HTTP request. No accounts, no OAuth, no webhooks. Payment is part of the HTTP conversation.

**Algorand is the right settlement layer:**

- **Fees**: ~0.001 ALGO per transaction (~$0.0002) — viable for $0.10 micropayments where Ethereum gas would consume the entire margin
- **Finality**: 3.5-second block time, instant finality — confirmed before an HTTP timeout fires
- **Native ASA standard**: EURD and USDC are first-class Algorand Standard Assets, not ERC-20 wrappers
- **Atomic groups**: the ASA transfer and escrow contract call are bundled into a single atomic unit — if either fails, both roll back, eliminating partial-payment exploits
- **MiCA alignment**: Quantoz's EURD is issued under MiCA regulatory oversight, making Algorand the natural settlement layer for compliant European stablecoin payments

**For EURance specifically:** European users and freelancers operate under GDPR and MiCA. Settling work payments in a MiCA-regulated Euro stablecoin on Algorand — with an on-chain receipt as the invoice — is both legally defensible and technically superior to any off-chain alternative. The escrow contract's KYC gate models the exact compliance requirement; wiring it to a real KYC oracle is a production integration step, not an architectural change.

---

## Architecture

```
Browser
  ├─ USDC mode: connect Pera wallet → sign ASA transfer → POST /api/tasks
  └─ EURD mode: no wallet → POST /api/tasks/mock (instant demo)

Next.js API Routes (Vercel)
  ├─ /api/tasks          — verify lock txn on Indexer → KV → fire AI trigger
  ├─ /api/tasks/mock     — mock escrow → KV → fire AI trigger (or return preset)
  ├─ /api/ai/trigger     — Featherless AI → update KV → release payment
  ├─ /api/balance        — algod balance for USDC or EURD
  └─ /api/poll (cron)    — Indexer polling, unblock stalled tasks

x402 Backend (Express, localhost:4021)
  └─ POST /task
       ├─ no X-PAYMENT → 402 + Algorand payment terms
       └─ with X-PAYMENT → ExactAvmScheme validates → Facilitator settles → AI output

EuranceEscrow Contract (Algorand Testnet, APP_ID 764019032)
  ├─ create_task()     — lock USDC/EURD in box storage (KYC-gated)
  ├─ mark_complete()   — AI agent signals delivery
  ├─ release_payment() — inner ASA transfer to freelancer
  └─ dispute_task() / admin_resolve() — arbitration path
```

---

## Stack

| Layer | Technology |
|---|---|
| Smart contract | Algorand ARC-4, AlgoKit, Puya (Python) |
| Payment protocol | x402 — `@x402/express`, `@x402/avm` |
| Stablecoins | USDC ASA `10458941` (testnet) · EURD ASA `1221682136` (mainnet) |
| Facilitator | `facilitator.goplausible.xyz` (testnet) · Quantoz `x402algo.ai.quantozpay.com` (mainnet EURD) |
| AI model | Featherless AI — Llama 3.1 8B Instruct (OpenAI-compatible API) |
| Backend | Node.js, Express, TypeScript |
| Frontend | Next.js 15, Tailwind CSS, Shadcn UI, Framer Motion |
| Wallet | `@txnlab/use-wallet-react` (Pera Wallet, Defly) |
| State | Zustand (task store + mode store, localStorage persistence) |
| Deployment | Vercel (frontend + Cron) |

---

## Running Locally

```bash
git clone <repo> && cd EURance

# Backend (x402 server)
cd backend && npm install
npm run server          # :4021

# x402 client test (second terminal)
npm run client          # full payment loop

# Frontend
cd apps/web && npm install
npm run dev             # :3000
```

`.env` is at the repo root, symlinked into `backend/`. Copy `.env.example` and fill in values for a fresh setup.

---

## Testnet Addresses

| Role | Address |
|---|---|
| Client (payer) | `LMZYT7GPWJMAED6LPX6ZD3LOZR6EG5N3DCU6FHXH5YUN4D2ZJMS2KDSAFU` |
| AI Agent (receiver) | `VIS4H2LGLTHGFXLJFBW6EVDRI6BWDBXCCG2QI2APVF2WURLKBGH7K6RISI` |
| Escrow Contract | `EFARMNWZQH5566KRQ227R44RPIBT3MFV3XKF3HENUJBWIEYFAKBZCUZHKI` (APP ID `764019032`) |

---

## Path to EURD Mainnet

The EURD mode is marked "Mock Demo" because Quantoz EURD on Algorand requires KYC whitelisting of both payer and payee addresses. The infrastructure is production-ready. Going live requires:

1. Contact Quantoz team → whitelist both wallet addresses
2. Swap three env vars: `X402_FACILITATOR_URL`, `X402_NETWORK`, `ASA_ID` (see `EURD.md`)
3. Redeploy — no code changes required
