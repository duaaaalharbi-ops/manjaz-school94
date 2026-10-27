/* Manjaz 94 — Qudrat File, Google Drive URL only, v1.0
   Standalone: adds a card after Talent and a cloud-backed link section.
   No changes to existing Manjaz scripts or reserve logic.
*/
(()=>{"use strict";
  const KIND="qudrat_drive_link";
  const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
  const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
  const ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
  const HEADERS={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const isHome=()=>!location.hash||location.hash==="#home";
  const isQudrat=()=>location.hash==="#qudrat-file";
  const validDriveURL=value=>{
    try{const url=new URL(String(value||""));return url.protocol==="https:"&&
      (url.hostname==="drive.google.com"||url.hostname==="docs.google.com");}
    catch(_){return false;}
  };
  let records=[],busy=false,pending=false;
  function homeCard(){
    if(!isHome())return;
    const grid=document.querySelector("#manjazHome .manjaz-home-grid");
    if(!grid||grid.querySelector('[data-manjaz-qudrat-card="1"]'))return;
    const tahsili=[...grid.querySelectorAll(".manjaz-home-card")]
      .find(card=>!!card.querySelector('a[href="#tahsili-file"]'));
    if(!tahsili)return;
    const card=document.createElement("article");
    card.className="manjaz-home-card";
    card.dataset.manjazQudratCard="1";
    card.innerHTML=`<div class="manjaz-home-card-title">
      <span class="manjaz-home-icon" aria-hidden="true">▤</span><h3>ملف القدرات اللفظي</h3>
      </div><div class="manjaz-home-actions">
      <a class="manjaz-home-action view" href="#qudrat-file">استعراض</a>
      <a class="manjaz-home-action add" href="#qudrat-file">إضافة</a></div>`;
    card.querySelector(".manjaz-home-action.add").addEventListener("click",()=>{
      try{sessionStorage.setItem("manjaz_home_open_add","qudrat-file");}catch(_){}
    });
    tahsili.insertAdjacentElement("afterend",card);
  }
  async function api(url,init={}){
    const response=await fetch(url,{headers:HEADERS,cache:"no-store",...init});
    if(!response.ok)throw new Error(`تعذر الاتصال بملف القدرات (${response.status})`);
    return response.status===204?null:response.json();
  }
  async function load(){
    const query=new URLSearchParams({select:"id,kind,data,created_at",kind:`eq.${KIND}`,order:"created_at.desc"});
    const rows=await api(`${ENDPOINT}?${query}`);
    records=Array.isArray(rows)?rows:[];
  }
  async function saveLink(link){
    const now=new Date().toISOString();
    const payload={data:{url:link,updatedAt:now},status:"معتمد",updated_at:now};
    const current=records[0];
    if(current){
      const query=new URLSearchParams({id:`eq.${current.id}`,kind:`eq.${KIND}`});
      await api(`${ENDPOINT}?${query}`,{method:"PATCH",headers:{...HEADERS,"Prefer":"return=representation"},body:JSON.stringify(payload)});
    }else{
      await api(ENDPOINT,{method:"POST",headers:{...HEADERS,"Prefer":"return=representation"},body:JSON.stringify({...payload,kind:KIND})});
    }
  }
  async function deleteLink(){
    const current=records[0];if(!current)return;
    const query=new URLSearchParams({id:`eq.${current.id}`,kind:`eq.${KIND}`});
    await api(`${ENDPOINT}?${query}`,{method:"DELETE",headers:{...HEADERS,"Prefer":"return=minimal"}});
  }
  // بَيان: isolated large external-link card within ملف القدرات only.
  function ensureBayanStyle(){
    if(document.getElementById("manjazBayanVerbalStyle"))return;
    const style=document.createElement("style");
    style.id="manjazBayanVerbalStyle";
    style.textContent="\n#manjazBayanVerbal{box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;gap:12px;width:100%;min-width:0;min-height:264px;margin:16px 0 20px;padding:22px 20px;border:1px solid #cfdfdb;border-top:3px solid #238581;border-radius:18px;background:linear-gradient(135deg,#fff 8%,#f0faf7 100%);color:#173d48;text-decoration:none!important;box-shadow:0 8px 19px rgba(18,54,76,.08);-webkit-tap-highlight-color:transparent;transition:box-shadow .15s ease,transform .15s ease}\n#manjazBayanVerbal:hover{box-shadow:0 12px 26px rgba(18,54,76,.13);transform:translateY(-1px)}\n#manjazBayanVerbal:focus-visible{outline:3px solid #258a86;outline-offset:3px}\n#manjazBayanVerbal .mj-bayan-brand{display:flex;gap:13px;align-items:center;min-width:0}\n#manjazBayanVerbal .mj-bayan-icon{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;border-radius:13px;background:#dcefeb;color:#146d69;font-size:26px;font-weight:700}\n#manjazBayanVerbal .mj-bayan-name{margin:0;font-size:27px;font-weight:650;line-height:1.4;letter-spacing:normal;color:#173d48}\n#manjazBayanVerbal .mj-bayan-subtitle{margin:3px 0 0;color:#4b7570;font-size:13px;font-weight:600;line-height:1.6}\n#manjazBayanVerbal .mj-bayan-topic{font-size:18px;font-weight:800;color:#1e5552;line-height:1.5}\n#manjazBayanVerbal .mj-bayan-cta{box-sizing:border-box;min-height:45px;width:100%;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#0b7777;color:#fff;font-size:14px;font-weight:800;line-height:1.25}\n@media(max-width:430px){#manjazBayanVerbal{min-height:250px;padding:17px 14px;margin:12px 0 17px}#manjazBayanVerbal .mj-bayan-icon{width:42px;height:42px;flex-basis:42px;font-size:23px}#manjazBayanVerbal .mj-bayan-name{font-size:25px}#manjazBayanVerbal .mj-bayan-subtitle{font-size:12px}#manjazBayanVerbal .mj-bayan-topic{font-size:16px}}\n";
    document.head.appendChild(style);
  }
  function shell(){return `
    <section class="page-intro"><div>
      <span class="kicker">ملف القدرات</span><h2>ملف القدرات</h2>
      <p>استعراض ملف القدرات من Google Drive</p>
    </div></section>
    <a id="manjazBayanVerbal" href="https://bayan-verbal-boost.lovable.app" target="_blank" rel="noopener noreferrer" aria-label="استعراض بَيان منصة التدريب الرقمي القسم اللفظي">
      <div class="mj-bayan-brand">
        <span class="mj-bayan-icon" aria-hidden="true">ب</span>
        <div><h3 class="mj-bayan-name">بَيان</h3><p class="mj-bayan-subtitle">منصة التدريب الرقمي</p></div>
      </div>
      <div class="mj-bayan-topic">القسم اللفظي</div>
      <span class="mj-bayan-cta">استعراض</span>
    </a>
    <button type="button" id="qudratOpenForm" hidden style="display:none!important" tabindex="-1" aria-hidden="true">إضافة رابط درايف</button>
    <form id="qudratForm" class="surface form-card" style="display:none">
      <div class="form-section-title">رابط ملف القدرات</div>
      <div class="form-grid"><label class="wide">رابط Google Drive *
        <input id="qudratUrl" type="url" dir="ltr" inputmode="url" autocomplete="url"
          placeholder="https://drive.google.com/drive/folders/..." required>
      </label></div>
      <div class="form-actions"><button type="submit" class="btn btn-primary" id="qudratSave">حفظ الرابط</button>
        <button type="button" class="btn btn-ghost" id="qudratCancel">إلغاء</button></div>
      <div id="qudratMessage" role="status" aria-live="polite"></div>
    </form>
    <div id="qudratContent"></div>`;}
  function showLink(){
    const content=document.getElementById("qudratContent");
    const trigger=document.getElementById("qudratOpenForm");
    if(!content||!trigger)return;
    const link=String(records[0]?.data?.url||"");
    const hasLink=validDriveURL(link);
    trigger.textContent=hasLink?"تعديل رابط درايف":"إضافة رابط درايف";
    // Always preserve the previous Qudrat / Google Drive card, including when the
    // database has no saved URL. Bayan remains above this card on the page.
    content.innerHTML=hasLink?
      `<article class="achievement-card" data-qudrat-drive-card="1"><span class="badge">ملف القدرات</span>
        <h3>ملف القدرات</h3>
        <div class="record-actions-grid">
          <a class="details-btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">استعراض الملف في Google Drive</a>
          <button class="record-delete-btn" type="button" id="qudratDelete">حذف الرابط</button>
        </div>
      </article>`:
      `<article class="achievement-card" data-qudrat-drive-card="1"><span class="badge">ملف القدرات</span>
        <h3>ملف القدرات</h3>
        <p>لا يوجد رابط Google Drive محفوظ حاليًا. أعيدي إضافة الرابط السابق لإظهار زر استعراض الملف.</p>
        <div class="record-actions-grid">
          <button class="details-btn" type="button" id="qudratRestoreLink">إضافة رابط ملف القدرات</button>
        </div>
      </article>`;
    const restore=document.getElementById("qudratRestoreLink");
    if(restore)restore.onclick=()=>trigger.click();
    const deletion=document.getElementById("qudratDelete");
    if(deletion)deletion.onclick=async()=>{
      if(!confirm("هل تريدين حذف رابط ملف القدرات؟"))return;
      deletion.disabled=true;
      try{await deleteLink();await load();showLink();}
      catch(error){console.error(error);alert("تعذر حذف الرابط؛ أعيدي المحاولة.");deletion.disabled=false;}
    };
  }
  async function showPage(){
    if(!isQudrat()||busy)return;
    const view=document.getElementById("view");if(!view)return;
    busy=true;
    try{
      ensureBayanStyle();
      view.innerHTML=shell();
      const form=document.getElementById("qudratForm");
      const url=document.getElementById("qudratUrl");
      const open=document.getElementById("qudratOpenForm");
      const cancel=document.getElementById("qudratCancel");
      const save=document.getElementById("qudratSave");
      const msg=document.getElementById("qudratMessage");
      open.onclick=()=>{
        url.value=records[0]?.data?.url||"";
        form.style.display="block";msg.textContent="";url.focus();
      };
      cancel.onclick=()=>{form.style.display="none";msg.textContent="";};
      form.onsubmit=async event=>{
        event.preventDefault();
        const value=url.value.trim();
        if(!validDriveURL(value)){
          msg.textContent="يُقبل رابط Google Drive أو مستند Google Docs فقط.";url.focus();return;
        }
        save.disabled=true;msg.textContent="جارٍ حفظ الرابط...";
        try{await saveLink(value);await load();showLink();form.style.display="none";msg.textContent="";}
        catch(error){console.error(error);msg.textContent="تعذر حفظ الرابط، حاولي مرة أخرى.";}
        finally{save.disabled=false;}
      };
      try{await load();showLink();}
      catch(error){console.error(error);msg.textContent="تعذر تحميل الرابط حاليًا.";records=[];showLink();}
      let openFromHome=false;
      try{openFromHome=sessionStorage.getItem("manjaz_home_open_add")==="qudrat-file";}catch(_){}
      if(openFromHome){try{sessionStorage.removeItem("manjaz_home_open_add");}catch(_){}open.click();}
    }finally{busy=false;}
  }
  function sync(){if(isHome())homeCard();else if(isQudrat()&&!document.getElementById("qudratContent"))showPage();}
  function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;sync();},0);}
  addEventListener("hashchange",schedule);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
  // app.js and home-v3.js rebuild #view during navigation and cloud reloads.
  // Observe only this view and restore the card/section when they redraw it.
  const view=document.getElementById("view");
  if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
})();


