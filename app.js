
const storeKey = "manjaz_achievements_v1";

function getAchievements(){
  try { return JSON.parse(localStorage.getItem(storeKey) || "[]"); }
  catch { return []; }
}
function saveAchievements(items){
  localStorage.setItem(storeKey, JSON.stringify(items));
}

const routeTitles = {
  admin:"لوحة الإدارة",
  reports:"التقارير والإحصاءات",
  awards:"التكريمات والحوافز",
  partners:"الشراكات",
  settings:"الإعدادات"
};

function setActive(route){
  document.querySelectorAll("#nav a").forEach(a=>{
    a.classList.toggle("active", a.dataset.route===route);
  });
}

function cloneTemplate(id){
  return document.getElementById(id).content.cloneNode(true);
}

function render(){
  const route = (location.hash || "#home").slice(1);
  const view = document.getElementById("view");
  view.innerHTML = "";
  setActive(route);

  if(route==="home"){
    view.appendChild(cloneTemplate("homeTpl"));
    const items = getAchievements();
    document.getElementById("mTotal").textContent = items.length;
    document.getElementById("mApproved").textContent = items.filter(x=>x.status==="معتمد").length;
    document.getElementById("mReview").textContent = items.filter(x=>x.status==="تحت المراجعة").length;
  } else if(route==="about"){
    view.appendChild(cloneTemplate("aboutTpl"));
  } else if(route==="add"){
    view.appendChild(cloneTemplate("addTpl"));
    wireForm();
  } else if(route==="achievements"){
    view.appendChild(cloneTemplate("achievementsTpl"));
    wireList();
  } else {
    view.appendChild(cloneTemplate("placeholderTpl"));
    document.getElementById("placeholderTitle").textContent = routeTitles[route] || "قريبًا";
  }
}

function wireForm(){
  const form = document.getElementById("achievementForm");
  const msg = document.getElementById("formMsg");
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const fd = new FormData(form);
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: fd.get("title"),
      category: fd.get("category"),
      date: fd.get("date"),
      entity: fd.get("entity"),
      team: fd.get("team"),
      audience: fd.get("audience"),
      beneficiaries: fd.get("beneficiaries"),
      type: fd.get("type"),
      goal: fd.get("goal"),
      description: fd.get("description"),
      impact: fd.get("impact"),
      link: fd.get("link"),
      status: "تحت المراجعة",
      createdAt: new Date().toISOString()
    };
    const items = getAchievements();
    items.unshift(item);
    saveAchievements(items);
    form.reset();
    msg.className = "wide success";
    msg.textContent = "تم حفظ المنجز وإرساله للمراجعة بنجاح";
  });
}

function wireList(){
  const search = document.getElementById("searchAchievements");
  const cat = document.getElementById("filterCategory");
  const status = document.getElementById("filterStatus");
  [search,cat,status].forEach(el=>el.addEventListener("input", draw));

  function draw(){
    const all = getAchievements();
    const q = search.value.trim();
    const items = all.filter(x =>
      (!q || [x.title,x.description,x.team,x.entity].join(" ").includes(q)) &&
      (!cat.value || x.category===cat.value) &&
      (!status.value || x.status===status.value)
    );

    const list = document.getElementById("achievementList");
    const empty = document.getElementById("emptyState");
    list.innerHTML = "";
    empty.style.display = items.length ? "none" : "block";

    items.forEach(x=>{
      const card = document.createElement("article");
      card.className = "achievement-card";
      card.innerHTML = `
        <span class="badge">${escapeHtml(x.status)}</span>
        <h3>${escapeHtml(x.title)}</h3>
        <div class="meta">
          <span>${escapeHtml(x.category)}</span>
          <span>${escapeHtml(x.date)}</span>
          <span>المنفذة: ${escapeHtml(x.team)}</span>
          <span>المستفيدات: ${escapeHtml(x.beneficiaries || "—")}</span>
        </div>
        <p>${escapeHtml(x.impact)}</p>
      `;
      list.appendChild(card);
    });
  }
  draw();
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[ch]);
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
