# Kosmos.

> A decentralized application for event management and ticketing with:
>
> - escrowed payments,
> - Selfie Check anti-bot verification &
> - NFT proof of attendance.

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

| Field            | Detail                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Project name** | Kosmos                                                                                                                |
| **Type**         | NFTs (primary) + Wallet/Payments (secondary)                                                                          |
| **Core value**   | Escrowed payments, verified identity & provable attendance all enforced on-chain.                                     |
| **Tagline**      | Tickets backed by escrow, not promises.                                                                               |
| **Chain**        | Ethereum mainnet (production) + ETH Sepolia (contract-creation testing, ENSv2 beta)                                   |
| **Timeline**     | September 4 – 16, 2026 (ETH Global Online hackathon)                                                                  |
| **Site**         | `kosmos.com` uses a single domain, landing page + full app, sign-in required from `/home` onward                      |
| **Deployment**   | Vercel (frontend + API routes) · Foundry deploy to Ethereum mainnet, Sepolia for testing · Supabase (hosted Postgres) |

---

## 2. Sponsor Tracks

Kosmos is built using four sponsor technologies. Only three official track submissions are allowed per participant, so ENS is fully built into the product but not one of the three entered, the other three are.

| Sponsor | Track                           | Used for                                                                                                                                                                         | Entered as official track?                          |
| ------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Privy   | Best financial flow             | Email sign-in creates an embedded wallet; the user links an external wallet, which handles payment and holds the NFT; the Uniswap swap into escrow is signed through this wallet | Yes                                                 |
| World   | Selfie Check                    | Identity verification gate on every Join click. Free and paid events alike to prevent bots and scalping                                                                          | Yes                                                 |
| Uniswap | Best Uniswap Stack Contribution | Swap quote and execution letting a joinee pay in any token, with the output routed directly into the event's escrow contract                                                     | Yes                                                 |
| ENS     | Best Use of ENSv2               | Subname registry for user profile IDs (e.g. `name.kosmos.eth`), Enhanced Access Control for scoped co-host permissions on an event                                               | Built into the product, not entered as one of the 3 |

> **Uniswap submission requirement:** A `FEEDBACK.md` file in the repo, plus a completed Uniswap Developer Feedback Form linking to it.

> **World submission requirement:** A feedback document covering the Selfie Check docs, Developer Portal experience and Sandbox App testing.

---

## 3. Problem & Solution

### The Problem

Traditional event ticketing puts trust entirely in a platform's word. Organizers can't prove a buyer is a real, unique person, so bots and scalpers buy up tickets. Payment platforms hold funds and take a cut with no guarantee the money ever reaches the organizer in a form tied to the event actually happening. And once an event is over, there's no durable, verifiable record of who actually attended. Just a ticket stub or a screenshot.

### The Solution

Kosmos replaces that trust with a smart contract. Every event gets its own dedicated escrow, every join request is gated by a real-human identity check, payment only settles once the event happens and attendance becomes a real, ownable NFT rather than a claim anyone could make.

Here's how it works:

1. **Event creation** : A host fills in name, dates, location, description, price, capacity and whether join requests need approval. This deploys a dedicated escrow contract for that event.
2. **Identity check** : Anyone who clicks Join first passes a World ID Selfie Check, proving they're a real, unique person. For free events too, not just paid ones.
3. **Payment into escrow** : The joinee pays in ETH or any other token swapped into ETH via Uniswap, landing directly in that event's escrow contract.
4. **Approval** : If the host requires it, they review each paid, verified request and accept or deny it. Denials trigger an automatic refund from escrow; acceptances keep the funds locked.
5. **Ticketing** : Accepted attendees get an emailed QR-code ticket, plus a reminder email 24 hours before the event. Anyone who can no longer attend can cancel ahead of time for a direct refund.
6. **Check-in** : At the venue, the host scans each attendee's QR code to mark them present.
7. **Settlement** : When the host ends the event, escrow pays out automatically. Every checked-in attendee gets an NFT proof-of-attendance and the remaining balance goes to the host. No-shows get neither.
8. **Identity** : Every user's profile is a real ENSv2 subname (e.g. `name.kosmos.eth`) rather than a database row and hosts can grant co-hosts scoped permissions on an event's subname instead of full ownership.

---

## 4. Target Users

| User type         | Role                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host              | Creates events, deploys the event's escrow contract, approves or denies join requests, manages check-in, ends the event to trigger payout and NFT minting |
| Joinee / Attendee | Browses events, passes Selfie Check, pays to join, gets checked in at the venue, receives an NFT proof-of-attendance if they attend                       |

> There's no separate account type. The same sign-in and wallet let a user host one event and join another.

