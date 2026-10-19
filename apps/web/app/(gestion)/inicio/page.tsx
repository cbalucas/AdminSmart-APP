import { t } from "@ai/i18n";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";

const fechaDeHoy = () =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeZone: "America/Argentina/Cordoba" }).format(new Date());

const INDICADORES = ["vencidas", "vencen_7", "sin_cobrar", "deuda_inquilinos", "total_administrado"] as const;

// P-07 Home de gestión y P-08 Home del propietario. Por ahora muestran la estructura: los datos
// llegan con las pantallas de propietarios, bienes, obligaciones y cuentas corrientes.
export default async function Inicio() {
  const { usuario } = await usuarioActual();
  if (!usuario) return null;
  const fecha = fechaDeHoy();

  if (!esGestion(usuario.roles)) {
    return (
      <>
        <div className="encabezado">
          <div>
            <p className="muted">{fecha}</p>
            <h1>{t("inicio.saludo", { nombre: usuario.nombre })}</h1>
          </div>
        </div>
        <section className="panel">
          <p className="muted">{t("inicio.propietario_proximamente")}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="muted">{fecha}</p>
          <h1>{t("inicio.titulo")}</h1>
        </div>
        <div className="acciones-rapidas">
          <button type="button" className="boton" disabled title={t("app.proximamente")}>
            {t("inicio.registrar_pago")}
          </button>
          <button type="button" className="boton boton-secundario" disabled title={t("app.proximamente")}>
            {t("inicio.registrar_cobro")}
          </button>
          <button type="button" className="boton boton-secundario" disabled title={t("app.proximamente")}>
            {t("inicio.nueva_obligacion")}
          </button>
        </div>
      </div>

      <section className="indicadores">
        {INDICADORES.map((clave) => (
          <article key={clave} className="indicador">
            <p className="muted">{t(`inicio.ind_${clave}`)}</p>
            <strong className="cifra">—</strong>
            <p className="muted">{t("inicio.sin_datos")}</p>
          </article>
        ))}
      </section>

      <div className="paneles">
        <section className="panel">
          <h2>{t("inicio.a_depositar")}</h2>
          <p className="muted">{t("inicio.a_depositar_vacio")}</p>
        </section>
        <section className="panel">
          <h2>{t("inicio.proximos_vencimientos")}</h2>
          <p className="muted">{t("inicio.proximos_vencimientos_vacio")}</p>
        </section>
      </div>
    </>
  );
}
