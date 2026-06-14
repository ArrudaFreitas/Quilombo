#!/bin/sh
set -e

CERT_DIR=/etc/nginx/certs
CERT="${CERT_DIR}/quilombo.crt"
KEY="${CERT_DIR}/quilombo.key"

# quilombo.ianarruda.dev é um domínio .dev — está na lista HSTS-preload, então o
# navegador FORÇA https e NÃO permite furar um certificado não-confiável. Por isso
# não geramos um auto-assinado aqui: o cert precisa ser confiável (mkcert no host).
if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
    echo "[tls] Certificado de dev ausente em ${CERT_DIR} (quilombo.crt / quilombo.key)." >&2
    echo "[tls] .dev é HSTS-preloaded: gere um certificado CONFIÁVEL com mkcert no host:" >&2
    echo "[tls]   mkcert -install                      # uma vez — confia a CA local" >&2
    echo "[tls]   ./infra/nginx/generate-dev-certs.sh  # gera os certs em infra/nginx/certs" >&2
    exit 1
fi

exec nginx -g "daemon off;"
