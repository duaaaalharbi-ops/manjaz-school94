/* MANJAZ – awards expandable add card, 19.5.
   Upload this file IN PLACE OF manjaz-urgent18.js.
   Keeps original approved-gallery filtering and original award form & save handlers.
   No other sections, database operations, or certificate logic are modified.
*/
(()=>{'use strict';
 const view=document.getElementById('view');
 if(!view)return;

 // Preserve the original 18.1 gallery filtering, including its existing action visibility.
 let working=false, verifiedAdmin=false, adminChecked='';
 function checkAdmin(){
  const raw=sessionStorage.getItem('manjaz_admin_auth_session_v1')||'';
  if(raw===adminChecked)return;adminChecked=raw;verifiedAdmin=false;
  let session;try{session=JSON.parse(raw)}catch(_){}
  if(!session?.access_token)return;
  fetch('https://idkjuqfxcweqekdkcktk.supabase.co/auth/v1/user',{headers:{apikey:'sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL',Authorization:'Bearer '+session.access_token},cache:'no-store'}).then(async r=>{
   if(!r.ok)return;const user=await r.json();
   verifiedAdmin=String(user.email||'').toLowerCase()==='munjz.s94@hotmail.com';
   queue();
  }).catch(()=>{});
 }
 function filterGallery(){
  if(working)return;
  working=true;
  try{
   checkAdmin();
   view.classList.toggle('mj19-admin-awards',verifiedAdmin);
   const isAchievements=!!view.querySelector('#achievementList');
   const isAwards=!!view.querySelector('#awardList');
   if(!isAchievements&&!isAwards)return;
   const container=view.querySelector(isAchievements?'#achievementList':'#awardList');
   if(!container)return;
   for(const card of container.querySelectorAll('.achievement-card')){
    const state=card.querySelector('.badge')?.textContent?.trim();
    const approved=state==='معتمد';
    if(card.hidden!==!approved)card.hidden=!approved;
    if(isAwards){
     for(const b of card.querySelectorAll('.record-edit-btn,.record-delete-btn'))b.hidden=!verifiedAdmin;
    }
   }
  }finally{working=false;}
 }

 // Styles are installed from this already-referenced script: no index.html change needed.
 function ensureStyle(){
  if(document.getElementById('mj19AwardEntryCSS'))return;
  const sheet=document.createElement('style');
  sheet.id='mj19AwardEntryCSS';
  sheet.textContent=`
   #view.mj19-admin-awards:has(#awardList) .record-actions-grid{display:grid!important}
   #view.mj19-admin-awards:has(#awardList) .record-edit-btn,
   #view.mj19-admin-awards:has(#awardList) .record-delete-btn{display:block!important}
   #view:has(#awardList) #mj19AwardEntry{
    display:block;margin:0 0 16px;background:var(--white,#fff);
    border:1px solid var(--line,#d4e3e5);border-radius:16px;
    box-shadow:0 8px 22px rgba(11,48,71,.05);overflow:hidden;
    color:var(--ink,#173345);direction:rtl
   }
   #view:has(#awardList) #mj19AwardEntry>summary{
    display:flex;align-items:center;gap:12px;cursor:pointer;
    padding:16px 18px;min-height:64px;box-sizing:border-box;
    font:800 17px/1.5 Tahoma,Arial,sans-serif;color:var(--navy,#0b3047);
    list-style:none
   }
   #mj19AwardEntry>summary::-webkit-details-marker{display:none}
   #mj19AwardEntry>summary::before{
    content:'+';display:grid;place-items:center;width:34px;height:34px;flex:none;
    border-radius:10px;background:var(--teal-soft,#e7f4f2);
    color:var(--teal,#0f8b8d);font:800 25px/1 Tahoma,Arial,sans-serif
   }
   #mj19AwardEntry[open]>summary::before{content:'−'}
   #mj19AwardEntry>summary:focus-visible{outline:2px solid var(--teal,#0f8b8d);outline-offset:-3px}
   #mj19AwardEntry>.mj19-award-entry-body{padding:0 16px 18px;border-top:1px solid var(--line,#d4e3e5)}
   /* Override only the old display:none!important for this existing award form. */
   #view:has(#awardList) #mj19AwardEntry[open] #awardForm{
    display:block!important;visibility:visible!important;
    margin:14px 0 0;max-width:100%;box-sizing:border-box;
    box-shadow:none;border:0;background:transparent;padding:0
   }
   #view:has(#awardList) #mj19AwardEntry:not([open]) #awardForm{display:none!important}
   #mj19AwardEntry #awardForm :is(input,select,textarea){max-width:100%;box-sizing:border-box}
   @media(max-width:650px){
    #view:has(#awardList) #mj19AwardEntry>summary{font-size:15px;padding:13px 12px}
    #mj19AwardEntry>.mj19-award-entry-body{padding:0 10px 14px}
   }
  `;
  document.head.appendChild(sheet);
 }

 function mountAwardCard(){
  const list=view.querySelector('#awardList');
  const form=view.querySelector('#awardForm');
  if(!list||!form)return;
  let card=view.querySelector('#mj19AwardEntry');
  if(!card){
   card=document.createElement('details');
   card.id='mj19AwardEntry';
   const summary=document.createElement('summary');
   summary.textContent='إضافة تكريم';
   const body=document.createElement('div');
   body.className='mj19-award-entry-body';
   card.append(summary,body);
   list.parentElement.insertBefore(card,list);
   card.addEventListener('toggle',()=>{
    if(card.open){
     // Invoke the EXISTING show button's click listener; do not replace award cloud save.
     const show=view.querySelector('#showAwardForm');
     if(show)show.click();
     else form.style.display='block';
    }else if(form.dataset.busy!=='1'&&form.dataset.awardCloudBusy!=='1'){
     form.style.display='none';
    }
   });
   // Cancel keeps original reset behavior, then collapses this single added card.
   card.addEventListener('click',event=>{
    if(!event.target.closest('#cancelAward'))return;
    queueMicrotask(()=>{if(card.isConnected)card.open=false;});
   });
  }
  const body=card.querySelector('.mj19-award-entry-body');
  if(body&&form.parentElement!==body)body.appendChild(form);
 }

 let queued=false;
 function apply(){filterGallery();ensureStyle();mountAwardCard();}
 function queue(){
  if(queued)return;
  queued=true;
  queueMicrotask(()=>{queued=false;apply();});
 }
 const observer=new MutationObserver(queue);
 observer.observe(view,{childList:true,subtree:true});
 window.addEventListener('hashchange',queue);
 queue();
})();


/* Daily duty stylesheet is deliberately bundled with the entry script */


