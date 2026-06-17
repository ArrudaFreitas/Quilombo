# Reverse proxy de dev (nginx + TLS)

O nginx termina o TLS e serve tudo em **mesmo origin** (`https://<host>:8080`), roteando
`/api`, `/oauth2`*, `/actuator` e o Swagger para o backend e todo o resto para o frontend,
preservando o `Host` que resolve o tenant pelo subdomínio.

> \* O login não usa mais o redirect do Google — é o `POST /api/v1/auth/google` (idToken do
> Google Identity Services). Não há redirect URI; o Google Cloud Console só precisa das
> **Authorized JavaScript origins**.

## Domínio de dev e `/etc/hosts`

A aplicação usa `quilombo.ianarruda.dev` (e `*.quilombo.ianarruda.dev`). O domínio real só
resolve em produção; no dev mapeie-o para `127.0.0.1`:

```
# /etc/hosts (adicione os slugs que precisar testar)
127.0.0.1  quilombo.ianarruda.dev kalunga.quilombo.ianarruda.dev palmares.quilombo.ianarruda.dev frechal.quilombo.ianarruda.dev
```

## Certificado TLS (mkcert — obrigatório)

`.dev` está na lista **HSTS-preload**: o navegador força https e **não permite** furar um
certificado não-confiável. Por isso o cert precisa ser emitido por uma CA local confiável
(mkcert) — um auto-assinado seria bloqueado.

```bash
# 1) Instale o mkcert e confie a CA local (uma vez):
#    Arch: sudo pacman -S nss mkcert | Debian/Ubuntu: sudo apt install libnss3-tools (+ mkcert)
mkcert -install

# 2) Gere os certs de dev (em infra/nginx/certs/, gitignored):
./infra/nginx/generate-dev-certs.sh
```

Sem os certs, o nginx falha no boot com instruções (ver `entrypoint.sh`).

## Google Cloud Console (login)

Cliente do tipo **Aplicativo da Web**. Em **Authorized JavaScript origins**, registre as
origens onde o botão renderiza (uma por host, sem wildcard):

```
https://quilombo.ianarruda.dev:8080
https://kalunga.quilombo.ianarruda.dev:8080
https://palmares.quilombo.ianarruda.dev:8080
https://frechal.quilombo.ianarruda.dev:8080
```

Exporte o mesmo client-id para o backend (audiência do idToken) e o front (botão GIS):

```bash
export GOOGLE_CLIENT_ID=...apps.googleusercontent.com   # back e front leem esta var
export DEV_ADMIN_EMAIL=voce@gmail.com                   # o seed te registra como admin
```
