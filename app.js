
const STORE = "manjaz_achievements_v2";
const AWARDS_STORE = "manjaz_awards_v1";
const PARTNERS_STORE = "manjaz_partners_v1";

function getItems(){
  try { return JSON.parse(localStorage.getItem(STORE) || "[]"); }
  catch { return []; }
}
function saveItems(items){ localStorage.setItem(STORE, JSON.stringify(items)); }
function getAwards(){ try { return JSON.parse(localStorage.getItem(AWARDS_STORE) || "[]"); } catch { return []; } }
function saveAwards(items){ localStorage.setItem(AWARDS_STORE, JSON.stringify(items)); }
function getPartners(){ try { return JSON.parse(localStorage.getItem(PARTNERS_STORE) || "[]"); } catch { return []; } }
function savePartners(items){ localStorage.setItem(PARTNERS_STORE, JSON.stringify(items)); }

const MEDIA_DB = "manjaz_media_v1";
const MEDIA_STORE = "files";

function openMediaDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(MEDIA_DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(MEDIA_STORE)){
        const store=db.createObjectStore(MEDIA_STORE,{keyPath:"id",autoIncrement:true});
        store.createIndex("parentKey","parentKey",{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function saveSelectedFiles(parentKey, imageFiles=[], docFiles=[]){
  const files=[
    ...Array.from(imageFiles||[]).map(file=>({parentKey,kind:"image",name:file.name,type:file.type||"image/*",blob:file,createdAt:new Date().toISOString()})),
    ...Array.from(docFiles||[]).map(file=>({parentKey,kind:"document",name:file.name,type:file.type||"application/octet-stream",blob:file,createdAt:new Date().toISOString()}))
  ];
  if(!files.length) return;
  const db=await openMediaDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readwrite");
    const store=tx.objectStore(MEDIA_STORE);
    files.forEach(f=>store.add(f));
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

async function getMedia(parentKey){
  const db=await openMediaDB();
  const rows=await new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readonly");
    const idx=tx.objectStore(MEDIA_STORE).index("parentKey");
    const req=idx.getAll(parentKey);
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
  db.close();
  return rows;
}

function parentKey(kind,id){ return `${kind}:${id}`; }
function mediaURL(row){ return URL.createObjectURL(row.blob); }

async function hydrateCover(el,kind,id){
  if(!el) return;
  try{
    const rows=await getMedia(parentKey(kind,id));
    const image=rows.find(r=>r.kind==="image");
    if(image){
      el.innerHTML="";
      const img=document.createElement("img");
      img.src=mediaURL(image);
      img.alt="صورة الغلاف";
      el.appendChild(img);
    }
  }catch(err){ console.warn("media cover",err); }
}

function getRecord(kind,id){
  const list = kind==="achievement" ? getItems() : kind==="award" ? getAwards() : getPartners();
  return list.find(x=>String(x.id)===String(id));
}

const placeholders = {
  reports:"التقارير والإحصاءات",
  awards:"التكريمات والحوافز",
  partners:"الشراكات",
  settings:"الإعدادات"
};

function clone(id){ return document.getElementById(id).content.cloneNode(true); }

function setActive(route){
  document.querySelectorAll("#nav a").forEach(a=>{
    a.classList.toggle("active", a.dataset.route === route);
  });
  document.querySelectorAll(".mobile-nav a").forEach(a=>{
    const isActive = a.dataset.mobileRoute === route;
    a.style.opacity = isActive ? "1" : ".72";
  });
}

function render(){
  const route = (location.hash || "#home").slice(1);
  const view = document.getElementById("view");
  view.innerHTML = "";
  setActive(route);

  if(route==="home"){
    view.appendChild(clone("homeTpl"));
    const items=getItems();
    byId("mTotal").textContent=items.length;
    byId("mApproved").textContent=items.filter(x=>x.status==="معتمد").length;
    byId("mReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
  } else if(route==="about"){
    view.appendChild(clone("aboutTpl"));
  } else if(route==="add"){
    view.appendChild(clone("addTpl"));
    wireForm();
  } else if(route==="achievements"){
    view.appendChild(clone("achievementsTpl"));
    wireAchievements();
  } else if(route==="admin"){
    view.appendChild(clone("adminTpl"));
    wireAdmin();
  } else if(route==="awards"){
    view.appendChild(clone("awardsTpl"));
    wireAwards();
  } else if(route==="partners"){
    view.appendChild(clone("partnersTpl"));
    wirePartners();
  } else if(route==="reports"){
    view.appendChild(clone("reportsTpl"));
    wireReports();
  } else {
    view.appendChild(clone("placeholderTpl"));
    byId("placeholderTitle").textContent=placeholders[route] || "قريبًا";
  }
}

function wireForm(){
  const form=byId("achievementForm");
  const msg=byId("formMsg");
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const id=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const item={
      id,
      title:fd.get("title"),
      category:fd.get("category"),
      date:fd.get("date"),
      entity:fd.get("entity"),
      team:fd.get("team"),
      audience:fd.get("audience"),
      beneficiaries:fd.get("beneficiaries"),
      type:fd.get("type"),
      goal:fd.get("goal"),
      description:fd.get("description"),
      impact:fd.get("impact"),
      link:fd.get("link"),
      status:"تحت المراجعة",
      createdAt:new Date().toISOString()
    };
    const items=getItems(); items.unshift(item); saveItems(items);
    try{
      await saveSelectedFiles(parentKey("achievement",id),form.elements.images?.files,form.elements.documents?.files);
      form.reset();
      msg.className="success";
      msg.textContent="تم حفظ المنجز والمرفقات وإرساله للمراجعة بنجاح";
    }catch(err){
      msg.className="success";
      msg.textContent="تم حفظ المنجز، لكن تعذر حفظ بعض المرفقات على هذا الجهاز";
      console.error(err);
    }
  });
}

function wireAchievements(){
  const search=byId("searchAchievements");
  const cat=byId("filterCategory");
  const status=byId("filterStatus");
  [search,cat,status].forEach(el=>el.addEventListener("input",draw));

  function draw(){
    const all=getItems();
    byId("aTotal").textContent=all.length;
    byId("aApproved").textContent=all.filter(x=>x.status==="معتمد").length;
    byId("aReview").textContent=all.filter(x=>x.status==="تحت المراجعة").length;

    const q=search.value.trim();
    const items=all.filter(x =>
      (!q || [x.title,x.description,x.team,x.entity,x.impact].join(" ").includes(q)) &&
      (!cat.value || x.category===cat.value) &&
      (!status.value || x.status===status.value)
    );

    const list=byId("achievementList");
    const empty=byId("emptyState");
    list.innerHTML="";
    empty.style.display=items.length ? "none" : "block";

    items.forEach(x=>{
      const card=document.createElement("article");
      card.className="achievement-card";
      card.dataset.kind="achievement";
      card.dataset.id=x.id;
      card.innerHTML=`
        <div class="card-cover"><div class="card-cover-placeholder">لا توجد صورة غلاف بعد</div></div>
        <span class="badge">${esc(x.status)}</span>
        <h3>${esc(x.title)}</h3>
        <div class="meta">
          <span>${esc(x.category)}</span>
          <span>${esc(x.date)}</span>
          <span>المنفذة: ${esc(x.team)}</span>
          <span>المستفيدات: ${esc(x.beneficiaries || "—")}</span>
        </div>
        <p>${esc(x.impact)}</p>
        <span class="card-open">عرض التفاصيل ←</span>
      `;
      card.addEventListener("click",()=>openDetails("achievement",x.id));
      list.appendChild(card);
      hydrateCover(card.querySelector(".card-cover"),"achievement",x.id);
    });
  }
  draw();
}

function wireAdmin(){
  const a=getItems(), w=getAwards(), p=getPartners();
  const items=[
    ...a.map(x=>({...x,_kind:"منجز",_mediaKind:"achievement"})),
    ...w.map(x=>({...x,_kind:"تكريم",_mediaKind:"award"})),
    ...p.map(x=>({...x,_kind:"شراكة",_mediaKind:"partner"}))
  ];
  byId("dNew").textContent=0;
  byId("dReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
  byId("dApproved").textContent=items.filter(x=>x.status==="معتمد").length;
  const list=byId("adminList");
  const empty=byId("adminEmpty");
  const reviewItems=items.filter(x=>x.status==="تحت المراجعة");
  empty.style.display=reviewItems.length ? "none" : "block";

  reviewItems.forEach(x=>{
    const row=document.createElement("div");
    row.className="admin-item";
    row.innerHTML=`
      <div class="admin-thumb"><span></span></div>
      <div>
        <h4>${esc(x.title)}</h4>
        <p>${esc(x._kind)} • ${esc(x.category || x.type || "")} • ${esc(x.team || x.recipient || x.partner || "")} • ${esc(x.date || x.startDate || "")}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn view-record" data-id="${esc(x.id)}" data-media-kind="${esc(x._mediaKind)}">عرض</button>
        <button class="small-btn approve" data-id="${esc(x.id)}" data-kind="${esc(x._kind)}">اعتماد</button>
      </div>
    `;
    list.appendChild(row);
    hydrateCover(row.querySelector(".admin-thumb"),x._mediaKind,x.id);
  });

  list.querySelectorAll(".view-record").forEach(btn=>{
    btn.addEventListener("click",()=>openDetails(btn.dataset.mediaKind,btn.dataset.id));
  });
  list.querySelectorAll(".approve").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const kind=btn.dataset.kind, id=btn.dataset.id;
      if(kind==="منجز"){ const all=getItems(); const item=all.find(x=>x.id===id); if(item)item.status="معتمد"; saveItems(all); }
      if(kind==="تكريم"){ const all=getAwards(); const item=all.find(x=>x.id===id); if(item)item.status="معتمد"; saveAwards(all); }
      if(kind==="شراكة"){ const all=getPartners(); const item=all.find(x=>x.id===id); if(item)item.status="معتمد"; savePartners(all); }
      render();
    });
  });
}

