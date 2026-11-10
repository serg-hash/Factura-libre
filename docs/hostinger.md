# Desplegar Factura Libre en Hostinger

Factura Libre es un sitio **estático**. No necesita Node en producción, PHP ni base de datos: el navegador guarda las facturas en IndexedDB.

<!-- HOSTINGER_PARTNER_URL -->
Alojamiento: [Hostinger](https://www.hostinger.com/) · [Hostinger España](https://www.hostinger.es/)

(Sergio añadirá más adelante su enlace de partner. Ver `CONTRIBUTING.md`.)

## Opción A — sube la carpeta `dist/`

1. En tu máquina:

   ```bash
   npm ci
   BASE_PATH=/ npm run build
   ```

   `BASE_PATH=/` porque en un dominio o subdominio propio la app vive en la raíz. No uses `/Factura-libre` salvo que la cuelgues en una subcarpeta con ese nombre.

2. En hPanel: **Sitios web → Administrar → Administrador de archivos** (o FTP).
3. Entra en `public_html` (o la carpeta del dominio).
4. Sube **el contenido** de `dist/` (`index.html`, `_astro/`, `favicon.svg`…). El `index.html` debe quedar en la raíz del sitio, no dentro de una carpeta extra llamada `dist`.
5. Abre `https://tu-dominio/` y pulsa **Cargar ejemplo**.

Si ves la página de bienvenida de Hostinger, borra el `default.php` / placeholder y vuelve a subir `index.html`.

## Opción B — Git auto-deploy (plan que lo permita)

1. Conecta GitHub en hPanel (**Sitios web → Administrar → Avanzado → Git**).
2. Apunta al repositorio `serg-hash/Factura-libre`, rama `main`.
3. Hostinger clonará el código fuente. Como este proyecto **hay que construirlo**, o bien:

   - construyes en CI y despliegas solo `dist/` desde otra rama/`gh-pages`, o
   - usas un plan con build de Node y `npm run build`, `output_directory`: `dist`, variable `BASE_PATH=/`.

La vía más simple y barata es la **A**: generar `dist/` en casa o en GitHub Actions y subir el estático.

## Docker en un VPS Hostinger

Si tienes un VPS:

```bash
docker build -t factura-libre .
docker run -d -p 80:80 --name factura-libre factura-libre
```

La imagen usa nginx y sirve `dist/` en `/`.

## Después del despliegue

- Cada navegador tiene **su** copia de las facturas. Un móvil y un portátil no se sincronizan solos: usa **Ajustes → Exportar JSON**.
- HTTPS es recomendable (Hostinger lo activa con SSL gratuito).
- No es un programa certificado. Sigue aplicando el aviso del README.
