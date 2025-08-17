(function(){
  const out = document.getElementById('output');
  function write(v){ out.innerHTML = '<pre>'+escapeHtml(v)+'</pre>'; }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function makeDownload(filename, content){
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return `<a download="${filename}" href="${url}">${filename}</a>`;
  }

  const files = {
    'assets/img/logo.svg': `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"120\" viewBox=\"0 0 400 120\">\n  <rect width=\"100%\" height=\"100%\" fill=\"#fff0\"/>\n  <text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"Segoe UI, Arial\" font-size=\"28\" fill=\"#c33\">Focinhos Amados</text>\n</svg>` ,

    'assets/js/config-shopcoords.js': `// Replace or merge into assets/js/config.js\nwindow.CONFIG = window.CONFIG || {};
window.CONFIG.shopCoords = { lat: -19.9520894, lng: -43.9926409 };\n// End of snippet\n` ,

    'sw-add-sprite-snippet.txt': `/* Snippet: add '/assets/img/sprite.svg' to STATIC_ASSETS and ensure SW_VERSION constant exists */\n// Find the STATIC_ASSETS array and add '\'/assets/img/sprite.svg\','\n// Also ensure there is a line like: const SW_VERSION = "2"; (increment as needed)\n` ,

    'refs-replace-instructions.txt': `Replace references in your HTML/JS files: search for 'logo_heart.svg' and 'escultura_unique.png' and replace with '/assets/img/logo.svg' or '/assets/img/escultura_unique.png' as desired.\nExample sed (Git Bash):\nsed -i "s/logo_heart.svg/\/assets\/img\/logo.svg/g" $(git ls-files '*.html' '*.js' '*.css')\n` ,

    'at2-placeholders-instructions.txt': `Create @2x placeholders by copying existing gallery files: e.g. copy gallery-pet-1.webp -> gallery-pet-1@2x.webp.\nYou can use PowerShell:\nCopy-Item assets\\img\\gallery-pet-1.webp assets\\img\\gallery-pet-1@2x.webp\n` 
  };

  document.querySelectorAll('button[data-opt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const opt = btn.getAttribute('data-opt');
      if (opt === '1') {
        write(`Problemas detectados (resumo):\n\n- Arquivos referenciados no SW ou HTML que não existem: favicon.svg, logo_heart.svg, alguns @2x.webp.\n- shopCoords deve ser preenchido em assets/js/config.js (use o snippet gerado).\n- sprite.svg deve ser adicionado ao array STATIC_ASSETS em sw.js para cache.\n- Arquivos gerados/checks.json foram removidos; confirme se precisa restaurar algo.\n`);
      } else if (opt === '2') {
        const filename = 'assets/img/logo.svg';
        const content = files[filename];
        write('Gerado: ' + filename + '\n\nClique para baixar abaixo:');
        out.innerHTML += '<div style="margin-top:8px">' + makeDownload(filename, content) + '</div>';
      } else if (opt === '3') {
        const filename = 'refs-replace-instructions.txt';
        write('Instruções para substituição de referências (baixe o arquivo):');
        out.innerHTML += '<div style="margin-top:8px">' + makeDownload(filename, files[filename]) + '</div>';
      } else if (opt === '4') {
        const filename = 'assets/js/config-shopcoords.js';
        write('Gerado snippet para shopCoords. Baixe e cole dentro de assets/js/config.js ou substitua onde necessário.');
        out.innerHTML += '<div style="margin-top:8px">' + makeDownload(filename, files[filename]) + '</div>';
      } else if (opt === '5') {
        const filename = 'sw-add-sprite-snippet.txt';
        write('Snippet para sw.js gerado — baixe e edite seu sw.js conforme instruções.');
        out.innerHTML += '<div style="margin-top:8px">' + makeDownload(filename, files[filename]) + '</div>';
      } else if (opt === '6') {
        write('Gerando todos os snippets/arquivos. Baixe cada um abaixo e substitua no repositório local.');
        Object.keys(files).forEach(k => {
          out.innerHTML += '<div style="margin-top:6px">' + makeDownload(k, files[k]) + '</div>';
        });
      } else if (opt === '7') {
        write('Instruções rápidas:\n\n1) Faça backup do repositório atual.\n2) Baixe os arquivos gerados por este menu.\n3) Copie para o caminho relativo do repositório (sobrescrevendo quando apropriado).\n4) Abra http://localhost:8080 após iniciar um servidor local (python -m http.server 8080).\n5) Teste o funcionamento offline e registros de Service Worker no DevTools.');
      } else if (opt === '9') {
        write('Saída limpa. Escolha outra opção.');
      }
    });
  });
})();
