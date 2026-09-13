# Sepolia End-to-End Validation Log

- **Run date**: 2026-09-13
- **Network**: Ethereum Sepolia
- **Tester**: Mrinmoy Porel

## Deployment verification

- [x] EventEscrowFactory contains deployed Sepolia bytecode
- [x] TicketNFT contains deployed Sepolia bytecode
- [x] TicketNFT factory is configured to the active EventEscrowFactory
- EventEscrowFactory: `0x5540800a975a46228d2A42D671da1F2e8867aD81`
- TicketNFT: `0xc85365cEd1A610575002E4a3d22188882665AdA7`

---

## Happy path

Validated using a fresh paid Sepolia event with one host wallet and one attendee wallet.

- [x] Create fresh paid event
- [x] Attendee joins and pays
- [x] Host approves attendee
- [x] Host starts event
- [x] Host checks in attendee
- [x] Host ends event
- [x] Event reaches ended state
- [x] Attendee reaches checked-in state
- [x] Escrow settles successfully
- [x] Checked-in attendee receives NFT
- [x] Host receives eligible attendee deposit

Result: PASS

---

## No-show

Validated using a separate paid event because testing was performed with one host wallet and one attendee wallet.

- [x] Attendee joins and pays
- [x] Host approves attendee
- [x] Host starts event
- [x] Attendee is deliberately not checked in
- [x] Host ends event
- [x] No-show attendee receives no NFT
- [x] No-show attendee receives no refund
- [x] Eligible deposit settles to host

Result: PASS

---

## Denial refund

- [x] Paid attendee submits join request
- [x] Host denies request
- [x] Application reaches denied state
- [x] On-chain denial succeeds
- [x] Deposit refund confirmed

Result: PASS

---

## Cancellation refund

- [x] Paid attendee joins
- [x] Host approves attendee
- [x] Attendee cancels before event starts
- [x] Application reaches cancelled state
- [x] On-chain cancellation succeeds
- [x] Deposit refund confirmed
- [x] Cancellation after event start is rejected by contract test (`test_RevertWhen_CancelAfterEventStart`)

Result: PASS

---

## External-service observations

The Sepolia validation exercised the production application flow and its configured integrations while validating the event lifecycle. Sponsor-specific integration feedback is documented separately in the corresponding deliverables.

---

## Bugs found and fixes

- No blocking bugs found during Sepolia end-to-end validation.
- All four required lifecycle scenarios completed successfully without requiring code changes.

---

## Final verification

- [x] `forge test -vv` — 17 passed, 0 failed
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`

---

## Final result

Sepolia validation: **PASS**

Validated scenarios:

1. Successful attendance, check-in, settlement and NFT mint
2. Approved attendee no-show with no NFT and no refund
3. Join-request denial with deposit refund
4. Pre-event attendee cancellation with deposit refund

The deployed Sepolia ticket system, event escrow lifecycle, refund paths, payout path and attendance NFT behavior are ready for submission.

---
