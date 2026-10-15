# Hoja de ruta

Oct 14, 2026

La definición y el diseño están cerrados: el documento quedó aprobado como versión final 1.0 el 14/10/2026. De 63 pasos, 21 están hechos. El próximo paso es la preparación técnica: herramientas, repositorio, Supabase, esquema de base de datos y el paquete de contexto para Claude Code. Durante el desarrollo, cada cambio o modificación se reflejará en todas las pestañas afectadas, en los prototipos y en los modelos de PDF y Excel.

| Etapa | Hechos | Total | Estado |
| --- | --- | --- | --- |
| 1. Definición | 10 | 10 | Completa |
| 2. Diseño | 9 | 9 | Completo |
| 3. Preparación técnica | 2 | 8 | En curso |
| 4. Desarrollo Fase 1 · gastos y depósitos | 0 | 16 | Por iniciar |
| 5. Desarrollo Fase 2 · alquileres | 0 | 5 | Por iniciar |
| 6. Desarrollo Fase 3 · contabilidad | 0 | 5 | Por iniciar |
| 7. Desarrollo Fase 4 · automatización | 0 | 3 | Por iniciar |
| 8. Puesta en marcha | 0 | 7 | Por iniciar |

Los totales están al día a la fecha de arriba; las casillas de cada etapa son las que se tildan al avanzar.

## 1. Definición

- [x] Especificación funcional y técnica: objetivos, roles, requerimientos, reglas contables y arquitectura
- [x] Decisiones de alcance: una administración, acceso de propietarios, pesos y dólares, circuito de fondos, IPC informativo
- [x] Diccionario de datos: 20 objetos con campos, obligatoriedad y reglas
- [x] Idiomas: de la aplicación y de los informes
- [x] Flujos de los procesos principales con 79 escenarios
- [x] Resolución de los 13 vacíos detectados
- [x] Comparación con el Excel actual: gastos recurrentes, vehículos y gastos varios, pago promedio
- [x] Confirmar las propuestas pendientes del Excel: cuota "n de m", período bimestral, pago por un tercero y conciliación con el saldo real de la cuenta
- [x] Definir el nombre del listado: Bienes
- [x] Revisión final del documento completo: aprobada como versión final 1.0

## 2. Diseño

- [x] Mapa de pantallas: 49 pantallas con contenido, acciones y roles
- [x] Sistema visual: modo claro y modo oscuro
- [x] Prototipos de 5 pantallas clave, web y app, y propuestas de logo
- [x] Español, inglés y portugués en los prototipos
- [x] Modelos de PDF (liquidación, resumen de depósito, recibo) y Excel de exportación
- [x] Confirmar el formato de los PDF y del Excel
- [x] Textos del email y del mensaje de WhatsApp que acompañan a cada PDF
- [x] Nombre de la aplicación (definido: Administración Inteligente) y logo (elegido: Mosaico)
- [x] Prototipos de las pantallas de Fase 1 que faltan: obligaciones, ventana de fin de mes, resumen de depósito y ficha del propietario

## 3. Preparación técnica

- [x] Arquitectura y herramientas definidas: web y app con base local y nube en Supabase
- [ ] Instalar en la computadora: Node.js, Git, VS Code y Claude Code
- [ ] Crear el repositorio en GitHub
- [ ] Crear el proyecto en Supabase y la clave de Google Maps
- [ ] Decidir la sincronización sin conexión: PowerSync o desarrollo propio
- [ ] Esquema de base de datos: tablas, claves, restricciones y seguridad por usuario
- [x] Paquete de contexto para Claude Code: CLAUDE.md, documentos exportados, prompt inicial y guía de instalación
- [ ] Datos de prueba a partir del Excel actual

## 4. Desarrollo Fase 1 · gastos y depósitos

- [ ] Estructura del proyecto: web y app sobre la misma base
- [ ] Base local y sincronización con la nube
- [ ] Ingreso, registro, invitaciones y recuperación de contraseña
- [ ] Usuarios, roles y permisos
- [ ] Propietarios con avatar, cuentas bancarias y su bien Gastos varios
- [ ] Bienes (inmuebles, terrenos, vehículos y otros) con ubicación en Google Maps, titulares con reparto por porcentaje y servicios
- [ ] Catálogo de conceptos
- [ ] Obligaciones, gastos recurrentes y ventana de fin de mes
- [ ] Pagos y anulaciones
- [ ] Cuenta corriente en pesos y dólares: depósitos, ajustes y saldo
- [ ] Resumen de depósito en PDF y envío por email y WhatsApp
- [ ] Datos y logo de la administración y plantillas de envío editables
- [ ] Inicio de gestión e inicio del propietario
- [ ] Modo claro y oscuro, y textos en archivos de idioma (solo español en la versión 1.0)
- [ ] Auditoría de cambios
- [ ] Pruebas automáticas de las reglas contables

## 5. Desarrollo Fase 2 · alquileres

- [ ] Inquilinos
- [ ] Contratos y renovaciones
- [ ] Canon por tramos
- [ ] Quién paga qué en cada contrato
- [ ] Cobros, recibos y recupero de gastos del inquilino

## 6. Desarrollo Fase 3 · contabilidad

- [ ] Liquidaciones y su envío
- [ ] Honorarios de administración
- [ ] Cierre y reapertura de períodos
- [ ] Reglas de reparto por concepto y liquidación al representante en condominio
- [ ] Reportes y exportación a Excel

## 7. Desarrollo Fase 4 · automatización

- [ ] Histórico de IPC importado del INDEC
- [ ] Notificaciones en la app y por email
- [ ] Acceso de inquilinos

## 8. Puesta en marcha

- [ ] Pruebas con datos reales según los criterios de aceptación
- [ ] Migración de los datos del Excel actual
- [ ] Publicación de la web: dominio y alojamiento
- [ ] Publicación en Google Play y App Store, con sus cuentas de desarrollador
- [ ] Respaldos y monitoreo
- [ ] Guía de uso
- [ ] Traducción al inglés y al portugués de la aplicación, los informes y los textos de envío, con la versión 1.0 en español funcionando