---

## 5. Feature Scope

- **Event creation** : Name, dates, location, description, price, capacity, approval toggle, cover image; deploys a dedicated escrow contract
- **Event discovery** : Browse all upcoming events, view full event details on a custom event page
- **Identity verification** : World ID Selfie Check on every join click, for free and paid events alike
- **Pay in any token** : Uniswap swap-to-ETH, landing directly in the event's escrow
- **Approval workflow** : Host accepts or denies each paid, verified request; automatic refund on denial
- **Ticketing** : Emailed QR-code ticket on acceptance, 24-hour email reminder
- **Cancellation** : Approved attendees can cancel before the event starts for a direct refund
- **Check-in** : Host-side QR scanner marks attendees present, gated behind a "Start event" action
- **Batch settlement** : "End event" mints an NFT proof-of-attendance to every checked-in wallet and releases the remaining escrow to the host
- **Onchain identity** : ENSv2 subname per user, Enhanced Access Control for co-host permissions
- **Wallet & auth** : Privy email sign-in + linked external wallet for payment and NFT custody
- **Deployment** : Contracts on Ethereum mainnet for production, Sepolia for testing

---

## 6. Tech Stack

| Purpose              | Tool                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Smart Contracts**  | Solidity + Foundry + OpenZeppelin (ERC-721)                                                                                   |
| **Chain**            | Ethereum mainnet (production) + ETH Sepolia (contract-creation testing, ENSv2 beta)                                           |
| **Frontend**         | Next.js (App Router) + TailwindCSS + wagmi / viem                                                                             |
| **Auth & Wallets**   | Privy                                                                                                                         |
| **Identity**         | World ID Selfie Check (via World ID Sandbox App) + ENSv2 (subname registry + Permissioned Resolver + Enhanced Access Control) |
| **Payments**         | Uniswap Swap API                                                                                                              |
| **Backend**          | Next.js API routes                                                                                                            |
| **Off-chain DB**     | Postgres (via Supabase)                                                                                                       |
| **Metadata storage** | IPFS (via Pinata or web3.storage)                                                                                             |
| **Email**            | Resend / SendGrid                                                                                                             |
| **Scheduler**        | Vercel Cron (24-hour reminder trigger)                                                                                        |
| **QR Code**          | `qrcode` (generate ticket) + `html5-qrcode` (scan at check-in)                                                                |

---

## 7. System Architecture

```
   ┌──────────────────────────────────────────────────────────────────┐
   │                            FRONTEND                              │
   │                 Next.js (App Router) — Vercel                    │
   │     Privy · wagmi/viem · World ID SDK · Uniswap Trading API      │
   │                                                                  │
   │                           kosmos.com                             │
   └───────┬───────────────────────┬───────────────────────────┬──────┘
           │ image uploads         │                           │ API calls
┌──────────▼──────────┐            │              ┌────────────▼───────────────────┐
│         IPFS        │            │              │       NEXT.JS API ROUTES       │
│  (via Pinata /      │            │              │                                │
│   web3.storage)     │            │              │  /api/events                   │
│                     │            │              │  /api/verify-selfie            │
│  Event cover images │            │              │  /api/swap-quote               │
│  + NFT metadata,    │            │              │  /api/join · /approve · /deny  │
│  stored as CID      │            │              │  /api/checkin/[ticketId]       │
└─────────────────────┘            │              │  /api/events/[id]/end          │
                                   │              │  /api/ens/register             │
                                   │              │  /api/cron/reminder            │
                                   │              └───────────────┬─────────────┬──┘
                                   │                              │             │
┌──────────────────────────────────▼─────────┐       ┌────────────▼────┐   ┌────▼──────────────────┐
│            EXTERNAL SERVICES               │       │     POSTGRES    │   │       ETHEREUM        │
│                                            │       │  (via Supabase) │   │  (mainnet + Sepolia)  │
│  World ID Sandbox App for Selfie Check     │       │                 │   │                       │
│  verification, called on every Join        │       │  Events, users, │   │  EventEscrow          │
│                                            │       │  join requests, │   │  TicketNFT (ERC-721)  │
│  Uniswap Trading API for quote + swap for  │       │  ticket status  │   │  KosmosSubnameRegistry│
│  pay-in-any-token, output routed           │       └─────────────────┘   │  (ENSv2)              │
│  directly to the event's escrow            │                             └───────────────────────┘
│                                            │
│  Resend / SendGrid for payment confirm-    │
│  ations, ticket QR emails and reminders,   │
│  triggered on demand or via Vercel Cron    │
└────────────────────────────────────────────┘
```

### Transaction flow. (create event)