/* MANJAZ DUTY 22: isolated styles, no reserve modifications */
(function(){const id="mjDailyDutyCSS22";if(document.getElementById(id))return;const node=document.createElement("style");node.id=id;node.textContent="/* Daily duty 21 – reuse the reserve design tokens and components; isolate all rules. */\n.mj-duty{direction:rtl;text-align:right;color:var(--ink,#173345);max-width:1180px;margin:0 auto 32px;display:grid;gap:16px;font-family:inherit}\n.mj-duty .page-intro{margin-bottom:0}\n.mj-duty :is(.reserve-public-card,.reserve-tab,.reserve-table,.reserve-actions,.reserve-mini,.reserve-card-grid,.reserve-work-card,.reserve-tabs){font-family:inherit}\n.mj-duty .reserve-public-card{background:var(--white,#fff);border:1px solid var(--line,#dae7ea);border-radius:14px;overflow:hidden;margin-bottom:12px}\n.mj-duty .reserve-public-card summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px;cursor:pointer;min-height:60px;list-style:none;color:var(--navy,#0b3047)}\n.mj-duty .reserve-public-card summary strong{font-size:16px}\n.mj-duty .reserve-public-card summary span{font-size:13px;color:#627d83}\n.mj-duty .reserve-public-card summary:before{content:'+';font-weight:800;font-size:22px;color:var(--teal,#0d8082);margin-inline-end:6px}\n.mj-duty .reserve-public-card[open] summary:before{content:'−'}\n.mj-duty .reserve-public-card-content{padding:14px 16px;border-top:1px solid var(--line,#dae7ea)}\n.mj-duty .surface.panel,.mj-duty .surface.form-card{background:var(--white,#fff);border:1px solid var(--line,#dae7ea);border-radius:14px;padding:18px}\n.mj-duty .panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}\n.mj-duty .panel-head h3{margin:0;color:var(--navy,#0b3047)}\n.mj-duty .panel-head span{color:#6b8288;font-size:13px}\n.mj-duty .duty-date-row{display:flex;align-items:end;gap:12px;flex-wrap:wrap;margin:12px 0}\n.mj-duty .duty-date-label{display:grid;gap:6px;font-weight:700;max-width:250px;flex:1 1 170px}\n.mj-duty :is(input,select){height:46px;box-sizing:border-box;background:#fff;border:1px solid var(--line,#c9dcdf);border-radius:10px;padding:9px 11px;min-width:0;max-width:100%;color:var(--ink,#173345);direction:rtl;font:inherit}\n.mj-duty .duty-hijri{padding:10px;color:#335e65}\n.mj-duty button{font-family:inherit;cursor:pointer;min-height:42px}\n.mj-duty button:disabled{opacity:.5;cursor:not-allowed}\n.mj-duty .form-actions,.mj-duty .reserve-actions,.mj-duty .duty-admin-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:12px 0}\n.mj-duty .btn{padding:10px 16px;border-radius:10px;font-size:14px;font-weight:700}\n.mj-duty .reserve-mini{border:1px solid #bad1d4;border-radius:9px;color:#145b60;background:#fff;padding:8px 12px;font-weight:700}\n.mj-duty .reserve-mini.danger{color:#9b2929;border-color:#e4baba}\n.mj-duty .reserve-tab{border:1px solid #cce0e3;background:#fff;border-radius:10px;color:#275f67;padding:10px 14px;font-weight:700}\n.mj-duty .reserve-tab.active,.mj-duty .reserve-work-card.active{border-color:var(--teal,#128080);background:var(--teal-soft,#e7f4f2)}\n.mj-duty .reserve-card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:14px 0}\n.mj-duty .reserve-work-card{border:1px solid var(--line,#d9e6e7);border-radius:12px;background:#fff;text-align:right;display:grid;gap:6px;padding:15px;min-height:95px;color:var(--navy,#0b3047)}\n.mj-duty .reserve-work-card strong{font-size:15px}.mj-duty .reserve-work-card small{color:#687f82;font-size:12px;line-height:1.6}\n.mj-duty .reserve-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}\n.mj-duty .reserve-share-box{padding:13px;background:#f5fbfa;border:1px solid #d3e5e4;border-radius:12px;margin:14px 0}\n.mj-duty .reserve-public-note{color:#526e73;line-height:1.8;font-size:13px}\n.mj-duty .reserve-table-wrap{overflow-x:auto;max-width:100%}\n.mj-duty .reserve-table{border-collapse:collapse;width:100%;min-width:400px;font-size:13px}\n.mj-duty .reserve-table :is(td,th){text-align:right;padding:10px 12px;border:1px solid #e0eaec;white-space:normal}\n.mj-duty .reserve-table th{background:#edf6f5;color:#214b57}\n.mj-duty .reserve-status{color:#13745f;font-weight:700}\n.mj-duty .reserve-status.pending{color:#9a5925}\n.mj-duty .duty-totals{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;color:#42666d}\n.mj-duty .duty-totals span{padding:7px 10px;background:#f2f8f8;border-radius:8px;font-size:12px}\n.mj-duty #dutyStatus:not(:empty){border-radius:10px;padding:10px 13px;background:#edf8f6;color:#146259}\n.mj-duty #dutyStatus.error{background:#fff1ee;color:#9d2929}\n.mj-duty [hidden],#dutyPreviewBackdrop[hidden]{display:none!important}\n.mj-duty .duty-slot-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}\n.mj-duty .duty-slot{border-radius:12px;border:1px solid #dae6e6;overflow:hidden;min-width:0;background:#fbfefd}\n.mj-duty .duty-slot h3{background:#eaf5f3;color:#184f59;padding:13px;margin:0;font-size:15px}\n.mj-duty .duty-slot h3 small{font-size:11px;margin-inline:6px;font-weight:500}\n.mj-duty .duty-slots-grid{display:grid;gap:7px;padding:10px}\n.mj-duty .duty-slots-grid label{display:flex;gap:7px;align-items:center;min-width:0}\n.mj-duty .duty-slots-grid label span{display:grid;place-items:center;width:25px;flex:0 0 25px;border-radius:7px;background:#eaf4f4;color:#216267}\n.mj-duty .duty-slots-grid select{width:100%;font-size:12px}\n.mj-duty #dutyPersonForm{display:grid;grid-template-columns:2fr 1fr auto;align-items:end;gap:9px;margin:12px 0}\n.mj-duty #dutyPersonForm label{display:grid;gap:7px}\n.mj-duty .duty-link-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid #e0e8e9;border-radius:10px;padding:10px 12px;margin:7px 0}\n.mj-duty .duty-link-row span{display:grid;gap:5px}.mj-duty .duty-link-row small{color:#637f82}\n.mj-duty-link-public{max-width:720px;margin:20px auto;padding:22px}.mj-duty-link-public h2{color:var(--navy,#0b3047)}\n#dutyPreviewBackdrop{position:fixed;inset:0;background:rgba(10,27,39,.62);z-index:999999;overflow:auto;padding:16px;display:flex;align-items:flex-start;justify-content:center}\n#dutyPreviewBackdrop .duty-preview{width:min(900px,100%);padding:16px;background:#fff;border-radius:14px;direction:rtl;box-sizing:border-box}\n#dutyPreviewBackdrop .duty-preview-tools{display:flex;gap:10px;justify-content:flex-start;margin-bottom:14px}\n#dutyPrintSheet{direction:rtl;color:#111;font:13px/1.6 Tahoma,Arial,sans-serif;background:white;min-height:180px;padding:12mm}\n#dutyPrintSheet .duty-sheet-heading{text-align:center;margin-bottom:16px}\n#dutyPrintSheet h1{font-size:21px;margin:14px 0;color:#123745}\n#dutyPrintSheet table{border-collapse:collapse;width:100%;table-layout:fixed}\n#dutyPrintSheet :is(th,td){border:1px solid #a8b7bd;text-align:right;padding:8px;min-height:30px;vertical-align:middle}\n#dutyPrintSheet th{background:#e9f4f3;color:#163c48}\n#dutyPrintSheet .duty-sheet-period{margin:21px 0 0;break-inside:avoid;page-break-inside:avoid}\n#dutyPrintSheet .duty-sheet-period h2{margin:0 0 10px;text-align:right;color:#153b46;font:bold 16px/1.55 Tahoma,Arial,sans-serif}\n#dutyPrintSheet .duty-sheet-table{width:100%;border-collapse:collapse;table-layout:fixed}\n#dutyPrintSheet .duty-sheet-table .duty-col-index{width:8%;text-align:center}\n#dutyPrintSheet .duty-sheet-table th:nth-child(2){width:43%}\n#dutyPrintSheet .duty-sheet-table th:nth-child(3){width:17%}\n#dutyPrintSheet .duty-sheet-table th:nth-child(4){width:17%}\n#dutyPrintSheet .duty-sheet-table th:nth-child(5){width:15%}\n#dutyPrintSheet .duty-sheet-table tbody td{background:#fff!important;color:#153b46;-webkit-print-color-adjust:exact;print-color-adjust:exact}\n#dutyPrintSheet .duty-sheet-table tbody tr:not(:first-child) td{background:#fff}\n#dutyPrintSheet .duty-sheet-empty{text-align:right;margin:30px 0;color:#51656d}\n#dutyPrintSheet .duty-sheet-totals{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;border-top:1px solid #cbd6d7;margin-top:18px;padding-top:10px}\n@media(max-width:960px){.mj-duty .duty-slot-columns{grid-template-columns:1fr}.mj-duty .reserve-card-grid{grid-template-columns:1fr}}\n@media(max-width:640px){.mj-duty .page-intro{padding:8px}.mj-duty .reserve-public-card summary{display:grid;grid-template-columns:auto 1fr;justify-content:start}.mj-duty .reserve-public-card summary span{grid-column:2}.mj-duty .surface.panel,.mj-duty .surface.form-card{padding:12px}.mj-duty #dutyPersonForm{grid-template-columns:1fr}}\n@page{size:A4 portrait;margin:12mm}\n@media print{\n body:has(#dutyPreviewBackdrop:not([hidden])) *{visibility:hidden!important}\n body:has(#dutyPreviewBackdrop:not([hidden])) #dutyPreviewBackdrop,body:has(#dutyPreviewBackdrop:not([hidden])) #dutyPreviewBackdrop :is(*, *::before, *::after){visibility:visible!important}\n #dutyPreviewBackdrop:not([hidden]){position:absolute!important;inset:0!important;display:block!important;padding:0!important;background:white!important;overflow:visible!important}\n #dutyPreviewBackdrop .duty-preview{width:100%!important;padding:0!important;border:0!important;box-shadow:none!important}\n #dutyPreviewBackdrop .duty-preview-tools{display:none!important}\n #dutyPrintSheet{padding:0!important;min-height:0!important;font-size:11px}\n #dutyPrintSheet tr{break-inside:avoid}\n#dutyPrintSheet .duty-sheet-period{margin-top:17px;break-inside:avoid;page-break-inside:avoid}\n#dutyPrintSheet .duty-sheet-period h2{font-size:13px;margin-bottom:7px}\n#dutyPrintSheet .duty-sheet-period td,#dutyPrintSheet .duty-sheet-period th{padding:6px 8px}\n #dutyPrintSheet thead{display:table-header-group}\n}\n\n/* 26.0: Public personal acknowledgement, mobile user preview, predictable single-sheet A4 print. */\n.mj-duty .duty-public-guide{background:#f2f8f8;border:1px solid #cbe0dd;border-radius:10px;padding:12px 14px;margin-bottom:12px;color:#164854}\n.mj-duty .duty-public-guide p{font-size:13px;line-height:1.8;margin:7px 0 11px}\n.mj-duty .duty-viewed-at{display:block;font-size:11px;color:#44686c;margin-top:4px}\n.mj-duty .duty-link-actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-start}\n.mj-duty .duty-personal-slots{margin:16px 0;background:#f1f8f7;padding:12px;border-radius:10px}\n.mj-duty .duty-personal-slots p{margin:4px 0;padding:7px 9px;border-bottom:1px solid #dceae9}\n.mj-duty .duty-personal-slots p:last-child{border:0}\n.mj-duty-link-public .duty-ack-button{min-height:48px;min-width:200px}\n.mj-duty-link-public #dutyAckStatus{margin:12px 0;color:#176453;font-weight:700;line-height:1.8}\n.mj-duty-link-public .duty-personal-return{display:inline-flex;align-items:center;justify-content:center;margin-top:12px;text-decoration:none}\n#dutyPreviewBackdrop{padding:12px 8px;align-items:flex-start;overscroll-behavior:contain}\n#dutyPreviewBackdrop .duty-preview{width:min(920px,100%);min-width:0;max-width:100%;padding:14px;overflow:hidden}\n#dutyPreviewBackdrop .duty-preview-tools{flex-wrap:wrap;gap:7px}\n#dutyPreviewBackdrop .duty-preview-hint{text-align:right;color:#526b73;font-size:12px;margin:0 0 10px}\n#dutyPreviewBackdrop .duty-preview-page-frame{width:100%;height:var(--duty-preview-height,1100px);overflow:auto;position:relative;background:#fff;border:1px solid #dae3e3;box-sizing:border-box;direction:rtl}\n#dutyPreviewBackdrop .duty-preview-page-frame #dutyPrintSheet{position:absolute;right:0;top:0;background:#fff;transform-origin:top right;box-sizing:border-box}\n#dutyPrintPortal{display:none}\n@media(max-width:540px){#dutyPreviewBackdrop .duty-preview{padding:9px}#dutyPreviewBackdrop .duty-preview-tools .btn{padding:9px 8px;font-size:12px}#dutyPreviewBackdrop #dutyPrintSheet{font-size:12px}}\n@page{size:A4 portrait;margin:7mm}\n@media print{\n html,body{margin:0!important;padding:0!important;min-height:0!important;overflow:visible!important;background:#fff!important}\n body > *:not(#dutyPrintPortal){display:none!important}\n body:has(#dutyPreviewBackdrop:not([hidden])) #dutyPrintPortal,body:has(#dutyPreviewBackdrop:not([hidden])) #dutyPrintPortal *{visibility:visible!important}\n body > #dutyPrintPortal,body > #dutyPrintPortal *{visibility:visible!important}\n body > #dutyPrintPortal{display:block!important;position:static!important;inset:auto!important;margin:0!important;padding:0!important;width:100%!important;height:auto!important;overflow:visible!important;background:#fff!important}\n #dutyPrintPortal #dutyPrintSheet{padding:0!important;margin:0!important;width:100%!important;min-height:0!important;height:auto!important;box-shadow:none!important;transform:none!important;font:10.1px/1.25 Tahoma,Arial,sans-serif!important;letter-spacing:0!important}\n #dutyPrintPortal .duty-sheet-heading{margin-bottom:7px!important}\n #dutyPrintPortal .duty-sheet-heading strong{font-size:12px!important}\n #dutyPrintPortal h1{font-size:15px!important;margin:4px 0!important}\n #dutyPrintPortal .duty-sheet-heading p{margin:4px 0!important}\n #dutyPrintPortal .duty-sheet-period{margin:10px 0 0!important;padding:0!important;break-inside:avoid!important;page-break-inside:avoid!important}\n #dutyPrintPortal .duty-sheet-period h2{font-size:11.5px!important;margin:0 0 5px!important;line-height:1.25!important;text-align:right!important}\n #dutyPrintPortal .duty-sheet-table{width:100%!important;table-layout:fixed!important}\n #dutyPrintPortal .duty-sheet-table td,#dutyPrintPortal .duty-sheet-table th{padding:4px 7px!important;font-size:9.4px!important;line-height:1.2!important;height:auto!important;min-height:0!important;vertical-align:middle!important;white-space:normal!important;overflow-wrap:anywhere!important}\n #dutyPrintPortal .duty-sheet-table tbody tr{break-inside:avoid!important;page-break-inside:avoid!important}\n #dutyPrintPortal .duty-sheet-table thead{display:table-header-group!important}\n #dutyPrintPortal .duty-sheet-totals{margin-top:9px!important;padding-top:6px!important;gap:6px!important;font-size:10px!important}\n #dutyPrintPortal .duty-sheet-table tbody td{background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}\n}\n\n.mj-duty .duty-v18-editor{margin-top:14px}.mj-duty .duty-v18-editor table{min-width:670px}.mj-duty .duty-v18-form:not([hidden]){display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.mj-duty .duty-v18-form select{flex:1 1 150px;max-width:250px}.mj-duty .duty-v18-form [hidden]{display:none!important}.mj-duty .duty-v18-feedback{display:block;color:#385c60;margin-top:4px}\n/* 22.0: Fixed full-width Hijri date inside the panel; never leak a native Gregorian picker. */\n.mj-duty .duty-date-row{display:block;min-width:0;width:100%;box-sizing:border-box}\n.mj-duty .duty-date-control{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;width:100%;max-width:100%;min-width:0;position:relative;box-sizing:border-box}\n.mj-duty .duty-date-label{display:block;max-width:none;min-width:0;font-weight:700}\n.mj-duty .duty-hijri-trigger{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;max-width:100%;min-width:0;min-height:46px;box-sizing:border-box;text-align:right;white-space:normal;word-break:normal;font-size:15px;padding:9px 13px;border:1px solid var(--line,#c9dcdf);border-radius:10px;background:#fff;color:var(--ink,#173345)}\n.mj-duty .duty-hijri-trigger:after{content:'▦';flex:none;font-size:19px;color:var(--teal,#0d8082)}\n.mj-duty :is(.duty-main-toolbar,.panel-head,#dutyDayLabel){min-width:0;max-width:100%}\n.mj-duty .duty-main-toolbar{overflow:visible;box-sizing:border-box}\n.mj-duty #dutyDayLabel{font-size:13px;overflow-wrap:anywhere}\n.mj-duty .duty-calendar{position:absolute;top:100%;right:0;left:auto;width:min(342px,100%);max-width:100%;z-index:10020;box-sizing:border-box;padding:12px;background:#fff;border:1px solid #c9d9dc;border-radius:12px;box-shadow:0 15px 35px #12334335;direction:rtl}\n.mj-duty .duty-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;color:var(--navy,#0b3047)}\n.mj-duty .duty-calendar-head button{border:1px solid #cbd9db;background:#edf6f4;border-radius:7px;padding:2px 11px;font-size:25px;color:var(--navy,#0b3047);min-height:35px}\n.mj-duty .duty-calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}\n.mj-duty .duty-calendar-days b{font-size:11px;color:#60737d}\n.mj-duty .duty-calendar-day{min-height:36px;padding:0;font-size:13px;border-radius:8px;border:1px solid transparent;background:#f4f8f7;color:var(--ink,#173345)}\n.mj-duty .duty-calendar-day.selected{background:var(--navy,#0b3047);color:#fff;font-weight:700}\n.mj-duty .duty-calendar-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;padding-top:9px;color:#59757b;font-size:12px}\n.mj-duty .duty-calendar-foot button{border:0;border-radius:7px;background:#edf6f4;color:#105a58;font-size:12px;padding:7px}\n.mj-duty .duty-load-error{color:#993632;background:#fff3ef;padding:12px;border-radius:9px}\n.mj-duty .duty-ack-public-btn{min-height:36px!important;min-width:108px;padding:6px 11px!important;margin:5px 0 0;white-space:nowrap;font-size:12px!important}\n.mj-duty .duty-ack-public-btn:disabled{opacity:.8;cursor:default}\n.mj-duty .duty-ack-public-state{display:grid;justify-items:start;gap:3px}\n.mj-duty .duty-ack-public-message{color:#9b3030;font-size:12px}\n@media(max-width:640px){.mj-duty .duty-calendar{width:100%}.mj-duty .duty-date-control{width:100%}.mj-duty #dutyDateTrigger{width:100%!important;max-width:100%!important}}\n@media print{.mj-duty .duty-calendar{display:none!important}}\n/* Avoid implicit min-content grid widening on mobile pages. */\n.mj-duty{width:100%;max-width:100%;min-width:0;box-sizing:border-box;grid-template-columns:minmax(0,1fr)}\n.mj-duty :is(.duty-main-toolbar,.reserve-public-card-stack,.duty-public-stack,.reserve-public-card,.duty-date-row,.duty-date-control,.duty-admin){min-width:0;max-width:100%;box-sizing:border-box}\n";document.head.append(node)})();

