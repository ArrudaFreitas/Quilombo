#!/usr/bin/env bash
# Gera o certificado de DEV (mkcert) para o Nginx, cobrindo o diretório (raiz) e os
# subdomínios de tenant. Os arquivos vão para infra/nginx/certs/ (gitignored — contêm
# chave privada). Necessário porque quilombo.ianarruda.dev é um domínio .dev
# (HSTS-preloaded): o navegador não aceita certificado não-confiável.
#
# Pré-requisito (uma vez): instalar o mkcert e confiar a CA local no SO/navegador:
#   Arch:          sudo pacman -S nss mkcert
#   Debian/Ubuntu: sudo apt install libnss3-tools   (+ binário do mkcert)
#   mkcert -install
#
# Uso (na raiz do repo): ./infra/nginx/generate-dev-certs.sh
set -euo pipefail

if ! command -v mkcert >/dev/null 2>&1; then
  echo "ERRO: mkcert não encontrado. Instale-o e rode 'mkcert -install' antes." >&2
  exit 1
fi

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$CERT_DIR"

mkcert \
  -cert-file "$CERT_DIR/quilombo.crt" \
  -key-file  "$CERT_DIR/quilombo.key" \
  "quilombo.ianarruda.dev" "*.quilombo.ianarruda.dev" localhost 127.0.0.1

echo "Certificado de dev gerado em $CERT_DIR (quilombo.crt / quilombo.key)."
