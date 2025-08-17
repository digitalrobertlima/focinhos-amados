/* cliente.js — persistência simples de dados do cliente (nome, tel, endereço) */
(function(){
  const KEY = 'fa_cliente_v1';
  function get(){
    try { return JSON.parse(localStorage.getItem(KEY)||'{}'); } catch { return {}; }
  }
  function set(data){
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }
  function onlyDigits(s){ return String(s||'').replace(/\D+/g,''); }
  function fmtTelBR(s){
    const d = onlyDigits(s);
    if(d.length===11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if(d.length===10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return s||'';
  }
  function bind(){
    const store = get();
    const nome = document.getElementById('tutorNome');
    const tel  = document.getElementById('tutorTelefone');
    const end  = document.getElementById('endereco');
    if(nome && !nome.value) nome.value = store.nome || '';
    if(tel && !tel.value) tel.value = store.telefone || '';
    if(end && !end.value) end.value = store.endereco || '';

    function sync(){
      const data = get();
      data.nome = (nome?.value||'').trim();
      data.telefone = (tel?.value||'').trim();
      data.endereco = (end?.value||'').trim();
      set(data);
      // Atualiza resumos que usem data-bind
      document.querySelectorAll('[data-bind=\"cliente-nome\"]').forEach(el=> el.textContent = data.nome||'-');
      document.querySelectorAll('[data-bind=\"cliente-telefone\"]').forEach(el=> el.textContent = data.telefone? fmtTelBR(data.telefone) : '-');
      document.querySelectorAll('[data-bind=\"cliente-endereco\"]').forEach(el=> el.textContent = data.endereco||'-');
    }
    ['change','blur','input'].forEach(ev=>{
      nome && nome.addEventListener(ev, sync);
      tel && tel.addEventListener(ev, sync);
      end && end.addEventListener(ev, sync);
    });
    // Primeira sincronização
    sync();
  }
  // Expor API mínima
  window.Cliente = { get, set, bind };
  document.addEventListener('DOMContentLoaded', bind);
})();
