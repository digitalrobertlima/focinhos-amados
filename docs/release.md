# Publicação e Releases

Branching sugerido
- `v0.1-LTS` — estável (deploy do GitHub Pages).
- `feature/*` — desenvolvimento de features.
- `hotfix/*` — correções rápidas.

Checklist de release
1. Atualize `config.json` (versão em `appVersion` se aplicável; opcional).
2. Rode testes automatizados (ou manuais mínimos) e verifique WhatsApp links.
3. Suba commit com mensagem clara (PT-BR) e crie tag opcional.
4. Em Settings → Pages, garanta que a branch publicada está correta.
5. Para forçar atualização do SW em clientes, incremente versão de cache ou appVersion e faça commit.

GitHub Pages
- Source: Deploy from a branch → `v0.1-LTS` / root.
- Atualize `robots.txt` e `sitemap.xml` com a URL final do site.