function wireAwards(){
  const form=byId("awardForm");
  const show=byId("showAwardForm");
  const cancel=byId("cancelAward");
  const msg=byId("awardMsg");
  show.addEventListener("click",()=>form.style.display="block");
  cancel.addEventListener("click",()=>{form.reset();form.style.display="none";});
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const id=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const item={
      id,
      title:fd.get("title"), type:fd.get("type"), grantor:fd.get("grantor"),
      recipient:fd.get("recipient"), date:fd.get("date"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      reason:fd.get("reason"), impact:fd.get("impact"),
      status:"تحت المراجعة", createdAt:new Date().toISOString()
    };
    const items=getAwards(); items.unshift(item); saveAwards(items);
    try{
      await saveSelectedFiles(parentKey("award",id),form.elements.images?.files,form.elements.documents?.files);
      msg.className="success"; msg.textContent="تم حفظ التكريم والمرفقات وإرساله للمراجعة بنجاح";
    }catch(err){
      msg.className="success"; msg.textContent="تم حفظ التكريم، لكن تعذر حفظ بعض المرفقات على هذا الجهاز";
    }
    form.reset(); form.style.display="none"; drawAwards();
  });
  drawAwards();

  function drawAwards(){
    const items=getAwards();
    byId("awTotal").textContent=items.length;
    byId("awApproved").textContent=items.filter(x=>x.status==="معتمد").length;
    byId("awReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
    const list=byId("awardList"), empty=byId("awardEmpty");
    list.innerHTML=""; empty.style.display=items.length?"none":"block";
    items.forEach(x=>{
      const card=document.createElement("article");
      card.className="achievement-card";
      card.innerHTML=`<div class="card-cover"><div class="card-cover-placeholder">لا توجد صورة غلاف بعد</div></div>
      <span class="badge">${esc(x.status)}</span><h3>${esc(x.title)}</h3>
      <div class="meta"><span>${esc(x.type)}</span><span>${esc(x.grantor)}</span><span>${esc(x.recipient)}</span><span>${esc(x.date)}</span></div>
      <p>${esc(x.reason)}</p><span class="card-open">عرض التفاصيل ←</span>`;
      card.addEventListener("click",()=>openDetails("award",x.id));
      list.appendChild(card);
      hydrateCover(card.querySelector(".card-cover"),"award",x.id);
    });
  }
}

