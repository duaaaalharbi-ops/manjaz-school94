/* أثر – ملفات الإنجاز المطورة | مدخل فرعي حصري داخل الحوسبة السحابية / ملفات الإنجاز.
   لا يغير قائمة الموقع الرئيسية أو وظائف روابط Google Drive، ويمكن إزالته بحذف هذا التحميل. */
(() => {
  'use strict';
  const source = document.currentScript && document.currentScript.src;
  if (!source) return;
  const atharUrl = new URL('./index.html', source).href;
  let queued = false;

  function mount() {
    queued = false;
    if (location.hash !== '#cloud-portfolios') return;
    const view = document.getElementById('view');
    if (!view || view.querySelector('[data-athar-cloud-entry="1"]')) return;
    // Only mount after the original cloud portfolios section has been rendered.
    const list = view.querySelector('#cloudLinksList');
    const intro = view.querySelector('.page-intro');
    if (!list || !intro) return;

    const card = document.createElement('section');
    card.className = 'surface panel';
    card.dataset.atharCloudEntry = '1';
    card.setAttribute('aria-label', 'أثر – ملفات الإنجاز المطورة');
    card.style.cssText = 'margin:16px 0 20px;padding:20px;border-radius:16px;';
    const head = document.createElement('div');
    head.className = 'panel-head';
    const title = document.createElement('h3');
    title.textContent = 'أثر – ملفات الإنجاز المطورة';
    head.appendChild(title);
    const description = document.createElement('p');
    description.textContent = 'ملفات إنجاز رقمية تفاعلية للمعلمات، تُستعرض باختيار اسم المعلمة من القائمة المنسدلة.';
    description.style.cssText = 'line-height:1.9;margin:8px 0 14px;';
    const actions = document.createElement('div');
    actions.className = 'section-actions';
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = atharUrl;
    link.textContent = 'استعراض ملفات الإنجاز المطورة';
    actions.appendChild(link);
    card.append(head, description, actions);
    intro.insertAdjacentElement('afterend', card);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(mount);
  }

  function init() {
    const view = document.getElementById('view');
    if (view) {
      // Detect view replacements by Manjaz's existing router, not mutations inside the other sections.
      new MutationObserver(schedule).observe(view, {childList:true});
    }
    schedule();
  }
  addEventListener('hashchange', schedule);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
