
# Publicação e Releases

## Branches e Fluxo de Release

- `v0.1-LTS`: branch principal e estável para deploy no GitHub Pages.
- `feature/*`: desenvolvimento de novas funcionalidades.
- `hotfix/*`: correções rápidas e emergenciais.

## Checklist de Release

1. Atualize `config.json` (campo `appVersion` se aplicável).
2. Execute todos os testes automatizados e manuais, validando links do WhatsApp e fluxos principais.
3. Realize commit com mensagem clara e objetiva (preferencialmente em PT-BR) e crie tag de versão se necessário.
4. Em Settings → Pages, confirme que a branch publicada está correta.
5. Para forçar atualização do Service Worker nos clientes, incremente a versão de cache ou `appVersion` e faça novo commit.

## Deploy no GitHub Pages

- Configure o deploy para a branch `v0.1-LTS` na raiz do repositório.
- Após publicação, atualize os arquivos `robots.txt` e `sitemap.xml` com a URL final do site.

---

Este fluxo garante releases organizadas, rastreáveis e seguras, facilitando manutenção e auditoria do app.