function wirePartners(){
  const form=byId("partnerForm");
  const show=byId("showPartnerForm");
  const cancel=byId("cancelPartner");
  const msg=byId("partnerMsg");
  show.addEventListener("click",()=>form.style.display="block");
  cancel.addEventListener("click",()=>{form.reset();form.style.display="none";});
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const id=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const item={
      id,
      title:fd.get("title"), partner:fd.get("partner"), type:fd.get("type"),
      startDate:fd.get("startDate"), endDate:fd.get("endDate"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      goal:fd.get("goal"), description:fd.get("description"), impact:fd.get("impact"),
      status:"تحت المراجعة", createdAt:new Date().toISOString()
    };
    const items=getPartners(); items.unshift(item); savePartners(items);
    try{
      await saveSelectedFiles(parentKey("partner",id),form.elements.images?.files,form.elements.documents?.files);
      msg.className="success"; msg.textContent="تم حفظ الشراكة والمرفقات وإرسالها للمراجعة بنجاح";
    }catch(err){
      msg.className="success"; msg.textContent="تم حفظ الشراكة، لكن تعذر حفظ بعض المرفقات على هذا الجهاز";
    }
    form.reset(); form.style.display="none"; drawPartners();
  });
  drawPartners();

  function drawPartners(){
    const items=getPartners();
    byId("ptTotal").textContent=items.length;
    byId("ptApproved").textContent=items.filter(x=>x.status==="معتمد").length;
    byId("ptReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
    const list=byId("partnerList"), empty=byId("partnerEmpty");
    list.innerHTML=""; empty.style.display=items.length?"none":"block";
    items.forEach(x=>{
      const card=document.createElement("article");
      card.className="achievement-card";
      card.innerHTML=`<div class="card-cover"><div class="card-cover-placeholder">لا توجد صورة غلاف بعد</div></div>
      <span class="badge">${esc(x.status)}</span><h3>${esc(x.title)}</h3>
      <div class="meta"><span>${esc(x.partner)}</span><span>${esc(x.type)}</span><span>${esc(x.startDate)}</span><span>المستفيدات: ${esc(x.beneficiaries||0)}</span></div>
      <p>${esc(x.impact)}</p><span class="card-open">عرض التفاصيل ←</span>`;
      card.addEventListener("click",()=>openDetails("partner",x.id));
      list.appendChild(card);
      hydrateCover(card.querySelector(".card-cover"),"partner",x.id);
    });
  }
}