/* Independent quantitative Drive file; existing verbal page is unchanged. */
(()=>{"use strict";
  const KIND="qudrat-quant_drive_link";
  const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
  const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
  const ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
  const HEADERS={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const isHome=()=>!location.hash||location.hash==="#home";
  const isQudrat=()=>location.hash==="#qudrat-quant-file";
  const validDriveURL=value=>{
    try{const url=new URL(String(value||""));return url.protocol==="https:"&&
      (url.hostname==="drive.google.com"||url.hostname==="docs.google.com");}
    catch(_){return false;}
  };
  let records=[],busy=false,pending=false;
  function homeCard(){
    if(!isHome())return;
    const grid=document.querySelector("#manjazHome .manjaz-home-grid");
    if(!grid||grid.querySelector('[data-manjaz-qudrat-quant-card="1"]'))return;
    const tahsili=grid.querySelector('[data-manjaz-qudrat-card="1"]');
    if(!tahsili)return;
    const card=document.createElement("article");
    card.className="manjaz-home-card";
    card.setAttribute("data-manjaz-qudrat-quant-card","1");
    card.innerHTML=`<div class="manjaz-home-card-title">
      <span class="manjaz-home-icon" aria-hidden="true">▤</span><h3>ملف القدرات الكمي</h3>
      </div><div class="manjaz-home-actions">
      <a class="manjaz-home-action view" href="#qudrat-quant-file">استعراض</a>
      <a class="manjaz-home-action add" href="#qudrat-quant-file">إضافة</a></div>`;
    card.querySelector(".manjaz-home-action.add").addEventListener("click",()=>{
      try{sessionStorage.setItem("manjaz_home_open_add","qudrat-quant-file");}catch(_){}
    });
    tahsili.insertAdjacentElement("afterend",card);
  }
  async function api(url,init={}){
    const response=await fetch(url,{headers:HEADERS,cache:"no-store",...init});
    if(!response.ok)throw new Error(`تعذر الاتصال بملف القدرات الكمي (${response.status})`);
    return response.status===204?null:response.json();
  }
  async function load(){
    const query=new URLSearchParams({select:"id,kind,data,created_at",kind:`eq.${KIND}`,order:"created_at.desc"});
    const rows=await api(`${ENDPOINT}?${query}`);
    records=Array.isArray(rows)?rows:[];
  }
  async function saveLink(link){
    const now=new Date().toISOString();
    const payload={data:{url:link,updatedAt:now},status:"معتمد",updated_at:now};
    const current=records[0];
    if(current){
      const query=new URLSearchParams({id:`eq.${current.id}`,kind:`eq.${KIND}`});
      await api(`${ENDPOINT}?${query}`,{method:"PATCH",headers:{...HEADERS,"Prefer":"return=representation"},body:JSON.stringify(payload)});
    }else{
      await api(ENDPOINT,{method:"POST",headers:{...HEADERS,"Prefer":"return=representation"},body:JSON.stringify({...payload,kind:KIND})});
    }
  }
  async function deleteLink(){
    const current=records[0];if(!current)return;
    const query=new URLSearchParams({id:`eq.${current.id}`,kind:`eq.${KIND}`});
    await api(`${ENDPOINT}?${query}`,{method:"DELETE",headers:{...HEADERS,"Prefer":"return=minimal"}});
  }
  function shell(){return `
    <section class="page-intro"><div>
      <span class="kicker">ملف القدرات الكمي</span><h2>ملف القدرات الكمي</h2>
      <p>استعراض ملف القدرات الكمي من Google Drive</p>
    </div></section>
    <button type="button" id="qudrat-quantOpenForm">إضافة رابط درايف</button>
    <form id="qudrat-quantForm" class="surface form-card" style="display:none">
      <div class="form-section-title">رابط ملف القدرات الكمي</div>
      <div class="form-grid"><label class="wide">رابط Google Drive *
        <input id="qudrat-quantUrl" type="url" dir="ltr" inputmode="url" autocomplete="url"
          placeholder="https://drive.google.com/drive/folders/..." required>
      </label></div>
      <div class="form-actions"><button type="submit" class="btn btn-primary" id="qudrat-quantSave">حفظ الرابط</button>
        <button type="button" class="btn btn-ghost" id="qudrat-quantCancel">إلغاء</button></div>
      <div id="qudrat-quantMessage" role="status" aria-live="polite"></div>
    </form>
    <div id="qudrat-quantContent"></div>`;}
  function showLink(){
    const content=document.getElementById("qudrat-quantContent");
    const trigger=document.getElementById("qudrat-quantOpenForm");
    if(!content||!trigger)return;
    const link=String(records[0]?.data?.url||"");
    const hasLink=validDriveURL(link);
    trigger.textContent=hasLink?"تعديل رابط درايف":"إضافة رابط درايف";
    // Always preserve the previous Qudrat / Google Drive card, including when the
    // database has no saved URL. Bayan remains above this card on the page.
    content.innerHTML=hasLink?
      `<article class="achievement-card" data-qudrat-quant-drive-card="1"><span class="badge">ملف القدرات الكمي</span>
        <h3>ملف القدرات الكمي</h3>
        <div class="record-actions-grid">
          <a class="details-btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">استعراض الملف في Google Drive</a>
          <button class="record-delete-btn" type="button" id="qudrat-quantDelete">حذف الرابط</button>
        </div>
      </article>`:
      `<article class="achievement-card" data-qudrat-quant-drive-card="1"><span class="badge">ملف القدرات الكمي</span>
        <h3>ملف القدرات الكمي</h3>
        <p>لا يوجد رابط Google Drive محفوظ حاليًا. أعيدي إضافة الرابط السابق لإظهار زر استعراض الملف.</p>
        <div class="record-actions-grid">
          <button class="details-btn" type="button" id="qudrat-quantRestoreLink">إضافة رابط ملف القدرات الكمي</button>
        </div>
      </article>`;
    const restore=document.getElementById("qudrat-quantRestoreLink");
    if(restore)restore.onclick=()=>trigger.click();
    const deletion=document.getElementById("qudrat-quantDelete");
    if(deletion)deletion.onclick=async()=>{
      if(!confirm("هل تريدين حذف رابط ملف القدرات الكمي؟"))return;
      deletion.disabled=true;
      try{await deleteLink();await load();showLink();}
      catch(error){console.error(error);alert("تعذر حذف الرابط؛ أعيدي المحاولة.");deletion.disabled=false;}
    };
  }
  async function showPage(){
    if(!isQudrat()||busy)return;
    const view=document.getElementById("view");if(!view)return;
    busy=true;
    try{
      view.innerHTML=shell();
      const form=document.getElementById("qudrat-quantForm");
      const url=document.getElementById("qudrat-quantUrl");
      const open=document.getElementById("qudrat-quantOpenForm");
      const cancel=document.getElementById("qudrat-quantCancel");
      const save=document.getElementById("qudrat-quantSave");
      const msg=document.getElementById("qudrat-quantMessage");
      open.onclick=()=>{
        url.value=records[0]?.data?.url||"";
        form.style.display="block";msg.textContent="";url.focus();
      };
      cancel.onclick=()=>{form.style.display="none";msg.textContent="";};
      form.onsubmit=async event=>{
        event.preventDefault();
        const value=url.value.trim();
        if(!validDriveURL(value)){
          msg.textContent="يُقبل رابط Google Drive أو مستند Google Docs فقط.";url.focus();return;
        }
        save.disabled=true;msg.textContent="جارٍ حفظ الرابط...";
        try{await saveLink(value);await load();showLink();form.style.display="none";msg.textContent="";}
        catch(error){console.error(error);msg.textContent="تعذر حفظ الرابط، حاولي مرة أخرى.";}
        finally{save.disabled=false;}
      };
      try{await load();showLink();}
      catch(error){console.error(error);msg.textContent="تعذر تحميل الرابط حاليًا.";records=[];showLink();}
      let openFromHome=false;
      try{openFromHome=sessionStorage.getItem("manjaz_home_open_add")==="qudrat-quant-file";}catch(_){}
      if(openFromHome){try{sessionStorage.removeItem("manjaz_home_open_add");}catch(_){}open.click();}
    }finally{busy=false;}
  }
  function sync(){if(isHome())homeCard();else if(isQudrat()&&!document.getElementById("qudrat-quantContent"))showPage();}
  function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;sync();},0);}
  addEventListener("hashchange",schedule);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
  // app.js and home-v3.js rebuild #view during navigation and cloud reloads.
  // Observe only this view and restore the card/section when they redraw it.
  const view=document.getElementById("view");
  if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
})();
