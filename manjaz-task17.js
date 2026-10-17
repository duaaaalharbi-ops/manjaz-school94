/* MANJAZ Task17 – layout observer only. No data cloning, mutation of field values or saves. */
(()=>{'use strict';
 const ready=()=>{
   document.body.classList.add('mj17-uniform');
   // The official template/preview comes from ManjazTask15, never from a substitute design.
   // Progressive enhancement: reopen/resize preview only when a Task16 dialog exists.
   const dialog=document.getElementById('mj16CertificatePreviewDialog');
   if(dialog&&!dialog.dataset.mj17Enhanced){
     dialog.dataset.mj17Enhanced='1';
     dialog.setAttribute('aria-label','معاينة الشهادة الرسمية كاملة بعلامة مائية منجز');
     const recalc=()=>{
       if(!dialog.open)return;
       for(const frame of dialog.querySelectorAll('.mj15-paper-frame')){
         const available=frame.getBoundingClientRect().width;
         if(!available)return;
         const factor=Math.min(1,available/1123);
         frame.style.height=Math.round(794*factor)+'px';
         const paper=frame.querySelector('.mj15-paper');
         if(paper)paper.style.setProperty('--mj15-scale',factor.toFixed(5));
       }
     };
     dialog.addEventListener('close',()=>{dialog.removeAttribute('aria-busy')});
     dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
     if('ResizeObserver' in window){const resize=new ResizeObserver(recalc);resize.observe(dialog);}
     else window.addEventListener('resize',recalc,{passive:true});
     dialog.addEventListener('toggle',recalc);
     requestAnimationFrame(recalc);
   }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 // The dialog is created lazily by the Task16 certificate controller.
 document.addEventListener('click',e=>{if(e.target.closest('[data-mj16-preview-open]'))queueMicrotask(ready)},true);
})();
