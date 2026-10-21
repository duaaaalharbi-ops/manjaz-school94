/* أثر – ملفات الإنجاز المطورة: وصلة عرض مستقلة، قابلة للإزالة. */
(() => {
  'use strict';
  const source = document.currentScript?.src;
  if (!source) return;
  const url = new URL('./index.html', source).href;
  const title = 'أثر – ملفات الإنجاز المطورة';
  let scheduled = false;
  function mount() {
    scheduled = false;
    const nav = document.getElementById('nav');
    if (nav && !nav.querySelector('[data-athar-entry]')) {
      const link = document.createElement('a');
      link.href = url;
      link.dataset.atharEntry = '1';
      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = '✦';
      const label = document.createElement('span');
      label.textContent = title;
      link.append(icon, label);
      const before = nav.querySelector('a[href="#settings"]');
      if (before) nav.insertBefore(link, before);
      else nav.appendChild(link);
    }
    const grid = document.querySelector('#manjazHome .manjaz-home-grid');
    if (!grid || grid.querySelector('[data-athar-card]')) return;
    const card = document.createElement('article');
    card.className = 'manjaz-home-card';
    card.dataset.atharCard = '1';
    card.innerHTML = '<div class="manjaz-home-card-title"><span class="manjaz-home-icon" aria-hidden="true">✦</span><h3>أثر – ملفات الإنجاز المطورة</h3></div><div class="manjaz-home-actions"></div>';
    const action = document.createElement('a');
    action.className = 'manjaz-home-action view';
    action.href = url;
    action.textContent = 'استعراض';
    card.querySelector('.manjaz-home-actions').appendChild(action);
    const qudrat = [...grid.querySelectorAll('.manjaz-home-card')].find(el => el.querySelector('a[href="#qudrat-file"]'));
    if (qudrat) qudrat.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(mount);
  }
  const init = () => {
    schedule();
    const view = document.getElementById('view');
    if (view) new MutationObserver(schedule).observe(view, {childList:true,subtree:true});
  };
  addEventListener('hashchange', schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();