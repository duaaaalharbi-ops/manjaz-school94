/* Manjaz Part 2 — scoped UI orchestration; existing save/edit/delete handlers are reused. */
(()=>{
  'use strict';
  const BASE='https://idkjuqfxcweqekdkcktk.supabase.co';
  const KEY='sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL';
  const ADMIN_SESSION='manjaz_admin_auth_session_v1';
  const ADMIN_EMAIL='munjz.s94@hotmail.com';
  const AWARD_ENTRY_FLAG='manjaz_part2_admin_award_entry';
  const ENTRIES=new WeakSet();
  let timer=0;
  const getRoute=()=>String(location.hash||'#home').slice(1).split('&')[0];

  function addAchievementCard(view){
    const list=view.querySelector('#achievementList');
    if(!list)return;
    const blocks=[...view.querySelectorAll('.mj18-utility-card')];
    const add=blocks.find(x=>x.querySelector('summary')?.textContent?.trim()==='إضافة منجز');
    if(!add||add.dataset.mj2Initialized==='1')return;
    const source=document.querySelector('#addTpl')?.content?.querySelector('#achievementForm');
    if(!source)return;
    add.dataset.mj2Initialized='1';
    add.classList.add('mj2-add-card');
    add.setAttribute('aria-label','إضافة منجز');
    add.querySelector('a[href="#add"]')?.remove();
    const form=source.cloneNode(true);
    add.appendChild(form);
    // Existing source handler is responsible for validation, uploads and cloud storage.
    if(typeof window.wireForm==='function')window.wireForm();
    else console.error('منجز: تعذر تهيئة نموذج الإضافة الأصلي');
  }

  // Remove the unused search/filter panel from the achievements interface.
  // The original renderer has already bound its listeners and displayed the cards.
  // No storage or submission code is replaced.
  function removeAchievementFilters(view){
    if(!view.querySelector('#achievementList'))return;
    for(const panel of [...view.querySelectorAll('.mj18-utility-card')]){
      if(panel.classList.contains('mj2-add-card'))continue;
      const isFilter=panel.querySelector('#searchAchievements,#filterCategory,#filterStatus') ||
        /البحث والتصفية/.test(panel.querySelector('summary')?.textContent||'');
      if(isFilter)panel.remove();
    }
  }

  function adminAwardMode(view){
    if(!view.querySelector('#awardList'))return;
    const inAdmin=(()=>{try{return sessionStorage.getItem(AWARD_ENTRY_FLAG)==='1'}catch(_){return false}})();
    view.classList.toggle('mj2-awards-edit',inAdmin);
    if(inAdmin){
      const form=view.querySelector('#awardForm');
      if(form&&form.dataset.mj2Opened!=='1'){
        form.dataset.mj2Opened='1';
        const original=view.querySelector('#showAwardForm');
        if(original)original.click();
        else form.style.display='block';
      }
    }
  }

  function group(id,title){
    const wrapper=document.createElement('details');
    wrapper.className='mj2-approval-group';
    wrapper.id=id;
    const summary=document.createElement('summary');
    summary.className='mj2-approval-summary';
    const label=document.createElement('span');label.textContent=title;
    const count=document.createElement('span');count.className='mj2-approval-count';count.setAttribute('aria-label','عدد الطلبات');
    summary.append(label,count);
    const body=document.createElement('div');body.className='mj2-approval-content';
    const list=document.createElement('div');list.className='mj2-approval-list';
    body.append(list);wrapper.append(summary,body);
    return {wrapper,list,body};
  }
  function setCount(group,count){
    const label=group?.querySelector('.mj2-approval-count');
    const text=Number.isInteger(count)?String(count):'—';
    if(label&&label.textContent!==text)label.textContent=text;
  }
  function enhanceOriginalPanel(host){
    const panel=host.querySelector('.surface.panel');
    if(!panel||panel.classList.contains('mj2-records-accordion'))return;
    // Replace only the outer container. Move every original node, including
    // bound action listeners, without rebuilding the approval table.
    const group=document.createElement('details');
    group.className='surface panel mj2-approval-group mj2-records-accordion';
    group.open=true;
    const summary=document.createElement('summary');
    summary.className='mj2-approval-summary';
    const label=document.createElement('span');label.textContent='طلبات المنجزات والشراكات';
    const count=document.createElement('span');count.className='mj2-approval-count';
    summary.append(label,count);
    const body=document.createElement('div');body.className='mj2-approval-content';
    panel.replaceWith(group);
    while(panel.firstChild)body.appendChild(panel.firstChild);
    group.append(summary,body);
  }
  function emptyText(text){
    const p=document.createElement('p');
    p.className='mj2-empty';p.textContent=text;return p;
  }
  function isAwardItem(row){
    return !!row.querySelector('[data-media-kind="award"]');
  }
  function ensureApprovals(view){
    const dash=view.querySelector('#mj15Dashboard');
    const host=dash?.querySelector('#mj15Achievements');
    const records=host?.querySelector('#adminList');
    if(!dash||!host||!records)return;
    const first=dash.querySelector('.mj15-panel>summary');
    if(first){
      const labels=[...first.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE);
      for(const label of labels){
        if(label.textContent.includes('طلبات اعتماد المنجزات'))label.textContent=label.textContent.replace('طلبات اعتماد المنجزات','طلبات الاعتماد');
      }
    }
    enhanceOriginalPanel(host);
    const oldTitle=host.querySelector('.panel-head h3');
    if(oldTitle&&oldTitle.textContent!=='طلبات المنجزات والشراكات')oldTitle.textContent='طلبات المنجزات والشراكات';

    let awards=dash.querySelector('#mj2AwardApprovals');
    if(!awards){
      const node=group('mj2AwardApprovals','طلبات التكريمات');
      awards=node.wrapper;
      const controls=document.createElement('div');
      controls.className='mj2-admin-actions';
      const add=document.createElement('button');
      add.type='button';add.className='mj2-add-award-btn';
      add.textContent='إضافة تكريم';
      add.addEventListener('click',()=>{
        try{sessionStorage.setItem(AWARD_ENTRY_FLAG,'1')}catch(_){}
        location.hash='#awards';
      });
      controls.appendChild(add);node.list.before(controls);
      host.appendChild(awards);
    }
    const awardList=awards.querySelector('.mj2-approval-list');
    // Row button listeners were installed by wireAdmin; moving the nodes preserves them.
    for(const row of [...records.querySelectorAll(':scope > .admin-item')]){
      if(isAwardItem(row))awardList.appendChild(row);
    }
    const awEmpty=awards.querySelector('.mj2-empty');
    if(!awardList.querySelector('.admin-item')){
      if(!awEmpty)awardList.appendChild(emptyText('لا توجد طلبات تكريم بانتظار الاعتماد.'));
    }else awEmpty?.remove();
    const defaultEmpty=host.querySelector('#adminEmpty');
    if(defaultEmpty)defaultEmpty.style.display=records.querySelector('.admin-item')?'none':'block';

    setCount(awards,awardList.querySelectorAll('.admin-item').length);
    setCount(host.querySelector('.mj2-records-accordion'),records.querySelectorAll('.admin-item').length);
    if(!dash.querySelector('#mj2KnowledgeApprovals')){
      const node=group('mj2KnowledgeApprovals','طلبات اعتماد الإنتاج المعرفي');
      const toolbar=document.createElement('div');
      toolbar.className='mj2-admin-actions';
      const refresh=document.createElement('button');
      refresh.type='button';refresh.textContent='تحديث طلبات الإنتاج المعرفي';
      refresh.addEventListener('click',()=>loadKnowledge(node.wrapper));
      toolbar.appendChild(refresh);
      const message=document.createElement('p');message.className='mj2-knowledge-status';message.setAttribute('role','status');
      node.list.before(toolbar,message);
      host.appendChild(node.wrapper);
      loadKnowledge(node.wrapper);
    }
  }

  async function verifiedAdminToken(){
    let session=null;
    try{session=JSON.parse(sessionStorage.getItem(ADMIN_SESSION)||'null')}catch(_){}
    if(!session?.access_token)throw new Error('يجب تسجيل الدخول من الصلاحيات الإدارية لعرض طلبات الإنتاج المعرفي.');
    if(session.expires_at&&Number(session.expires_at)<Date.now()/1000)throw new Error('انتهت الجلسة الإدارية؛ أعيدي تسجيل الدخول.');
    const token=session.access_token;
    const user=await fetch(BASE+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+token},cache:'no-store'});
    if(!user.ok)throw new Error('تعذر التحقق من صلاحية الإدارة.');
    const identity=await user.json();
    if(String(identity.email||'').toLowerCase()!==ADMIN_EMAIL)throw new Error('الحساب الحالي غير مخوّل للاعتماد.');
    return token;
  }
  async function responseBody(response){
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.message||body.error||`تعذر إكمال العملية (${response.status})`);
    return body;
  }
  function knowledgeTitle(data){
    if(!data||typeof data!=='object')return 'منتج معرفي';
    for(const field of ['title','productTitle','product_name','name','activityTitle']){
      if(typeof data[field]==='string'&&data[field].trim())return data[field].trim();
    }
    if(data.fields&&typeof data.fields==='object')return knowledgeTitle(data.fields);
    return 'منتج معرفي';
  }
  async function loadKnowledge(panel){
    if(!panel?.isConnected)return;
    const message=panel.querySelector('.mj2-knowledge-status');
    const list=panel.querySelector('.mj2-approval-list');
    const refresh=panel.querySelector('.mj2-admin-actions button');
    if(!message||!list||panel.dataset.mj2Loading==='1')return;
    panel.dataset.mj2Loading='1';
    if(refresh)refresh.disabled=true;
    message.textContent='جارٍ تحميل الطلبات والتحقق من صلاحيات الإدارة...';
    list.replaceChildren();
    try{
      const bearer=await verifiedAdminToken();
      const params=new URLSearchParams({select:'id,payload,status,created_at',status:'eq.تحت المراجعة',order:'created_at.desc',limit:'200'});
      const url=BASE+'/rest/v1/manjaz_knowledge_submissions_v18?'+params.toString();
      const resp=await fetch(url,{headers:{apikey:KEY,Authorization:'Bearer '+bearer},cache:'no-store'});
      const rows=await responseBody(resp);
      if(!Array.isArray(rows))throw new Error('صيغة بيانات الطلبات غير متوقعة.');
      message.textContent=`طلبات الإنتاج المعرفي بانتظار الاعتماد: ${rows.length}`;
      setCount(panel,rows.length);
      if(!rows.length)list.appendChild(emptyText('لا توجد طلبات إنتاج معرفي بانتظار الاعتماد.'));
      for(const record of rows){
        const row=document.createElement('article');row.className='mj2-knowledge-row';
        const info=document.createElement('div');
        const title=document.createElement('strong');title.textContent=knowledgeTitle(record.payload);
        const meta=document.createElement('p');
        const date=record.created_at?new Date(record.created_at).toLocaleDateString('ar-SA'):'—';
        meta.textContent=`منتج معرفي • تحت المراجعة • ${date}`;
        info.append(title,meta);
        const actions=document.createElement('div');actions.className='mj2-row-actions';
        for(const [action,label] of [['approve','اعتماد'],['reject','رفض']]){
          const button=document.createElement('button');button.type='button';button.textContent=label;
          button.dataset.mj2Action=action;
          button.addEventListener('click',async()=>{
            const buttons=[...actions.querySelectorAll('button')];
            buttons.forEach(b=>b.disabled=true);
            message.textContent='جارٍ حفظ قرار الاعتماد...';
            try{
              const token=await verifiedAdminToken();
              await responseBody(await fetch(BASE+'/rest/v1/rpc/manjaz_knowledge_admin_v18',{
                method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},
                body:JSON.stringify({p_id:String(record.id),p_action:action})
              }));
              await loadKnowledge(panel);
            }catch(err){message.textContent='تعذر حفظ القرار: '+err.message;buttons.forEach(b=>b.disabled=false)}
          });actions.appendChild(button);
        }
        row.append(info,actions);list.appendChild(row);
      }
    }catch(err){message.textContent=err.message;setCount(panel,null);list.appendChild(emptyText('لا يمكن عرض هذه الطلبات دون صلاحية الإدارة.'))}
    finally{panel.dataset.mj2Loading='0';if(refresh)refresh.disabled=false}
  }

  function mount(){
    const view=document.getElementById('view');if(!view)return;
    const route=getRoute();
    view.classList.toggle('mj2-about',route==='about');
    if(route==='achievements'){addAchievementCard(view);removeAchievementFilters(view);}
    if(route==='awards')adminAwardMode(view);
    if(route==='admin')ensureApprovals(view);
  }
  function schedule(){
    if(timer)return;
    timer=setTimeout(()=>{timer=0;mount()},45);
  }
  function init(){
    const view=document.getElementById('view');if(!view)return;
    if(!ENTRIES.has(view)){
      ENTRIES.add(view);
      new MutationObserver(schedule).observe(view,{subtree:true,childList:true});
    }
    addEventListener('hashchange',schedule);
    document.addEventListener('click',e=>{
      if(e.target.closest('#achievementSuccessClose'))setTimeout(()=>{if(getRoute()==='achievements'&&typeof window.render==='function')window.render()},0);
      if(e.target.closest('#cancelAward,#awardCloudSuccessClose,#awardSuccessClose')){
        const active=getRoute()==='awards'&&document.getElementById('view')?.classList.contains('mj2-awards-edit');
        if(active){try{sessionStorage.removeItem(AWARD_ENTRY_FLAG)}catch(_){};setTimeout(()=>{location.hash='#admin'},0)}
      }
    },true);
    mount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
