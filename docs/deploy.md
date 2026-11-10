# Despliegue

## Demo en GitHub Pages

La demo pública debe quedar en:

https://serg-hash.github.io/Factura-libre/

El workflow `.github/workflows/pages.yml` construye con `BASE_PATH=/Factura-libre` (el nombre del repo va con F mayúscula). Astro prefixa CSS, JS y enlaces internos.

Tras el primer merge a `main`:

1. Repo → **Settings → Pages**
2. Source: **GitHub Actions**
3. Deja correr el workflow *GitHub Pages*

Si GitHub responde 403 al activarlo por API, hay que hacerlo a mano con esos valores. No reintentar en bucle.

## Docker (VPS)

```bash
docker build -t factura-libre .
docker run --rm -p 8080:80 factura-libre
```

Abre http://localhost:8080 — aquí `BASE_PATH=/`.

## Hostinger

Ver [hostinger.md](./hostinger.md).
