# EURance — AI Freelancing, Paid in Euros, Settled on Algorand

> European users hire on-chain AI agents (Designer · Translator · Coder) and pay with MiCA-compliant Euro stablecoins (EURD / EURQ) via the x402 payment protocol on Algorand.

---

## One-Liner

**EURance is an agentic commerce platform where European users pay AI freelancers in Euro stablecoins using HTTP 402 payments settled on Algorand — no bank, no middleman, full MiCA compliance.**

---

## Project Description

EURance is a Web3 freelancing marketplace built for the European market. Users connect their Algorand wallet, bridge real Euros into EURD (a Quantoz MiCA-regulated 1:1 Euro stablecoin), then hire one of three specialist AI agents — a **Designer**, **Translator**, or **Coder** — by locking their budget in an on-chain escrow contract. The AI agent executes the task and is paid automatically the moment the work is delivered and the client approves.

The entire payment flow runs over **x402** — the open HTTP payment standard where a server returns a `402 Payment Required` response with Algorand payment terms, the client signs and submits an Algorand atomic transaction group, and a facilitator verifies and settles on-chain before the protected resource (AI output) is unlocked. No off-chain invoices, no recurring billing, no trust required.

---

## Main Track

**Track 1 — Agentic Commerce** ($11,000 pool)

EURance is a new project built entirely during this hackathon. Every line of code — smart contract, backend, frontend, and payment integration — was written between 9:00 am June 6 and 13:00 June 7.

**Bonus track entered:** Quantoz — Best EURQ/EURD Implementation (900 EURQ)

---

## State Before the Hackathon

The project did not exist. On Day 0 there was only a planning document (`todolist.md`) describing the concept: a MiCA-compliant AI freelancing platform where European users pay with Euro stablecoins on Algorand. No code, no contracts, no deployed services — only an idea and a two-phase roadmap.

---

## What Was Built During the Hackathon

### 1. MiCA-Compliant Escrow Smart Contract (`contracts/escrow/`)

A production-ready Algorand ARC-4 smart contract written in Python (AlgoKit / Puya) that manages the full task lifecycle on-chain:

- **Box storage** for per-task records (`TaskData` struct: client, freelancer, amount, ASA ID, status, timestamp)
- **Five-state machine**: `ACTIVE → COMPLETE → RELEASED / REFUNDED` with a `DISPUTED` branch resolved by an admin arbitrator
- **KYC / MiCA compliance gate**: a `kyc_verified` box map guards every fund-locking call — modelling MiCA Article 68 / FATF Travel Rule requirements. In production, a KYC oracle (Sumsub, Quantoz VASP API) calls `set_kyc_status()` after AML verification; during the hackathon, the two test accounts are whitelisted on deployment
- **ASA-agnostic**: works with USDC (testnet) and switches to EURD / EURQ on mainnet via a single env var change
- **Dispute resolution**: `dispute_task()` → `admin_resolve(releaseToFreelancer)` — the arbitration path most freelancing platforms omit entirely

### 2. x402 Payment Backend (`backend/src/server.ts`)

An Express server wired end-to-end with the x402 protocol on Algorand:

- `paymentMiddleware` from `@x402/express` intercepts `POST /task` and returns a `402` with Algorand payment requirements (scheme: `exact`, asset: testnet USDC ASA `10458941`, amount: `$0.10`, network CAIP-2 ID)
- `ExactAvmScheme` constructs and validates Algorand atomic transaction groups — the ASA transfer and application call are verified together before the AI endpoint is reached
- `HTTPFacilitatorClient` forwards payment proofs to the external facilitator (`facilitator.goplausible.xyz`) for simulation and on-chain settlement
- Protected `/task` endpoint calls **Featherless AI** (OpenAI-compatible, Llama 3.1 8B) with a task-type-aware system prompt; the AI response is returned only after payment is confirmed

### 3. x402 Payment Client (`backend/src/client.ts`)

A headless test client that runs the full payment loop:

1. Probes the server endpoint — receives the `402` with payment terms
2. Builds a signed Algorand atomic transaction group via `ExactAvmScheme` using the client's private key
3. Re-submits the request with the signed payment payload in the `X-PAYMENT` header
4. Receives the AI result and on-chain settlement confirmation

The client reads `ALGOD_SERVER` from the environment so the Algorand node can be swapped without code changes — the fix added during Day 2 after AlgoNode's shared daily quota was exhausted.

### 4. Next.js Frontend (`apps/web/`)

A dark-mode Web3 UI deployed on Vercel:

