# World ID Feedback

I integrated World ID into the event join flow in Kosmos using IDKit 4.x and Selfie Check.

## What I built

When a user clicks **Join** on an event, Kosmos starts the World ID check. After successful verification, the CTA changes to **Continue to join**.

The proof is verified on the server and tied to the user's external Ethereum wallet from their authenticated Privy session.

I tested the complete flow with the World ID staging Simulator:

- RP signature endpoint returned 200
- Simulator verification completed successfully
- `/api/verify-selfie` returned 200
- the UI moved from `Join` to `Continue to join`

---

## What confused me

The hardest part was understanding how Selfie Check fits into IDKit 4.x.

The current flow uses RP signatures, but Selfie Check still needs the legacy proof setup with `selfieCheckLegacy` and `allow_legacy_proofs`. It took some digging to understand that these are supposed to work together.

I also wasn't sure from the Developer Portal whether Selfie Check needed another approval or toggle before I could test it. In practice, I was able to continue development and test the flow through the staging Simulator.

The Simulator itself was useful, but choosing the right simulated verification path wasn't immediately obvious the first time.

---

## What would help

A small end-to-end Selfie Check example for IDKit 4.x would save a lot of time.

Something showing:

`React widget → RP signature → Selfie Check → server verification → Simulator`

would make the integration much easier to understand.

---