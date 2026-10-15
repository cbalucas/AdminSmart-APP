# Prompt para la primera sesión

Copie el texto que está entre las líneas y péguelo en el panel de Claude Code dentro de VS Code.

---

Hola. Vamos a empezar el desarrollo de Administración Inteligente. Primero leé completo `CLAUDE.md` y después los archivos de `docs/especificacion/` (empezá por la hoja de ruta y la sección 6 de la especificación). Mirá también las capturas de `docs/prototipos/capturas/`.

Estamos en la etapa "3. Preparación técnica" de la hoja de ruta. En esta sesión quiero:

1. Que verifiques que en mi computadora están Node.js, pnpm y Git, y me indiques cómo instalar lo que falte.
2. Que me presentes, en pocas líneas y en lenguaje simple, la decisión pendiente sobre la sincronización sin conexión (PowerSync o desarrollo propio), con tu recomendación, y esperes mi respuesta.
3. Que armes la estructura del monorepo descrita en `CLAUDE.md` (sin funcionalidades todavía): web en Next.js, app en Expo, paquetes compartidos, archivo de textos en español y tokens de diseño de la sección 12 del mapa de pantallas.
4. Que dejes funcionando una pantalla de inicio mínima en la web y en la app, con el logo y los colores, para comprobar que todo levanta.
5. Que inicialices Git, hagas el primer commit y me guíes para subirlo a mi repositorio privado de GitHub.
6. Que anotes en `docs/CAMBIOS.md` las decisiones que tomemos.

Avanzá paso a paso y avisame cada vez que necesites que yo haga algo.

---

## Sesiones siguientes

Para cada tarea nueva alcanza con un pedido corto, por ejemplo:

- "Seguimos con la Preparación técnica: conectemos el proyecto de Supabase y armemos el esquema de base de datos según el diccionario."
- "Empecemos la Fase 1, tarea 'Propietarios con avatar, cuentas bancarias y su bien Gastos varios'."
- "Revisá la tarea anterior contra la especificación y los flujos, y corregí lo que no coincida."
