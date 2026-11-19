/* Selos de fidelidade assinados — sem servidor.
   A loja tem uma chave privada que fica SÓ no celular da dona (painel.html).
   Cada selo é um "recibo" assinado (ECDSA P-256, a mesma família de assinatura usada em blockchains)
   que diz: "o celular X tem N banhos e já resgatou R prêmios". O selo é cumulativo: basta guardar o último.
   O app do cliente confere a assinatura com a chave pública publicada no config.json.
   Ninguém consegue inventar um selo sem a chave privada, e um selo de outro número não vale. */
(function (global) {
  'use strict';
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
  const SIG = { name: 'ECDSA', hash: 'SHA-256' };
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const b64u = (buf) => {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const deb64u = (s) => {
    const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  };

  /* Níveis da trilha. O 1º prêmio é a hidratação; os seguintes ainda são mistério. */
  const NIVEIS = [
    { at: 3, icone: '💧', nome: 'Hidratação de brinde', desc: 'Complete 3 banhos e ganhe uma hidratação.' },
    { at: 6, misterio: true }, { at: 9, misterio: true }, { at: 12, misterio: true },
  ];

  /* Telefone: só dígitos, DDD + número (sem o 55). */
  function normTel(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
    if (d.length > 11 && d.startsWith('0')) d = d.replace(/^0+/, '');
    return d;
  }
  const telValido = (v) => /^\d{10,11}$/.test(normTel(v));
  async function hashTel(v) {
    const h = await crypto.subtle.digest('SHA-256', enc.encode('focinhos-amados:' + normTel(v)));
    return b64u(new Uint8Array(h).slice(0, 12)); // o selo não leva o número em si
  }

  async function gerarChaves() {
    const k = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', k.privateKey);
    const pub = await crypto.subtle.exportKey('jwk', k.publicKey);
    return { priv, pub: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y } };
  }
  const mesmaChave = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;

  async function assinar(payload, privJwk) {
    const key = await crypto.subtle.importKey('jwk', privJwk, ALG, false, ['sign']);
    const corpo = b64u(enc.encode(JSON.stringify(payload)));
    const sig = await crypto.subtle.sign(SIG, key, enc.encode(corpo));
    return `${corpo}.${b64u(sig)}`;
  }

  /* Devolve o conteúdo do selo se a assinatura for válida; senão null. */
  async function verificar(token, pubJwk) {
    try {
      if (!pubJwk || !pubJwk.x) return null;
      const t = extrair(token); if (!t) return null;
      const [corpo, sig] = t.split('.');
      const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pubJwk.x, y: pubJwk.y, ext: true }, ALG, false, ['verify']);
      const ok = await crypto.subtle.verify(SIG, key, deb64u(sig), enc.encode(corpo));
      if (!ok) return null;
      const p = JSON.parse(dec.decode(deb64u(corpo)));
      if (p.v !== 1 || typeof p.h !== 'string' || !Number.isInteger(p.n) || !Number.isInteger(p.r) || p.n < 0 || p.r < 0) return null;
      return p;
    } catch (_) { return null; }
  }

  /* Aceita o link inteiro ("...fidelidade.html#selo=XXX"), só o token, ou texto com o link no meio. */
  function extrair(texto) {
    const s = String(texto || '').trim();
    const m = s.match(/selo=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/) || s.match(/^([A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{40,})$/);
    return m ? m[1] : '';
  }

  /* Situação da trilha a partir de n (banhos) e r (prêmios já resgatados). */
  function situacao(n, r) {
    const prox = NIVEIS[r];
    return {
      n, r,
      podeResgatar: !!prox && !prox.misterio && n >= prox.at,
      proximo: prox || null,
      faltam: prox ? Math.max(0, prox.at - n) : 0,
    };
  }

  global.FA_SELO = { NIVEIS, normTel, telValido, hashTel, gerarChaves, mesmaChave, assinar, verificar, extrair, situacao, b64u };
})(window);
