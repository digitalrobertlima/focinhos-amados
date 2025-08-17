/* register-sw.js — registro com autodetecção de escopo + fluxo de atualização */
(function(){
  if (!('serviceWorker' in navigator)) return;

  const baseHref = (document.querySelector('base')?.getAttribute('href')) || (location.pathname.replace(/[^\/]*$/, '')) || '/';
  const scopeUrl = new URL('.', location.origin + baseHref).pathname;
  const swUrl = new URL('service-worker.js', location.origin + baseHref).toString();

  function showToast(message, actionLabel, onAction){
    const bar = document.createElement('div');
    bar.setAttribute('role','status');
    bar.style.position='fixed';bar.style.inset='auto 16px 16px 16px';bar.style.padding='12px 16px';
    bar.style.background='#111';bar.style.color='#fff';bar.style.borderRadius='12px';bar.style.boxShadow='0 6px 24px rgba(0,0,0,.25)';
    bar.style.zIndex='99999';bar.style.font='14px system-ui,Segoe UI,Roboto,Arial,sans-serif';
    bar.textContent = message + ' ';
    const btn = document.createElement('button');
    btn.textContent = actionLabel; btn.style.marginLeft='12px'; btn.style.padding='6px 10px'; btn.style.borderRadius='8px'; btn.style.border='0';
    btn.onclick = () => { onAction?.(); document.body.removeChild(bar); };
    bar.appendChild(btn); document.body.appendChild(bar);
  }

  navigator.serviceWorker.register(swUrl, { scope: scopeUrl, updateViaCache:'none' })
    .then(reg => {
      reg.update().catch(()=>{});
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('Nova versão disponível.', 'Atualizar', () => {
              if (reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return; refreshing = true; location.reload();
      });
    })
    .catch(err => console.error('[SW] Registro falhou:', err));
})();
