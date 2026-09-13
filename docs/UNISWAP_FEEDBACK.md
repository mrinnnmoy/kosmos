# Uniswap Integration Feedback

## What we built

Kosmos is an event coordination dApp where paid event deposits are held in an onchain escrow.

For paid events, Kosmos integrates the Uniswap Trading API on Sepolia so an attendee can pay using USDC even though the event escrow is denominated in native ETH.

The payment flow is:

1. Kosmos requests an exact-output Uniswap quote for the event's ETH price.
2. The attendee completes any required Permit2 approval.
3. Kosmos requests a fresh quote and signs Permit2 data when required.
4. The Uniswap swap converts USDC to the exact ETH event fee.
5. The ETH is received by the attendee's linked external wallet.
6. The attendee deposits that ETH into the event's `EventEscrow` contract.

We use the Uniswap Trading API endpoints:

- `/check_approval`
- `/quote`
- `/swap`

The integration uses Sepolia and supports Uniswap V2, V3 and V4 routes through the Trading API.

---

## Why we used exact-output quotes

The event price is stored as an exact amount of ETH.

An exact-input swap would make it difficult to guarantee that the escrow receives exactly the required event fee after price movement and slippage.

Instead, Kosmos requests an `EXACT_OUTPUT` quote where the output amount is the event's ETH price.

This lets us determine how much USDC the attendee may need while keeping the final event deposit amount deterministic.

---

## What worked well

### Exact-output quoting

Exact-output quotes fit the escrow use case very well because the application already knows the exact ETH amount that must ultimately be deposited.

During Sepolia testing, we successfully completed a real USDC-to-ETH swap for an event priced at:

`0.0001 ETH`

and then deposited that exact amount into the event escrow.

---

### Transaction simulation

Using:

`simulateTransaction: true`

when requesting the swap transaction was particularly useful.

It helped catch approval, routing and transaction problems before asking the attendee to submit a transaction that would revert.

---

### Permit2 support

The Trading API provided the information needed to handle Permit2 approvals and typed-data signatures.

Kosmos validates the returned Permit2 data before asking the wallet to sign it, including:

- verifying contract
- chain ID
- token
- Permit2 spender
- quoted amount
- expiration
- nonce
- signature deadline

---

### Approval endpoint

The `/check_approval` endpoint provided a convenient way to determine whether a Permit2 token approval or approval reset was required before the swap.

---

### Server-side Trading API integration

Keeping the Uniswap API key and Trading API calls on the server worked well.

The frontend only receives the quote and transaction data required for the attendee's wallet interaction, while the API key remains server-side.

---

## Friction and lessons learned

### Approval state was more complicated than expected

Approval handling was one of the most difficult parts of the integration.

During development, a wallet could have allowance associated with an older spender while still requiring an approval for the spender used by the current payment route.

That made it important not to assume that an existing token approval automatically meant the current swap was ready.

We also learned that exact-output flows need to account for the quote's maximum input amount rather than assuming only the nominal quoted input will matter.

---

### Quotes must be refreshed after approval

A Permit2 signature is tied to the quote being submitted to the swap endpoint.

Because completing an approval takes time, Kosmos requests a fresh quote after approval and signs the Permit2 data associated with that fresh quote.

This reduced the chance of using stale quote or signature data.

It would be helpful if the documentation emphasized this lifecycle more strongly for applications that need an approval transaction before the swap.

---

### Swap and escrow deposit are separate transactions

Our original approach attempted to make the Uniswap output recipient the event escrow contract.

That exposed an important integration issue: receiving ETH and attributing that ETH to a specific attendee are separate concerns for an escrow contract.

The current Kosmos flow therefore sends the swap output to the authenticated attendee wallet first and then performs a second transaction calling:

`EventEscrow.deposit(attendee)`

with the exact ETH output.

This is safer and makes attendee attribution explicit, but it also means the user experience is not atomic.

The attendee may need to complete:

1. token approval, when required
2. the Uniswap swap
3. the escrow deposit

A swap succeeds independently of the later escrow deposit, so Kosmos stores the pending output amount and exposes a retry path if the deposit step fails.

For payment-oriented applications, guidance or examples for composing a swap with a contract payment/deposit flow would be especially valuable.

---

### Wallet identity matters

Kosmos authentication can have multiple wallets associated with a user.

During testing, browser wallets could also expose multiple accounts.

We therefore validate that:

- the quote swapper matches the authenticated linked external wallet
- the quote recipient matches that wallet
- the transaction sender matches that wallet
- the wallet is connected to Sepolia

This prevented accidentally signing or sending a payment from a different account.

---

### Error responses were useful but integration guidance could go further

The Trading API returned useful error details during development.

For escrow-style or multi-transaction payment flows, more end-to-end examples showing approval, Permit2, quote refresh, swap execution and a subsequent contract interaction would make integration significantly easier.

---

## Security checks added in Kosmos

Before using Uniswap-returned data, Kosmos validates several properties rather than signing or broadcasting it blindly.

For example:

- only Sepolia transactions are accepted
- transaction sender must match the authenticated wallet
- Permit2 approval calldata is decoded and checked
- approval spender must be the canonical Permit2 contract
- Permit2 token must be Sepolia USDC
- quote output must be native ETH
- exact output must equal the event price
- quote recipient and swapper must match the authenticated wallet
- unsupported routing types are rejected

---

## Overall experience

The Uniswap Trading API gave us a practical way to add token-flexible event payments without building routing logic ourselves.

The strongest parts of the integration were exact-output quoting, Permit2 support and transaction simulation.

The main complexity came from coordinating approval state, quote freshness and the boundary between a successful swap and the application's separate escrow deposit.

For future documentation, an end-to-end example of:

`ERC-20 approval -> Permit2 -> exact-output quote -> swap -> contract payment`

would be particularly useful for developers building payment and escrow applications.