function wireReports(){
  const a=getItems(), w=getAwards(), p=getPartners();
  const all=[...a,...w,...p];
  const total=all.length;
  const approved=all.filter(x=>x.status==="معتمد").length;
  const review=all.filter(x=>x.status==="تحت المراجعة").length;
  const beneficiaries=all.reduce((s,x)=>s+Number(x.beneficiaries||0),0);
  byId("rAll").textContent=total;
  byId("rAchievements").textContent=a.length;
  byId("rAwards").textContent=w.length;
  byId("rPartners").textContent=p.length;
  byId("rBeneficiaries").textContent=beneficiaries;
  byId("rApproved").textContent=approved;
  byId("rReview").textContent=review;
  byId("rRate").textContent=total?Math.round((approved/total)*100)+"%":"0%";

  drawBars(byId("typeBars"),[
    ["المنجزات",a.length],["التكريمات",w.length],["الشراكات",p.length]
  ]);

  const cats={};
  a.forEach(x=>cats[x.category]=(cats[x.category]||0)+1);
  drawBars(byId("categoryBars"),Object.entries(cats));

  const months={};
  all.forEach(x=>{
    const d=x.date || x.startDate || x.createdAt?.slice(0,10);
    if(!d)return;
    const m=d.slice(0,7);
    months[m]=(months[m]||0)+1;
  });
  drawBars(byId("monthBars"),Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])));
}

function drawBars(container, rows){
  container.innerHTML="";
  if(!rows.length){
    container.innerHTML='<div class="empty-inline">لا توجد بيانات كافية بعد</div>';
    return;
  }
  const max=Math.max(...rows.map(r=>r[1]),1);
  rows.forEach(([label,value])=>{
    const row=document.createElement("div");
    row.className="bar-row";
    row.innerHTML=`<div class="bar-label">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${(value/max)*100}%"></div></div><div class="bar-value">${value}</div>`;
    container.appendChild(row);
  });
}


