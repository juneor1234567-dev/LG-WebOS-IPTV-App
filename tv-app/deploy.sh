#!/bin/bash

# Script para empacotar e instalar o app no LG webOS

echo "================================"
echo "LG webOS TV Stream App Deploy"
echo "================================"

# 1. Limpar builds anteriores
echo "Limpando builds anteriores..."
rm -rf dist/
rm -rf *.ipk

# 2. Build da aplicação
echo "Compilando a aplicação..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
  echo "Erro: Build falhou!"
  exit 1
fi

# 3. Copiar appinfo.json para dist
echo "Preparando manifesto..."
cp appinfo.json dist/

# 4. Empacotar com ares-package (webOS SDK)
echo "Empacotando para webOS..."

# Verifique se tem ares-package instalado
if ! command -v ares-package &> /dev/null; then
  echo "Aviso: ares-package não encontrado."
  echo "Instale o LG webOS SDK CLI:"
  echo "  npm install -g @webos-tools/ares-cli"
  echo ""
  echo "Após instalar, execute novamente:"
  echo "  ./deploy.sh"
  exit 1
fi

# Empacotar
ares-package dist/

# Procurar o .ipk gerado
IPK_FILE=$(ls *.ipk 2>/dev/null | head -n1)

if [ -z "$IPK_FILE" ]; then
  echo "Erro: Arquivo .ipk não foi gerado!"
  exit 1
fi

echo "✓ App empacotado: $IPK_FILE"
echo ""
echo "Próximos passos:"
echo "1. Conecte sua TV LG webOS à rede"
echo "2. Encontre o IP da TV (Configurações > Rede)"
echo "3. Execute:"
echo "   ares-install --device <NOME_DA_TV> $IPK_FILE"
echo ""
echo "Exemplo com IP:"
echo "   ares-install --device 192.168.1.100:22 $IPK_FILE"
echo ""
echo "Para listar dispositivos:"
echo "   ares-device-info --list"
