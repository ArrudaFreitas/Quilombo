#!/bin/sh
set -e

CERT_DIR=/etc/nginx/certs
CERT="${CERT_DIR}/quilombo.crt"
KEY="${CERT_DIR}/quilombo.key"

if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
    echo "[tls] Gerando certificado auto-assinado para *.quilombo.localhost..."
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$KEY" \
        -out "$CERT" \
        -subj "/C=BR/ST=Dev/L=Dev/O=Quilombo/CN=quilombo.localhost" \
        -addext "subjectAltName=DNS:quilombo.localhost,DNS:*.quilombo.localhost,IP:127.0.0.1" \
        2>/dev/null
    echo "[tls] Certificado criado — para confiar nele localmente, importe ${CERT} como CA raiz."
fi

exec nginx -g "daemon off;"
