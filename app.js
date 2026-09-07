
const STORE = "manjaz_achievements_v2";

function getItems(){
  try { return JSON.parse(localStorage.getItem(STORE) || "[]"); }
  catch { return []; }
}
function saveItems(items){ localStorage.setItem(STORE, JSON.stringify(items)); }

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
  const items=getItems();
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
        <p>${esc(x.category)} • ${esc(x.team)} • ${esc(x.date)}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn approve" data-id="${esc(x.id)}">اعتماد</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll(".approve").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const all=getItems();
      const item=all.find(x=>x.id===btn.dataset.id);
      if(item) item.status="معتمد";
      saveItems(all);
      render();
    });
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
