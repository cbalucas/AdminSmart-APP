// Inicia Expo con un nombre de dominio en lugar del número IP de esta computadora.
//
// Por qué: Supabase no acepta direcciones con número IP como destino de retorno del ingreso con
// Google ni del enlace de recuperación (por ejemplo, exp://192.168.0.121:8081). Acepta nombres.
// sslip.io es un servicio público que convierte "192-168-0-121.sslip.io" en 192.168.0.121.
//
// Requisito: el teléfono tiene que poder resolver ese nombre. Algunos routers lo bloquean; en ese
// caso se configura el DNS de Google (8.8.8.8) en el teléfono. Ver CLAUDE.md.
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

function direccionLocal() {
  const candidatas = [];
  for (const [nombre, interfaces] of Object.entries(networkInterfaces())) {
    for (const i of interfaces ?? []) {
      if (i.family !== "IPv4" || i.internal) continue;
      const [a, b] = i.address.split(".").map(Number);
      const privada = a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
      if (privada) candidatas.push({ nombre, direccion: i.address });
    }
  }
  // Se prefiere la red Wi-Fi o Ethernet sobre adaptadores virtuales (Docker, WSL, VPN).
  const virtual = /vethernet|wsl|docker|virtual|vpn|bluetooth|loopback/i;
  return (candidatas.find((c) => !virtual.test(c.nombre)) ?? candidatas[0])?.direccion;
}

const ip = process.env.IP_LOCAL ?? direccionLocal();
if (!ip) {
  console.error("No encontré la dirección de red de esta computadora. Conectate a una red Wi-Fi o Ethernet.");
  process.exit(1);
}

const nombre = `${ip.replaceAll(".", "-")}.sslip.io`;
console.log(`Dirección de esta computadora: ${ip}`);
console.log(`Expo usará el nombre: ${nombre}`);

const proceso = spawn("npx", ["expo", "start", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: nombre },
});
proceso.on("exit", (codigo) => process.exit(codigo ?? 0));
