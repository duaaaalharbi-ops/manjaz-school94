/* MANJAZ 17.1 | Safely decorate all existing form rows without moving nodes or values. */
(()=>{'use strict';
 const rowTypes='input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),select,textarea,.manjaz-hijri-trigger';
 const excluded='[type="checkbox"],[type="radio"],[type="range"],[type="color"],[type="hidden"],.manjaz-hijri-calendar *';
 let pending=false;
 function update(){pending=false;document.body.classList.add('mj17-uniform');
  // Scope to form-like sections; no certificate paper, reserve tables, or interactive calendar cells.
  document.querySelectorAll('#view label,#dailyReserveRoot label,#adminPermissionsRoot label,#awardForm label,#partnerForm label').forEach(label=>{
   if(label.closest('.manjaz-hijri-calendar,.certificate-paper,.reserve-table,.reserve-day-grid,.reserve-timetable,.mj17-exempt-scope'))return;
   const children=Array.from(label.children);
   const control=children.find(node=>node.matches?.(rowTypes));
   if(control){label.classList.add('mj17-field-row');}
   else label.classList.remove('mj17-field-row');
  });
  document.querySelectorAll('#view .form-grid,#view .mj15-form-grid,#view .mj14-form-grid,#view .manjaz-edit-grid,#view .filters,#dailyReserveRoot .form-grid,#adminPermissionsRoot .form-grid').forEach(el=>el.classList.add('mj17-one-field-grid'));
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(update)}
 function init(){update();const roots=[document.getElementById('view'),document.getElementById('dailyReserveRoot'),document.getElementById('adminPermissionsRoot')].filter(Boolean);
  roots.forEach(root=>new MutationObserver(schedule).observe(root,{subtree:true,childList:true}));
  // Source code already listens to resize for certificates; this is a safe companion.
  document.addEventListener('click',e=>{if(e.target.closest('[data-mj16-preview-open]'))requestAnimationFrame(schedule)},true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
