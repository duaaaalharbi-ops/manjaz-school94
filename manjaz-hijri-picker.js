/* MANJAZ HIJRI DATE PICKER 1.0
   UI: Umm al-Qura only. Existing data values: Gregorian YYYY-MM-DD (unchanged).
   Scope: nine approved controls in achievements, awards, partnerships,
   admin certificates and daily reserve. No other date fields are altered. */
(()=>{'use strict';
  const allowed=[
    '#achievementForm input[name="date"]',
    '#awardForm input[name="date"]',
    '#partnerForm input[name="startDate"]',
    '#partnerForm input[name="endDate"]',
    '#adminCertificateForm input[name="date"]',
    '#reservePublicDate','#reserveAdminDate','#reserveManualDate'
  ].join(',');
  const monthNames=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
  const weekNames=['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  const dateFmt=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{
    calendar:'islamic-umalqura',timeZone:'Asia/Riyadh',year:'numeric',month:'numeric',day:'numeric'
  });
  const displayFmt=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{
    calendar:'islamic-umalqura',timeZone:'Asia/Riyadh',year:'numeric',month:'long',day:'numeric',weekday:'long'
  });
  const arabicNum=new Intl.NumberFormat('ar-SA-u-nu-arab',{useGrouping:false});
  const pad=n=>String(n).padStart(2,'0');
  const isoUTC=iso=>new Date(`${iso}T12:00:00Z`);
  const asISO=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  function addDays(iso,delta){const d=isoUTC(iso);d.setUTCDate(d.getUTCDate()+delta);return asISO(d);}
  function daysBetween(a,b){return Math.round((isoUTC(b)-isoUTC(a))/86400000);}
  function validISO(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&asISO(isoUTC(v))===v;}
  function parts(iso){
    const a={};
    dateFmt.formatToParts(isoUTC(iso)).forEach(x=>{if(['year','month','day'].includes(x.type))a[x.type]=Number(x.value);});
    return a;
  }
  function monthStart(anyISO){
    let at=anyISO;
    for(let i=0;i<32;i++){
      if(parts(at).day===1)return at;
      at=addDays(at,-1);
    }
    throw new Error('تعذر حساب بداية الشهر الهجري');
  }
  function nextMonth(first){return monthStart(addDays(first,32));}
  function prevMonth(first){return monthStart(addDays(first,-1));}
  function monthByParts(year,month,reference){
    const h=parts(reference);
    const offset=(year-h.year)*12+(month-h.month);
    if(Math.abs(offset)>720)throw new Error('السنة خارج نطاق الاختيار');
    let at=monthStart(addDays(reference,Math.round(offset*29.53059)));
    for(let i=0;i<5;i++){
      const p=parts(at),delta=(year-p.year)*12+(month-p.month);
      if(delta===0)return at;
      at=delta>0?nextMonth(at):prevMonth(at);
    }
    throw new Error('تعذر اختيار الشهر الهجري المطلوب');
  }
  function todayISO(){
    const x={};
    new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',day:'2-digit',month:'2-digit',year:'numeric'})
      .formatToParts(new Date()).forEach(p=>{if(['day','month','year'].includes(p.type))x[p.type]=p.value;});
    return `${x.year}-${x.month}-${x.day}`;
  }
  const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let popup=null,activeInput=null,showMonth=null;
  function displayValue(iso){return validISO(iso)?displayFmt.format(isoUTC(iso)):'اختاري التاريخ الهجري';}
  function updateButton(input){
    const b=input._manjazHijriButton;
    if(!b)return;
    b.textContent=displayValue(input.value);
    b.classList.toggle('is-empty',!validISO(input.value));
    b.setAttribute('aria-label',`فتح التقويم الهجري: ${displayValue(input.value)}`);
    b.removeAttribute('aria-invalid');
    const error=input.parentElement?.querySelector('.manjaz-hijri-error');
    if(error)error.remove();
  }
  function positionPopup(){
    if(!popup||!activeInput)return;
    const box=activeInput._manjazHijriButton.getBoundingClientRect();
    if(window.innerWidth<=600){popup.style.left='12px';popup.style.right='12px';popup.style.top='auto';popup.style.bottom='12px';return;}
    const width=342;
    popup.style.right='auto';popup.style.bottom='auto';
    popup.style.left=`${Math.max(12,Math.min(window.innerWidth-width-12,box.left))}px`;
    popup.style.top=`${Math.max(12,Math.min(window.innerHeight-420,box.bottom+6))}px`;
  }
  function closePopup(returnFocus=false){
    const button=activeInput?._manjazHijriButton;
    if(popup)popup.hidden=true;
    activeInput=null;showMonth=null;
    if(returnFocus)button?.focus();
  }
  function renderPopup(){
    if(!activeInput||!showMonth)return;
    const first=showMonth,h=parts(first),length=daysBetween(first,nextMonth(first));
    const startDay=isoUTC(first).getUTCDay();
    const selected=activeInput.value;
    const yearOptions=[];
    for(let y=Math.max(1300,h.year-50);y<=Math.min(1600,h.year+50);y++)
      yearOptions.push(`<option value="${y}" ${y===h.year?'selected':''}>${arabicNum.format(y)}</option>`);
    const days=[];
    for(let i=0;i<startDay;i++)days.push('<span class="manjaz-hijri-blank" aria-hidden="true"></span>');
    for(let d=1;d<=length;d++){
      const iso=addDays(first,d-1),selectedDay=selected===iso;
      days.push(`<button type="button" class="manjaz-hijri-day ${selectedDay?'selected':''}" data-hijri-iso="${iso}" ${selectedDay?'aria-current="date"':''} aria-label="${esc(displayValue(iso))}">${arabicNum.format(d)}</button>`);
    }
    popup.innerHTML=`<div class="manjaz-hijri-toolbar">
      <button type="button" class="manjaz-hijri-nav" data-hijri-nav="prev" aria-label="الشهر الهجري السابق">‹</button>
      <div class="manjaz-hijri-selects">
        <select aria-label="الشهر الهجري" data-hijri-part="month">${monthNames.map((m,i)=>`<option value="${i+1}" ${i+1===h.month?'selected':''}>${m}</option>`).join('')}</select>
        <select aria-label="السنة الهجرية" data-hijri-part="year">${yearOptions.join('')}</select>
      </div>
      <button type="button" class="manjaz-hijri-nav" data-hijri-nav="next" aria-label="الشهر الهجري التالي">›</button>
    </div>
    <div class="manjaz-hijri-weekdays">${weekNames.map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="manjaz-hijri-days">${days.join('')}</div>
    <div class="manjaz-hijri-bottom"><span>تقويم أم القرى</span><button type="button" data-hijri-today>اختيار اليوم</button><button type="button" data-hijri-close>إغلاق</button></div>`;
  }
  function chooseDate(iso){
    if(!activeInput||!validISO(iso))return;
    const input=activeInput;
    closePopup();
    input.value=iso;
    updateButton(input);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    // Preserve the platform's original ISO date synchronization and save handlers.
  }
  function openPopup(input){
    if(!input?.isConnected)return;
    if(!popup){
      popup=document.createElement('section');
      popup.id='manjazHijriCalendar';popup.className='manjaz-hijri-calendar';
      popup.setAttribute('dir','rtl');popup.setAttribute('role','dialog');
      popup.setAttribute('aria-label','اختيار التاريخ الهجري – تقويم أم القرى');
      document.body.appendChild(popup);
      popup.addEventListener('click',event=>{
        const day=event.target.closest('[data-hijri-iso]');
        if(day){chooseDate(day.dataset.hijriIso);return;}
        const nav=event.target.closest('[data-hijri-nav]');
        if(nav){showMonth=nav.dataset.hijriNav==='prev'?prevMonth(showMonth):nextMonth(showMonth);renderPopup();return;}
        if(event.target.closest('[data-hijri-today]')){chooseDate(todayISO());return;}
        if(event.target.closest('[data-hijri-close]'))closePopup(true);
      });
      popup.addEventListener('change',event=>{
        if(!event.target.matches('[data-hijri-part]'))return;
        const y=Number(popup.querySelector('[data-hijri-part="year"]').value),
              m=Number(popup.querySelector('[data-hijri-part="month"]').value);
        showMonth=monthByParts(y,m,showMonth);renderPopup();
      });
    }
    if(activeInput===input&&!popup.hidden){closePopup(true);return;}
    activeInput=input;
    showMonth=monthStart(validISO(input.value)?input.value:todayISO());
    popup.hidden=false;
    renderPopup();positionPopup();
  }
  function enhance(input){
    if(input.dataset.manjazHijriEnhanced==='1')return;
    input.dataset.manjazHijriEnhanced='1';
    const required=input.required;
    input.dataset.manjazHijriRequired=required?'1':'0';
    input.type='hidden'; // No Gregorian native picker is ever displayed.
    const button=document.createElement('button');
    button.type='button';button.className='manjaz-hijri-trigger';
    button.setAttribute('aria-haspopup','dialog');
    if(required)button.setAttribute('aria-required','true');
    const reserveLabel=input.closest('.reserve-date-picker-label');
    if(reserveLabel)reserveLabel.after(button);else input.after(button);
    input._manjazHijriButton=button;
    button.addEventListener('click',event=>{event.preventDefault();openPopup(input);});
    input.addEventListener('change',()=>updateButton(input));
    input.addEventListener('input',()=>updateButton(input));
    updateButton(input);
  }
  function scan(){document.querySelectorAll(allowed).forEach(enhance);}
  function injectStyle(){
    if(document.getElementById('manjazHijriStyles'))return;
    const style=document.createElement('style');style.id='manjazHijriStyles';
    style.textContent=`
      .manjaz-hijri-trigger{width:100%;min-width:135px;min-height:41px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:space-between;gap:8px;direction:rtl;text-align:right;border:1px solid #c7d7d9;border-radius:9px;padding:9px 12px;background:#fff;color:#123943;cursor:pointer;font:inherit;font-size:14px;line-height:1.5}
      .manjaz-hijri-trigger::after{content:'▦';font-size:19px;color:#0f5f59;flex:none}
      .manjaz-hijri-trigger.is-empty{color:#647580}
      .manjaz-hijri-trigger:focus-visible,.manjaz-hijri-day:focus-visible{outline:3px solid #62a9a3;outline-offset:2px}
      .manjaz-hijri-trigger[aria-invalid="true"]{border:2px solid #af3535}
      .manjaz-hijri-error{font-size:12px;color:#af3535;display:block}
      .manjaz-hijri-calendar{direction:rtl;position:fixed;z-index:2147483000;width:342px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:14px;background:#fff;border:1px solid #cad9dc;border-radius:15px;box-shadow:0 18px 50px rgba(11,48,71,.25);font:14px/1.5 Tahoma,Arial,sans-serif;color:#17394a}
      .manjaz-hijri-calendar[hidden]{display:none!important}
      .manjaz-hijri-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
      .manjaz-hijri-selects{display:flex;gap:5px;flex:1;min-width:0}
      .manjaz-hijri-selects select{font:inherit;color:#0b3047;background:#fff;border:1px solid #cbd8da;border-radius:7px;padding:5px 4px;min-width:0;max-width:62%;flex:1}
      .manjaz-hijri-selects select[data-hijri-part="year"]{flex:.65}
      .manjaz-hijri-nav{border:1px solid #cbd8da;background:#eff5f4;border-radius:8px;min-width:30px;min-height:32px;color:#0f5f59;cursor:pointer;font-size:24px}
      .manjaz-hijri-weekdays,.manjaz-hijri-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
      .manjaz-hijri-weekdays{margin-bottom:6px;color:#62747c;font-size:11px;font-weight:bold}
      .manjaz-hijri-day{border:1px solid transparent;border-radius:7px;background:#f5f8f8;min-height:35px;cursor:pointer;font:inherit;font-size:13px;color:#17394a;padding:0}
      .manjaz-hijri-day.selected{background:#0f5f59;color:#fff;font-weight:bold}
      .manjaz-hijri-day:hover{border-color:#0f5f59}
      .manjaz-hijri-bottom{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid #e3eaeb;color:#6d8086;font-size:12px}
      .manjaz-hijri-bottom button{border:0;border-radius:6px;background:#edf4f2;color:#0d5c55;padding:7px 9px;cursor:pointer;font:inherit}
      #dailyReserveRoot .reserve-hijri-date .manjaz-hijri-trigger{width:auto;max-width:100%;flex:1 1 200px}
      #dailyReserveRoot .reserve-date-picker-label{display:none!important}
      @media(max-width:600px){.manjaz-hijri-calendar{width:auto;max-height:calc(100vh - 24px);overflow:auto}.manjaz-hijri-day{min-height:40px}#dailyReserveRoot .reserve-hijri-date .manjaz-hijri-trigger{width:100%;grid-column:1/-1}}
      @media print{.manjaz-hijri-calendar{display:none!important}}
    `;
    document.head.appendChild(style);
  }
  function init(){
    injectStyle();scan();
    // Most Manjaz pages/forms are rendered dynamically into #view or reserve admin.
    const observer=new MutationObserver(()=>{
      scan();
      if(activeInput&&!activeInput.isConnected)closePopup();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('pointerdown',event=>{
      if(activeInput&&popup&&!popup.hidden&&!popup.contains(event.target)&&!activeInput._manjazHijriButton?.contains(event.target))closePopup();
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activeInput){event.preventDefault();closePopup(true);}});
    document.addEventListener('submit',event=>{
      const form=event.target;if(!(form instanceof HTMLFormElement))return;
      const requiredDate=[...form.querySelectorAll(allowed)].find(input=>input.dataset.manjazHijriRequired==='1'&&!validISO(input.value));
      if(!requiredDate)return;
      event.preventDefault();event.stopImmediatePropagation();
      const b=requiredDate._manjazHijriButton;
      b.setAttribute('aria-invalid','true');
      if(!requiredDate.parentElement.querySelector('.manjaz-hijri-error')){
        const error=document.createElement('span');error.className='manjaz-hijri-error';error.textContent='يرجى اختيار التاريخ الهجري.';
        b.after(error);
      }
      b.focus();
    },true);
    window.addEventListener('resize',()=>{if(activeInput)positionPopup();});
    window.addEventListener('scroll',()=>{if(activeInput)positionPopup();},true);
  }
  window.ManjazHijriPicker={refresh:scan,calendar:'islamic-umalqura',version:'1.0'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
