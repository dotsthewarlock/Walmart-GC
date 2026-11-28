import React from 'react';
import {Button} from '../../components/primitives/Button';
import {Card} from '../../components/primitives/Card';
import {SelectField} from '../../components/primitives/SelectField';
import {defaultTransferPreferences} from '../../lib/balanceTransfer';
function Segments({ label, value, choices, onChange, disabled, detail }) {
  return <fieldset disabled={disabled} className="min-w-0">
    <legend className="mb-1 text-sm font-medium">{label} {detail && <span className="font-normal text-m3-on-surface-variant">{detail}</span>}</legend>
    <div className="flex overflow-hidden rounded-full border border-m3-outline">
      {choices.map(([option, text]) => <label key={option} className={`flex min-h-[48px] min-w-0 flex-1 cursor-pointer items-center justify-center border-r border-m3-outline px-1 text-sm last:border-r-0 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-m3-primary ${value === option ? "bg-m3-secondary-container text-m3-on-secondary-container" : "text-m3-on-surface"}`}>
        <input className="sr-only" type="radio" name={label} value={option} checked={value === option} onChange={() => onChange(option)} />{text}
      </label>)}
    </div>
  </fieldset>;
}

export function VerificationSelection({session,selectionCounts,busy,onSelect}){
 const {preferences,setPreferences,flaggedOnly,setFlaggedOnly}=session;
 const setPreference=(key,value)=>setPreferences(p=>({...p,[key]:value}));
 const lifecycle=preferences.purpose && preferences.purpose!=='general' && !flaggedOnly;
 return <Card as="section" className="flex flex-col gap-3 p-4" aria-label="Verification selection">
 <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Select cards</h2><Button variant="text" disabled={busy} onClick={()=>setPreferences({...defaultTransferPreferences})}>Reset</Button></div>
 <div role="group" aria-label="Cards to verify" className="grid grid-cols-2 gap-2">
 <Button disabled={busy} variant={!flaggedOnly?'tonal':'outlined'} aria-pressed={!flaggedOnly} onClick={()=>setFlaggedOnly(false)}>All eligible</Button>
 <Button disabled={busy} variant={flaggedOnly?'tonal':'outlined'} aria-pressed={flaggedOnly} onClick={()=>setFlaggedOnly(true)}>Flagged only</Button>
 </div>
 {flaggedOnly&&<p className="text-sm">Includes eligible used cards and provisional zero balances. Verification leaves used status unchanged.</p>}
 {!flaggedOnly&&<label className="flex flex-col gap-1 text-sm font-medium">Verification purpose
   <SelectField disabled={busy} value={preferences.purpose||'general'} onChange={event=>setPreferences(p=>({...p,purpose:event.target.value,quantity:event.target.value==='general'?'all':'20'}))}>
     <option value="general">General verification</option><option value="reconcile">Reconcile spent cards</option>
     <option value="watch">Recent refund watch</option><option value="final">Final checks due</option><option value="historical">Historical sweep / missing dates</option>
   </SelectField>
 </label>}
 {lifecycle&&<>
   <p className="text-sm">{preferences.purpose==='reconcile'?'Used cards without an applicable verified zero. A recorded $0 alone is unconfirmed.':preferences.purpose==='watch'?'Used within 120 days and due for another check.':preferences.purpose==='final'?'Due 120 days after use; priority for 30 days. Missed checks remain eligible.':'Older used cards and cards without a valid spending date remain recoverable.'} Known uncertainty comes first. Verification keeps used status; choose Mark Active explicitly after recovery.</p>
   {['watch','historical'].includes(preferences.purpose)&&<label className="flex flex-col gap-1 text-sm font-medium">Check freshness
     <SelectField disabled={busy} value={preferences.freshness||60} onChange={event=>setPreference('freshness',Number(event.target.value))}>
       {[30,60,90].map(days=><option key={days} value={days}>{days} days</option>)}
     </SelectField>
   </label>}
   <p className="text-sm text-m3-on-surface-variant">The watch period limits routine work, not refund eligibility. Historical cards are retained. Select up to 50 per pass.</p>
 </>}
             {!flaggedOnly&&!lifecycle&&<>
            <Segments label="Status" value={preferences.status} disabled={busy} onChange={v => setPreference("status", v)} choices={[["active", "Active"], ["used", "Used"], ["all", "All"]]} />
            <Segments label="Balance" value={preferences.balance} disabled={busy} onChange={v => setPreference("balance", v)} choices={[["yes", "Yes"], ["zero", "$0"], ["all", "All"]]} />
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">Last checked
                <SelectField disabled={busy} value={preferences.checked} onChange={event => setPreference("checked", event.target.value)}>
                  <option value="any">Any time</option><option value="never">Never</option><option value="older">At least</option><option value="recent">Within</option>
                </SelectField>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">Days
                <SelectField disabled={busy || !["older", "recent"].includes(preferences.checked)} value={preferences.days} onChange={event => setPreference("days", Number(event.target.value))}>
                  {[1, 3, 7, 30, 90, 180].map(days => <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>)}
                </SelectField>
              </label>
            </div>
            </>}
            {!lifecycle&&<label className="flex flex-col gap-1 text-sm font-medium">Sort by
              <SelectField disabled={busy} value={preferences.sort} onChange={event => setPreference("sort", event.target.value)}>
                <option value="checked-oldest">Checked oldest</option><option value="checked-newest">Checked newest</option><option value="added-oldest">Added oldest</option><option value="added-newest">Added newest</option><option value="balance-highest">Balance highest</option><option value="balance-lowest">Balance lowest</option>
              </SelectField>
            </label>}
            <Segments label="Quantity" detail={`· ${selectionCounts.matching} matching`} value={preferences.quantity} disabled={busy} onChange={v => setPreference("quantity", v)} choices={lifecycle?[["1", "1"], ["5", "5"], ["20", "20"], ["50", "50"]]:[["1", "1"], ["5", "5"], ["20", "20"], ["50", "50"], ["all", "All"]]} />
            <Button disabled={busy || !selectionCounts.selected.length} onClick={onSelect}>Select cards ({selectionCounts.selected.length})</Button>
 <p className="text-sm text-m3-on-surface-variant">Select cards to replace the working selection. Mode changes keep drafts and progress.</p>
 </Card>;
}
