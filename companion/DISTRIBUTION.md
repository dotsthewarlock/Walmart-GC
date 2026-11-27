# Companion distribution contract

`version.json` defines the version for both distributions and their diagnostic labels. Both packages are built from the same checked-in session, UI, wire rules, batch policy and merchant adapter; delivery and message bridges are platform-specific. `BASELINE-bookmarklet.js` remains a separate recovery benchmark.

1. Commit the reviewed source and run the synthetic companion and integrated repository validation. Build both packages with `python3 stage_release.py --source-revision "$(git rev-parse HEAD)"` from `companion/`. This verifies clean checked-in build inputs and writes `staging/companion/dev/{bookmarklet.js,extension.zip,release.json}` and `staging/companion/launcher.txt`. The descriptor binds both hashes to the same version and source revision.
2. Staging is local; copying assets to hosting, deploying and publishing require separate authorization. The permanent launcher gives Dev the primary action and focus. Stable remains unchanged until separately accepted and explicitly promoted.
3. Test ordinary hosted script loading on an inert fixture before using it on the merchant page. Do not bypass a merchant CSP; retain the standalone recovery bookmarklet. No credentials are sent to the hosting origin by the launcher.
4. Only after integrated acceptance and separate authorization, `python3 promote_release.py --accepted-version VERSION --accepted-source-revision FULL_SHA --authorize-stable` copies the exact accepted Dev bytes to staging Stable without rebuilding. Deployment remains separate.

The extension-origin frame provides isolation from the merchant page. The bookmarklet's closed shadow root is a UI boundary within the merchant page, not a security boundary against page scripts. Neither distribution writes directly to the wallet; Batch v1 is unchanged. The staged descriptor's `hostedLoaderVerified` and `sharedEngineParity` flags remain conservative until independent acceptance.

Dev 1.0.6 adds explicit extension-only Wallet transport. The extension ID remains
unchanged. The worker accepts only the production Wallet root and validated
top-level sender documents; an authorized merchant overlay explicitly receives
requests and returns observations. Credentials exist only in memory. Worker
restart or expiry interrupts transfer without resuming it; saved Wallet Batch
references and Companion result history retain TSV fallback. The bookmarklet
shares the existing session/UI/merchant engine and keeps explicit TSV transfer.
The native synthetic transport test instruments only a copied launcher shadow
root for inspection; release sources and both packaged artifacts keep isolation.
