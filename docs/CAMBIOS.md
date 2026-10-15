# Registro de cambios respecto de la especificación 1.0

Cada entrada anota una decisión tomada durante el desarrollo que cambia o completa la especificación. El usuario lleva este archivo a su proyecto de claude.ai para actualizar el documento, los prototipos y los modelos.

| Fecha | Cambio | Motivo | Afecta a | Sincronizado |
| --- | --- | --- | --- | --- |
| 14/10/2026 | Se parte de la especificación 1.0 | Inicio del desarrollo | — | Sí |
| 15/10/2026 | Sincronización sin conexión: se adopta PowerSync (no desarrollo propio) | Los pagos y depósitos son dinero; se prioriza una solución probada. Los registros contables son solo de inserción, lo que reduce los conflictos | Especificación 6.3 y 6.4; Hoja de ruta, etapa 3 | No |
| 15/10/2026 | Monorepo armado en la raíz del proyecto (pnpm workspaces + Turborepo). Paquetes con prefijo @ai/ (ui, i18n, domain, db, sync). Web con Next.js 16 y app con Expo 57 | Estructura de la sección 6.5; el prefijo @ai/ evita choques de nombres | Especificación 6.4 y 6.5; Hoja de ruta, etapa 4 (Estructura del proyecto) | No |
| 15/10/2026 | Se agrega el paquete packages/i18n (archivo es-AR.json) a la estructura del monorepo | CLAUDE.md lo exige y la sección 6.5 de la especificación no lo lista | Especificación 6.5; Mapa de pantallas, sección 13 | No |
| 15/10/2026 | El nombre de la aplicación pasa de "Administración Inteligente" a "AdminSmart" (textos visibles, nombre de la app móvil, repositorio y carpetas) | Decisión del usuario | Especificación (nombre y pie de PDF "Generado por…"), Mapa de pantallas sección 12, prototipos, modelos de PDF, textos de envío | No |
