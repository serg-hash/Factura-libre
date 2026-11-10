# Contribuir a Factura Libre

Gracias por echar una mano. El objetivo es una herramienta **honesta** para autónomos: útil, local, y sin fingir que es un programa certificado.

## Cómo trabajar

1. Haz un fork (o una rama) y abre un PR contra `main`.
2. Instala Node 20+ y ejecuta `npm install`.
3. Antes de pedir revisión:

   ```bash
   npm test
   npm run lint
   npm run typecheck
   npm run build
   ```

4. Si cambias la interfaz, regenera las capturas:

   ```bash
   npm run build
   npx playwright install chromium
   npm run screenshots
   ```

## Qué encaja

- Mejoras de cálculo (IVA, IRPF, recargo, redondeo a céntimos).
- Accesibilidad, i18n, plantilla PDF y Facturae **sin firmar**.
- Tests y documentación clara.

## Qué no encaja (todavía)

- Afirmar cumplimiento de **Veri*Factu**, SIF o Ley Antifraude.
- Enviar datos a un servidor, cuentas de usuario o analítica invasiva.
- Datos personales reales en ejemplos, issues o capturas.

## Enlace de partner Hostinger

<!-- HOSTINGER_PARTNER_URL -->

El README y `docs/hostinger.md` apuntan a la web oficial **sin código de referido**:

- https://www.hostinger.com/
- https://www.hostinger.es/

Cuando Sergio tenga su código de partner, sustituye esas URLs por la que Hostinger asigne (normalmente algo como `https://www.hostinger.com/in/your-code` o el enlace de afiliado del panel). Busca el comentario HTML `<!-- HOSTINGER_PARTNER_URL -->` en:

- `README.md`
- `README.en.md`
- `docs/hostinger.md`

No añadas un código de otra persona.

## Código de conducta breve

Sé respetuoso. Este repo lo usa gente que factura su trabajo; no ridiculices a nadie por preguntar sobre IVA o IRPF.
