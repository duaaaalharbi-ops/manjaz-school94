
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
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const item={
      id:(crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
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
    const items=getItems();
    items.unshift(item);
    saveItems(items);
    form.reset();
    msg.className="success";
    msg.textContent="تم حفظ المنجز وإرساله للمراجعة بنجاح";
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
      card.innerHTML=`
        <span class="badge">${esc(x.status)}</span>
        <h3>${esc(x.title)}</h3>
        <div class="meta">
          <span>${esc(x.category)}</span>
          <span>${esc(x.date)}</span>
          <span>المنفذة: ${esc(x.team)}</span>
          <span>المستفيدات: ${esc(x.beneficiaries || "—")}</span>
        </div>
        <p>${esc(x.impact)}</p>
      `;
      list.appendChild(card);
    });
  }
  draw();
}

function wireAdmin(){
  const a=getItems(), w=getAwards(), p=getPartners();
  const items=[
    ...a.map(x=>({...x,_kind:"منجز"})),
    ...w.map(x=>({...x,_kind:"تكريم"})),
    ...p.map(x=>({...x,_kind:"شراكة"}))
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
      <div>
        <h4>${esc(x.title)}</h4>
        <p>${esc(x._kind)} • ${esc(x.category || x.type || "")} • ${esc(x.team || x.recipient || x.partner || "")} • ${esc(x.date || x.startDate || "")}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn approve" data-id="${esc(x.id)}" data-kind="${esc(x._kind)}">اعتماد</button>
      </div>
    `;
    list.appendChild(row);
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
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const item={
      id:(crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      title:fd.get("title"), type:fd.get("type"), grantor:fd.get("grantor"),
      recipient:fd.get("recipient"), date:fd.get("date"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      reason:fd.get("reason"), impact:fd.get("impact"),
      status:"تحت المراجعة", createdAt:new Date().toISOString()
    };
    const items=getAwards(); items.unshift(item); saveAwards(items);
    form.reset(); form.style.display="none";
    msg.className="success"; msg.textContent="تم حفظ التكريم وإرساله للمراجعة بنجاح";
    drawAwards();
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
      card.innerHTML=`<span class="badge">${esc(x.status)}</span><h3>${esc(x.title)}</h3>
      <div class="meta"><span>${esc(x.type)}</span><span>${esc(x.grantor)}</span><span>${esc(x.recipient)}</span><span>${esc(x.date)}</span></div>
      <p>${esc(x.reason)}</p>`;
      list.appendChild(card);
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
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const item={
      id:(crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      title:fd.get("title"), partner:fd.get("partner"), type:fd.get("type"),
      startDate:fd.get("startDate"), endDate:fd.get("endDate"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      goal:fd.get("goal"), description:fd.get("description"), impact:fd.get("impact"),
      status:"تحت المراجعة", createdAt:new Date().toISOString()
    };
    const items=getPartners(); items.unshift(item); savePartners(items);
    form.reset(); form.style.display="none";
    msg.className="success"; msg.textContent="تم حفظ الشراكة وإرسالها للمراجعة بنجاح";
    drawPartners();
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
      card.innerHTML=`<span class="badge">${esc(x.status)}</span><h3>${esc(x.title)}</h3>
      <div class="meta"><span>${esc(x.partner)}</span><span>${esc(x.type)}</span><span>${esc(x.startDate)}</span><span>المستفيدات: ${esc(x.beneficiaries||0)}</span></div>
      <p>${esc(x.impact)}</p>`;
      list.appendChild(card);
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

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}
function byId(id){ return document.getElementById(id); }

window.addEventListener("hashchange",render);
window.addEventListener("DOMContentLoaded",render);
