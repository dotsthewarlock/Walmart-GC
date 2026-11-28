import {useState,useEffect,useLayoutEffect,useSyncExternalStore} from 'react';
import {readTransferPreferences,transferPreferenceKey,defaultTransferPreferences} from '../../lib/balanceTransfer';
import {createVerificationWorkflow} from './verificationWorkflow';

// App-lifetime controller, scoped to inventory/generation rather than a mounted
// presentation. Inventory and its saved Batch ledger remain the only authority.
export function useVerificationSession(walletSnapshot,commands){
 const [workflow]=useState(()=>{
  let preferences;try{preferences=readTransferPreferences(window.localStorage);}catch{preferences={...defaultTransferPreferences};}
  return createVerificationWorkflow(preferences);
 });
 const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot);
 // Like Checkout, invalidate sensitive state and command ownership before the
 // changed context paints. Ordinary destination/mode changes do not reset it.
 useLayoutEffect(()=>{workflow.configure({...commands,walletSnapshot});});
 useEffect(()=>{try{localStorage.setItem(transferPreferenceKey,JSON.stringify(state.preferences));}catch{}},[state.preferences]);
 return {...state,...workflow};
}
