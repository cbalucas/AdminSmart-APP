// Genera el APK (para instalar en el teléfono) y el AAB (para Google Play) de la app móvil.
// Uso: pnpm --filter mobile generar:android
// Los archivos quedan en apps/mobile/releases/<versión>/ (esa carpeta no se sube a Git).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esWindows = process.platform === "win32";

// JDK: el de Android Studio (si no hay JAVA_HOME) y SDK de Android en su lugar habitual.
const candidatosJdk = [process.env.JAVA_HOME, "C:/Program Files/Android/Android Studio/jbr"].filter(Boolean);
const javaHome = candidatosJdk.find((d) => fs.existsSync(path.join(d, "bin", esWindows ? "java.exe" : "java")));
const candidatosSdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(process.env.LOCALAPPDATA ?? os.homedir(), "Android", "Sdk")].filter(Boolean);
const androidHome = candidatosSdk.find((d) => fs.existsSync(path.join(d, "platforms")));
if (!javaHome) throw new Error("No se encontró Java (JDK 17 o 21). Instalá Android Studio o definí JAVA_HOME.");
if (!androidHome) throw new Error("No se encontró el SDK de Android. Instalá Android Studio o definí ANDROID_HOME.");
const entorno = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: androidHome, CI: "1" };

function ejecutar(comando, args, opciones = {}) {
  console.log(`\n> ${comando} ${args.join(" ")}`);
  const r = spawnSync(comando, args, { stdio: "inherit", env: entorno, shell: esWindows, cwd: raiz, ...opciones });
  if (r.status !== 0) throw new Error(`Falló: ${comando} ${args.join(" ")}`);
}

const paqueteJson = path.join(raiz, "package.json");
const original = fs.readFileSync(paqueteJson, "utf8");
const app = JSON.parse(fs.readFileSync(path.join(raiz, "app.json"), "utf8")).expo;
const version = app.version;
const codigo = app.android?.versionCode;
if (!codigo) throw new Error("Falta android.versionCode en app.json.");

try {
  // 1. Proyecto nativo de Android a partir de app.json (se regenera cada vez; no se sube a Git).
  ejecutar("npx", ["expo", "prebuild", "--platform", "android", "--no-install"]);
} finally {
  // "prebuild" cambia los scripts "android" e "ios" de package.json: se dejan como estaban.
  fs.writeFileSync(paqueteJson, original);
}

// 2. Compilación: APK firmado con la clave de depuración y AAB.
const android = path.join(raiz, "android");
fs.writeFileSync(path.join(android, "local.properties"), `sdk.dir=${androidHome.replace(/\\/g, "/")}\n`);
ejecutar(esWindows ? "gradlew.bat" : "./gradlew", ["assembleRelease", "bundleRelease", "--no-daemon"], { cwd: android });

// 3. Se copian los archivos con un nombre claro.
const destino = path.join(raiz, "releases", version);
fs.mkdirSync(destino, { recursive: true });
const nombre = `AdminSmart-${version}-${codigo}`;
const apk = path.join(android, "app", "build", "outputs", "apk", "release", "app-release.apk");
const aab = path.join(android, "app", "build", "outputs", "bundle", "release", "app-release.aab");
fs.copyFileSync(apk, path.join(destino, `${nombre}.apk`));
fs.copyFileSync(aab, path.join(destino, `${nombre}.aab`));
console.log(`\nListo. Archivos en ${destino}:\n  ${nombre}.apk\n  ${nombre}.aab`);