async function openDetails(kind,id){
  const record=getRecord(kind,id);
  if(!record) return;
  const dialog=byId("detailDialog");
  const content=byId("detailContent");
  const rows=await getMedia(parentKey(kind,id));
  const images=rows.filter(r=>r.kind==="image");
  const docs=rows.filter(r=>r.kind==="document");

  const labels = kind==="achievement"
    ? {
        type:"منجز",
        category:record.category,
        date:record.date,
        owner:record.team,
        ownerLabel:"المنفذة / الفريق",
        sections:[
          ["الهدف",record.goal],
          ["الوصف",record.description],
          ["الأثر / النتيجة",record.impact],
          ["الفئة المستهدفة",record.audience],
          ["الجهة المنفذة",record.entity]
        ]
      }
    : kind==="award"
    ? {
        type:"تكريم",
        category:record.type,
        date:record.date,
        owner:record.recipient,
        ownerLabel:"المكرمة / الفئة",
        sections:[
          ["سبب التكريم",record.reason],
          ["الأثر / القيمة المضافة",record.impact],
          ["الجهة المانحة",record.grantor]
        ]
      }
    : {
        type:"شراكة",
        category:record.type,
        date:record.startDate,
        owner:record.partner,
        ownerLabel:"الجهة الشريكة",
        sections:[
          ["الهدف من الشراكة",record.goal],
          ["وصف التنفيذ",record.description],
          ["الأثر / النتيجة",record.impact],
          ["تاريخ النهاية",record.endDate]
        ]
      };

  const cover=images[0] ? `<img src="${mediaURL(images[0])}" alt="صورة الغلاف">` : `<div class="card-cover-placeholder">لا توجد صورة غلاف بعد<br><small>يمكن إضافتها من الأسفل</small></div>`;
  const gallery=images.length ? images.map(x=>`<img src="${mediaURL(x)}" alt="${esc(x.name)}">`).join("") : `<div class="empty-inline">لا توجد صور مرفقة</div>`;
  const docLinks=docs.length ? docs.map(x=>`<a class="file-link" href="${mediaURL(x)}" target="_blank" download="${esc(x.name)}"><span>${esc(x.name)}</span><strong>فتح / تنزيل</strong></a>`).join("") : `<div class="empty-inline">لا توجد مستندات مرفقة</div>`;
  const external = kind==="achievement" && record.link ? `<div class="detail-section"><h3>رابط خارجي</h3><a class="file-link" href="${esc(record.link)}" target="_blank" rel="noopener"><span>${esc(record.link)}</span><strong>فتح الرابط</strong></a></div>` : "";

  content.innerHTML=`
    <div class="detail-hero">
      <div class="detail-cover">${cover}</div>
      <div class="detail-title">
        <span class="badge">${esc(record.status)}</span>
        <h2>${esc(record.title)}</h2>
        <div class="detail-meta">
          <span>${esc(labels.type)}</span>
          <span>${esc(labels.category||"")}</span>
          <span>${esc(labels.date||"")}</span>
          <span>${esc(labels.ownerLabel)}: ${esc(labels.owner||"")}</span>
          <span>المستفيدات: ${esc(record.beneficiaries||"—")}</span>
        </div>
      </div>
    </div>

    ${labels.sections.filter(x=>x[1]).map(([h,v])=>`<div class="detail-section"><h3>${esc(h)}</h3><p>${esc(v)}</p></div>`).join("")}

    <div class="detail-section">
      <h3>الصور</h3>
      <div class="media-gallery">${gallery}</div>
    </div>

    <div class="detail-section">
      <h3>الملفات والمستندات</h3>
      <div class="file-list">${docLinks}</div>
    </div>

    ${external}

    <div class="add-attachments">
      <h3>إضافة مرفقات لهذا السجل</h3>
      <div class="attachment-grid">
        <label>إضافة صور<input id="detailImages" type="file" accept="image/*" multiple></label>
        <label>إضافة ملفات<input id="detailDocs" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" multiple></label>
        <button id="saveDetailAttachments" class="btn btn-primary" type="button">حفظ المرفقات</button>
      </div>
      <div class="attachment-status" id="detailAttachmentStatus">أول صورة محفوظة تصبح صورة الغلاف المصغرة تلقائيًا</div>
    </div>
  `;
  dialog.showModal();

  byId("saveDetailAttachments").addEventListener("click",async ()=>{
    const status=byId("detailAttachmentStatus");
    try{
      await saveSelectedFiles(
        parentKey(kind,id),
        byId("detailImages").files,
        byId("detailDocs").files
      );
      status.textContent="تم حفظ المرفقات بنجاح";
      setTimeout(()=>openDetails(kind,id),350);
    }catch(err){
      status.textContent="تعذر حفظ المرفقات على هذا الجهاز";
      console.error(err);
    }
  });
}

function setupDetailDialog(){
  const dialog=byId("detailDialog");
  const close=byId("detailClose");
  if(close) close.addEventListener("click",()=>dialog.close());
  if(dialog) dialog.addEventListener("click",e=>{
    if(e.target===dialog) dialog.close();
  });
}

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}
function byId(id){ return document.getElementById(id); }

window.addEventListener("hashchange",render);
window.addEventListener("DOMContentLoaded",()=>{
  setupDetailDialog();
  render();
});
