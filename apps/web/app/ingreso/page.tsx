import { redirect } from "next/navigation";
import Image from "next/image";
import { t } from "@ai/i18n";
import { consultarConfiguracion } from "@/lib/configuracion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioIngreso } from "./FormularioIngreso";

// P-02 Ingreso
export default async function Ingreso({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await consultarConfiguracion()) === false) redirect("/configuracion-inicial");

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/inicio");

  const { error } = await searchParams;
  return (
    <main className="ingreso-pagina">
      <section className="ingreso-marca">
        <div className="ingreso-marca-cuerpo">
          <Image src="/logo.svg" alt="" width={72} height={72} priority />
          <h1>{t("app.nombre")}</h1>
          <p className="ingreso-lema">{t("app.lema")}</p>
          <ul className="ingreso-puntos">
            {["ingreso.punto_1", "ingreso.punto_2", "ingreso.punto_3"].map((clave) => (
              <li key={clave}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                {t(clave)}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="ingreso-panel">
        <FormularioIngreso errorInicial={error === "enlace" ? "ingreso.error_enlace" : undefined} />
      </section>
    </main>
  );
}
