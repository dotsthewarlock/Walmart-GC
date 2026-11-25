// Exact field and result selectors retained from the established Walmart helper.
// Local DOM operations only; no submission, retry or network call.
export function createMerchantFields(doc, win) {
  const form=()=>doc.querySelector('#check-gift-card-balance-form');
  const fields=()=>{const f=form();return [f?.querySelector('input[name="gc-number"]'),f?.querySelector('input[name="securitycode"]')];};
  const visible=e=>!!e&&e.getClientRects().length>0&&win.getComputedStyle(e).visibility!=='hidden';
  const dialogs=()=>[...doc.querySelectorAll('[role="dialog"]')].filter(visible);
  const resultDialog=()=>dialogs().find(d=>d.querySelector('.cardnumber')&&d.querySelector('.balance')&&[...d.querySelectorAll('h2')].some(h=>h.textContent.trim()==='Gift card balance'));
  const matches=(number,pin)=>{const [n,p]=fields();return !!n&&!!p&&n.value.replace(/\D/g,'')===number&&p.value===pin;};
  const native=(e,v)=>{Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value').set.call(e,v);e.dispatchEvent(new win.Event('input',{bubbles:true}));};
  function fill(number,pin){
    if(!/^[0-9]{16}$/.test(number)||!/^\d{4}$/.test(pin)||dialogs().length||doc.hidden)return false;
    const [n,p]=fields();if(!visible(n)||!visible(p)||n.disabled||p.disabled||n.readOnly||p.readOnly)return false;
    native(n,number.replace(/(.{4})(?=.)/g,'$1 '));native(p,pin);return matches(number,pin);
  }
  function read(number,pin){
    const ds=dialogs(),d=resultDialog();if(!ds.length)return {state:'waiting'};
    if(!d||ds.length!==1)return {state:'blocked'};
    const tail=d.querySelector('.cardnumber').textContent.trim().match(/^Ending in\s+(\d{4})$/i);
    const amount=d.querySelector('.balance').textContent.trim().match(/^Balance:\s*\$\s*((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)$/i);
    if(!tail||tail[1]!==number.slice(-4)||!amount||!matches(number,pin))return {state:'mismatch'};
    const value=Number(amount[1].replace(/,/g,''));if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*100)))return {state:'mismatch'};
    return {state:'observed',balance:value.toFixed(2)};
  }
  function dismissSaved(number,pin,balance,expected){
    const ds=dialogs();
    if(!ds.length)return true;
    if(ds.length!==1||ds[0]!==expected)return false;
    const result=read(number,pin);
    if(result.state!=='observed'||result.balance!==balance)return false;
    const buttons=[...expected.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Check another card balance'&&visible(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true');
    if(buttons.length!==1||doc.hidden)return false;
    buttons[0].click();return true;
  }
  return {form,fields,visible,dialogs,resultDialog,matches,fill,read,dismissSaved};
}