```
Host fills event form + uploads cover image → clicks "Create Event"
→ Frontend sends image to /api/events (multipart upload)
→ API route uploads image to IPFS, gets back a CID
→ Host's linked wallet (Privy) prompted to sign
→ Deploys a new EventEscrow contract for this event — host pays gas
→ Event row stored in Postgres with contract address + IPFS CID
→ Event appears on /discover
```

### Transaction flow. (join event)

```
Joinee opens the event page → clicks "Join"
→ World ID Selfie Check widget runs — proof sent to /api/verify-selfie
→ Backend verifies proof + nullifier uniqueness for this event
→ If paying in a token other than ETH: /api/swap-quote returns a Uniswap quote
→ Joinee's wallet signs the swap — output ETH sent directly to the event's escrow contract
→ Postgres records a pending join request (name, email, wallet)
→ Payment-confirmation email sent
→ Host sees the pending request on /events/[id]/manage
```

### Transaction flow. (approve, cancel, check-in & end event)

```
Host clicks Accept or Deny on a pending request
→ Accept: funds stay locked in escrow, backend generates a QR ticket, emails it to the joinee
→ Deny: escrow contract's refund function fires automatically, ETH returned to the joinee

At any point before the event starts, an approved joinee can cancel via /api/join/[id]/cancel
→ Same automatic refund mechanism as a denial — ETH returned from escrow directly to the joinee

Host clicks "Start event" → check-in scanner becomes active
→ Host scans each attendee's QR at /events/[id]/checkin
→ Backend verifies the ticket and marks the attendee present

Host clicks "End event"
→ Contract loops through every checked-in wallet, mints a TicketNFT to each
→ Remaining escrow balance transferred to the host's wallet
→ No-shows receive neither a refund nor an NFT
```

---

## 8. Pages & Routes.

Single domain — `kosmos.com`. Everything past the landing page requires sign-in.

| Route                    | Access           | Description                                                          |
| ------------------------ | ---------------- | -------------------------------------------------------------------- |
| `/`                      | Public           | Landing page — product pitch, sign-in / create / join entry points   |
| `/signin`                | Public           | Privy email login + link external wallet + ENS subname registration  |
| `/home`                  | Sign-in required | Post-signin hub — create or join                                     |
| `/create`                | Sign-in required | Event creation form                                                  |
| `/discover`              | Sign-in required | Browse all upcoming events                                           |
| `/discover/[event-slug]` | Sign-in required | Event details + Join button                                          |
| `/[ens-subname]`         | Sign-in required | User dashboard — hosted + joined events                              |
| `/events/[id]/manage`    | Host only        | Pending requests, approve/deny, add co-host, Start event / End event |
| `/events/[id]/checkin`   | Host only        | QR scanner page for check-in                                         |

### API routes

| Route                                            | Description                                            |
| ------------------------------------------------ | ------------------------------------------------------ |
| `/api/events`                                    | Create/list events                                     |
| `/api/events/[id]`                               | Event details, update                                  |
| `/api/verify-selfie`                             | World ID Selfie Check verification                     |
| `/api/swap-quote`                                | Uniswap quote for pay-in-any-token                     |
| `/api/join`                                      | Submit join request + payment                          |
| `/api/join/[id]/approve` / `/api/join/[id]/deny` | Host decision                                          |
| `/api/join/[id]/cancel`                          | Attendee-initiated refund                              |
| `/api/checkin/[ticketId]`                        | Mark attendee present                                  |
| `/api/events/[id]/end`                           | Batch payout + NFT mint trigger                        |
| `/api/ens/register`                              | Register a user's ENS subname at sign-in               |
| `/api/events/[id]/co-host`                       | Grant Enhanced Access Control permissions to a co-host |
| `/api/cron/reminder`                             | 24-hour email reminder job                             |

---

## 9. Folder Structure

```text
Kosmos/
├── contracts/                      # Foundry project — EventEscrow, KosmosSubnameRegistry (Solidity)
│
├── web/                            # Next.js app — frontend pages + backend API routes
│   ├── app/
│   │   ├── checkin/                # Host check-in/scanner page
│   │   ├── events/                 # Event discovery and event details
│   │   ├── create/                 # Event creation
│   │   └── api/                    # Backend API routes
│   │       ├── events/
│   │       ├── join/
│   │       ├── verify-selfie/
│   │       ├── swap/
│   │       ├── checkin/
│   │       ├── ens/
│   │       └── cron/
│   │
│   ├── components/                 # Reusable frontend components
│   ├── lib/                        # Web3, database, API and utility logic
│   └── ...
│
├── shared/                         # Shared types, ABIs and constants
│   ├── types/
│   ├── abi/
│   └── constants/
│
├── brand/                         # Contains all the colour palatte, typography & logo assets
│   ├── exports/
│   ├── logo/
│   └── BRAND.md                   # The brand source-of-truth file
│
└── README.md
```

