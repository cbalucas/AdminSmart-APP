# Guía de instalación y puesta en marcha del desarrollo

Esta guía prepara su computadora para que Claude Code programe Administración Inteligente dentro de Visual Studio Code. Se hace una sola vez; después, cada sesión de trabajo empieza en el paso 8. Los comandos se escriben en la terminal: en Windows, PowerShell (menú Inicio, escriba "PowerShell"); en Mac, Terminal.

## 1. Cuentas necesarias

| Cuenta | Para qué | Cuándo | Costo |
| --- | --- | --- | --- |
| Claude, plan Pro o Max | Usar Claude Code. El plan gratuito no lo incluye. Para sesiones largas de programación conviene Max. | Ahora | Pago mensual |
| GitHub (github.com) | Guardar el código en un repositorio privado; es también su respaldo. | Ahora | Gratis |
| Expo (expo.dev) | Probar la app en el teléfono y, más adelante, compilarla. | Ahora | Gratis |
| Supabase (supabase.com) | Base de datos en la nube, usuarios y archivos. | Cuando Claude Code lo pida (Preparación técnica) | Gratis para empezar |
| Google Cloud (console.cloud.google.com) | Clave de Google Maps para la ubicación de los bienes. Pide una tarjeta para activar la facturación; incluye un uso mensual sin cargo. | Al llegar a la tarea de Bienes | Uso gratuito mensual |
| Google Play Console y Apple Developer | Publicar la app en las tiendas. | Puesta en marcha | Pago (Google, único; Apple, anual) |

## 2. Programas a instalar, en este orden

1. **Node.js**, versión LTS (la que el sitio marca como recomendada): nodejs.org. Instalar con las opciones por defecto.
2. **Git**: git-scm.com/downloads. En Windows, "Git for Windows", con las opciones por defecto; Claude Code lo usa para ejecutar comandos.
3. **Visual Studio Code**: code.visualstudio.com.
4. **Claude Code** (programa de terminal). En PowerShell:

   ```
   irm https://claude.ai/install.ps1 | iex
   ```

   En Mac:

   ```
   curl -fsSL https://claude.ai/install.sh | bash
   ```

   Al terminar, cierre la terminal y abra una nueva.
5. **pnpm** (administrador de paquetes del proyecto):

   ```
   npm install -g pnpm
   ```

6. **Extensión Claude Code en VS Code**: abra VS Code, presione `Ctrl+Shift+X` (en Mac `Cmd+Shift+X`), busque "Claude Code", verifique que el autor sea Anthropic y presione Instalar.
7. **Expo Go en el teléfono**: desde Google Play o App Store.

## 3. Verificar la instalación

En una terminal nueva, ejecute uno por uno. Cada comando debe responder con un número de versión:

```
node -v
npm -v
git --version
pnpm -v
claude --version
```

Si alguno responde "no se reconoce", cierre y vuelva a abrir la terminal; si persiste, reinicie la computadora.

## 4. Configurar Git (una sola vez)

```
git config --global user.name "Su nombre y apellido"
git config --global user.email "su-email@ejemplo.com"
```

Use el mismo email de su cuenta de GitHub.

## 5. Crear la carpeta del proyecto

- Windows: `C:\Proyectos\administracion-inteligente`
- Mac: `Proyectos/administracion-inteligente` dentro de su carpeta personal

Evite el Escritorio, Documentos sincronizado con OneDrive o iCloud, y nombres con espacios o tildes.

## 6. Copiar el paquete de contexto

Descomprima `administracion-inteligente-paquete.zip` dentro de esa carpeta. Debe quedar así:

```
administracion-inteligente/
  CLAUDE.md
  PROMPT_INICIAL.md
  GUIA_DE_INSTALACION.md
  .gitignore
  docs/
    especificacion/   (6 archivos .md)
    prototipos/       (pantallas HTML y capturas)
    modelos/          (PDF y Excel modelo)
    marca/            (logo)
    CAMBIOS.md
```

`CLAUDE.md` es el archivo que Claude Code lee automáticamente al empezar cada sesión: contiene las reglas del proyecto. No lo borre ni lo mueva.

## 7. Abrir el proyecto e iniciar sesión

1. En VS Code: menú Archivo → Abrir carpeta → elija `administracion-inteligente`. Si pregunta si confía en los autores, responda que sí.
2. Abra Claude Code: haga clic en **✻ Claude Code** en la barra inferior derecha, o en el ícono de chispa de la barra lateral izquierda.
3. La primera vez aparece "Sign in": inicie sesión con su cuenta de Claude y autorice en el navegador.

## 8. Primera sesión

Abra `PROMPT_INICIAL.md`, copie el texto entre las líneas y péguelo en el panel de Claude Code. Claude Code va a:

1. Revisar que esté todo instalado.
2. Plantearle la decisión de sincronización sin conexión y esperar su respuesta.
3. Armar la estructura del proyecto y una pantalla inicial con el logo.
4. Guiarlo para crear el repositorio privado en GitHub y subir el código.

Cuando le pida crear el repositorio: en github.com, botón **New**, nombre `administracion-inteligente`, opción **Private**, sin README ni .gitignore, y **Create repository**.

## 9. Cómo se trabaja en cada sesión

1. Abra la carpeta en VS Code y el panel de Claude Code.
2. Pida la siguiente tarea de la hoja de ruta, por ejemplo: "Sigamos con la tarea 'Catálogo de conceptos' de la Fase 1".
3. Claude Code propone un plan breve: léalo y confirme.
4. Claude Code pide permiso antes de editar archivos o ejecutar comandos. Lea qué va a hacer y apruebe. Si algo no le resulta claro, pregúntele en el mismo panel.
5. Pruebe el resultado:
   - **Web**: Claude Code le indicará la dirección, normalmente `http://localhost:3000`, para abrirla en el navegador.
   - **App**: escanee con Expo Go el código QR que aparece en la terminal. El teléfono y la computadora deben estar en la misma red WiFi.
6. Si está conforme, Claude Code guarda los cambios en Git y los sube a GitHub.

## 10. Mantener la documentación al día

Durante el desarrollo, Claude Code anota en `docs/CAMBIOS.md` toda decisión que cambie o complete la especificación. Cada tanto, o al cerrar una tarea importante, traiga ese archivo a este proyecto de claude.ai. Aquí se actualizan el documento, los prototipos y los modelos de PDF y Excel, y usted recibe la carpeta `docs/especificacion` actualizada para reemplazar la anterior.

## 11. Cuidados

- Las claves de Supabase y Google van en archivos `.env`, que nunca se suben a GitHub ni se comparten por mensaje.
- No trabaje en carpetas sincronizadas con OneDrive o iCloud: generan conflictos con los miles de archivos del proyecto.
- GitHub es el respaldo del código: mientras cada tarea termine con un commit subido, no se pierde trabajo.
- Si algo deja de funcionar, describa el problema a Claude Code tal como lo ve, con el mensaje de error si lo hay.
