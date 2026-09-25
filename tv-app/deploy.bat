@echo off
REM Script para empacotar e instalar o app no LG webOS (Windows)

echo ================================
echo LG webOS TV Stream App Deploy
echo ================================

REM 1. Limpar builds anteriores
echo Limpando builds anteriores...
if exist dist (
  rmdir /s /q dist
)
for /f *.ipk %%f in ('dir /b *.ipk 2^>nul') do del "%%f"

REM 2. Build da aplicação
echo Compilando a aplicação...
call npm run build

REM Verificar se o build foi bem-sucedido
if not exist dist (
  echo Erro: Build falhou!
  exit /b 1
)

REM 3. Copiar appinfo.json para dist
echo Preparando manifesto...
copy appinfo.json dist\

REM 4. Empacotar com ares-package (webOS SDK)
echo Empacotando para webOS...

where ares-package >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Aviso: ares-package não encontrado.
  echo Instale o LG webOS SDK CLI:
  echo   npm install -g @webos-tools/ares-cli
  echo.
  echo Após instalar, execute novamente este script.
  exit /b 1
)

REM Empacotar
call ares-package dist\

REM Procurar o .ipk gerado
for /f %%f in ('dir /b *.ipk 2^>nul') do (
  set IPK_FILE=%%f
  goto :found
)

echo Erro: Arquivo .ipk não foi gerado!
exit /b 1

:found
echo ✓ App empacotado: %IPK_FILE%
echo.
echo Próximos passos:
echo 1. Conecte sua TV LG webOS à rede
echo 2. Encontre o IP da TV (Configurações ^> Rede)
echo 3. Execute:
echo    ares-install --device ^<NOME_DA_TV^> %IPK_FILE%
echo.
echo Exemplo com IP:
echo    ares-install --device 192.168.1.100:22 %IPK_FILE%
echo.
echo Para listar dispositivos:
echo    ares-device-info --list
echo.
pause
