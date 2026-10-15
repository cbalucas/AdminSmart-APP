import Image from "next/image";
import { t } from "@ai/i18n";

export default function Inicio() {
  return (
    <main className="inicio">
      <div className="tarjeta">
        <Image src="/logo.svg" alt={t("app.nombre")} width={96} height={96} priority />
        <h1>{t("app.nombre")}</h1>
        <div className="resalte" />
        <p className="muted">{t("app.lema")}</p>
        <span className="etiqueta">{t("inicio.estado")}</span>
      </div>
      <p className="muted">{t("inicio.version")}</p>
    </main>
  );
}