/* Manjaz daily duty 27.0 — general published table acknowledgement, no code, dual WhatsApp links. */
(()=>{'use strict';
const BASE='https://idkjuqfxcweqekdkcktk.supabase.co',KEY='sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL';
const AUTH_KEY='manjaz_admin_auth_session_v1',ROUTE='#daily-duty';
const SLOTS=[['morning','مناوبة الصباح'],['break','مناوبة الفسحة'],['end','مناوبة نهاية الدوام']];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateLong=d=>{try{return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{calendar:'islamic-umalqura',weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Riyadh'}).format(new Date(d+'T12:00:00+03:00'))}catch{return d}};
const hijri=d=>{try{return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Riyadh'}).format(new Date(d+'T12:00:00+03:00'))}catch{return d}};
const slotName=k=>SLOTS.find(x=>x[0]===k)?.[1]||k;
const root=()=>document.getElementById('view');
let date=localDate(),roster=[],assignments=[],links=[],history=[],published=false,activeCard='manual',busy=false,routeKey='',publicStats=null,refreshSequence=0;
function session(){try{const s=JSON.parse(sessionStorage.getItem(AUTH_KEY)||'null');return s?.access_token&&(!s.expires_at||s.expires_at>Date.now()/1000)?s:null}catch{return null}}
function headers(){return {apikey:KEY,Authorization:'Bearer '+(session()?.access_token||KEY),'Content-Type':'application/json'}}
async function api(path,body,admin=false){if(admin&&!session())throw Error('سجلي الدخول للإدارة أولًا');const r=await fetch(BASE+'/rest/v1/'+path,{method:body?'POST':'GET',headers:headers(),...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});const t=await r.text();let data;try{data=t?JSON.parse(t):null}catch{data=t}if(!r.ok)throw Error(data?.message||data?.hint||'تعذر الاتصال بقاعدة البيانات '+r.status);return data}
const rpc=(name,params={},admin=false)=>api('rpc/'+name,params,admin);
const log=t=>{const p=document.getElementById('dutyStatus');if(p){p.textContent=t||'';p.classList.toggle('error',/تعذر|يلزم|غير |خطأ/.test(t))}};
const urlFor=(h)=>location.href.split('#')[0]+h;
function home(){const view=root();if(!view || (location.hash&&location.hash!=='#home'))return;
 const grid=view.querySelector('.manjaz-home-grid');if(!grid||grid.querySelector('#mjDutyHomeCard'))return;
 const card=document.createElement('article');card.id='mjDutyHomeCard';card.className='manjaz-home-card';
 card.innerHTML='<div class="manjaz-home-card-title"><span class="manjaz-home-icon" aria-hidden="true">▦</span><h3>المناوبة اليومية</h3></div><div class="manjaz-home-actions"><a class="manjaz-home-action view" href="#daily-duty">استعراض</a></div>';
 const reserve=[...grid.children].find(x=>x.textContent.includes('الاحتياط اليومي'));
 if(reserve)reserve.after(card);else grid.append(card);
}
function nav(){const n=document.getElementById('nav');if(n&&!n.querySelector('[data-route="daily-duty"]')){const a=document.createElement('a');a.href=ROUTE;a.dataset.route='daily-duty';a.innerHTML='<span class="icon">▦</span><span>المناوبة اليومية</span>';const reserve=n.querySelector('[href*="reserve"]');reserve?reserve.after(a):n.append(a)}}
const dateInput=()=>`<div class="duty-date-control"><label class="duty-date-label" for="dutyDateTrigger">اليوم والتاريخ الهجري</label><input type="hidden" id="dutyDate" value="${esc(date)}"><button type="button" class="manjaz-hijri-trigger duty-hijri-trigger" id="dutyDateTrigger" aria-haspopup="dialog" aria-controls="dutyCalendar">${esc(dateLong(date))}</button></div>`;
// Native data values remain ISO for database compatibility; visible picker is Umm al-Qura only.
const hijriPartsFmt=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{calendar:'islamic-umalqura',year:'numeric',month:'numeric',day:'numeric',timeZone:'Asia/Riyadh'});
const hijriMonths=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
const hijriNum=new Intl.NumberFormat('ar-SA-u-nu-arab',{useGrouping:false});
const isoRe=/^\d{4}-\d{2}-\d{2}$/;
const asUtc=x=>new Date(x+'T12:00:00Z');
const addDay=(x,n)=>{const d=asUtc(x);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
function hParts(x){const p={};hijriPartsFmt.formatToParts(asUtc(x)).forEach(t=>{if(['year','month','day'].includes(t.type))p[t.type]=Number(t.value)});return p}
function hijriMonthFirst(x){let d=x;for(let i=0;i<32;i++){if(hParts(d).day===1)return d;d=addDay(d,-1)}throw Error('تعذر تحديد بداية الشهر الهجري')}
function hijriNextMonth(x){return hijriMonthFirst(addDay(x,32))}
function hijriPrevMonth(x){return hijriMonthFirst(addDay(x,-1))}
let displayedMonth=null;
function closeHijriCalendar(){document.getElementById('dutyCalendar')?.remove();displayedMonth=null}
function renderHijriCalendar(){const calendar=document.getElementById('dutyCalendar');if(!calendar||!displayedMonth)return;
 const p=hParts(displayedMonth),next=hijriNextMonth(displayedMonth),days=Math.round((asUtc(next)-asUtc(displayedMonth))/86400000),offset=asUtc(displayedMonth).getUTCDay(),weekdays=['ح','ن','ث','ر','خ','ج','س'];
 const cells=Array.from({length:offset},()=>'<span aria-hidden="true"></span>');
 for(let i=0;i<days;i++){const val=addDay(displayedMonth,i);cells.push(`<button type="button" class="duty-calendar-day ${val===date?'selected':''}" data-hijri-date="${val}" aria-label="${esc(dateLong(val))}" ${val===date?'aria-current="date"':''}>${hijriNum.format(i+1)}</button>`)}
 calendar.innerHTML=`<header class="duty-calendar-head"><button type="button" data-hijri-move="-1" aria-label="الشهر السابق">‹</button><strong>${hijriMonths[p.month-1]} ${hijriNum.format(p.year)} هـ</strong><button type="button" data-hijri-move="1" aria-label="الشهر التالي">›</button></header><div class="duty-calendar-days">${weekdays.map(d=>`<b>${d}</b>`).join('')}${cells.join('')}</div><footer class="duty-calendar-foot"><span>تقويم أم القرى</span><button type="button" data-hijri-today>اليوم</button><button type="button" data-hijri-close>إغلاق</button></footer>`;
 calendar.querySelectorAll('[data-hijri-date]').forEach(b=>b.onclick=()=>{closeHijriCalendar();selectDate(b.dataset.hijriDate)});
 calendar.querySelectorAll('[data-hijri-move]').forEach(b=>b.onclick=()=>{displayedMonth=b.dataset.hijriMove==='1'?hijriNextMonth(displayedMonth):hijriPrevMonth(displayedMonth);renderHijriCalendar()});
 calendar.querySelector('[data-hijri-today]').onclick=()=>{closeHijriCalendar();selectDate(localDate())};
 calendar.querySelector('[data-hijri-close]').onclick=closeHijriCalendar;
}
function openHijriCalendar(){if(document.getElementById('dutyCalendar')){closeHijriCalendar();return}
 displayedMonth=hijriMonthFirst(date);
 const calendar=document.createElement('section');calendar.id='dutyCalendar';calendar.className='duty-calendar';calendar.setAttribute('role','dialog');calendar.setAttribute('aria-label','اختيار التاريخ الهجري');calendar.dir='rtl';
 document.getElementById('dutyDateTrigger').after(calendar);renderHijriCalendar();
}
// Unified date selector: changes the canonical date and synchronizes every dependent view.
function selectDate(value){
 if(!isoRe.test(value)||Number.isNaN(asUtc(value).getTime())){log('تاريخ غير صالح');return}
 if(value===date){closeHijriCalendar();return}
 if(busy){log('انتظري اكتمال عملية الحفظ أو التوليد قبل تغيير التاريخ.');return}
 const chosen=document.querySelector('#dutyWorkspaceContent select[data-slot]')?collect():null;
 if(chosen && (chosen.length!==assignments.length || chosen.some(row=>!assignments.some(saved=>saved.slot===row.slot&&Number(saved.position)===row.position&&saved.person_id===row.person_id)))){
  if(!confirm('هناك تغييرات على أسماء المناوبات لم تُحفظ. هل تريدين الانتقال إلى تاريخ آخر دون حفظها؟'))return;
 }
 date=value;
 const input=document.getElementById('dutyDate');if(input)input.value=date;
 if(location.hash.startsWith('#daily-duty')){const h='#daily-duty?date='+date;try{window.history.replaceState(null,'',location.pathname+location.search+h)}catch(_){}routeKey=h}
 // One coordinated refresh for public rows, stats, admin roster, assignments, links and preview.
 // The request sequence prevents slow previous-day responses from overriding the selected day.
 void refresh();
}
function layout(){const view=root();if(!view)return;view.innerHTML=`<div id="mjDutyRoot" class="mj-duty" dir="rtl">
 <section class="page-intro"><div><span class="kicker">منجز</span><h2>المناوبة اليومية</h2><p>الثانوية الرابعة والتسعون – مسارات</p></div></section>
 <section class="surface panel duty-main-toolbar"><div class="panel-head"><h3>عرض المناوبة</h3><span id="dutyDayLabel">${esc(dateLong(date))}</span></div>
 <div class="duty-date-row">${dateInput()}</div><div class="form-actions duty-toolbar-actions"><button class="btn btn-ghost" id="dutyReload" type="button">عرض الجدول</button><button class="btn btn-ghost" id="dutyPrint" type="button">طباعة الجدول</button><button class="btn btn-primary" id="dutyPublishPreview" type="button">جدول النشر</button><button class="btn btn-ghost" id="dutyAdminOpen" type="button">دخول الإدارة</button></div></section>
 <div id="dutyStatus" role="status" aria-live="polite"></div>
 <div class="reserve-public-card-stack duty-public-stack">
 <details class="reserve-public-card" id="dutyPublicCardDaily" open><summary><strong>جدول المناوبة اليومية</strong><span>الصباح والفسحة ونهاية الدوام – تأكيد الاطلاع</span></summary><div class="reserve-public-card-content" id="dutyPublicTable">جارٍ تحميل الجدول...</div></details>
 <details class="reserve-public-card" id="dutyPublicCardStatistics"><summary><strong>إحصائيات المناوبة</strong><span>يومي وأسبوعي وشهري هجري وتراكمي</span></summary><div class="reserve-public-card-content" id="dutyStats">جارٍ تحميل الإحصائيات...</div></details></div>
 <section class="surface panel reserve-admin-block duty-admin" id="dutyAdmin" hidden><div class="panel-head"><h3>إدارة المناوبة اليومية</h3><span>دخول إداري</span></div>
 <nav class="reserve-tabs duty-admin-nav" aria-label="أقسام المناوبة"><button class="reserve-tab active" data-dtab="workspace">إنشاء ومتابعة المناوبة</button><button class="reserve-tab" data-dtab="teachers">المنفذات والجداول</button><button class="reserve-tab" data-dtab="settings">الإعدادات</button></nav>
 <section class="reserve-share-box"><strong>مشاركة روابط المناوبة</strong><div class="reserve-actions"><button type="button" class="reserve-mini" id="dutyCopyDay">نسخ رابط جدول اليوم</button><button type="button" class="reserve-mini" id="dutyWhatsapp">مشاركة عبر واتساب</button></div></section>
 <div id="dutyAdminWorkspace"></div></section>
 </div><div id="dutyPreviewBackdrop" hidden></div>`;
 document.getElementById('dutyDate').onchange=e=>selectDate(e.target.value);
 document.getElementById('dutyDateTrigger').onclick=()=>openHijriCalendar();
 document.getElementById('dutyReload').onclick=()=>refresh();
 document.getElementById('dutyPrint').onclick=()=>preview(false);
 document.getElementById('dutyPublishPreview').onclick=()=>preview(false);
 document.getElementById('dutyAdminOpen').onclick=()=>{
  const panel=document.getElementById('dutyAdmin');if(!panel)return;
  panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'});
  if(!session()){openDutyLogin();return}
  revealDutyAdminControls(true);loadAdmin();
 };
 const dutyPublicUrl=()=>urlFor('#daily-duty?date='+date);
 const dutyPublishUrl=()=>urlFor('#daily-duty?date='+date+'&publish=1');
 document.getElementById('dutyCopyDay').onclick=()=>{
  if(!published){log('انشري جدول اليوم قبل مشاركة رابط الاطلاع العام.');return}
  copy(dutyPublicUrl());
 };
 document.getElementById('dutyWhatsapp').onclick=()=>{
  if(!published){log('يجب حفظ جدول المناوبة ونشره أولًا قبل مشاركة روابط الاطلاع والنشر.');return}
  const body=`السلام عليكم ورحمة الله وبركاته\n\nتُفيدكم إدارة الثانوية الرابعة والتسعون – مسارات بنشر المناوبة اليومية ليوم ${dateLong(date)}.\n\nرابط جدول المناوبة العام لتأكيد الاطلاع بجانب اسمك:\n${dutyPublicUrl()}\n\nرابط جدول النشر الرسمي للعرض والطباعة:\n${dutyPublishUrl()}\n\nيرجى من كل منفذة مراجعة تكليفها واختيار «تأكيد الاطلاع» في صف اسمها.\n\nإدارة الثانوية الرابعة والتسعون – مسارات`;
  const u='https://api.whatsapp.com/send?text='+encodeURIComponent(body);
  window.open(u,'_blank','noopener,noreferrer')||location.assign(u);
 };
 document.querySelectorAll('[data-dtab]').forEach(b=>b.onclick=()=>adminTab(b.dataset.dtab));
 if(session()){const p=document.getElementById('dutyAdmin');p.hidden=false;}
 refresh().then(()=>{if(location.hash.includes('publish=1')&&document.getElementById('mjDutyRoot'))preview(false)});
}
// Duty administration uses the SAME authenticated Supabase session as the reserve section.
// Unauthenticated users sign in here; never redirect away from daily duty.
function revealDutyAdminControls(show){
 const p=document.getElementById('dutyAdmin');if(!p)return;
 for(const selector of ['.duty-admin-nav','.reserve-share-box']){
  const el=p.querySelector(selector);if(el)el.style.display=show?'':'none';
 }
}
function openDutyLogin(){
 const panel=document.getElementById('dutyAdmin');const holder=document.getElementById('dutyAdminWorkspace');
 if(!panel||!holder)return;
 panel.hidden=false;revealDutyAdminControls(false);
 holder.innerHTML=`<section class="surface form-card duty-login-card"><div class="form-section-title">دخول إدارة المناوبة اليومية</div>
 <p class="reserve-public-note">يتم تسجيل الدخول داخل المناوبة اليومية، ثم تظهر بطاقات الإنشاء اليدوي والآلي والمفاضلة.</p>
 <form id="dutyInlineLoginForm"><div class="form-grid">
 <label>البريد الإلكتروني الإداري<input name="email" type="email" required autocomplete="username" inputmode="email"></label>
 <label>كلمة المرور<input name="password" type="password" required autocomplete="current-password"></label>
 </div><div class="form-actions"><button class="btn btn-primary" type="submit" id="dutyLoginSubmit">دخول</button>
 <button class="btn btn-ghost" type="button" id="dutyLoginCancel">إلغاء</button></div>
 <p id="dutyLoginMessage" role="alert" aria-live="polite"></p></form></section>`;
 const form=holder.querySelector('#dutyInlineLoginForm'),button=holder.querySelector('#dutyLoginSubmit'),message=holder.querySelector('#dutyLoginMessage');
 holder.querySelector('#dutyLoginCancel').onclick=()=>{panel.hidden=true;holder.innerHTML='';revealDutyAdminControls(true)};
 form.onsubmit=async event=>{
  event.preventDefault();if(button.disabled)return;
  const fd=new FormData(form),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
  button.disabled=true;button.textContent='جارٍ التحقق من الحساب...';message.textContent='';
  try{
   const reply=await fetch(BASE+'/auth/v1/token?grant_type=password',{
    method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email,password}),cache:'no-store'});
   const auth=await reply.json().catch(()=>({}));
   if(!reply.ok||!auth.access_token)throw Error('بيانات الدخول غير صحيحة أو تعذّر الاتصال بخدمة الدخول.');
   const check=await fetch(BASE+'/auth/v1/user',{
    headers:{apikey:KEY,Authorization:'Bearer '+auth.access_token},cache:'no-store'});
   if(!check.ok)throw Error('تعذّر التحقق من هوية الحساب.');
   const user=await check.json();
   // Interface guard, plus existing database RLS / RPC admin authorization.
   if(String(user.email||'').toLowerCase()!=='munjz.s94@hotmail.com')
    throw Error('هذا الحساب غير مخوّل لإدارة المناوبة اليومية.');
   sessionStorage.setItem(AUTH_KEY,JSON.stringify({
    access_token:auth.access_token,refresh_token:auth.refresh_token||'',
    expires_at:Math.floor(Date.now()/1000)+Math.max(1,Number(auth.expires_in||3600)),user
   }));
   revealDutyAdminControls(true);
   await loadAdmin();
   if(document.getElementById('dutyInlineLoginForm'))throw Error('لم يتم فتح بطاقات الإنشاء. أعيدي المحاولة.');
   log('تم الدخول إلى إدارة المناوبة اليومية.');
  }catch(error){
   message.textContent=error?.message||'تعذّر تسجيل الدخول.';
   button.disabled=false;button.textContent='دخول';
  }
 };
}
function ackDateLabel(value){
 if(!value)return '';
 try{return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{timeZone:'Asia/Riyadh',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return ''}
}
function dayTable(data){
 const holder=document.getElementById('dutyPublicTable');if(!holder)return;
 const rows=Array.isArray(data?.rows)?data.rows:[],dayPublished=Boolean(data?.published);
 published=dayPublished;
 const totals=SLOTS.map(([slot,name])=>({name,count:rows.filter(r=>r.slot===slot).length}));
 const acknowledged=rows.filter(r=>Boolean(r.viewed_at)).length;
 holder.innerHTML=`<div class="duty-public-guide" role="note"><strong>تأكيد الاطلاع من جدول المناوبة العام</strong><p>راجعي اسمك وفترة المناوبة، ثم اضغطي «تأكيد الاطلاع» في صف اسمك. يتم تسجيل تاريخ ووقت الاطلاع تلقائيًا دون دخول إداري. اختاري اسمك فقط؛ لا يُتحقق من الهوية عبر هذا الرابط العام.</p>
 <button type="button" class="reserve-mini" id="dutyRefreshAcknowledgements">تحديث حالات الاطلاع</button></div>
 <p class="reserve-public-note">${dayPublished?'الجدول المنشور لهذا اليوم — تم اطلاع '+acknowledged+' من '+rows.length+' منفذة.':'لم يُنشر جدول المناوبة لهذا اليوم.'}</p>
 <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>فترة المناوبة</th><th>اسم المنفذة</th><th>حالة الاطلاع</th><th>حالة التفعيل</th></tr></thead><tbody>${rows.length?SLOTS.map(([key,title])=>rows.filter(r=>r.slot===key).map((r,i)=>`<tr><td>${i===0?esc(title):''}</td><td>${esc(r.name)}</td><td><div class="duty-ack-public-state"><span class="reserve-status ${r.viewed_at?'':'pending'}">${r.viewed_at?'تم الاطلاع':'لم يتم الاطلاع'}</span>${r.viewed_at?`<small class="duty-viewed-at">${esc(ackDateLabel(r.viewed_at))}</small>`:r.person_id?`<button type="button" class="reserve-mini duty-ack-public-btn" data-duty-public-ack="${esc(r.person_id)}" data-duty-ack-name="${esc(r.name)}">تأكيد الاطلاع</button>`:'<small class="duty-ack-public-message">تحديث قاعدة البيانات مطلوب لتفعيل التأكيد العام</small>'}</div></td><td><span class="reserve-status ${r.activation_status==='تم التفعيل'?'':'pending'}">${r.activation_status==='تم التفعيل'?'تم التفعيل':'لم تفعل'}</span></td></tr>`).join('')).join(''):'<tr><td colspan="4">لا يوجد جدول منشور في التاريخ المحدد</td></tr>'}</tbody></table></div>
 <div class="duty-totals">${totals.map(x=>`<span>${x.name}: <strong>${x.count}</strong></span>`).join('')}<span>الإجمالي: <strong>${rows.length}</strong></span></div>`;
 holder.querySelector('#dutyRefreshAcknowledgements')?.addEventListener('click',()=>loadPublic(date,refreshSequence));
 holder.querySelectorAll('[data-duty-public-ack]').forEach(button=>button.addEventListener('click',async()=>{
  const personId=button.dataset.dutyPublicAck,personName=button.dataset.dutyAckName;
  const requestDate=date,serial=refreshSequence;
  if(!dayPublished||!personId)return;
  if(!confirm(`أقر بأنني ${personName}، وقد اطلعت على تكليف المناوبة الخاص بي ليوم ${dateLong(requestDate)}.\n\nهل تريدين تأكيد الاطلاع؟`))return;
  button.disabled=true;button.textContent='جارٍ حفظ الاطلاع...';
  try{
   const result=await rpc('mj_duty_public_ack',{p_date:requestDate,p_person_id:personId});
   if(result?.acknowledged!==true||!result.at)throw Error('لم تؤكد قاعدة البيانات حفظ الاطلاع.');
   if(requestDate===date&&serial===refreshSequence){await loadPublic(requestDate,serial)}
  }catch(e){
   if(!button.isConnected)return;
   button.disabled=false;button.textContent='إعادة تأكيد الاطلاع';
   const error=document.createElement('small');error.className='duty-ack-public-message';
   error.textContent='تعذر تسجيل الاطلاع: '+(e?.message||e);
   button.after(error);
  }
 }));
}
function islamicMonthKey(d){return new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{year:'numeric',month:'2-digit',timeZone:'Asia/Riyadh'}).format(new Date(d+'T12:00:00+03:00'))}
function monthStart(d){let dt=new Date(d+'T12:00:00+03:00');const key=islamicMonthKey(d);for(let i=0;i<35;i++){const prev=new Date(dt.getTime()-86400000);if(islamicMonthKey(prev.toISOString().slice(0,10))!==key)break;dt=prev}return dt.toISOString().slice(0,10)}
function renderStats(data,prior=false){const root=document.getElementById('dutyStats');if(!root)return;
 const rows=data?.rows||[],usePrior=prior;
 root.innerHTML=`<p class="reserve-public-note">إحصائيات المناوبات المعتمدة في جداول النشر فقط، مع استبعاد الخانات الفارغة.</p>
 <div class="reserve-actions duty-stats-buttons"><button type="button" class="reserve-tab ${!usePrior?'active':''}" data-dstats="current">الأسبوع الحالي</button><button type="button" class="reserve-tab ${usePrior?'active':''}" data-dstats="previous">الأسبوع السابق</button></div>
 <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>المنفذة</th><th>الفئة</th><th>اليوم</th><th>الأسبوع</th><th>الشهر الهجري</th><th>التراكمي</th><th>الصباح</th><th>الفسحة</th><th>النهاية</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.role==='administrative'?'إدارية':'معلمة'}</td><td>${Number(r.day_count||0)}</td><td>${Number(usePrior?r.previous_week_count:r.week_count)||0}</td><td>${Number(r.month_count||0)}</td><td>${Number(r.total_count||0)}</td><td>${Number(r.morning_count||0)}</td><td>${Number(r.break_count||0)}</td><td>${Number(r.end_count||0)}</td></tr>`).join(''):'<tr><td colspan="9">لا توجد إحصائيات منشورة</td></tr>'}</tbody></table></div>`;
 root.querySelectorAll('[data-dstats]').forEach(b=>b.onclick=()=>renderStats(data,b.dataset.dstats==='previous'));
}
// Both groups share one native select. Optgroup titles are the divider labels on iOS and desktop.
function dutyRosterOptions(selected){
 return [['teacher','المعلمات'],['administrative','الإداريات']].map(([role,title])=>{
  const people=roster.filter(p=>p.active&&p.role===role).sort((a,b)=>a.full_name.localeCompare(b.full_name,'ar'));
  return `<optgroup label="${title} ─────────────">${people.map(p=>`<option value="${esc(p.id)}" ${selected===p.id?'selected':''}>${esc(p.full_name)}</option>`).join('')}</optgroup>`;
 }).join('');
}
function cardPicker(slot){return `<section class="duty-slot"><h3>${esc(slotName(slot))} <small>الحد الأقصى ٦</small></h3><div class="duty-slots-grid">${Array.from({length:6},(_,i)=>{const old=assignments.find(a=>a.slot===slot&&Number(a.position)===i+1);return `<label><span>${i+1}</span><select data-slot="${slot}" data-position="${i+1}" aria-label="${esc(slotName(slot))} - المنفذة ${i+1}"><option value="">خانة غير مستخدمة</option>${dutyRosterOptions(old?.person_id)}</select></label>`}).join('')}</div></section>`}
function workspace(){const p=document.getElementById('dutyAdminWorkspace');if(!p)return;
 p.innerHTML=`<div class="reserve-card-grid duty-work-tabs">${[['manual','الإنشاء اليدوي','اختيار المنفذات يدويًا من قوائم قابلة للتعديل'],['auto','الإنشاء الآلي','التوليد العادل مع تخصيص الفسحة للإداريات'],['ranking','احتساب المفاضلة','متابعة عدالة التوزيع دون لوحة تميز']].map(([k,title,desc])=>`<button type="button" class="reserve-work-card ${activeCard===k?'active':''}" data-dcard="${k}"><strong>${title}</strong><small>${desc}</small></button>`).join('')}</div><div id="dutyWorkspaceContent"></div>`;
 p.querySelectorAll('[data-dcard]').forEach(b=>b.onclick=()=>{activeCard=b.dataset.dcard;workspace()});
 const section=document.getElementById('dutyWorkspaceContent');
 if(activeCard==='ranking'){section.innerHTML='<section class="surface panel"><h3>احتساب المفاضلة</h3><p>تعتمد المفاضلة على أقل عدد من التكليفات السابقة، وتدوير الفترات بين المؤهلات، دون إنشاء ترتيب للتميز أو شهادات.</p><div id="dutyRanking"></div></section>';const totals=new Map;(publicStats?.rows||[]).forEach(x=>{const person=roster.find(p=>p.full_name===x.name&&p.role===x.role);if(person)totals.set(person.id,Number(x.total_count||0))});section.querySelector('#dutyRanking').innerHTML='<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>المنفذة</th><th>التكليفات السابقة</th></tr></thead><tbody>'+roster.filter(x=>x.active).sort((a,b)=>(totals.get(a.id)||0)-(totals.get(b.id)||0)).map(x=>`<tr><td>${esc(x.full_name)}</td><td>${totals.get(x.id)||0}</td></tr>`).join('')+'</tbody></table></div>';return}
 const auto=activeCard==='auto';
 section.innerHTML=`<section class="surface form-card"><div class="form-section-title">${auto?'الإنشاء الآلي':'الإنشاء اليدوي'}</div><p class="reserve-public-note">${auto?'الفسحة للإداريات فقط في التوليد الآلي، وتوزيع متوازن دون تكرار الاسم في اليوم.':'الاختيار يدوي من القائمة المشتركة للمعلمات والإداريات.'} حد أقصى ٦ منفذات لكل فترة، ويُقبل الحفظ بأقل من ٦.</p>
 <p><strong>التاريخ الهجري:</strong> ${esc(dateLong(date))}</p>
 <div class="duty-slot-columns">${SLOTS.map(x=>cardPicker(x[0])).join('')}</div>
 <section class="duty-admin-actions"><button type="button" class="btn btn-primary" id="dutySave">حفظ واعتماد جدول اليوم</button>${auto?'<button type="button" class="btn btn-primary" id="dutyGenerate">توليد آلي عادل</button>':''}<button type="button" class="reserve-mini danger" id="dutyClear">حذف جدول اليوم</button></section><p id="dutyInlineActionStatus" class="reserve-public-note duty-inline-action-status" role="status" aria-live="polite"></p><p id="dutyEditNote" class="reserve-public-note">يمكن تغيير الأسماء بعد التوليد أو عند الغياب، ثم حفظ التعديلات.</p>
 <div id="dutyLinks"></div></section>`;
 section.querySelector('#dutySave').onclick=()=>doAction(async()=>{
 const selectedDate=date,rows=collect(),counts=SLOTS.map(x=>rows.filter(y=>y.slot===x[0]).length);
 if(counts.some(x=>x<1))throw Error('اختاري منفذة واحدة على الأقل في كل فترة. لا يلزم ملء الخانات الست.');
 if(new Set(rows.map(r=>r.person_id)).size!==rows.length)throw Error('المنفذة مكررة في اليوم نفسه؛ اختاري أسماء مختلفة.');
 if(!session())throw Error('انتهت صلاحية الدخول الإداري. أعيدي تسجيل الدخول داخل المناوبة.');
 if(!confirm('حفظ الجدول سيوقف النشر السابق حتى تعيدي نشره. هل تستمرين؟'))return false;
 const result=await rpc('mj_duty_save',{p_date:selectedDate,p_assignments:rows},true);
 if(result?.saved!==true||Number(result.assignments)!==rows.length)throw Error('لم تؤكد قاعدة البيانات حفظ جميع التكليفات.');
 await refresh();log('تم حفظ '+rows.length+' تكليفًا بتاريخ '+dateLong(selectedDate)+'. يمكن النشر بعد المراجعة.');
}, {button:section.querySelector('#dutySave'),status:section.querySelector('#dutyInlineActionStatus'),pending:'جارٍ الحفظ...',success:'تم الحفظ'});
 if(auto)section.querySelector('#dutyGenerate').onclick=()=>doAction(async()=>{if(!confirm('سيُعاد توليد جدول التاريخ المحدد وفق العدالة. هل تستمرين؟'))return false;const r=await rpc('mj_duty_generate',{p_date:date},true);await refresh();log('تم توليد '+r.count+' تكليفًا، والفسحة للإداريات فقط.')}, {button:section.querySelector('#dutyGenerate'),pending:'جارٍ التوليد...',success:'تم التوليد'});
 section.querySelector('#dutyClear').onclick=()=>doAction(async()=>{if(!confirm('هل تريدين حذف تكليفات هذا اليوم وروابط اطلاعها؟'))return false;await rpc('mj_duty_delete_day',{p_date:date},true);await refresh();log('تم حذف تكليفات اليوم فقط.')}, {button:section.querySelector('#dutyClear'),pending:'جارٍ الحذف...',success:'تم الحذف'});
 linkPanel();
}
function collect(){return [...document.querySelectorAll('#dutyWorkspaceContent select[data-slot]')].filter(x=>x.value).map(x=>({slot:x.dataset.slot,position:Number(x.dataset.position),person_id:x.value}))}
async function copy(t){try{await navigator.clipboard.writeText(t);log('تم نسخ الرابط.')}catch{prompt('انسخي الرابط:',t)}}

function dutyV18Editor(){
 if(!session()||!published||!assignments.length)return '';
 return '<section class="surface panel duty-v18-editor"><h3>التعديل الإداري للتكليفات المعتمدة</h3><p>تعديل موضعي دون حذف الجدول أو إعادة نشره.</p><div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>الفترة</th><th>المنفذة</th><th>الاطلاع</th><th>التفعيل</th><th>الإجراءات</th></tr></thead><tbody>'+
 assignments.map(a=>{
  const person=roster.find(x=>x.id===a.person_id),link=links.find(x=>x.person_id===a.person_id),status=a.activation_status==='تم التفعيل'?'تم التفعيل':'لم تفعل';
  return '<tr data-duty-v18-row data-slot="'+esc(a.slot)+'" data-position="'+Number(a.position)+'"><td>'+esc(slotName(a.slot))+' - '+a.position+'</td><td>'+esc(person?.full_name||'—')+'</td><td>'+(link?.viewed_at?'تم الاطلاع':'لم يتم الاطلاع')+'</td><td>'+esc(status)+'</td><td>'+
   '<div class="reserve-actions"><button type="button" class="reserve-mini" data-duty-v18-mode="person">✎ تعديل</button><button type="button" class="reserve-mini" data-duty-v18-mode="status">تغيير حالة التفعيل</button></div>'+
   '<div class="duty-v18-form" hidden><select class="duty-v18-person" aria-label="اختيار المنفذة"><option value="">اختاري المنفذة</option>'+dutyRosterOptions(a.person_id)+'</select>'+
   '<select class="duty-v18-status" aria-label="حالة التفعيل"><option value="تم التفعيل"'+(status==='تم التفعيل'?' selected':'')+'>تم التفعيل</option><option value="لم تفعل"'+(status==='لم تفعل'?' selected':'')+'>لم تفعل</option></select>'+
   '<button type="button" class="reserve-mini" data-duty-v18-save>حفظ</button><button type="button" class="reserve-mini" data-duty-v18-cancel>إلغاء</button></div><small class="duty-v18-feedback" role="status"></small></td></tr>';
 }).join('')+'</tbody></table></div></section>';
}
function dutyV18BindEditor(panel){
 panel.querySelectorAll('[data-duty-v18-row]').forEach(row=>{
  const form=row.querySelector('.duty-v18-form'),msg=row.querySelector('.duty-v18-feedback');
  row.querySelectorAll('[data-duty-v18-mode]').forEach(button=>button.onclick=()=>{
   const mode=button.dataset.dutyV18Mode;form.hidden=false;form.dataset.mode=mode;
   form.querySelector('.duty-v18-person').hidden=mode!=='person';form.querySelector('.duty-v18-status').hidden=mode!=='status';
   msg.textContent='اختاري القيمة ثم احفظي.';});
  row.querySelector('[data-duty-v18-cancel]').onclick=()=>{form.hidden=true;msg.textContent='أُلغي التعديل.'};
  row.querySelector('[data-duty-v18-save]').onclick=async e=>{
   const mode=form.dataset.mode,slot=row.dataset.slot,position=Number(row.dataset.position),old=assignments.find(a=>a.slot===slot&&Number(a.position)===position);
   if(!old)return;
   const value=mode==='person'?form.querySelector('.duty-v18-person').value:form.querySelector('.duty-v18-status').value;
   if(!value){msg.textContent='اختاري قيمة صحيحة.';return}
   if(mode==='person'&&value===old.person_id||mode==='status'&&value===old.activation_status){form.hidden=true;msg.textContent='لا يوجد تغيير.';return}
   if(!confirm('حفظ التعديل المحدد فقط دون إعادة نشر الجدول؟'))return;
   const requestDate=date,serial=refreshSequence;
   await doAction(async()=>{
    const name=mode==='person'?'mj_duty_edit_assignment_v18':'mj_duty_edit_activation_v18';
    const args=mode==='person'?{p_date:requestDate,p_slot:slot,p_position:position,p_person_id:value}:{p_date:requestDate,p_slot:slot,p_position:position,p_activation:value};
    const res=await rpc(name,args,true);
    if(res?.updated!==true||res.slot!==slot||Number(res.position)!==position)throw Error('لم تؤكد قاعدة البيانات الحفظ.');
    const qs='duty_date=eq.'+encodeURIComponent(requestDate)+'&slot=eq.'+encodeURIComponent(slot)+'&position=eq.'+position;
    const check=await api('mj_duty_assignments?select=person_id,activation_status&'+qs,null,true);
    if(check.length!==1||(mode==='person'?check[0].person_id!==value:check[0].activation_status!==value))throw Error('تعذر التحقق من حفظ التعديل.');
    if(date===requestDate&&serial===refreshSequence){
     Object.assign(old,check[0]); // Persisted row only, without rebuilding the administrative workspace.
     if(mode==='person')links=await api('mj_duty_links?select=duty_date,person_id,link_token,viewed_at&duty_date=eq.'+encodeURIComponent(requestDate),null,true);
     await loadPublic(requestDate,serial);
     linkPanel();
    }
   },{button:e.currentTarget,status:msg,pending:'جارٍ حفظ التعديل...',success:'تم الحفظ'});
  };
 });
}

function linkPanel(){const panel=document.getElementById('dutyLinks');if(!panel)return;
 const confirmed=links.filter(l=>Boolean(l.viewed_at)).length;
 panel.innerHTML=`<section class="duty-link-panel"><h3>نشر جدول المناوبة العام</h3>
 <p class="reserve-public-note">العدد المحفوظ: <strong>${assignments.length}</strong> من حد أقصى ١٨ تكليفًا؛ الخانات الفارغة لا تُنشر.</p>
 <p class="reserve-public-note">${published?'الجدول منشور. تُرسل رسالة واتساب عامة واحدة تشمل رابط تأكيد الاطلاع ورابط جدول النشر.':'احفظي جدول اليوم ثم انشريه لإتاحة تأكيد الاطلاع الجماعي.'}</p>
 <div class="reserve-actions"><button type="button" class="btn btn-primary" id="dutyPublishButton" ${assignments.length<3?'disabled':''}>نشر جدول اليوم</button><button type="button" class="btn btn-ghost" id="dutyPreviewButton">معاينة جدول النشر</button></div>
 ${published?`<div class="reserve-actions"><button type="button" class="reserve-mini" id="dutyCopyShared">نسخ رابط الاطلاع العام</button><button type="button" class="reserve-mini" id="dutyShareShared">مشاركة واتساب بالرابطين</button></div><p class="reserve-public-note">تم الاطلاع: <strong>${confirmed}</strong> من <strong>${assignments.length}</strong> منفذة. تُحدَّث حالة الاطلاع تلقائيًا.</p>`:''}
 </section>${dutyV18Editor()}`;
 dutyV18BindEditor(panel);
 panel.querySelector('#dutyPublishButton').onclick=()=>doAction(async()=>{await rpc('mj_duty_publish',{p_date:date},true);await refresh();log('تم نشر جدول اليوم. يمكنك إرسال رابط الاطلاع العام ورابط جدول النشر عبر واتساب.')}, {button:panel.querySelector('#dutyPublishButton'),pending:'جارٍ النشر...',success:'تم النشر'});
 panel.querySelector('#dutyPreviewButton').onclick=()=>preview(false);
 panel.querySelector('#dutyCopyShared')?.addEventListener('click',()=>document.getElementById('dutyCopyDay')?.click());
 panel.querySelector('#dutyShareShared')?.addEventListener('click',()=>document.getElementById('dutyWhatsapp')?.click());
}
function rosterPanel(){return `<section class="surface form-card"><div class="form-section-title">قائمة المنفذات: المعلمات والإداريات</div><p class="reserve-public-note">تضم القائمة الإداريات الـ١٧ المستوردات؛ لا توجد أسماء مستثناة. يتيح النموذج إضافة المعلمات أو تعديل الاسم والتصنيف.</p>
 <form id="dutyPersonForm"><label>الاسم الكامل<input name="full_name" id="dutyPersonName" maxlength="160" required></label><label>الفئة<select name="role" id="dutyPersonRole"><option value="teacher">معلمة</option><option value="administrative">إدارية</option></select></label><button class="btn btn-primary" type="submit">إضافة منفذة</button></form>
 <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>اسم المنفذة</th><th>الفئة</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${roster.map(p=>`<tr><td>${esc(p.full_name)}</td><td>${p.role==='administrative'?'إدارية':'معلمة'}</td><td>${p.active?'نشطة':'موقوفة'}</td><td><button class="reserve-mini" type="button" data-edit-person="${esc(p.id)}">تعديل</button></td></tr>`).join('')}</tbody></table></div></section>`}
function adminTab(tab){document.querySelectorAll('[data-dtab]').forEach(b=>b.classList.toggle('active',b.dataset.dtab===tab));const e=document.getElementById('dutyAdminWorkspace');if(!e)return;
 if(tab==='workspace'){workspace();return}
 if(tab==='settings'){e.innerHTML='<section class="surface panel"><h3>إعدادات المناوبة</h3><p>الحد الأقصى لكل فترة ٦ منفذات، والحد الأدنى للحفظ منفذة واحدة لكل فترة. الفسحة للإداريات فقط عند التوليد الآلي. لا استثناءات؛ ولا توجد لوحة تميز.</p><p>النشر الفردي وتأكيد الاطلاع والإحصائيات مستقلة تمامًا عن قسم الاحتياط.</p></section>';return}
 e.innerHTML=rosterPanel();e.querySelector('#dutyPersonForm').onsubmit=ev=>{ev.preventDefault();doAction(async()=>{const fd=new FormData(ev.currentTarget),name=String(fd.get('full_name')||'').trim(),role=fd.get('role');if(name.length<2)throw Error('الاسم قصير');const result=await fetch(BASE+'/rest/v1/mj_duty_people',{method:'POST',headers:{...headers(),Prefer:'return=minimal'},body:JSON.stringify({full_name:name,role,active:true})});if(!result.ok)throw Error('تعذر إضافة الاسم أو أنه موجود مسبقًا');await loadAdmin();log('أُضيف الاسم إلى القائمة.')})};
 e.querySelectorAll('[data-edit-person]').forEach(b=>b.onclick=()=>{const p=roster.find(x=>x.id===b.dataset.editPerson);if(!p)return;const name=prompt('تعديل الاسم الكامل:',p.full_name);if(name===null)return;const role=prompt('الفئة: teacher للمعلمة، administrative للإدارية',p.role);if(role===null)return;if(!['teacher','administrative'].includes(role)||name.trim().length<2){log('الاسم أو الفئة غير صالحين');return}doAction(async()=>{const resp=await fetch(BASE+'/rest/v1/mj_duty_people?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',headers:{...headers(),Prefer:'return=minimal'},body:JSON.stringify({full_name:name.trim(),role})});if(!resp.ok)throw Error('تعذر تحديث بيانات المنفذة');await loadAdmin();log('تم تعديل الاسم والتصنيف دون حذف تاريخ المناوبات')})});
}
async function doAction(fn,options={}){
 const feedback=options.status,button=options.button,globalStatus=document.getElementById('dutyStatus');
 if(busy){const msg='توجد عملية جارية، انتظري حتى تكتمل.';if(feedback)feedback.textContent=msg;if(globalStatus)globalStatus.textContent=msg;return false}
 busy=true;
 const originalLabel=button?.textContent;
 const label=options.pending||'جارٍ الحفظ...';
 if(button){button.disabled=true;button.textContent=label}
 if(feedback){feedback.textContent=label;feedback.classList.remove('error')}
 if(globalStatus)globalStatus.textContent=label;
 try{
   const result=await fn();
   if(result===false){if(globalStatus)globalStatus.textContent='أُلغيت العملية';return false}
   const success=options.success||'تم الحفظ';
   if(feedback?.isConnected)feedback.textContent=success;
   const live=document.getElementById('dutyStatus');if(live)live.textContent=success;
   return true
 }catch(e){
   const message='تعذر التنفيذ: '+(e?.message||e);log(message);
   const live=document.getElementById('dutyStatus');if(live)live.textContent=message;
   if(feedback?.isConnected){feedback.textContent=message;feedback.classList.add('error')}
   return false
 }finally{busy=false;if(button?.isConnected){button.disabled=false;button.textContent=originalLabel}}
}
async function loadPublic(requestDate=date,serial=refreshSequence){
 const results=await Promise.allSettled([rpc('mj_duty_public_day',{p_date:requestDate}),rpc('mj_duty_public_stats',{p_date:requestDate,p_month_start:monthStart(requestDate)})]);
 if(serial!==refreshSequence||requestDate!==date||!document.getElementById('mjDutyRoot'))return;
 if(results[0].status==='fulfilled'){dayTable(results[0].value)}
 else{dayTable({rows:[],published:false});const p=document.getElementById('dutyPublicTable');if(p)p.innerHTML='<p class="reserve-public-note duty-load-error">تعذر تحميل جدول هذا اليوم. يلزم تشغيل إعداد قاعدة بيانات المناوبة أولًا.</p>'}
 if(results[1].status==='fulfilled'){publicStats=results[1].value;renderStats(publicStats)}
 else{publicStats=null;const s=document.getElementById('dutyStats');if(s)s.innerHTML='<p class="reserve-public-note duty-load-error">تعذر تحميل الإحصائيات. تحققي من تنفيذ ملف قاعدة البيانات (الدالة mj_duty_public_stats) ثم أعيدي عرض التاريخ.</p>'}
 if(results[0].status==='rejected' && results[1].status==='rejected')log('تعذر تحميل بيانات المناوبة لهذا التاريخ. تأكدي من تفعيل ملف SQL في Supabase.');
}
async function loadAdmin(requestDate=date,serial=refreshSequence){if(!document.getElementById('dutyAdmin')||!session())return;
 try{const [r,a,l,h]=await Promise.all([api('mj_duty_people?select=id,full_name,role,active&order=full_name.asc',null,true),api('mj_duty_assignments?select=duty_date,slot,position,person_id,activation_status&duty_date=eq.'+requestDate+'&order=slot.asc,position.asc',null,true),api('mj_duty_links?select=duty_date,person_id,link_token,viewed_at&duty_date=eq.'+requestDate,null,true),api('mj_duty_assignments?select=duty_date,slot,person_id&order=duty_date.desc&limit=5000',null,true)]);
 if(serial!==refreshSequence||requestDate!==date||!document.getElementById('mjDutyRoot'))return;
 roster=r;assignments=a;links=l;history=h;adminTab(document.querySelector('[data-dtab].active')?.dataset.dtab||'workspace');
 }catch(e){if(serial===refreshSequence && requestDate===date)log('تعذر تحميل بيانات الإدارة لهذا اليوم: '+e.message)}
}
async function refresh(){if(!document.getElementById('mjDutyRoot'))return;
 const requestDate=date,serial=++refreshSequence;
 closeHijriCalendar();
 const label=document.getElementById('dutyDayLabel'),button=document.getElementById('dutyDateTrigger'),input=document.getElementById('dutyDate');
 if(label)label.textContent=dateLong(requestDate);
 if(button){button.textContent=dateLong(requestDate);button.setAttribute('aria-label','اختيار التاريخ الهجري: '+dateLong(requestDate))}
 if(input)input.value=requestDate;
 log('');publicStats=null;publicDayRows=[];published=false;assignments=[];links=[];history=[];
 const table=document.getElementById('dutyPublicTable'),stats=document.getElementById('dutyStats'),workspace=document.getElementById('dutyAdminWorkspace');
 if(table)table.textContent='جارٍ تحميل جدول التاريخ المحدد...';
 if(stats)stats.textContent='جارٍ تحميل إحصائيات التاريخ المحدد...';
 const loggedIn=Boolean(session());
 const panel=document.getElementById('dutyAdmin');
 if(workspace && loggedIn)workspace.textContent='جارٍ تحميل تكليفات وروابط التاريخ المحدد...';
 // Preserve the inline admin login if a date is changed before authentication.
 if(panel && !panel.hidden && !loggedIn && workspace && !workspace.querySelector('#dutyInlineLoginForm'))openDutyLogin();
 const preview=document.getElementById('dutyPreviewBackdrop');if(preview){preview.hidden=true;preview.innerHTML=''}
 // Load published state before admin cards so the edit controls appear reliably on iPhone and desktop.
 await loadPublic(requestDate,serial);
 if(loggedIn)await loadAdmin(requestDate,serial);
}
const dutyPublicationTitles={morning:'جدول المناوبة الصباحية',break:'جدول مناوبة الفسحة',end:'جدول مناوبة نهاية الدوام'};
function dutyPublicationPeriod(slot,rows){
 const title=dutyPublicationTitles[slot],selected=rows.filter(x=>x.slot===slot);
 // Render only the actual assigned personnel, never six empty placeholders or ditto marks.
 return `<section class="duty-sheet-period" data-print-slot="${esc(slot)}" aria-label="${esc(title)}"><h2>${esc(title)}</h2>
 <table class="duty-sheet-table"><thead><tr><th scope="col" class="duty-col-index">م</th><th scope="col">اسم المنفذة</th><th scope="col">حالة الاطلاع</th><th scope="col">حالة التفعيل</th><th scope="col">التوقيع</th></tr></thead>
 <tbody>${selected.map((x,i)=>`<tr><td class="duty-col-index">${i+1}</td><td>${esc(x.name)}</td><td>${x.viewed_at?'تم الاطلاع':'لم يتم الاطلاع'}</td><td>${x.activation_status==='تم التفعيل'?'تم التفعيل':'لم تفعل'}</td><td></td></tr>`).join('')}</tbody></table></section>`;
}
function sheetHTML(){
 const rows=published?(publicDayRows||[]):[];
 const acknowledged=rows.filter(x=>Boolean(x.viewed_at)).length;
 return `<div id="dutyPrintSheet" dir="rtl" lang="ar"><div class="duty-sheet-heading"><div><strong>الثانوية الرابعة والتسعون – مسارات</strong></div><h1>جدول النشر — المناوبة اليومية</h1><p><b>اليوم والتاريخ الهجري:</b> ${esc(dateLong(date))}</p></div>
 ${rows.length?SLOTS.map(([slot])=>dutyPublicationPeriod(slot,rows)).join(''):'<p class="duty-sheet-empty">لا توجد تكليفات منشورة لهذا اليوم.</p>'}
 <div class="duty-sheet-totals">${SLOTS.map(([k,n])=>`<span>${n}: <b>${rows.filter(r=>r.slot===k).length}</b></span>`).join('')}<span>الإجمالي: <b>${rows.length}</b></span><span>تم الاطلاع: <b>${acknowledged}</b></span></div></div>`;
}
let publicDayRows=[];
function installPrintPortal(){
 const old=document.getElementById('dutyPrintPortal');if(old)old.remove();
 const portal=document.createElement('div');portal.id='dutyPrintPortal';portal.setAttribute('aria-hidden','true');portal.innerHTML=sheetHTML();document.body.append(portal);
 return portal;
}

// Publication PDF export filename only; never change stored Gregorian schedule dates.
function dutyPublicationPdfFilename(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||"")))throw Error("تاريخ جدول النشر غير صالح");
  const dateValue=new Date(date+"T12:00:00+03:00");
  if(Number.isNaN(dateValue.getTime()))throw Error("تعذر تحديد التاريخ الهجري");
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{
    calendar:"islamic-umalqura",timeZone:"Asia/Riyadh",year:"numeric",month:"numeric",day:"numeric"
  }).formatToParts(dateValue).filter(x=>["day","month","year"].includes(x.type)).map(x=>[x.type,Number(x.value)]));
  if(!parts.day||!parts.month||!parts.year)throw Error("تعذر تحديد التاريخ الهجري");
  const weekday=new Intl.DateTimeFormat("ar-SA",{timeZone:"Asia/Riyadh",weekday:"long"}).format(dateValue).replace(/\s+/g,"_");
  return "جدول_نشر_المناوبة_"+weekday+"_"+String(parts.day).padStart(2,"0")+"-"+String(parts.month).padStart(2,"0")+"-"+parts.year+"هـ.pdf";
}
function dutyPrintStandalone(){
 const tab=window.open('','_blank');
 if(!tab){alert('المتصفح منع فتح صفحة الطباعة؛ اسمحي بفتح النوافذ المنبثقة.');return}
 const html='<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(dutyPublicationPdfFilename(date).replace(/\.pdf$/,""))+'</title><style>body{direction:rtl;text-align:right;color:#132f3a;background:#fff;font:13px Tahoma,Arial,sans-serif;margin:12px}.duty-sheet-heading{text-align:center}.duty-sheet-period{margin-top:14px;break-inside:avoid}.duty-sheet-period h2{font-size:16px}.duty-sheet-table{width:100%;border-collapse:collapse;table-layout:fixed}.duty-sheet-table th,.duty-sheet-table td{border:1px solid #9eb6be;padding:6px;overflow-wrap:anywhere;text-align:right}.duty-sheet-table th{background:#eaf5f4}.duty-col-index{width:7%}.duty-sheet-totals{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px}.printbar{text-align:center;margin:12px}.printbar button{padding:10px 22px;font:700 16px Tahoma;background:#edf6f5;border:1px solid #497d7c;border-radius:8px}@page{size:A4 portrait;margin:10mm}@media print{.printbar{display:none!important}body{margin:0;font-size:11px}.duty-sheet-period h2{font-size:13px}.duty-sheet-table th,.duty-sheet-table td{padding:4px}}</style></head><body><div class="printbar"><button onclick="window.print()">طباعة / حفظ PDF من الجهاز</button></div>'+sheetHTML()+'</body></html>';
 tab.document.open();tab.document.write(html);tab.document.close();tab.focus();
}
let dutyV18PdfPromise=null;
async function dutyV18DownloadPDF(){
 const button=document.getElementById('dutySavePDF'),page=document.querySelector('#dutyPreviewPageFrame #dutyPrintSheet');
 if(!page||!published||!publicDayRows.length){alert('لا يوجد جدول منشور صالح للتصدير.');return}
 if(button)button.disabled=true;
 let host=null;
 try{
  if(!window.html2pdf){
   if(!dutyV18PdfPromise)dutyV18PdfPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(Error('مكتبة PDF غير متاحة'));
    script.onerror=()=>reject(Error('تعذر تحميل أداة PDF'));document.head.append(script);
   }).catch(e=>{dutyV18PdfPromise=null;throw e});
   await dutyV18PdfPromise;
  }
  host=document.createElement('div');host.style.cssText='position:fixed;left:-20000px;top:0;width:186mm;background:#fff;z-index:-1;pointer-events:none';
  const print=page.cloneNode(true);print.removeAttribute('id');print.style.cssText='width:186mm;direction:rtl;text-align:right;font:11px/1.4 Tahoma,Arial,sans-serif;background:#fff;color:#153b46;transform:none';
  print.querySelectorAll('table').forEach(t=>{t.style.cssText='border-collapse:collapse;table-layout:fixed;width:100%'});
  print.querySelectorAll('th,td').forEach(t=>{t.style.cssText='border:1px solid #91aab2;padding:4px;text-align:right;overflow-wrap:anywhere;white-space:normal'});
  print.querySelectorAll('.duty-sheet-heading').forEach(t=>t.style.textAlign='center');
  print.querySelectorAll('.duty-sheet-period').forEach(t=>t.style.breakInside='avoid');
  host.append(print);document.body.append(host);
  await window.html2pdf().set({margin:[9,9,9,9],filename:dutyPublicationPdfFilename(date),image:{type:'jpeg',quality:0.98},html2canvas:{scale:1.8,backgroundColor:'#fff',scrollY:0,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(print).save();
 }catch(e){console.error('Duty PDF export',e);alert('تعذر التنزيل المباشر؛ استخدمي الطباعة ثم حفظ PDF من الجهاز.')}
 finally{host?.remove();if(button?.isConnected)button.disabled=false}
}

function dutyPrintNow(){dutyPrintStandalone()}
window.addEventListener('afterprint',()=>document.getElementById('dutyPrintPortal')?.remove());
window.addEventListener('beforeprint',()=>{
 if(document.getElementById('dutyPreviewBackdrop')&&!document.getElementById('dutyPreviewBackdrop').hidden && !document.getElementById('dutyPrintPortal'))installPrintPortal();
});
function resizeDutyPreview(){
 const frame=document.getElementById('dutyPreviewPageFrame'),page=document.querySelector('#dutyPreviewBackdrop #dutyPrintSheet');if(!frame||!page)return;
 const zoom=document.getElementById('dutyPreviewZoom');const manual=zoom?.dataset.mode==='actual';
 const width=Math.max(220,frame.clientWidth-4),natural=794;
 const scale=manual?1:Math.min(1,width/natural);
 page.style.width=natural+'px';page.style.minHeight='0';page.style.boxSizing='border-box';page.style.transformOrigin='top right';page.style.transform=`scale(${scale})`;
 frame.style.setProperty('--duty-preview-height',Math.ceil(page.scrollHeight*scale+8)+'px');
 if(zoom)zoom.textContent=manual?'ملاءمة الصفحة':'تكبير المعاينة';
}
window.addEventListener('resize',()=>requestAnimationFrame(resizeDutyPreview));
async function preview(printNow){const wrap=document.getElementById('dutyPreviewBackdrop');if(!wrap)return;
 const requestedDate=date,requestedSerial=refreshSequence;
 wrap.hidden=false;wrap.innerHTML='<section class="duty-preview" dir="rtl" role="status">جارٍ تحديث حالات الاطلاع وإعداد معاينة النشر...</section>';
 // Reload only public data and status; do not touch administrator edits or other dates.
 await loadPublic(requestedDate,requestedSerial);
 if(requestedDate!==date||requestedSerial!==refreshSequence||wrap.hidden)return;
 wrap.innerHTML=`<section class="duty-preview" role="dialog" aria-modal="true" aria-label="معاينة جدول النشر" dir="rtl"><div class="duty-preview-tools"><button class="btn btn-primary" type="button" id="dutyPrintGo">طباعة الجدول</button><button class="btn btn-ghost" type="button" id="dutySavePDF">حفظ PDF</button><button class="btn btn-ghost" type="button" id="dutyPreviewZoom">تكبير المعاينة</button><button class="btn btn-ghost" type="button" id="dutyPreviewClose">إغلاق</button></div><p class="duty-preview-hint">معاينة الصفحة الرسمية A4 — تعرض حالة الاطلاع المحدثة عند فتح المعاينة.</p><div class="duty-preview-page-frame" id="dutyPreviewPageFrame">${sheetHTML()}</div></section>`;
 wrap.querySelector('#dutyPreviewClose').onclick=()=>{wrap.hidden=true;wrap.innerHTML='';document.getElementById('dutyPrintPortal')?.remove()};
 wrap.querySelector('#dutyPrintGo').onclick=dutyPrintNow;
 wrap.querySelector('#dutySavePDF').onclick=dutyV18DownloadPDF;
 wrap.querySelector('#dutyPreviewZoom').onclick=e=>{e.currentTarget.dataset.mode=e.currentTarget.dataset.mode==='actual'?'fit':'actual';resizeDutyPreview()};
 requestAnimationFrame(resizeDutyPreview);
 // iOS Safari requires a direct press on print; offer the preview/print button instead of calling print after an async fetch.
}
// Keep the print dataset tied to the published, public and current date.
const _dayTable=dayTable;dayTable=function(data){
 publicDayRows=data?.rows||[];_dayTable(data);
 // Keep an already-open publication preview in sync when another person acknowledges.
 const frame=document.getElementById('dutyPreviewPageFrame');
 if(frame && document.getElementById('dutyPreviewBackdrop')?.hidden===false){
  frame.innerHTML=sheetHTML();
  requestAnimationFrame(resizeDutyPreview);
 }
};
async function publicLink(token){
 const view=root();if(!view)return;
 view.innerHTML=`<section class="mj-duty mj-duty-link-public surface panel" dir="rtl"><div class="duty-personal-head"><span class="kicker">المناوبة اليومية</span><h2>تأكيد الاطلاع على تكليف المناوبة</h2><p>الثانوية الرابعة والتسعون – مسارات</p></div><p id="dutyPublicMessage" role="status" aria-live="polite">جارٍ التحقق من الرابط الشخصي...</p><div id="dutyPublicControls"></div></section>`;
 const message=document.getElementById('dutyPublicMessage'),panel=document.getElementById('dutyPublicControls');
 try{
  const d=await rpc('mj_duty_link_view',{p_token:token});
  if(!message?.isConnected||!panel?.isConnected)return;
  if(!d||!d.name||!Array.isArray(d.slots)||!d.slots.length)throw Error('لا توجد تكليفات منشورة لهذا الرابط.');
  message.textContent='المكلفة: '+d.name+' | '+dateLong(d.date);
  panel.innerHTML=`<div class="duty-personal-slots">${d.slots.map(x=>`<p><strong>${esc(slotName(x.slot))}</strong> — التكليف رقم ${Number(x.position)}</p>`).join('')}</div>
  <p class="reserve-public-note">بعد مراجعة التكليفات، اضغطي الزر أدناه. يُسجَّل تاريخ ووقت اطلاعك تلقائيًا. لا تحتاجين لتسجيل الدخول.</p>
  <button class="btn btn-primary duty-ack-button" type="button" id="dutyAcknowledge" ${d.viewed_at?'disabled':''}>${d.viewed_at?'تم تأكيد الاطلاع':'تأكيد الاطلاع'}</button>
  <p id="dutyAckStatus" role="status" aria-live="polite">${d.viewed_at?'تم تسجيل اطلاعك بتاريخ '+esc(ackDateLabel(d.viewed_at)):''}</p>
  <a href="#daily-duty?date=${esc(d.date)}" class="btn btn-ghost duty-personal-return">العودة لجدول المناوبة</a>`;
  const button=panel.querySelector('#dutyAcknowledge'),status=panel.querySelector('#dutyAckStatus');
  button.onclick=async()=>{
   if(button.disabled)return;
   button.disabled=true;button.textContent='جارٍ تسجيل الاطلاع...';status.textContent='جارٍ حفظ التأكيد...';
   try{
    const ack=await rpc('mj_duty_ack',{p_token:token});
    if(ack?.acknowledged!==true)throw Error('لم تؤكد قاعدة البيانات تسجيل الاطلاع.');
    const verified=await rpc('mj_duty_link_view',{p_token:token});
    if(!verified?.viewed_at)throw Error('تعذر التحقق من حفظ وقت الاطلاع.');
    button.textContent='تم تأكيد الاطلاع';status.textContent='تم تسجيل اطلاعك بنجاح بتاريخ '+ackDateLabel(verified.viewed_at);
   }catch(e){button.disabled=false;button.textContent='إعادة محاولة تأكيد الاطلاع';status.textContent='تعذر تسجيل الاطلاع: '+(e?.message||e)}
  };
 }catch(e){if(message?.isConnected){message.textContent='تعذر عرض نموذج الاطلاع: '+(e?.message||e);panel.innerHTML='<p>اطلبي رابطًا شخصيًا جديدًا من الإدارة إذا انتهت صلاحية الرابط.</p>'}}
}
function route(){nav();const h=location.hash||'#home';if(h.startsWith('#duty-view?token=')){if(routeKey!==h||!document.querySelector('.mj-duty-link-public')){routeKey=h;publicLink(decodeURIComponent(h.slice('#duty-view?token='.length)))}return}
 if(/^#daily-duty(?:\?|$)/.test(h)){const value=/[?&]date=(\d{4}-\d{2}-\d{2})/.exec(h);if(routeKey!==h||!document.getElementById('mjDutyRoot')){if(value)date=value[1];routeKey=h;layout()}return}
 routeKey='';if(h==='#home'||h==='#')home();}
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;route()})}
function boot(){nav();const v=root();if(v)new MutationObserver(schedule).observe(v,{childList:true,subtree:false});window.addEventListener('hashchange',schedule);schedule()}
let dutyLastPublicPoll=0;
function dutyAutoUpdateAcknowledgements(){
 if(!document.getElementById('mjDutyRoot')||!location.hash.startsWith('#daily-duty')||document.visibilityState==='hidden'||busy)return;
 if(Date.now()-dutyLastPublicPoll<4000)return;
 dutyLastPublicPoll=Date.now();void loadPublic(date,refreshSequence);
 // Keep cross-device changes current without interrupting active admin edits.
 if(session() && !document.getElementById('dutyAdmin')?.hidden && document.getElementById('dutyLinks')){
  const requestDate=date,serial=refreshSequence;
  void Promise.all([
   api('mj_duty_links?select=duty_date,person_id,link_token,viewed_at&duty_date=eq.'+encodeURIComponent(requestDate),null,true),
   api('mj_duty_assignments?select=duty_date,slot,position,person_id,activation_status&duty_date=eq.'+encodeURIComponent(requestDate),null,true)
  ]).then(([freshLinks,freshAssignments])=>{
   if(serial!==refreshSequence||requestDate!==date||!document.getElementById('dutyLinks'))return;
   if(document.querySelector('.duty-v18-form:not([hidden])'))return;
   links=freshLinks;assignments=freshAssignments;linkPanel();
  }).catch(()=>{});
 }
}
window.addEventListener('focus',dutyAutoUpdateAcknowledgements);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')dutyAutoUpdateAcknowledgements()});
setInterval(dutyAutoUpdateAcknowledgements,5000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
