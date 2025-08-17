@echo off
chcp 65001 >nul
REM ============================
REM Script .BAT - VS Code Launcher com UTF-8
REM Narrador técnico ativado
REM ============================

echo =====================================================
echo INICIANDO SCRIPT DE ABERTURA DO VS CODE - M.E.S.A.
echo =====================================================
echo.

echo [INFO] Data e hora da execução:
echo   Comando usado: echo %date% %time%
echo.
echo %date% %time%
echo.

echo [INFO] Pasta atual onde o script está rodando:
echo   Comando usado: cd
echo.
cd
echo.

echo [INFO] Detectando sistema operacional:
echo   Comando usado: ver | findstr /i "Windows"
ver | findstr /i "Windows" >nul
if %errorlevel% == 0 (
    echo   Resultado: Windows detectado.
    echo   Sistema operacional definido como Windows.
) else (
    echo   Resultado: Sistema operacional diferente de Windows.
    echo   Aviso: Este script foi desenvolvido para Windows.
)
echo.

echo [INFO] Verificando se o VS Code está instalado e disponível no PATH:
echo   Comando usado: where code
where code >nul 2>&1
if %errorlevel% == 0 (
    echo   Resultado: VS Code encontrado no PATH.
) else (
    echo   ERRO: VS Code não encontrado no PATH.
    echo   Para corrigir, adicione o VS Code ao PATH ou instale-o.
    pause
    exit /b 1
)
echo.

echo [INFO] Preparando para abrir VS Code na pasta atual:
echo   Comando usado: code .
echo.

echo [AÇÃO] Executando comando para abrir VS Code na pasta atual...
code .
echo.

echo [SUCESSO] VS Code foi aberto com sucesso na pasta:
cd
echo.

echo Finalizando script.
pause
exit /b 0
