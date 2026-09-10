# Uniswap Integration Feedback

## What we built

Kosmos uses the Uniswap Trading API on Sepolia to let an attendee pay for an event using USDC while the event escrow receives ETH.

I also used an exact-output quote so the escrow receives the event's exact ETH price.

## What worked well

- Sepolia support worked well for testing the full flow.
- Exact-output quotes made it easy to target the event price.
- Custom recipients let us route the swap output directly to the event escrow.
- Transaction simulation was very useful. It caught contract and approval problems before we sent a failing transaction.

## Friction we faced

### Approval handling

I initially relied on `/check_approval`, but it returned no approval transaction even though the wallet had zero allowance for the current Uniswap proxy.

The wallet still had a large allowance for an older proxy address. But fixed it by checking the ERC-20 allowance on-chain against the current proxy and sending the approval directly when needed.

For exact-output swaps, I also had to approve `input.maximumAmount` rather than only the quoted input amount.

### Sending ETH directly to the escrow

My first swap simulation failed when Uniswap tried to send native ETH directly to the event escrow.

The escrow originally only accepted ETH through `deposit(address)` and did not have a `receive()` function.

Later updated the escrow to accept direct ETH transfers and track them as an unallocated balance. The attendee association can then be recorded separately after the payment is verified.

### Wallet matching

During testing I had multiple MetaMask accounts available. So I made the app require the exact external wallet linked to the authenticated Kosmos account instead of automatically using the first connected wallet.

## Result

Successfully completed a real USDC-to-ETH swap on Sepolia and routed the ETH directly to the event's escrow contract.

The escrow received the exact event fee of `0.0001 ETH`.
