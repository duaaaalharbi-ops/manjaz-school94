/* MANJAZ 18.1 – safely filter gallery cards; approval & stored data untouched. */
(()=>{'use strict';
 const view=document.getElementById('view');if(!view)return;
 let working=false;
 function apply(){
  if(working)return;working=true;
  try{
   const isAchievements=!!view.querySelector('#achievementList');
   const isAwards=!!view.querySelector('#awardList');
   if(!isAchievements&&!isAwards)return;
   const container=view.querySelector(isAchievements?'#achievementList':'#awardList');
   if(!container)return;
   for(const card of container.querySelectorAll('.achievement-card')){
    const state=card.querySelector('.badge')?.textContent?.trim();
    // Approved content is the public gallery; records not matching remain stored for admin review.
    const approved=state==='معتمد';
    if(card.hidden!==!approved)card.hidden=!approved;
    if(isAwards){
     for(const b of card.querySelectorAll('.record-edit-btn,.record-delete-btn'))b.hidden=true;
    }
   }
  }finally{working=false;}
 }
 let queued=false;function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply()})}
 const observer=new MutationObserver(queue);observer.observe(view,{childList:true,subtree:true});
 window.addEventListener('hashchange',queue);queue();
})();
