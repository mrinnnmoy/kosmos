# Kosmos.

> A decentralized application for event management and ticketing with:
>
> - escrowed payments,
> - Selfie Check abuse-prevention verification &
> - NFT proof of attendance.

---

## Demo

🎥 **Demo Video:** [Watch Kosmos on YouTube](https://youtu.be/x75mrrqn13A)

> Demoed on Ethereum Sepolia.

---

## Table of Contents.

1. [Overview](#1-overview)
2. [Sponsor Tracks](#2-sponsor-tracks)
3. [Problem & Solution](#3-problem--solution)
4. [Target Users](#4-target-users)
5. [Feature Scope](#5-feature-scope)
6. [Tech Stack](#6-tech-stack)
7. [System Architecture](#7-system-architecture)
8. [Pages & Routes](#8-pages--routes)
9. [Folder Structure](#9-folder-structure)
10. [Environment Variables](#10-environment-variables)
11. [Project Building Steps](#11-project-building-steps)
12. [Contributing](#12-contributing)

---

## 1. Overview

| Field            | Detail                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Project name** | Kosmos                                                                                                                     |
| **Type**         | Event management + escrowed ticketing + onchain attendance                                                                 |
| **Core value**   | Human-gated event access, escrowed payments and provable attendance tied together in one event lifecycle.                  |
| **Tagline**      | Tickets backed by escrow, not promises.                                                                                    |
| **Chain**        | Ethereum Sepolia                                                                                                           |
| **Timeline**     | September 4 – 16, 2026 (ETHOnline 2026)                                                                                    |
| **Application**  | Next.js web application with authenticated host and attendee flows                                                         |
| **Contracts**    | Foundry-deployed EventEscrowFactory, EventEscrow, TicketNFT and KosmosSubnameRegistry contracts on Sepolia                 |
| **Validation**   | Sepolia lifecycle validation completed with 17/17 Foundry tests passing, plus lint, typecheck and production build passing |

Kosmos was built for ETHOnline 2026 as an event platform where hosts create events, attendees pass a human-verification gate before joining, paid attendance is backed by an event escrow and checked-in attendees receive an NFT proof of attendance when the event is settled.

The validated Sepolia deployment and lifecycle results are documented in [`docs/SEPOLIA_VALIDATION.md`](docs/SEPOLIA_VALIDATION.md).

---

## 2. Sponsor Tracks

Kosmos integrates four sponsor technologies. The three official prize tracks selected for submission are **World, Uniswap and ENS**. Privy remains an important part of the product's authentication and wallet flow, but Kosmos is not being submitted to the Privy prize track.

| Sponsor | Track                           | Used for                                                                                                                                                                                | Entered as official track? |
| ------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| World   | Selfie Check                    | Selfie Check-compatible World ID flow before an attendee can continue through the event join flow; used as an abuse-prevention and repeat-participation signal                          | Yes                        |
| Uniswap | Best Uniswap Stack Contribution | Exact-output USDC → ETH payment flow on Sepolia using the Uniswap Trading API, Permit2 approval/signing support and transaction simulation before the attendee deposits ETH into escrow | Yes                        |
| ENS     | Best Use of ENSv2               | ENSv2 Sepolia-backed Kosmos profile subnames such as `name.kosmos.eth`, with a dedicated Permissioned Resolver deployed for each registered subname                                     | Yes                        |
| Privy   | Authentication / wallets        | Email authentication, access-token verification and linked external Ethereum wallet selection for onchain actions                                                                       | No                         |

### World Selfie Check

Every event join begins behind the World verification component. The implementation:

- requests an RP signature server-side,
- invokes IDKit with the `join-kosmos-event` action,
- uses the attendee's authenticated external wallet as the verification signal,
- verifies the proof server-side,
- validates the returned signal hash,
- stores the Selfie Check nullifier, and
- prevents reuse of the same nullifier for an active join request to the same event.

The complete World integration feedback, including the Developer Portal and Sandbox testing experience, is documented in [`docs/WORLD_FEEDBACK.md`](docs/WORLD_FEEDBACK.md).

Key implementation files:

- [`app/web/components/worldid/SelfieCheckButton.tsx`](app/web/components/worldid/SelfieCheckButton.tsx)
- [`app/web/app/api/world-id/rp-signature/route.ts`](app/web/app/api/world-id/rp-signature/route.ts)
- [`app/web/app/api/verify-selfie/route.ts`](app/web/app/api/verify-selfie/route.ts)
- [`app/web/lib/worldid/verify.ts`](app/web/lib/worldid/verify.ts)

> Selfie Check was exercised through the World staging / Sandbox Simulator flow used during development. This README does not claim production Selfie Check access.

### Uniswap

Kosmos uses the Uniswap Trading API for a paid-join flow on Sepolia.

The implemented flow is:

```text
Sepolia USDC
→ Uniswap exact-output quote
→ approval / Permit2 handling where required
→ Uniswap swap
→ exact ETH output arrives in the authenticated attendee's external wallet
→ attendee calls EventEscrow.deposit(attendee) with the event's exact ETH price
```

The swap and escrow deposit are separate transactions. If the swap succeeds but the subsequent escrow deposit fails, the UI keeps the pending deposit amount and exposes a retry path.

Important implementation references:

- [`app/web/lib/uniswap/client.ts#L51-L96`](app/web/lib/uniswap/client.ts#L51-L96) — approval check, quote request, Permit2 configuration, V2/V3/V4 protocols, swap construction and transaction simulation
- [`app/web/app/api/swap-quote/route.ts#L129-L156`](app/web/app/api/swap-quote/route.ts#L129-L156) — `EXACT_OUTPUT` quote with the authenticated wallet as recipient and approval check
- [`app/web/app/api/swap-build/route.ts#L177-L197`](app/web/app/api/swap-build/route.ts#L177-L197) — quote recipient validation and swap construction
- [`app/web/components/join/UniswapPayButton.tsx#L433-L584`](app/web/components/join/UniswapPayButton.tsx#L433-L584) — escrow deposit, retry handling and swap → deposit flow
- [`contracts/src/EventEscrow.sol#L81`](contracts/src/EventEscrow.sol#L81) — payable attendee deposit entry point

Detailed builder feedback is available in [`docs/UNISWAP_FEEDBACK.md`](docs/UNISWAP_FEEDBACK.md).

> The Uniswap Developer Feedback Form will be submitted after the Phase 15 changes are merged to `main`, using the final public feedback-document URL.

### ENS

Kosmos uses ENSv2 on Sepolia to give users human-readable Kosmos identities such as:

```text
name.kosmos.eth
```

Registration is not only a database alias. The backend checks the Kosmos ENSv2 subname registry, deploys a Permissioned Resolver for the user and registers the resulting subname through `KosmosSubnameRegistry`.

Relevant implementation:

- [`contracts/src/KosmosSubnameRegistry.sol#L21-L63`](contracts/src/KosmosSubnameRegistry.sol#L21-L63) — ENSv2 Permissioned Registry integration and subname registration
- [`app/web/lib/ens/register-subname.ts#L33-L99`](app/web/lib/ens/register-subname.ts#L33-L99) — Permissioned Resolver deployment and subname registration
- [`app/web/app/api/ens/check-availability/route.ts`](app/web/app/api/ens/check-availability/route.ts) — subname availability checking
- [`app/web/app/api/ens/register/route.ts`](app/web/app/api/ens/register/route.ts) — authenticated registration flow
- [`app/web/app/[ens-subname]/page.tsx`](app/web/app/[ens-subname]/page.tsx) — human-readable Kosmos profile route

> The optional co-host Enhanced Access Control feature is not part of the completed submission build. The current co-host API route remains a placeholder.

---

## 3. Problem & Solution

### The Problem

Traditional event ticketing separates identity, payment, attendance and settlement into independent systems.

Hosts have limited protection against automated or repeated participation attempts. Attendees often have to trust a platform to hold and release event funds correctly. After an event, attendance is usually represented by a database flag, email or screenshot rather than a user-owned onchain record.

### The Solution

Kosmos connects those steps into one event lifecycle.

A host creates an event backed by an onchain escrow. Before an attendee can continue through the join flow, Kosmos performs a World Selfie Check-compatible verification. Paid attendance is backed by the event escrow, and the implemented Uniswap path swaps Sepolia USDC for the exact ETH amount required before the attendee deposits it into escrow. Hosts can approve or deny join requests, attendees can cancel before an event begins, QR tickets support physical check-in and event settlement releases eligible escrow funds while minting attendance NFTs for checked-in attendees.

Here's how it works:

1. **Event creation** : A host creates an event with its core details and an escrow-backed event lifecycle.
2. **Identity check** : A join attempt first passes through the World Selfie Check-compatible verification flow.
3. **Payment** : For the implemented Uniswap path, Sepolia USDC is swapped for an exact ETH output to the attendee's authenticated external wallet and then deposited into the event escrow.
4. **Approval** : Where host approval is enabled, the host accepts or denies a join request. Denial refunds the attendee's escrowed deposit.
5. **Ticketing** : Accepted attendees receive access to a QR ticket associated with their join record.
6. **Cancellation** : An eligible attendee can cancel before the event starts and receive an escrow refund.
7. **Check-in** : The host scans the attendee's QR code to mark attendance.
8. **Settlement** : The host ends the event, eligible escrow value is settled to the host and checked-in attendees receive TicketNFT proof-of-attendance tokens.
9. **Identity** : User profiles are represented with Kosmos ENSv2 subnames such as `name.kosmos.eth`.

---

## 4. Target Users

| User type         | Role                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host              | Creates events, manages join requests, starts events, scans attendee tickets and ends events to trigger settlement and attendance NFT minting             |
| Joinee / Attendee | Discovers events, completes the Selfie Check gate, pays when required, receives a QR ticket after acceptance, checks in and receives an NFT when eligible |

> There's no separate permanent account type. The same authenticated user can host one event and attend another.

---

## 5. Feature Scope

- **Event creation** : Event details, capacity, approval settings and cover-image upload backed by IPFS storage through Pinata
- **Event discovery** : Browse events and open individual event pages
- **Identity verification** : World ID Selfie Check-compatible gate before the event join flow
- **Uniswap payment option** : Exact-output Sepolia USDC → ETH swap followed by an explicit ETH deposit into the event escrow
- **Direct ETH escrow deposit** : Payable `EventEscrow.deposit(attendee)` path for event deposits
- **Approval workflow** : Host accepts or denies pending join requests
- **Refunds** : Denial refunds and attendee cancellation refunds validated on Sepolia
- **Ticketing** : QR-code ticket generation for accepted attendees
- **Check-in** : Host-side QR scanner using `html5-qrcode`
- **Settlement** : End-event payout flow plus TicketNFT minting for checked-in attendees
- **Onchain identity** : ENSv2 Sepolia subname registration with a Permissioned Resolver
- **Wallet & auth** : Privy authentication plus a linked external Ethereum wallet for onchain actions
- **Email** : Resend-backed transactional email components, including payment confirmation, QR-ticket and reminder templates
- **Metadata & images** : Pinata-backed IPFS uploads for event cover images and NFT metadata
- **Validation** : Happy path, no-show, denial refund and cancellation refund tested on Sepolia

### Not implemented in the submission build

Two optional roadmap items remain intentionally unfinished:

- **Co-host Enhanced Access Control permissions** — `/api/events/[id]/co-host` is currently a placeholder route.
- **Automated 24-hour reminder scheduler** — reminder-email support exists, but `/api/cron/reminder` remains a placeholder and no automated scheduler is claimed.

Mainnet deployment is also outside the current submission build. Kosmos is validated on Ethereum Sepolia.

---

## 6. Tech Stack

| Purpose                | Tool                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| **Smart Contracts**    | Solidity + Foundry + OpenZeppelin                                        |
| **Chain**              | Ethereum Sepolia                                                         |
| **Frontend**           | Next.js 16 App Router + React 19 + Tailwind CSS                          |
| **Web3**               | viem                                                                     |
| **Auth & Wallets**     | Privy                                                                    |
| **Human verification** | World ID / IDKit Selfie Check-compatible flow                            |
| **Onchain identity**   | ENSv2 Permissioned Registry + Permissioned Resolver                      |
| **Payments**           | Uniswap Trading API                                                      |
| **Backend**            | Next.js API routes                                                       |
| **Database**           | PostgreSQL + Drizzle ORM                                                 |
| **IPFS**               | Pinata                                                                   |
| **Email**              | Resend + React Email                                                     |
| **QR Code**            | `qrcode` for generation + `html5-qrcode` for scanning                    |
| **Validation**         | Foundry tests + ESLint + TypeScript typecheck + Next.js production build |

---

## 7. System Architecture

```text
   ┌─────────────────────────────────────────────────────────────────────┐
   │                              FRONTEND                               │
   │                    Next.js App Router + React                       │
   │                                                                     │
   │       Privy · World IDKit · viem · Uniswap payment UI               │
   └──────────┬───────────────────────────────┬──────────────────────────┘
              │                               │
              │ image / metadata              │ API requests
              ▼                               ▼
   ┌──────────────────────┐      ┌───────────────────────────────────────┐
   │        PINATA        │      │          NEXT.JS API ROUTES           │
   │                      │      │                                       │
   │ Event cover images   │      │ /api/events                           │
   │ NFT metadata         │      │ /api/join                             │
   │ stored on IPFS       │      │ /api/verify-selfie                    │
   └──────────────────────┘      │ /api/world-id/rp-signature            │
                                 │ /api/swap-quote                       │
                                 │ /api/swap-build                       │
                                 │ /api/ens/register                     │
                                 │ /api/checkin/[ticketId]               │
                                 │ /api/events/[id]/end                  │
                                 └───────────┬───────────────┬───────────┘
                                             │               │
                              ┌──────────────▼───┐      ┌────▼─────────────────────┐
                              │    POSTGRESQL    │      │     ETHEREUM SEPOLIA     │
                              │   Drizzle ORM    │      │                          │
                              │                  │      │ EventEscrowFactory       │
                              │ users            │      │ EventEscrow              │
                              │ events           │      │ TicketNFT                │
                              │ join requests    │      │ KosmosSubnameRegistry    │
                              │ ticket state     │      │ ENSv2 registry/resolvers │
                              └──────────────────┘      └──────────────────────────┘

   ┌─────────────────────────────────────────────────────────────────────┐
   │                         EXTERNAL SERVICES                           │
   │                                                                     │
   │ World ID / IDKit  → Selfie Check-compatible join verification       │
   │ Uniswap API       → exact-output USDC → ETH swap                    │
   │ Privy             → authentication + linked external wallet         │
   │ Resend            → transactional email                             │
   │ Pinata            → IPFS uploads                                    │
   └─────────────────────────────────────────────────────────────────────┘
```

### Transaction flow. (create event)

```text
Host fills the event form and selects a cover image
→ Next.js event API validates the request
→ Cover image is uploaded to IPFS through Pinata
→ Event creation uses the escrow-backed event lifecycle
→ Event data stores the relevant onchain and IPFS references
→ Event becomes available through discovery and management views
```

### Transaction flow. (join event)

```text
Attendee opens an event and clicks Join
→ World IDKit Selfie Check-compatible flow runs
→ RP request data is signed server-side
→ Proof is verified server-side
→ Wallet signal hash and per-event nullifier reuse are validated
→ Free events can continue to the join-request flow

For the Uniswap paid path:
→ /api/swap-quote requests an EXACT_OUTPUT Sepolia USDC → ETH quote
→ Quote recipient is the authenticated attendee external wallet
→ Approval / Permit2 requirements are handled
→ A fresh quote is used before swap construction
→ /api/swap-build validates the quote and constructs the swap
→ Exact ETH output arrives in the attendee wallet
→ Attendee submits EventEscrow.deposit(attendee) with the exact event price
→ If the deposit fails after the swap, the UI exposes a deposit retry path
→ Join request is recorded for the host workflow
```

### Transaction flow. (approve, cancel, check-in & end event)

```text
Host reviews a pending join request
→ Accept: attendee continues as an approved participant
→ Deny: escrow refund path returns the eligible attendee deposit

Approved attendee may cancel before the event starts
→ EventEscrow.cancelByAttendee() executes the attendee refund path

Host starts the event
→ QR scanner becomes available
→ Host scans attendee ticket
→ Backend validates the ticket and records check-in state

Host ends the event
→ Event escrow lifecycle settles
→ Eligible host payout is transferred
→ TicketNFT proof-of-attendance tokens are minted for checked-in attendees
→ No-show attendee receives no attendance NFT and no refund
```

### Sepolia deployment/validation result

The final Sepolia test pass covered:

1. Successful attendance, check-in, settlement and NFT mint
2. Approved attendee no-show with no NFT and no refund
3. Join-request denial with deposit refund
4. Pre-event attendee cancellation with deposit refund

Final verification:

```text
forge test -vv    → 17 passed, 0 failed
npm run lint      → PASS
npm run typecheck → PASS
npm run build     → PASS
```

Validated Sepolia contracts:

| Contract               | Sepolia address                              |
| ---------------------- | -------------------------------------------- |
| **EventEscrowFactory** | `0x5540800a975a46228d2A42D671da1F2e8867aD81` |
| **TicketNFT**          | `0xc85365cEd1A610575002E4a3d22188882665AdA7` |

The deployed ENSv2 Kosmos subname registry used by the application is:

| Contract                  | Sepolia address                              |
| ------------------------- | -------------------------------------------- |
| **KosmosSubnameRegistry** | `0xb98adc04d45365d48e3dbb46d181a43659be0b82` |

`EventEscrow` instances are created per event through the escrow factory.

See [`docs/SEPOLIA_VALIDATION.md`](docs/SEPOLIA_VALIDATION.md) for the detailed lifecycle validation log.

---

## 8. Pages & Routes.

The application uses a single Next.js application for the landing page, authenticated product flow and API routes.

| Route                    | Access           | Description                                                    |
| ------------------------ | ---------------- | -------------------------------------------------------------- |
| `/`                      | Public           | Landing page                                                   |
| `/signin`                | Public           | Privy authentication, linked-wallet flow and ENS profile setup |
| `/home`                  | Sign-in required | Post-sign-in hub                                               |
| `/create`                | Sign-in required | Event creation form                                            |
| `/discover`              | Sign-in required | Event discovery                                                |
| `/discover/[event-slug]` | Sign-in required | Event detail + join flow                                       |
| `/[ens-subname]`         | Sign-in required | Human-readable Kosmos profile dashboard                        |
| `/events/[id]/manage`    | Host flow        | Join-request management and event lifecycle controls           |
| `/events/[id]/checkin`   | Host flow        | QR scanner for attendee check-in                               |
| `/style-guide`           | Development      | Kosmos UI/style guide                                          |

### API routes

| Route                            | Description                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| `/api/auth/sync`                 | Synchronize authenticated Privy user state                   |
| `/api/events`                    | Create/list events                                           |
| `/api/events/[id]`               | Event-specific data                                          |
| `/api/events/[id]/join-requests` | Host join-request listing                                    |
| `/api/events/[id]/join-status`   | Attendee join status                                         |
| `/api/events/[id]/end`           | Event settlement + attendance metadata/NFT flow              |
| `/api/verify-selfie`             | World Selfie Check proof verification                        |
| `/api/world-id/rp-signature`     | World RP request signing                                     |
| `/api/swap-quote`                | Uniswap exact-output quote + approval check                  |
| `/api/swap-build`                | Validate quote / Permit2 data and build the swap transaction |
| `/api/join`                      | Submit the event join request                                |
| `/api/join/[id]/approve`         | Host approval                                                |
| `/api/join/[id]/deny`            | Host denial + refund flow                                    |
| `/api/join/[id]/cancel`          | Attendee cancellation + refund flow                          |
| `/api/checkin/[ticketId]`        | Validate and record attendee check-in                        |
| `/api/ens/check-availability`    | Check Kosmos ENSv2 subname availability                      |
| `/api/ens/register`              | Register a Kosmos ENSv2 subname                              |
| `/api/events/[id]/co-host`       | Placeholder for optional co-host EAC work; not implemented   |
| `/api/cron/reminder`             | Placeholder for optional automated reminder scheduler        |

---

## 9. Folder Structure

```text
Kosmos/
├── app/
│   └── web/                          # Next.js frontend + API application
│       ├── app/
│       │   ├── [ens-subname]/        # ENS-backed profile route
│       │   ├── create/               # Event creation
│       │   ├── discover/             # Event discovery + detail pages
│       │   ├── events/               # Host manage/check-in views
│       │   └── api/
│       │       ├── auth/
│       │       ├── events/
│       │       ├── join/
│       │       ├── verify-selfie/
│       │       ├── world-id/
│       │       ├── swap-quote/
│       │       ├── swap-build/
│       │       ├── checkin/
│       │       ├── ens/
│       │       └── cron/
│       ├── components/
│       │   ├── checkin/
│       │   ├── events/
│       │   ├── join/
│       │   ├── tickets/
│       │   ├── worldid/
│       │   └── ui/
│       ├── emails/                   # React Email templates
│       └── lib/
│           ├── db/
│           ├── email/
│           ├── ens/
│           ├── ipfs/
│           ├── uniswap/
│           └── worldid/
│
├── contracts/                        # Foundry contracts + deployment scripts + tests
│   ├── src/
│   │   ├── EventEscrow.sol
│   │   ├── EventEscrowFactory.sol
│   │   ├── TicketNFT.sol
│   │   └── KosmosSubnameRegistry.sol
│   ├── script/
│   │   ├── DeployEventEscrowFactoryV2.s.sol
│   │   ├── DeployTicketSystem.s.sol
│   │   └── ens/
│   └── test/
│       ├── EventEscrow.t.sol
│       └── TicketNFT.t.sol
│
├── docs/
│   ├── SEPOLIA_VALIDATION.md
│   ├── UNISWAP_FEEDBACK.md
│   └── WORLD_FEEDBACK.md
│
├── brand/                            # Kosmos brand assets and source-of-truth
├── shared/                           # Shared types, ABIs and contract constants
├── LICENSE
└── README.md
```

---

## 10. Environment Variables

The current web application environment template is `app/web/.env.example`.

```bash
# ── Database ────────────────────────────────
DATABASE_URL="postgresql://user:password@host:6543/postgres"
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/postgres"

# ── Privy ──────────────────────────────────
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

# ── ENS / Sepolia ──────────────────────────
SEPOLIA_RPC_URL=
ADMIN_PRIVATE_KEY=

# ── Email ──────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=

# ── IPFS ───────────────────────────────────
PINATA_JWT=
PINATA_GATEWAY=

# ── World ID ───────────────────────────────
NEXT_PUBLIC_WORLD_APP_ID=
NEXT_PUBLIC_WORLD_RP_ID=
RP_SIGNING_KEY=

# ── Uniswap ────────────────────────────────
UNISWAP_API_KEY=

# ── App ────────────────────────────────────
NEXT_PUBLIC_APP_URL=
```

> Never commit `.env.local`, private keys, API keys, signing keys or service JWTs.

---

## 11. Project Building Steps.

A step-by-step record of the ETHOnline 2026 build.

1. Logo and brand identity
2. Core UI component library
3. Project scaffold and repo setup
4. Database schema setup
5. Deploy EventEscrow contract system
6. Deploy TicketNFT contract
7. ENSv2 subname registry & resolver setup
8. Landing page
9. Privy sign-in with linked external wallet
10. Custom profile ID and dashboard route
11. Home hub page
12. Email service integration
13. Event creation flow
14. Discover page and dashboards
15. World ID Selfie Check integration
16. Uniswap exact-output swap + escrow payment flow
17. Request-to-join and host approve/deny flow
18. Cancellation and refund flow
19. Co-host Enhanced Access Control permissions (**optional/not implemented**)
20. 24-hour automated reminder scheduler (**optional/not implemented**)
21. Check-in scanner
22. Start/end event payout and NFT mint flow
23. Cross-page polish and QA
24. Sepolia testnet validation
25. Mainnet deployment (**optional/not implemented**)
26. Uniswap integration feedback document
27. World Selfie Check feedback document
28. Demo prep and submission

---

## 12. Contributing. ⚡👋

- 🎨 Improvements to the design and UI are welcome.
- 🔨 Try to break the app by testing real flows and edge cases. If you find a bug, check whether an issue already exists before opening a new one.
- 💡 Keep application code strongly typed with TypeScript and validate API inputs where appropriate.
- 📱 For UI changes, test both desktop and mobile viewport sizes before submitting.
- 🔐 Never commit private keys, API keys, signing keys, JWTs, `.env.local` files or other secrets.

### 🔃 Steps to make a valid contribution

1. **Fork the repository**

   Fork the [Kosmos](https://github.com/mrinnnmoy/kosmos) repository to your GitHub account.

2. **Clone your fork**

   ```bash
   git clone https://github.com/<your-github-username>/kosmos.git
   cd kosmos
   ```

3. **Create a feature branch**

   Start from the latest `develop` branch:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b <type>/<short-description>
   ```

   Example:

   ```bash
   git checkout -b fix/mobile-event-card
   ```

4. **Set up the web application**

   The Next.js application lives in:

   ```text
   app/web
   ```

   Install the web dependencies:

   ```bash
   cd app/web
   npm install
   ```

   Create your local environment file:

   ```bash
   cp .env.example .env.local
   ```

   Configure the required environment variables locally.

   > Never commit the populated `.env.local` file.

   Start the development server:

   ```bash
   npm run dev
   ```

   The app is available at:

   ```text
   http://localhost:3000
   ```

5. **Set up the smart contracts when needed**

   If your contribution affects Solidity contracts, open another terminal from the repository root and move to:

   ```bash
   cd contracts
   ```

   Make sure Foundry is installed, then run:

   ```bash
   forge build
   forge test
   ```

6. **Make your changes**

   Keep changes focused and avoid modifying unrelated files.

   Before committing web application changes, run from `app/web`:

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

   If contracts were modified, also run from `contracts`:

   ```bash
   forge test
   ```

7. **Commit your changes**

   Stage only the files you changed:

   ```bash
   git add <files-you-edited>
   ```

   Use a Conventional Commit message:

   ```bash
   git commit -m "<type>: <short description>"
   ```

   | Prefix      | Use for                                       |
   | ----------- | --------------------------------------------- |
   | `feat:`     | A new feature                                 |
   | `fix:`      | A bug fix                                     |
   | `docs:`     | Documentation changes                         |
   | `style:`    | Formatting with no behavior change            |
   | `refactor:` | Code restructure without a feature/bug change |
   | `test:`     | Adding or updating tests                      |
   | `chore:`    | Build, dependency or tooling work             |

8. **Push your branch**

   ```bash
   git push origin <your-branch-name>
   ```

9. **Create a Pull Request. 👋**

   Open a pull request against the Kosmos `develop` branch and describe your changes clearly.

   **Before opening a PR, check:**

   - [ ] `npm run lint` passes from `app/web`
   - [ ] `npm run typecheck` passes from `app/web`
   - [ ] `npm run build` passes from `app/web`
   - [ ] `forge test` passes when Solidity contracts are affected
   - [ ] The relevant feature works locally
   - [ ] UI changes have been checked at appropriate viewport sizes
   - [ ] No secrets or local environment files are included in the diff
   - [ ] The PR contains only relevant changes

   **Getting help:**

   - Open a [GitHub Discussion](https://github.com/mrinnnmoy/kosmos/discussions) for general questions
   - Comment directly on the issue you're working on
   - Reach out on [Twitter](https://x.com/mrinnnmoy)

---
