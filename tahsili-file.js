/* Manjaz 94 — Tahsili File, Google Drive URL only, v1.0
   Standalone: adds a card after Talent and a cloud-backed link section.
   No changes to existing Manjaz scripts or reserve logic.
*/
(()=>{"use strict";
  const KIND="tahsili_drive_link";
  const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
  const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
  const ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
  const HEADERS={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const isHome=()=>!location.hash||location.hash==="#home";
  const isTahsili=()=>location.hash==="#tahsili-file";
  const validDriveURL=value=>{
    try{const url=new URL(String(value||""));return url.protocol==="https:"&&
      (url.hostname==="drive.google.com"||url.hostname==="docs.google.com");}
    catch(_){return false;}
  };
  let records=[],busy=false,pending=false;
  function homeCard(){
    if(!isHome())return;
    const grid=document.querySelector("#manjazHome .manjaz-home-grid");
    if(!grid||grid.querySelector('[data-manjaz-tahsili-card="1"]'))return;
    const talent=[...grid.querySelectorAll(".manjaz-home-card")]
      .find(card=>!!card.querySelector('a[href="#talent"]'));
    if(!talent)return;
    const card=document.createElement("article");
    card.className="manjaz-home-card";
    card.dataset.manjazTahsiliCard="1";
    card.innerHTML=`<div class="manjaz-home-card-title">
      <span class="manjaz-home-icon" aria-hidden="true">▤</span><h3>ملف التحصيلي</h3>
      </div><div class="manjaz-home-actions">
      <a class="manjaz-home-action view" href="#tahsili-file">استعراض</a>
      <a class="manjaz-home-action add" href="#tahsili-file">إضافة</a></div>`;
    card.querySelector(".manjaz-home-action.add").addEventListener("click",()=>{
      try{sessionStorage.setItem("manjaz_home_open_add","tahsili-file");}catch(_){}
    });
    talent.insertAdjacentElement("afterend",card);
  }
  async function api(url,init={}){
    const response=await fetch(url,{headers:HEADERS,cache:"no-store",...init});
    if(!response.ok)throw new Error(`تعذر الاتصال بملف التحصيلي (${response.status})`);
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
      <span class="kicker">ملف التحصيلي</span><h2>ملف التحصيلي</h2>
      <p>استعراض ملف التحصيلي من Google Drive</p>
    </div></section>
    <div class="section-actions"><button type="button" class="btn btn-primary" id="tahsiliOpenForm">إضافة رابط درايف</button></div>
    <form id="tahsiliForm" class="surface form-card" style="display:none">
      <div class="form-section-title">رابط ملف التحصيلي</div>
      <div class="form-grid"><label class="wide">رابط Google Drive *
        <input id="tahsiliUrl" type="url" dir="ltr" inputmode="url" autocomplete="url"
          placeholder="https://drive.google.com/drive/folders/..." required>
      </label></div>
      <div class="form-actions"><button type="submit" class="btn btn-primary" id="tahsiliSave">حفظ الرابط</button>
        <button type="button" class="btn btn-ghost" id="tahsiliCancel">إلغاء</button></div>
      <div id="tahsiliMessage" role="status" aria-live="polite"></div>
    </form>
    <div id="tahsiliContent"></div>`;}
  function showLink(){
    const content=document.getElementById("tahsiliContent");
    const trigger=document.getElementById("tahsiliOpenForm");
    if(!content||!trigger)return;
    const link=String(records[0]?.data?.url||"");
    const hasLink=validDriveURL(link);
    trigger.textContent=hasLink?"تعديل رابط درايف":"إضافة رابط درايف";
    content.innerHTML=hasLink?
      `<article class="achievement-card"><span class="badge">ملف التحصيلي</span>
        <h3>ملف التحصيلي</h3>
        <div class="record-actions-grid">
          <a class="details-btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">استعراض الملف في Google Drive</a>
          <button class="record-delete-btn" type="button" id="tahsiliDelete">حذف الرابط</button>
        </div>
      </article>`:
      `<div class="surface empty-state"><h3>لم يُضف رابط ملف التحصيلي بعد</h3>
        <p>أضيفي رابط Google Drive من زر إضافة.</p></div>`;
    const deletion=document.getElementById("tahsiliDelete");
    if(deletion)deletion.onclick=async()=>{
      if(!confirm("هل تريدين حذف رابط ملف التحصيلي؟"))return;
      deletion.disabled=true;
      try{await deleteLink();await load();showLink();}
      catch(error){console.error(error);alert("تعذر حذف الرابط؛ أعيدي المحاولة.");deletion.disabled=false;}
    };
  }
  async function showPage(){
    if(!isTahsili()||busy)return;
    const view=document.getElementById("view");if(!view)return;
    busy=true;
    try{
      view.innerHTML=shell();
      const form=document.getElementById("tahsiliForm");
      const url=document.getElementById("tahsiliUrl");
      const open=document.getElementById("tahsiliOpenForm");
      const cancel=document.getElementById("tahsiliCancel");
      const save=document.getElementById("tahsiliSave");
      const msg=document.getElementById("tahsiliMessage");
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
      try{openFromHome=sessionStorage.getItem("manjaz_home_open_add")==="tahsili-file";}catch(_){}
      if(openFromHome){try{sessionStorage.removeItem("manjaz_home_open_add");}catch(_){}open.click();}
    }finally{busy=false;}
  }
  function sync(){if(isHome())homeCard();else if(isTahsili()&&!document.getElementById("tahsiliContent"))showPage();}
  function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;sync();},0);}
  addEventListener("hashchange",schedule);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
  // app.js and home-v3.js rebuild #view during navigation and cloud reloads.
  // Observe only this view and restore the card/section when they redraw it.
  const view=document.getElementById("view");
  if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
})();
