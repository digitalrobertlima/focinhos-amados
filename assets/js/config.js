@echo off
REM Criar as pastas principais
mkdir components
mkdir assets
mkdir assets\img
mkdir assets\icons
mkdir data

REM Criar arquivos HTML na raiz (apenas vazios)
type nul > index.html
type nul > agendar.html
type nul > delivery.html
type nul > taxi.html
type nul > sobre.html
type nul > 404.html

REM Criar arquivos CSS e JS na raiz (vazios)
type nul > style.css
type nul > config.js
type nul > main.js
type nul > sw.js
type nul > manifest.webmanifest

REM Criar arquivos HTML na pasta components (vazios)
type nul > components\resumo.html
type nul > components\wizard.html

REM Criar arquivo vazio para logo.svg (você pode substituir depois)
type nul > assets\img\logo.svg

REM Criar arquivo JSON vazio na pasta data
echo {} > data\presets.json

echo Estrutura criada com sucesso!
pause
