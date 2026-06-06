EURance — Phase 2: Frontend-Backend Integration & Fiat Bridge

 Context

 EURance is a hackathon Web3 freelancing platform where European users pay AI
 agents (Designer/Translator/Coder) using EURD (Quantoz MiCA-compliant
 stablecoin) on Algorand via x402 payment protocol. The project has no code yet
 — only todolist.md exists. Phase 1 (smart contracts + AI agent) has not been
 built, so this plan includes a mock escrow layer that can be replaced with
 real AlgoKit contracts without changing UI code.

 Goal: Build a polished, demo-ready app that judges can use at a public Vercel
 URL by end of Day 2.

 ---
 Architecture Decision

 Monorepo with a single Next.js app — API routes serve as the backend (no
 separate server). The Algorand Indexer polling runs as a Vercel Cron Job. In
 Codespaces, a local tsx script replaces the cron.

 ---
 Folder Structure

 EURance/
 ├── .devcontainer/devcontainer.json
 ├── apps/web/
 │   ├── app/
 │   │   ├── layout.tsx                  ← WalletProvider + ThemeProvider
 │   │   ├── bridge/page.tsx             ← Page 1: Fiat Bridge
 │   │   ├── marketplace/page.tsx        ← Page 2: Task Marketplace
 │   │   ├── receipt/[txId]/page.tsx     ← On-chain receipt (Phase 3)
 │   │   └── api/
 │   │       ├── bridge/route.ts         ← POST: mint EURD via faucet wallet
 │   │       ├── tasks/route.ts          ← POST/GET: create & list tasks
 │   │       ├── tasks/[id]/route.ts     ← GET: task status (polled by
 frontend)
 │   │       ├── ai/trigger/route.ts     ← POST: OpenAI agent execution
 │   │       └── poll/route.ts           ← GET: Vercel Cron indexer handler
 │   ├── components/
 │   │   ├── ui/                         ← Shadcn generated components
 │   │   ├── wallet/{WalletProvider,ConnectButton}.tsx
 │   │   ├── bridge/{FiatBridgeWidget,MintProgressStepper}.tsx
 │   │   ├── marketplace/{TaskForm,AgentCard,TaskStatusBadge}.tsx
 │   │   └── shared/{Navbar,MetricsDashboard}.tsx
 │   ├── lib/
 │   │   ├── algorand.ts                 ← algod + Indexer client singletons
 │   │   ├── eurd.ts                     ← EURD ASA constants + opt-in helpers
 │   │   ├── escrow.ts                   ← Mock escrow (Phase 1 swap-in point)
 │   │   ├── ai-agent.ts                 ← OpenAI SDK calls by agent type
 │   │   └── store.ts                    ← Zustand task state
 │   ├── scripts/poll-dev.ts             ← Local cron replacement for
 Codespaces
 │   ├── .env.example
 │   ├── next.config.ts
 │   └── package.json
 ├── vercel.json                         ← Cron schedule + monorepo build
 config
 └── todolist.md  (existing)

 ---
 Key Dependencies

 # Framework + UI
 npx create-next-app@latest apps/web --typescript --tailwind --eslint --app
 npx shadcn@latest init && npx shadcn@latest add button card input label badge
 progress dialog tabs select textarea separator skeleton

 # Algorand + Wallet
 npm install algosdk @txnlab/use-wallet-react @perawallet/connect
 @blockshake/defly-connect

 # UI utilities
 npm install zustand zod framer-motion react-hot-toast next-themes recharts
 date-fns

 # AI + KV
 npm install openai @vercel/kv

 # Dev
 npm install --save-dev tsx @types/node

 Wallet library: @txnlab/use-wallet-react v4 — single useWallet() hook handles
 Pera + Defly, connect/disconnect/sign, and provides an AlgoKit-compatible
 transactionSigner.

 No LangChain — use OpenAI SDK directly with a switch on agent type
 (Designer→dall-e-3, Translator/Coder→gpt-4o).

 ---
 Implementation Steps (Time-boxed)

 ┌───────┬──────┬───────────────────────────────────────────────────────────┐
 │ Block │ Time │                        Deliverable                        │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 1     │ 2h   │ create-next-app, Shadcn init, WalletProvider wired,       │
 │       │      │ ConnectButton working                                     │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 2     │ 2h   │ lib/algorand.ts, lib/eurd.ts, lib/escrow.ts mock layer    │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 3     │ 2.5h │ /bridge page + /api/bridge route — real Testnet EURD      │
 │       │      │ transfers                                                 │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 4     │ 2.5h │ /marketplace page + /api/tasks + Zustand store            │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 5     │ 1.5h │ /api/ai/trigger + OpenAI + frontend 3s polling until task │
 │       │      │  completes                                                │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 6     │ 1h   │ /api/poll Vercel Cron + scripts/poll-dev.ts               │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 7     │ 1h   │ Vercel KV wiring, .devcontainer.json, vercel.json         │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 8     │ 1.5h │ Vercel deploy, env vars, KV store, smoke test             │
 ├───────┼──────┼───────────────────────────────────────────────────────────┤
 │ 9     │ 2h   │ Receipt page, metrics dashboard, dark mode polish         │
 └───────┴──────┴───────────────────────────────────────────────────────────┘

 ---
 Critical Files & Their Roles

 lib/escrow.ts — Phase 1 mock boundary (highest leverage)
 - lockEURD(taskId, amount, sender, signTxn) — real Testnet ASA transfer to
 MOCK_ESCROW_ADDRESS; embeds {taskId, action:"lock"} in the transaction note
 - releaseEURD(taskId) — marks task released in KV, stores mock txId
 - When Phase 1 contracts are ready, replace function bodies only — calling
 code unchanged

 lib/algorand.ts
 - algodClient — new algosdk.Algodv2("", "https://testnet-api.algonode.cloud",
 443)
 - indexerClient — new algosdk.Indexer("",
 "https://testnet-idx.algonode.cloud", 443)
 - AlgoNode free public Testnet endpoints — no API key needed

 app/api/bridge/route.ts
 - Sends real EURD ASA transfer from server-side faucet wallet to user's
 address
 - Returns real txId displayed in the bridge UI stepper

 app/api/tasks/route.ts
 - Validates lockTxId against Indexer (confirms on-chain proof of payment)
 - Persists task to Vercel KV
 - Fire-and-forgets POST /api/ai/trigger

 app/api/poll/route.ts
 - Vercel Cron handler (runs every minute)
 - Queries Indexer for recent txns to MOCK_ESCROW_ADDRESS
 - Decodes note field, triggers pending tasks in KV

 ---
 API Routes

 ┌────────┬────────────────────┬────────────────────────────────────────────┐
 │ Method │        Path        │                  Purpose                   │
 ├────────┼────────────────────┼────────────────────────────────────────────┤
 │ POST   │ /api/bridge        │ Mint EURD via faucet wallet (real Testnet  │
 │        │                    │ txn)                                       │
 ├────────┼────────────────────┼────────────────────────────────────────────┤
 │ POST   │ /api/tasks         │ Create task, verify lock on-chain, fire AI │
 ├────────┼────────────────────┼────────────────────────────────────────────┤
 │ GET    │ /api/tasks?wallet= │ List tasks by wallet                       │
 ├────────┼────────────────────┼────────────────────────────────────────────┤
 │ GET    │ /api/tasks/[id]    │ Single task status (polled every 3s)       │
 ├────────┼────────────────────┼────────────────────────────────────────────┤
 │ POST   │ /api/ai/trigger    │ Execute OpenAI agent, update KV, release   │
 │        │                    │ EURD                                       │
 ├────────┼────────────────────┼────────────────────────────────────────────┤
 │ GET    │ /api/poll          │ Vercel Cron: index deposits, trigger       │
 │        │                    │ stalled tasks                              │
 └────────┴────────────────────┴────────────────────────────────────────────┘

 ---
 Environment Variables

 # Public (NEXT_PUBLIC_ prefix)
 NEXT_PUBLIC_ALGORAND_NETWORK=testnet
 NEXT_PUBLIC_ALGORAND_ALGOD_URL=https://testnet-api.algonode.cloud
 NEXT_PUBLIC_ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud
 NEXT_PUBLIC_EURD_ASSET_ID=<Quantoz Testnet ASA ID>
 NEXT_PUBLIC_MOCK_ESCROW_ADDRESS=<demo wallet address>

 # Server-only (never NEXT_PUBLIC_)
 FAUCET_MNEMONIC=word1 word2 ... word25
 OPENAI_API_KEY=sk-...
 CRON_SECRET=<random string>

 # Auto-populated by Vercel KV
 KV_URL=
 KV_REST_API_URL=
 KV_REST_API_TOKEN=
 KV_REST_API_READ_ONLY_TOKEN=

 ---
 vercel.json

 {
   "buildCommand": "cd apps/web && npm run build",
   "outputDirectory": "apps/web/.next",
   "installCommand": "cd apps/web && npm install",
   "framework": "nextjs",
   "crons": [{ "path": "/api/poll", "schedule": "* * * * *" }]
 }

 ---
 .devcontainer/devcontainer.json

 {
   "name": "EURance Dev",
   "image": "mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm",
   "forwardPorts": [3000],
   "portsAttributes": { "3000": { "label": "Next.js", "onAutoForward":
 "openBrowser" } },
   "postCreateCommand": "cd apps/web && npm install",
   "postStartCommand": "cd apps/web && npm run dev",
   "remoteEnv": {
     "NEXT_PUBLIC_ALGORAND_NETWORK": "testnet",
     "NEXT_PUBLIC_ALGORAND_ALGOD_URL": "https://testnet-api.algonode.cloud",
     "NEXT_PUBLIC_ALGORAND_INDEXER_URL": "https://testnet-idx.algonode.cloud"
   }
 }

 Add FAUCET_MNEMONIC, OPENAI_API_KEY, CRON_SECRET as Codespaces secrets in
 GitHub repo settings.

 ---
 UI Pages

 Page 1 — /bridge (Fiat Bridge):
 - Left: Euro amount input + bank/card selector tabs (decorative) + "Bridge to
 EURD" button
 - Right: Real EURD balance from algod + exchange rate display
 - Below: 4-step MintProgressStepper animated with framer-motion (Euro Received
 → Quantoz Verification → EURD Minted → Ready to Spend); step 3 calls
 /api/bridge and shows real txId linking to AlgoExplorer Testnet

 Page 2 — /marketplace (Task Marketplace):
 - AgentCard selector row: Designer / Translator / Coder (with icons,
 highlights on select)
 - Prompt textarea + EURD budget input
 - "Lock Budget & Submit" button: calls lockEURD() then POST /api/tasks
 - Live task feed table with status badges, polling every 3s for active tasks
 - On COMPLETED: display AI result (image or text), link to /receipt/[txId]

 Both pages: dark mode default (Web3 aesthetic), Navbar with ConnectButton,
 framer-motion page transitions.

 ---
 Vercel Deployment Steps

 1. Import GitHub repo to Vercel
 2. Leave root directory blank — vercel.json handles monorepo routing
 3. Add all env vars in Vercel Project Settings
 4. Storage tab → Create KV store → "Connect to Project" (auto-populates KV_*
 vars)
 5. Deploy → get public URL

 ---
 Verification

 1. Wallet connect: Open app, click "Connect Wallet", select Pera Wallet,
 confirm in Pera mobile app — address appears in Navbar
 2. Bridge: Enter €10, click "Bridge to EURD" — stepper animates through 4
 steps, final step shows real AlgoExplorer txn link on Testnet
 3. Marketplace: Select "Coder", enter a prompt, set budget 5 EURD, click "Lock
 Budget & Submit" — task appears in feed as LOCKED, transitions to PROCESSING,
 then COMPLETED with AI output shown
 4. Receipt: Click receipt link — page shows decoded on-chain data (amount,
 addresses, timestamp, note)
 5. Cron poll: Check Vercel logs → /api/poll fires every minute, processes 0
 new txns when idle
 6. Codespaces: Open repo in Codespaces — npm run dev auto-starts, port 3000
 opens in browser, run tsx scripts/poll-dev.ts in second terminal for local
 indexer polling