- **Wallet connection** via `@txnlab/use-wallet-react` — supports Pera Wallet and Defly, providing an AlgoKit-compatible transaction signer
- **Fiat Bridge page**: mock EURO → EURD onramp UI with a 4-step animated stepper (Euro Received → Quantoz Verification → EURD Minted → Ready to Spend), real on-chain EURD transfer from a faucet wallet, live EURD balance from algod, transaction link to AlgoExplorer Testnet
- **AI Task Marketplace**: agent selector (Designer / Translator / Coder), prompt input, EURD budget lock, live task feed with 3-second polling as tasks move from `LOCKED → PROCESSING → COMPLETED`; AI output (text or generated image) displayed inline
- **On-chain receipts**: `/receipt/[txId]` page showing decoded transaction data as a verifiable payment proof
- **Metrics dashboard**: real-time stats on total EURD bridged, active agents, and average task cost
- **Vercel Cron** (`/api/poll`, every minute): polls Algorand Indexer for new deposits, unblocking stalled tasks without a persistent websocket

---

## Why x402 on Algorand

**The problem with existing payment rails for AI services:** every pay-per-use AI API today requires an account, a credit card, a billing dashboard, and a human-readable invoice. None of that is machine-native. An AI agent cannot open a Stripe account.

**x402 solves this at the protocol level.** A resource server returns `402 Payment Required` with machine-readable payment terms. The client — human or AI agent — reads the terms, constructs a payment, and re-submits. No account creation, no OAuth, no webhook callbacks. Payment is part of the HTTP conversation.

**Algorand is the right chain for this:**

- **Fees**: ~0.001 ALGO per transaction (~$0.0002) — viable for $0.10 micropayments where Ethereum gas would consume the entire margin
- **Finality**: 3.5-second block time, instant finality — the payment is confirmed before an HTTP timeout expires
- **ASA standard**: first-class fungible token support at the protocol layer; EURD and EURQ are native ASAs, not ERC-20 wrappers
- **MiCA alignment**: Quantoz's EURD and EURQ are issued under MiCA regulatory oversight, making Algorand the natural settlement layer for compliant European payments
- **Atomic groups**: Algorand's grouped transactions let the client bundle the ASA transfer and contract call into a single atomic unit — if either fails, both are rolled back, eliminating partial-payment exploits

**For EURance specifically:** European freelancers and clients operate under GDPR and MiCA. Settling work payments in a MiCA-regulated Euro stablecoin on Algorand — with an on-chain receipt as the invoice — is both legally defensible and technically superior to any off-chain alternative.

---

## Architecture

```
User (browser)
    │  Pera Wallet sign
    ▼
Next.js Frontend (Vercel)
    │  POST /task + X-PAYMENT header
    ▼
Express Backend (x402 middleware)
    │  ExactAvmScheme verifies Algorand atomic group
    │  HTTPFacilitatorClient → facilitator.goplausible.xyz → Algorand Testnet
    ▼
AI Endpoint (Featherless / Llama 3.1)
    │  result + settlement confirmation
    ▼
User sees AI output + AlgoExplorer tx link

Parallel: EuranceEscrow contract (AlgoKit / Puya)
    ├─ create_task()    — locks EURD / USDC in box storage
    ├─ mark_complete()  — AI agent signals delivery
    ├─ release_payment()— inner ASA transfer to freelancer
    └─ dispute_task()   — admin_resolve() arbitration
```

---

## Stack

| Layer | Technology |
|---|---|
| Smart contract | Algorand ARC-4, AlgoKit, Puya (Python) |
| Payment protocol | x402 (`@x402/express`, `@x402/avm`) |
| Stablecoins | USDC ASA 10458941 (testnet) · EURD ASA 1221682136 (mainnet) · EURQ |
| Facilitator | goplausible.xyz (testnet) · Quantoz x402algo (mainnet EURD) |
| Backend | Node.js, Express, TypeScript |
| AI model | Featherless AI — Llama 3.1 8B Instruct (OpenAI-compatible) |
| Frontend | Next.js 15, Tailwind CSS, Shadcn UI, Framer Motion |
| Wallet | `@txnlab/use-wallet-react` (Pera, Defly) |
| Deployment | Vercel (frontend + cron) |

---

## Running Locally

```bash
# 1. Clone
git clone <repo>
cd EURance

# 2. Backend
cd backend
cp ../.env .env          # already symlinked
npm install
npm run server           # starts on :4021

# 3. Client (in a second terminal)
npm run client           # full x402 payment loop

# 4. Frontend
cd apps/web
npm install
npm run dev              # starts on :3000
```

Environment variables are in `.env` at the repo root (symlinked into `backend/`).

---

## Testnet Addresses

| Role | Address |
|---|---|
| Client (payer) | `LMZYT7GPWJMAED6LPX6ZD3LOZR6EG5N3DCU6FHXH5YUN4D2ZJMS2KDSAFU` |
| AI Agent (receiver) | `VIS4H2LGLTHGFXLJFBW6EVDRI6BWDBXCCG2QI2APVF2WURLKBGH7K6RISI` |
| Escrow Contract | `EFARMNWZQH5566KRQ227R44RPIBT3MFV3XKF3HENUJBWIEYFAKBZCUZHKI` |