---

## 10. Environment Variables

```bash
# ── Chain / Contracts ─────────────────────

# ── Privy ─────────────────────────────────

# ── World ID ──────────────────────────────

# ── Uniswap ───────────────────────────────

# ── ENS ───────────────────────────────────

# ── Database (Supabase) ───────────────────

# ── IPFS (Pinata / web3.storage) ──────────

# ── Email ─────────────────────────────────

# ── App ────────────────────────────────────
```

> Not yet finalized, variable names will be filled in as each integration is scaffolded.

---

## 11. Project Building Steps.

A complete step-by-step checklist for taking this dapp from first run to a working demo.

1. Logo and brand identity
2. Core UI component library
3. Project scaffold and repo setup
4. Database schema setup
5. Deploy EventEscrow contract
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
16. Uniswap swap-to-escrow payment flow
17. Request-to-join and host approve/deny flow
18. Cancellation and refund flow
19. Co-host Enhanced Access Control permissions
20. 24-hour reminder scheduler
21. Check-in scanner
22. Start/end event batch payout and NFT mint
23. Cross-page polish and QA
24. Sepolia testnet validation
25. Mainnet deployment (optional)
26. Uniswap FEEDBACK.md and form submission
27. World Selfie Check feedback document
28. Demo prep and submission

---

## 12. Contributing. ⚡👋

- 🎨 Any improvements to the design & UI are welcome.
- 🔨 Try to break the app by testing it to find any bugs. If you find any, check if there is an issue already open for it. If there is none, then report it.
- 💡 All code must be written in **TypeScript**, no `any` types. All API inputs must be validated with **Zod**.
- 📱 For UI changes, test on both desktop and mobile viewport sizes before submitting.

### 🔃 Steps to be followed in order to make valid contributions to this repo.

1. Fork the [Kosmos](https://github.com/mrinnnmoy/kosmos) repo by clicking on the fork button on the top of the page. This will create a copy of this repository in your account.

2. **Clone the forked repository**

   ```bash
   git clone "https://github.com/<your-github-username>/kosmos"
   ```

   Then set up your local environment:
   - Download and install **Node.js v18** or higher
   - Download and install **Git**
   - Navigate into the project and install dependencies:

     ```bash
     cd kosmos
     npm install
     ```

   - Start the app in development mode:

     ```bash
     npm run dev
     ```

   After running `npm run dev` you should have the app running at `http://localhost:3000`.

3. **Make necessary changes & commit those changes.**

   Remember, **never push anything directly to the `main` branch.**

   Always switch your branch to `develop` first:

   ```bash
   git checkout develop
   ```

   Verify your current branch:

   ```bash
   git branch
   ```

   It should show `* develop`

   Add your changes:

   ```bash
   git add files-you-edited
   ```

   If there are multiple files:

   ```bash
   git add .
   ```

   Create a commit message following the [Conventional Commits](https://www.conventionalcommits.org) standard:

   ```bash
   git commit -m "<type>: <short description>"
   ```

   | Prefix      | Use for                                          |
   | ----------- | ------------------------------------------------ |
   | `feat:`     | A new feature                                    |
   | `fix:`      | A bug fix                                        |
   | `docs:`     | Documentation changes only                       |
   | `style:`    | Formatting, missing semicolons — no logic change |
   | `refactor:` | Code restructure — no feature or bug change      |
   | `test:`     | Adding or updating tests                         |
   | `chore:`    | Build process, dependency updates, tooling       |

   Run lint and type checks before pushing — the CI pipeline will reject failures:

   ```bash
   npm run lint
   npm run typecheck
   ```

4. **Push changes to GitHub.**

   ```bash
   git push origin develop
   ```

5. **Create a Pull Request. 👋**

   Go to your repository on GitHub, you'll see a **Compare & pull request** button.

   Click it & write a summary of what changes you made (attach screenshots for any UI changes).

   I will review your code & merge it if it passes all checks. ❤️

   **Before opening a PR, always check:**
   - [ ] `npm run lint` passes with no errors
   - [ ] `npm run typecheck` passes with no errors
   - [ ] The feature works correctly on `http://localhost:3000` if applicable
   - [ ] You've commented on the related issue so others know it's being worked on

   **Getting help:**
   - Open a [GitHub Discussion](https://github.com/mrinnnmoy/kosmos/discussions) for general questions
   - Comment directly on the issue you're working on
   - Reach out on [Twitter](https://x.com/mrinnnmoy)

---
