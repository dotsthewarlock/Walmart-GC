import {inventoryBytes,profileOf,inventoryContext,assertInventoryContext} from '../../lib/inventory';
import {inventoryFingerprint} from '../../lib/balanceTransferLedger';
import {sameTransferContext} from '../../lib/balanceTransfer';
import {verificationCards,credentialAmbiguous} from '../../lib/inventoryRecovery';
export async function openVerificationSession(options) {
    const {getTransferWallet,walletSnapshot,readWallet,commitWallet}=options;
    const assertSession=session=>assertVerificationSession(session,options);
    getTransferWallet();
    const start = await readWallet();
    assertInventoryContext(start, inventoryContext(walletSnapshot));
    let state=start;
    let profile=profileOf(state);
    if(profile.ledgerRecovery)throw new Error("Discard the preserved interrupted Batch before continuing.");
    // The saved compartment, never a cached session, identifies local work.
    // Synchronization independently verifies principal and Sheet ownership.
    const localOnly = profile.context.kind === 'unbound';
    if(!localOnly&&(!profile.context.ownershipVerified||!profile.context.principal||profile.remoteBase?.protocol!=='gc-wallet-sync-v1'||profile.context.sheetId!==profile.sheets?.spreadsheetId||!profile.remoteBase?.version||profile.remoteBase.version!==profile.sync?.lastKnownSheetVersion||profile.remoteBase.version!==profile.sheets?.remoteSheetVersion))throw new Error("Open a saved local inventory or the matching verified Sheet before preparing a Batch.");
    const context=localOnly?{sheetId:'local:unbound',sheetVersion:'local'}:{sheetId:profile.context.sheetId,sheetVersion:profile.remoteBase.version};
    const inventoryRaw = inventoryBytes(state);
    if(profile.ledger && profile.ledger.context.sheetId!==context.sheetId){
      await assertSession({state,profile});
      state=await commitWallet({kind:'archive-foreign-batch',...inventoryContext(state),revision:profile.revision});
      profile=profileOf(state);
    }
    if (profile.ledger) {
      const pendingRequests=profile.ledger.requests.filter(r=>r.state==='pending');
      const legacyMatches = pendingRequests.some(r=>!r.relevance) && profile.ledger.inventoryDigest === await inventoryFingerprint(inventoryRaw,profile.ledger.id);
      const invalid = (await Promise.all(pendingRequests.map(async r=>{
        const card=profile.cards.find(c=>c.cardNumber===r.cardNumber);
        return (!card || credentialAmbiguous(profile.recoveryEvidence,r.cardNumber) || !sameTransferContext(profile.ledger.context,context) || (r.relevance ? r.relevance.pinDigest!==await inventoryFingerprint(card.pin,profile.ledger.id) : !legacyMatches)) ? r.ref : null;
      }))).filter(Boolean);
      if(invalid.length || !sameTransferContext(profile.ledger.context,context)){
        await assertSession({state,profile});
        state=await commitWallet({kind:'invalidate-batch-refs',...inventoryContext(state),revision:profile.revision,refs:invalid,context});
        profile=profileOf(state);
      }
    }
    const session = { state, profile, ledger: profile.ledger, context, inventoryRaw, previewCards: verificationCards(profile) };
    await assertSession(session);
    return session;
  }


export async function assertVerificationSession(session, {assertActive=()=>{},getTransferWallet,readWallet}) {
    assertActive();
    getTransferWallet();
    const current = await readWallet();
    assertInventoryContext(current, inventoryContext(session.state));
    if (current.active !== session.state.active || profileOf(current).revision !== session.profile.revision) {
      throw new Error("Inventory or Sheet context changed. Preview again.");
    }
  }
