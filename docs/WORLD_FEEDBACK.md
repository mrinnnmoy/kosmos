# World Selfie Check Feedback

Kosmos uses World ID Selfie Check as a human-verification gate before someone can join an event.

I use it as an abuse-prevention and fairness signal to make automated joins, bot-driven access, repeated identity abuse and similar scalping-style behavior harder. The verification is tied to the attendee's authenticated external Ethereum wallet.

Selfie Check does not decide whether someone is ultimately accepted into an event. It is an eligibility gate before Kosmos accepts a join request or lets a paid attendee continue to payment.

## What I built

When an attendee clicks **Join** on a Kosmos event, the application starts a World ID verification flow before allowing the join request to continue.

The integration uses:

- `@worldcoin/idkit` / IDKit 4.x
- `IDKitRequestWidget`
- RP-signed verification requests
- `selfieCheckLegacy`
- `allow_legacy_proofs`
- server-side proof verification
- the attendee's external Ethereum wallet address as the verification signal

The World action used by Kosmos is:

`join-kosmos-event`

The flow is used before both free-event joins and paid-event joins.

For paid events, World verification happens before the attendee proceeds into the Uniswap payment and escrow flow.

---

## Integration flow

The implemented flow is:

1. The attendee authenticates with Privy and has an external Ethereum wallet linked.
2. The attendee clicks **Join**.
3. Kosmos requests an RP signature from `/api/world-id/rp-signature`.
4. The server signs the World request for the `join-kosmos-event` action.
5. The client opens `IDKitRequestWidget`.
6. Selfie Check uses the attendee's lower-cased external wallet address as its signal.
7. IDKit returns a verification response.
8. Kosmos sends that response to `/api/verify-selfie`.
9. The server verifies the World ID response against the configured RP ID.
10. Kosmos independently verifies that the proof signal hash matches the authenticated external wallet.
11. Kosmos extracts the returned nullifier.
12. The same nullifier cannot create another active join request for the same event.
13. After successful verification, the user can continue through the rest of the event join flow.

I deliberately use the external wallet as the World signal and verify it again on the server. I also use the returned nullifier for event-specific duplicate-join protection.

---

## What I tested

I tested the integration using the World ID staging Simulator / sandbox flow.

The tested path included:

- RP signature generation
- opening the IDKit verification flow
- completing a simulated Selfie Check
- submitting the IDKit response to the Kosmos server
- server-side World proof verification
- wallet signal-hash validation
- extraction of the nullifier
- transition of the Kosmos UI from the initial Join verification step into the rest of the join flow

During testing:

- the RP signature endpoint returned successfully
- the Simulator completed verification
- `/api/verify-selfie` returned successfully for a valid proof
- the client accepted the verified result and allowed the user to continue

This feedback is based on the sandbox / staging Simulator integration.

I did not validate a production Selfie Check flow, so I am not treating simulator success as production verification.

---

## What was confusing, missing or hard to test

### 1. Understanding Selfie Check in the IDKit 4.x flow

The biggest conceptual difficulty was understanding how the current RP-signature flow relates to Selfie Check.

The application uses the newer RP context and signed request flow, but the Selfie Check integration also uses:

- `selfieCheckLegacy(...)`
- `allow_legacy_proofs={true}`

Those names make the integration feel like two generations of the API are being combined.

It took me some digging to understand that these pieces are meant to be used together.

A current end-to-end Selfie Check example for IDKit 4.x would have made this much clearer.

### 2. Developer Portal navigation, search and product discovery

It was not clear from the Developer Portal what additional step, permission, approval or application state is required to move from Simulator testing to a real production Selfie Check flow.

The portal exposed the application's World ID configuration, RP information, signer configuration and verification-related settings, but I could not find an obvious Selfie Check production-access control.

Navigation and product discovery were therefore harder than expected. I had to determine whether Selfie Check was configured through the World ID application itself, through an action, through a separate product surface or through an access/approval process.

Search and documentation discovery could also be clearer. Searching for Selfie Check concepts should lead directly to the current IDKit integration path, sandbox instructions, production-access requirements and debugging guidance instead of leaving developers to infer how those pieces relate.

For a hackathon developer, it would help to explicitly show something like:

- Selfie Check sandbox access: enabled / disabled
- Selfie Check production access: enabled / pending / unavailable
- what action is required to request production access
- whether an application is currently expected to use Simulator only

That would remove uncertainty about whether a missing option is a configuration problem or an access-level limitation.

### 3. Sandbox App states, proof flows and test users

The Simulator was very useful once the correct flow was understood.

However, on the first attempt it was not immediately obvious which simulated verification path should be selected for Selfie Check or how each sandbox state maps to the proof/result that the application receives.

It would help if the Sandbox App made the relationship between these concepts explicit:

- available verification states
- which state represents a successful Selfie Check
- which proof/result is returned for each state
- whether a test user can be reused for the same action
- how to reset or create additional test users
- how nullifier behavior should be interpreted during repeated tests
- which errors are generated by World versus by the integrating application

A short table showing:

`Sandbox/Test User state -> proof/result -> expected application behavior`

would make testing faster and would make repeated end-to-end testing much easier.

### 4. Errors, debugging and edge-case testing

For production-style integration work, it would be useful to have clearer debugging guidance and deterministic ways to test cases such as:

- user cancels verification
- verification fails
- RP request expires
- invalid or mismatched signal
- reused nullifier
- malformed proof response
- unavailable camera / device capability
- sandbox user already used for a particular action

Kosmos performs its own server-side validation for several of these application-level concerns, but being able to deterministically trigger World-side failure states would make integration testing much easier.

For debugging, it would also help if the docs clearly separated:

- IDKit client errors
- RP-signature/request errors
- World verification API errors
- sandbox/test-user state errors
- application-level signal or nullifier validation errors

That separation would make it faster to determine whether a failed verification originates in World configuration, the sandbox state, or application code.

---

## What worked well

Once the correct configuration was in place, IDKit gave Kosmos a fairly compact client integration.

The RP-signature model also allowed the signing key to stay server-side instead of being exposed to the browser.

The returned proof data gave us enough information to add application-level checks rather than simply trusting a successful client callback.

In particular, Kosmos verifies the signal hash against the authenticated external wallet and uses the World nullifier to prevent the same verified identity from creating another active join request for the same event.

---

## What I would improve

The most useful addition for me would have been one complete Selfie Check example using the current IDKit APIs:

`React -> RP signature endpoint -> IDKitRequestWidget -> selfieCheckLegacy -> server verification -> signal validation -> nullifier handling -> Simulator`

It should explain why `selfieCheckLegacy` and `allow_legacy_proofs` are used alongside the RP-signature flow.

I would also make Selfie Check more visible inside the Developer Portal. A dedicated section could show sandbox and production availability, approval status if relevant, RP and action configuration, test-user state and links to the right documentation and Simulator.

Finally, clearer sandbox debugging would help a lot. Being able to see test-user state, understand the proof flow and deliberately reproduce common errors would make repeated end-to-end testing much faster.

## Summary

Selfie Check fits Kosmos well because it gives me a human-verification signal before a join request or payment is submitted.

I got the complete integration working in the staging Simulator, including RP request signing, Selfie Check, server verification, wallet-signal binding and nullifier handling. The hardest part was understanding how the current RP flow, the legacy-named Selfie Check options, sandbox behavior and production access fit together.

The integration itself was manageable once those pieces were clear.
