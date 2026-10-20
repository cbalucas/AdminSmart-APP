import { t } from "@ai/i18n";

// Mientras llegan los datos de la pantalla se muestra este esqueleto: la navegación responde al instante.
export default function Cargando() {
  return (
    <div className="esqueleto" role="status" aria-label={t("app.cargando")}>
      <div className="esqueleto-barra esqueleto-titulo" />
      <div className="esqueleto-fila">
        <div className="esqueleto-barra esqueleto-tarjeta" />
        <div className="esqueleto-barra esqueleto-tarjeta" />
        <div className="esqueleto-barra esqueleto-tarjeta" />
      </div>
      <div className="esqueleto-barra esqueleto-panel" />
    </div>
  );
}
