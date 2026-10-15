import Image from "next/image";
import { t } from "@ai/i18n";

// Logo y nombre de la aplicación, centrados, para las pantallas de acceso.
export function Cabecera() {
  return (
    <header className="cabecera">
      <Image src="/logo.svg" alt="" width={72} height={72} priority />
      <h1>{t("app.nombre")}</h1>
    </header>
  );
}
