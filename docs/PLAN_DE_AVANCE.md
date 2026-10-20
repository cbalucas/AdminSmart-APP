# Plan de avance — Fase 1 · gastos y depósitos

Se actualiza al terminar cada paso. Estado: ✅ hecho · 🔄 en curso · ⏳ por hacer.

| N.º | Paso | Estado | Qué incluye |
| --- | --- | --- | --- |
| 0 | Base: monorepo, esquema de base de datos (32 tablas), ingreso parte 1 | ✅ | Ya funcionando |
| 1 | Reglas de dominio y pruebas | ✅ | Importes en centavos, estado de obligación, saldo, monto a depositar, pago promedio, reparto de condominio (48 pruebas) |
| 2 | Inicio de gestión y navegación | ✅ | Menú, estructura de pantallas, modo claro/oscuro, textos en es-AR.json |
| 3 | Propietarios | ✅ | Listado, ficha, alta y edición, desactivar, Gastos varios automático, cuentas bancarias (alias o CBU, compartidas, predeterminada por moneda) y avatar con foto (recorte, 512 px) |
| 4 | Bienes y titulares | ✅ | Listado con filtros y agrupación por edificio, alta y edición por tipo, edificio opcional, titulares con porcentaje (puede sumar menos de 100 %), tres formas de liquidar y cambio de estado con PROP-03. **Pospuesto:** marcar el punto en el mapa de Google (falta la clave de Google Maps, que pide una tarjeta); el botón "Ver en Google Maps" ya funciona |
| 5 | Catálogo de conceptos y servicios del bien | ✅ | Catálogo de conceptos en Configuración (P-42) y pestaña Servicios e impuestos de cada bien (P-19), con los 8 servicios del Excel cargados |
| 6 | Obligaciones y gastos recurrentes | ✅ | 6a listado y reglas ✅ · 6b alta y edición ✅ · 6c ventana de fin de mes ✅ · 6d adjuntar boleta (foto o PDF) ✅ |
| 7 | Pagos y anulaciones | ✅ | Pago por obligación, contramovimiento, pago directo, con comprobante (foto o PDF) |
| 8 | Cuenta corriente | ✅ | Depósitos, ajustes, traspasos, saldo en pesos y dólares |
| 9 | Resumen de depósito en PDF | ✅ | 9a cálculo y pantalla ✅ · 9b PDF e historial (DEP-AAAA-NNNN) ✅ · 9c envío por WhatsApp ✅ (el envío por email queda para el final o una versión nueva con validación de Gmail y autorización de envío) |
| 10 | Datos de la administración y plantillas de envío | 🔄 | 10a datos y logo ✅ · 10b preferencias generales ⏳ · 10c plantillas editables ⏳ |
| 11 | Inicio del propietario | ⏳ | Vista de solo lectura para cada propietario |
| 12 | Auditoría y cierre de la fase | ⏳ | Pantalla de auditoría, revisión de pruebas y cobertura |
| — | Sincronización sin conexión (PowerSync) | ⏳ | Se decide cuándo intercalarla; hoy la app funciona en modo nube |
| — | Datos de prueba desde el Excel actual | ⏳ | Espera el archivo |
