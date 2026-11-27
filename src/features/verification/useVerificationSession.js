import {useState,useEffect} from 'react';
import {readTransferPreferences,transferPreferenceKey,defaultTransferPreferences} from '../../lib/balanceTransfer';
import {sendCompanion} from '../../lib/companionTransport';

// App-lifetime UI session only. Inventory commands and the saved Batch ledger
// remain the durable authority; credentials are never copied into UI storage.
export function useVerificationSession(wallet){
 const [preferences,setPreferences]=useState(()=>{try{return readTransferPreferences(window.localStorage);}catch{return {...defaultTransferPreferences};}});
 const [mode,setMode]=useState('manual');
 const [flaggedOnly,setFlaggedOnly]=useState(false);
 const [selection,setSelection]=useState(null);
 const [manual,setManual]=useState({position:0,saved:0,amount:'',completed:[]});
 const [packet,setPacket]=useState('');
 const [preview,setPreview]=useState(null);
 const [transfer,setTransfer]=useState(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  setSelection(null);setManual({position:0,saved:0,amount:'',completed:[]});setPacket('');setPreview(null);
  setTransfer(current=>{if(current)void sendCompanion({type:'wallet-transfer-cancel',version:1,sessionId:current.sessionId}).catch(()=>{});return null;});
 },[wallet?.active,wallet?.contextGeneration]);
 useEffect(()=>{try{localStorage.setItem(transferPreferenceKey,JSON.stringify(preferences));}catch{}},[preferences]);
 return {preferences,setPreferences,mode,setMode,flaggedOnly,setFlaggedOnly,selection,setSelection,manual,setManual,packet,setPacket,preview,setPreview,transfer,setTransfer,busy,setBusy};
}
