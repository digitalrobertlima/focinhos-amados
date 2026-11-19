/* =========================================================================
   ILUSTRAÇÕES "3D" — Focinhos Amados
   SVG vetorial com gradientes, brilhos e sombras para parecer volumétrico.
   Leve (poucos KB), nítido em qualquer tela, funciona offline.
   Todos os desenhos são originais (nenhum personagem ou marca).
   Uso: FA3D.desenho('banheira')  →  string <svg>
   ========================================================================= */
(function (global) {
  'use strict';

  let seq = 0;
  const uid = (p) => `${p}${++seq}`;

  // Gradiente radial com luz no canto superior esquerdo (efeito de volume)
  function bola(id, claro, base, escuro) {
    return `<radialGradient id="${id}" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="${claro}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${escuro}"/></radialGradient>`;
  }
  function linear(id, cores, x2 = 0, y2 = 1) {
    const stops = cores.map((c, i) => `<stop offset="${i / (cores.length - 1)}" stop-color="${c}"/>`).join('');
    return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
  }
  const brilho = (cx, cy, rx, ry, op = 0.7) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}"/>`;
  const svg = (corpo, vb = '0 0 200 200') =>
    `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${corpo}</svg>`;

  /* ---------------- Bolha de sabão ---------------- */
  function bolha() {
    const g = uid('b');
    return svg(`<defs><radialGradient id="${g}" cx="38%" cy="32%" r="70%">
        <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
        <stop offset=".45" stop-color="#c9f7ff" stop-opacity=".35"/>
        <stop offset=".8" stop-color="#9ad7ff" stop-opacity=".25"/>
        <stop offset=".93" stop-color="#e9b8ff" stop-opacity=".55"/>
        <stop offset="1" stop-color="#7cc8ff" stop-opacity=".75"/></radialGradient></defs>
      <circle cx="100" cy="100" r="90" fill="url(#${g})"/>
      ${brilho(68, 62, 26, 14, 0.85)}${brilho(140, 146, 8, 5, 0.6)}`);
  }

  /* ---------------- Banheira com espuma ---------------- */
  function banheira() {
    const corpo = uid('t'), borda = uid('t'), espuma = uid('t'), pe = uid('t'), agua = uid('t');
    const bolhas = [[48, 70, 20], [78, 58, 24], [112, 56, 26], [146, 66, 22], [64, 84, 16], [130, 82, 18], [96, 78, 20], [162, 84, 14], [36, 88, 13]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${espuma})" stroke="#a9d6ee" stroke-width="1.5"/>${brilho(x - r * 0.35, y - r * 0.4, r * 0.32, r * 0.2, 0.9)}`).join('');
    return svg(`<defs>
        ${linear(corpo, ['#ffffff', '#e6f6ff', '#b8dcef'])}
        ${linear(borda, ['#ffffff', '#d9eef9'])}
        ${bola(espuma, '#ffffff', '#eef8ff', '#b9dcf0')}
        ${bola(pe, '#ffe69a', '#f5b82e', '#b9790b')}
        ${linear(agua, ['#8fe3ff', '#3fb7ea'])}</defs>
      <ellipse cx="100" cy="182" rx="74" ry="8" fill="#0b3d1c" opacity=".12"/>
      <path d="M44 166 l-6 14 h14 l4-12z" fill="url(#${pe})"/><path d="M156 166 l6 14 h-14 l-4-12z" fill="url(#${pe})"/>
      <rect x="146" y="40" width="9" height="56" rx="4.5" fill="#c9d6de"/>
      <path d="M150 42 q0-16 -18-16 h-8" stroke="#c9d6de" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M22 96 h156 q0 74 -62 74 h-32 q-62 0 -62-74z" fill="url(#${corpo})"/>
      <path d="M22 96 h156 q0 8 -4 18 h-148 q-4-10 -4-18z" fill="url(#${agua})" opacity=".35"/>
      <rect x="14" y="88" width="172" height="14" rx="7" fill="url(#${borda})"/>
      ${brilho(48, 124, 10, 22, 0.55)}
      ${bolhas}`);
  }

  /* ---------------- Osso ---------------- */
  function osso() {
    const g = uid('o');
    return svg(`<defs>${bola(g, '#fffdf6', '#f6e7c8', '#cdb48a')}</defs>
      <g transform="rotate(-25 100 100)">
        <rect x="52" y="86" width="96" height="28" rx="14" fill="url(#${g})"/>
        <circle cx="50" cy="84" r="20" fill="url(#${g})"/><circle cx="50" cy="116" r="20" fill="url(#${g})"/>
        <circle cx="150" cy="84" r="20" fill="url(#${g})"/><circle cx="150" cy="116" r="20" fill="url(#${g})"/>
        ${brilho(46, 76, 8, 5)}${brilho(100, 93, 30, 4, 0.55)}</g>`);
  }

  /* ---------------- Patinha ---------------- */
  function pata(cor = '#029935') {
    const g = uid('p');
    const claro = cor === '#029935' ? '#7ef0a4' : '#ffd1dc';
    const escuro = cor === '#029935' ? '#016b25' : '#c2185b';
    const dedo = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.2}" fill="url(#${g})"/>${brilho(x - r * 0.3, y - r * 0.45, r * 0.35, r * 0.25)}`;
    return svg(`<defs>${bola(g, claro, cor, escuro)}</defs>
      <path d="M100 92 c30 0 52 30 52 52 c0 20 -18 26 -30 22 c-10 -3 -15 -6 -22 -6 s-12 3 -22 6 c-12 4 -30 -2 -30 -22 c0-22 22-52 52-52z" fill="url(#${g})"/>
      ${brilho(84, 110, 14, 8)}
      ${dedo(52, 78, 16)}${dedo(82, 48, 17)}${dedo(118, 48, 17)}${dedo(148, 78, 16)}`);
  }

  /* ---------------- Frasco de shampoo ---------------- */
  function shampoo() {
    const g = uid('s'), t = uid('s'), r = uid('s');
    return svg(`<defs>${linear(g, ['#7ef0a4', '#029935', '#015a1f'], 1, 0)}${linear(t, ['#ffffff', '#cfd8dc'], 1, 0)}${linear(r, ['#ffffff', '#e8fff0'])}</defs>
      <ellipse cx="100" cy="184" rx="44" ry="7" fill="#0b3d1c" opacity=".14"/>
      <rect x="84" y="18" width="32" height="26" rx="6" fill="url(#${t})"/>
      <path d="M116 26 h22 q6 0 6 6 v4 h-28z" fill="url(#${t})"/>
      <path d="M70 52 q0-10 10-10 h40 q10 0 10 10 l6 118 q0 12 -12 12 h-48 q-12 0 -12-12z" fill="url(#${g})"/>
      <rect x="76" y="92" width="48" height="50" rx="10" fill="url(#${r})"/>
      <path d="M100 104 c8 0 14 7 14 14 c0 6 -6 9 -9 8 c-3-1-3-2-5-2 s-2 1-5 2 c-3 1-9-2-9-8 c0-7 6-14 14-14z" fill="#029935"/>
      ${brilho(82, 72, 5, 20, 0.5)}`);
  }

  /* ---------------- Tesoura ---------------- */
  function tesoura() {
    const m = uid('c'), l = uid('c');
    return svg(`<defs>${linear(m, ['#ffffff', '#c3ccd3', '#7c8b96'], 1, 1)}${bola(l, '#ffb3c7', '#f0507a', '#a3123b')}</defs>
      <g transform="rotate(-35 100 100)">
        <path d="M96 100 L100 18 L110 22 L104 100z" fill="url(#${m})"/>
        <path d="M104 100 L132 24 L140 32 L110 104z" fill="url(#${m})"/>
        <circle cx="100" cy="100" r="6" fill="#5b6770"/>
        <circle cx="78" cy="148" r="24" fill="none" stroke="url(#${l})" stroke-width="13"/>
        <circle cx="126" cy="146" r="24" fill="none" stroke="url(#${l})" stroke-width="13"/>
        <path d="M97 104 L84 126 M106 104 L118 124" stroke="url(#${l})" stroke-width="13" stroke-linecap="round"/>
        ${brilho(70, 128, 6, 4)}</g>`);
  }

  /* ---------------- Cachorro (cabeça, original) ---------------- */
  function cachorro(opts = {}) {
    const g = uid('d'), o = uid('d'), f = uid('d');
    const base = opts.cor || '#e7b77a';
    const humor = opts.humor || 'feliz';
    const boca = humor === 'bravo'
      ? `<path d="M84 140 q16 -8 32 0" stroke="#3b2414" stroke-width="5" fill="none" stroke-linecap="round"/>
         <path d="M90 139 l3 7 l3-7 M104 139 l3 7 l3-7" fill="#fff" stroke="#3b2414" stroke-width="1.5"/>`
      : `<path d="M82 132 q18 18 36 0" stroke="#3b2414" stroke-width="5" fill="none" stroke-linecap="round"/>
         <path d="M94 140 q6 14 12 0z" fill="#f0507a"/>`;
    const sobr = humor === 'bravo'
      ? `<path d="M64 84 l22 8 M136 84 l-22 8" stroke="#3b2414" stroke-width="6" stroke-linecap="round"/>` : '';
    return svg(`<defs>${bola(g, '#fff1dc', base, '#9c6a32')}${bola(o, '#d79b5a', '#a86b2c', '#5e3812')}${bola(f, '#ffffff', '#fff6ea', '#ead3b5')}</defs>
      <ellipse cx="100" cy="186" rx="56" ry="7" fill="#0b3d1c" opacity=".14"/>
      <path d="M44 58 q-26 10 -22 60 q4 26 26 22 q10-30 14-66z" fill="url(#${o})"/>
      <path d="M156 58 q26 10 22 60 q-4 26 -26 22 q-10-30 -14-66z" fill="url(#${o})"/>
      <ellipse cx="100" cy="104" rx="62" ry="66" fill="url(#${g})"/>
      <ellipse cx="100" cy="132" rx="36" ry="28" fill="url(#${f})"/>
      ${sobr}
      <circle cx="78" cy="100" r="8" fill="#2a1a0e"/><circle cx="122" cy="100" r="8" fill="#2a1a0e"/>
      <circle cx="75" cy="97" r="2.6" fill="#fff"/><circle cx="119" cy="97" r="2.6" fill="#fff"/>
      <ellipse cx="100" cy="120" rx="11" ry="8" fill="#2a1a0e"/>${brilho(96, 117, 4, 2.2, 0.8)}
      ${boca}
      ${brilho(70, 64, 16, 9, 0.5)}`);
  }

  /* ---------------- Gato (cabeça, original) ---------------- */
  function gato() {
    const g = uid('g'), f = uid('g');
    return svg(`<defs>${bola(g, '#f4f4f6', '#9aa3ad', '#59626b')}${bola(f, '#ffffff', '#f4f6f8', '#d5dbe0')}</defs>
      <ellipse cx="100" cy="186" rx="56" ry="7" fill="#0b3d1c" opacity=".14"/>
      <path d="M46 84 l6-58 l40 32z" fill="url(#${g})"/><path d="M154 84 l-6-58 l-40 32z" fill="url(#${g})"/>
      <path d="M56 70 l3-30 l20 18z" fill="#f7a8bd"/><path d="M144 70 l-3-30 l-20 18z" fill="#f7a8bd"/>
      <ellipse cx="100" cy="110" rx="64" ry="60" fill="url(#${g})"/>
      <ellipse cx="100" cy="136" rx="32" ry="22" fill="url(#${f})"/>
      <ellipse cx="76" cy="104" rx="8" ry="10" fill="#2e7d32"/><ellipse cx="124" cy="104" rx="8" ry="10" fill="#2e7d32"/>
      <ellipse cx="76" cy="104" rx="3" ry="8" fill="#10220f"/><ellipse cx="124" cy="104" rx="3" ry="8" fill="#10220f"/>
      <path d="M93 124 h14 l-7 8z" fill="#f0507a"/>
      <path d="M100 132 q-8 10 -16 4 M100 132 q8 10 16 4" stroke="#4a4f55" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M60 128 h-30 M62 136 l-28 6 M140 128 h30 M138 136 l28 6" stroke="#4a4f55" stroke-width="2" stroke-linecap="round"/>
      ${brilho(72, 74, 16, 9, 0.45)}`);
  }

  /* ---------------- Coelho (outro pet) ---------------- */
  function outro() {
    const g = uid('r');
    return svg(`<defs>${bola(g, '#ffffff', '#f3ece4', '#cbbfb1')}</defs>
      <ellipse cx="100" cy="186" rx="50" ry="7" fill="#0b3d1c" opacity=".14"/>
      <ellipse cx="74" cy="54" rx="14" ry="44" fill="url(#${g})" transform="rotate(-10 74 54)"/>
      <ellipse cx="126" cy="54" rx="14" ry="44" fill="url(#${g})" transform="rotate(10 126 54)"/>
      <ellipse cx="74" cy="56" rx="6" ry="30" fill="#f7c1cf" transform="rotate(-10 74 56)"/>
      <ellipse cx="126" cy="56" rx="6" ry="30" fill="#f7c1cf" transform="rotate(10 126 56)"/>
      <ellipse cx="100" cy="128" rx="56" ry="52" fill="url(#${g})"/>
      <circle cx="80" cy="120" r="7" fill="#2a1a0e"/><circle cx="120" cy="120" r="7" fill="#2a1a0e"/>
      <circle cx="78" cy="117" r="2.2" fill="#fff"/><circle cx="118" cy="117" r="2.2" fill="#fff"/>
      <path d="M94 136 h12 l-6 6z" fill="#f0507a"/>
      ${brilho(76, 96, 14, 8, 0.6)}`);
  }

  /* ---------------- Pelo (amostra curta / média / longa) ---------------- */
  function pelo(tam = 'medio') {
    const g = uid('f');
    const n = { curto: 6, medio: 16, longo: 34 }[tam] || 16;
    const fios = Array.from({ length: 13 }, (_, i) => {
      const x = 34 + i * 11; const ond = i % 2 ? 6 : -6;
      return `<path d="M${x} 86 q${ond} ${n} 0 ${n * 2}" stroke="url(#${g})" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    }).join('');
    return svg(`<defs>${linear(g, ['#f6d7a6', '#d39a55', '#9c6a32'])}</defs>
      <ellipse cx="100" cy="182" rx="70" ry="6" fill="#0b3d1c" opacity=".12"/>
      <rect x="24" y="56" width="152" height="40" rx="20" fill="#e9c08a"/>
      ${fios}${brilho(60, 66, 24, 6, 0.55)}`);
  }

  /* ---------------- Frasco de perfume ---------------- */
  function perfume(intensidade = 'suave') {
    const v = uid('v'), t = uid('v');
    const nuvem = intensidade === 'nenhum' ? '' :
      Array.from({ length: intensidade === 'impacto' ? 7 : 3 }, (_, i) =>
        `<circle cx="${140 + i * 7}" cy="${46 - (i % 3) * 12 + i}" r="${6 + (i % 3) * 3}" fill="#e3b6ff" opacity="${0.75 - i * 0.07}"/>`).join('');
    const corpoOp = intensidade === 'nenhum' ? 0.35 : 1;
    return svg(`<defs>${bola(v, '#fbe9ff', '#c77dff', '#7b2cbf')}${linear(t, ['#fff6d6', '#e0b84a', '#9c7a12'], 1, 0)}</defs>
      <ellipse cx="96" cy="184" rx="46" ry="7" fill="#0b3d1c" opacity=".14"/>
      <g opacity="${corpoOp}">
      <rect x="84" y="30" width="24" height="22" rx="4" fill="url(#${t})"/>
      <path d="M108 38 h22" stroke="#9c7a12" stroke-width="5" stroke-linecap="round"/>
      <rect x="52" y="56" width="88" height="118" rx="30" fill="url(#${v})"/>
      ${brilho(72, 92, 8, 26, 0.55)}</g>
      ${nuvem}
      ${intensidade === 'nenhum' ? '<path d="M40 40 L156 172" stroke="#e53935" stroke-width="12" stroke-linecap="round"/>' : ''}`);
  }

  /* ---------------- Laço e gravata ---------------- */
  function laco() {
    const g = uid('l');
    return svg(`<defs>${bola(g, '#ffc4d6', '#f0507a', '#a3123b')}</defs>
      <ellipse cx="100" cy="176" rx="56" ry="7" fill="#0b3d1c" opacity=".12"/>
      <path d="M100 100 L30 54 q-14 46 0 92z" fill="url(#${g})"/>
      <path d="M100 100 L170 54 q14 46 0 92z" fill="url(#${g})"/>
      <path d="M94 104 l-24 58 l16-4 l8 14z M106 104 l24 58 l-16-4 l-8 14z" fill="url(#${g})"/>
      <circle cx="100" cy="100" r="18" fill="url(#${g})"/>${brilho(94, 92, 7, 4, 0.8)}${brilho(46, 80, 8, 14, 0.45)}`);
  }
  function gravata() {
    const g = uid('k');
    return svg(`<defs>${linear(g, ['#6ec6ff', '#1e88e5', '#0d47a1'], 1, 1)}</defs>
      <ellipse cx="100" cy="186" rx="40" ry="6" fill="#0b3d1c" opacity=".12"/>
      <path d="M82 26 h36 l-8 26 h-20z" fill="url(#${g})"/>
      <path d="M90 52 h20 l20 96 l-30 30 l-30-30z" fill="url(#${g})"/>
      <path d="M96 70 l14 -6 M94 98 l20 -8 M94 126 l24 -10" stroke="#fff" stroke-width="5" opacity=".5" stroke-linecap="round"/>
      ${brilho(94, 40, 8, 4, 0.6)}`);
  }
  function nada() {
    return svg(`<circle cx="100" cy="100" r="58" fill="none" stroke="#c5ccd3" stroke-width="12"/>
      <path d="M60 140 L140 60" stroke="#c5ccd3" stroke-width="12" stroke-linecap="round"/>`);
  }

  /* ---------------- Carro do Táxi Dog ---------------- */
  function carro(volta = false) {
    const c = uid('a'), v = uid('a'), r = uid('a');
    const seta = volta ? `<path d="M30 40 h48 m-12 -12 l12 12 l-12 12" stroke="#029935" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M170 40 h-48 m12 -12 l-12 12 l12 12" stroke="#f5a400" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return svg(`<defs>${linear(c, ['#ffe082', '#fbb800', '#c58200'])}${linear(v, ['#e3f6ff', '#8fd3f4'])}${bola(r, '#7d8790', '#3b4148', '#15181b')}</defs>
      ${seta}
      <ellipse cx="100" cy="170" rx="82" ry="8" fill="#0b3d1c" opacity=".14"/>
      <path d="M24 124 q0-22 22-24 l20-28 q6-8 16-8 h44 q10 0 16 8 l20 26 q24 2 26 26 v18 q0 8 -8 8 h-148 q-8 0 -8-8z" fill="url(#${c})"/>
      <path d="M74 76 h22 v24 h-38z" fill="url(#${v})"/><path d="M104 76 h22 q4 0 7 4 l14 20 h-43z" fill="url(#${v})"/>
      <rect x="86" y="54" width="30" height="12" rx="4" fill="#029935"/>
      <circle cx="58" cy="152" r="18" fill="url(#${r})"/><circle cx="148" cy="152" r="18" fill="url(#${r})"/>
      <circle cx="58" cy="152" r="6" fill="#cfd8dc"/><circle cx="148" cy="152" r="6" fill="#cfd8dc"/>
      <path d="M90 118 c6 0 10 5 10 10 c0 4 -4 6 -6 5 c-2-1-2-1-4-1 s-2 0-4 1 c-2 1-6-1-6-5 c0-5 4-10 10-10z" fill="#029935"/>
      ${brilho(52, 106, 14, 5, 0.6)}`);
  }

  /* ---------------- Pessoa levando o pet (coleira) ---------------- */
  function coleira() {
    const g = uid('e'), m = uid('e');
    return svg(`<defs>${bola(g, '#b7f5cb', '#029935', '#014d1b')}${bola(m, '#fff3c4', '#f5b82e', '#a8750a')}</defs>
      <ellipse cx="100" cy="182" rx="60" ry="7" fill="#0b3d1c" opacity=".12"/>
      <circle cx="100" cy="104" r="56" fill="none" stroke="url(#${g})" stroke-width="20"/>
      <rect x="138" y="78" width="26" height="40" rx="8" fill="url(#${m})"/>
      <circle cx="100" cy="166" r="14" fill="url(#${m})"/><path d="M100 152 v-10" stroke="#a8750a" stroke-width="5"/>
      ${brilho(70, 66, 14, 6, 0.6)}`);
  }

  /* ---------------- Cofre com moedas ---------------- */
  function moeda(simbolo = '₿', tipo = 'ouro') {
    const g = uid('m');
    const cores = {
      ouro: ['#fff3b0', '#f5b400', '#a86d00', '#7a4f00'],
      eth: ['#e1e7ff', '#7b8cf0', '#3d4fb8', '#1f2a6b'],
      verde: ['#c9ffd9', '#22c55e', '#11753a', '#0a4a24'],
    }[tipo] || ['#fff3b0', '#f5b400', '#a86d00', '#7a4f00'];
    return svg(`<defs>${bola(g, cores[0], cores[1], cores[2])}</defs>
      <ellipse cx="100" cy="108" rx="84" ry="84" fill="${cores[3]}"/>
      <circle cx="100" cy="100" r="84" fill="url(#${g})"/>
      <circle cx="100" cy="100" r="64" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6"/>
      <text x="100" y="128" text-anchor="middle" font-family="system-ui,Segoe UI,Arial" font-weight="900" font-size="84" fill="${cores[3]}" opacity=".85">${simbolo}</text>
      ${brilho(66, 58, 22, 12, 0.6)}`);
  }

  function cofre() {
    const c = uid('q'), p = uid('q'), h = uid('q');
    const parafusos = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45) * Math.PI / 180;
      return `<circle cx="${100 + Math.cos(a) * 60}" cy="${100 + Math.sin(a) * 60}" r="5" fill="#9aa5ae"/>`;
    }).join('');
    return svg(`<defs>${linear(c, ['#59636c', '#2e353b', '#1b2025'], 1, 1)}${bola(p, '#e9eef2', '#aab6c0', '#5d6870')}${bola(h, '#c9ffd9', '#22c55e', '#0d5c2b')}</defs>
      <ellipse cx="100" cy="190" rx="78" ry="7" fill="#0b3d1c" opacity=".16"/>
      <rect x="14" y="14" width="172" height="172" rx="24" fill="url(#${c})"/>
      <circle cx="100" cy="100" r="74" fill="url(#${p})"/>
      <circle cx="100" cy="100" r="74" fill="none" stroke="#2e353b" stroke-width="4"/>
      ${parafusos}
      <circle cx="100" cy="100" r="30" fill="url(#${h})"/>
      <path d="M100 70 v-16 M100 130 v16 M70 100 h-16 M130 100 h16" stroke="#3a454d" stroke-width="10" stroke-linecap="round"/>
      <path d="M92 92 c5 0 8 4 8 8 c0 3-3 5-5 4 c-2-1-2-1-3-1 s-1 0-3 1 c-2 1-5-1-5-4 c0-4 3-8 8-8z" transform="translate(8 0)" fill="#fff" opacity=".9"/>
      ${brilho(50, 44, 18, 8, 0.25)}${brilho(78, 64, 16, 8, 0.5)}`);
  }

  /* ---------------- Calendário e relógio ---------------- */
  function calendario() {
    const t = uid('h'), f = uid('h');
    return svg(`<defs>${linear(t, ['#7ef0a4', '#029935'])}${linear(f, ['#ffffff', '#eaf2ee'])}</defs>
      <ellipse cx="100" cy="184" rx="66" ry="7" fill="#0b3d1c" opacity=".12"/>
      <rect x="30" y="40" width="140" height="136" rx="22" fill="url(#${f})"/>
      <path d="M30 62 q0-22 22-22 h96 q22 0 22 22 v18 h-140z" fill="url(#${t})"/>
      <rect x="58" y="24" width="12" height="30" rx="6" fill="#5d6870"/><rect x="130" y="24" width="12" height="30" rx="6" fill="#5d6870"/>
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((k) => `<rect x="${48 + k * 28}" y="${92 + r * 20}" width="18" height="12" rx="4" fill="${r === 1 && k === 2 ? '#f5a400' : '#cfe0d6'}"/>`).join('')).join('')}
      ${brilho(62, 54, 18, 5, 0.5)}`);
  }

  const MAPA = {
    bolha, banheira, osso, pata, shampoo, tesoura, cachorro, gato, outro, pelo, perfume,
    laco, gravata, nada, carro, coleira, cofre, moeda, calendario,
  };

  function desenho(nome, ...args) {
    const fn = MAPA[nome];
    return fn ? fn(...args) : '';
  }

  global.FA3D = { desenho };
})(window);
