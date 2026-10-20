"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@ai/i18n";
import { formatearImporte } from "@ai/domain";
import { Icono } from "@/components/Iconos";
import { IconoBien } from "@/components/IconoBien";
import { completarGastos, dejarDeRepetir } from "@/app/(gestion)/obligaciones/ventana";
import type { ItemVentana } from "@/lib/ventana";

const CLAVE_POSPUESTA = "ventana_gastos_pospuesta";

// Importe en centavos a texto es-AR editable: 981050 → "9810,50".
const aTextoEditable = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");

interface Valor {
  monto: string;
  vencimiento: string;
}

// P-48 Completar gastos del mes (OBL-08). Aparece al ingresar; "Recordar más tarde" la cierra solo
// hasta el próximo ingreso. Con ?completar=1 se abre aunque se haya pospuesto.
export function VentanaFinDeMes({ items, mes }: { items: ItemVentana[]; mes: string }) {
  const router = useRouter();
  const forzada = useSearchParams().get("completar") === "1";
  const [pendiente, iniciar] = useTransition();
  const [abierta, setAbierta] = useState(false);
  const [lista, setLista] = useState(items);
  const [valores, setValores] = useState<Record<string, Valor>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pospuesta = false;
    try {
      pospuesta = sessionStorage.getItem(CLAVE_POSPUESTA) === "1";
    } catch {
      /* sin almacenamiento: se muestra igual */
    }
    // El almacenamiento del navegador solo se puede leer en el cliente: el primer dibujo (el del servidor) sale cerrado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbierta(items.length > 0 && (forzada || !pospuesta));
    // Solo al montar: si se pospone, un refresco posterior no la vuelve a abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forzada]);

  if (!abierta || lista.length === 0) return null;

  const valor = (id: string): Valor => valores[id] ?? { monto: "", vencimiento: "" };
  const cambiar = (id: string, parcial: Partial<Valor>) => setValores({ ...valores, [id]: { ...valor(id), ...parcial } });
  const completos = lista.filter((i) => valor(i.id).monto.trim() !== "");

  function posponer() {
    try {
      sessionStorage.setItem(CLAVE_POSPUESTA, "1");
    } catch {
      /* se cierra igual */
    }
    setAbierta(false);
  }

  function guardar() {
    setError(null);
    iniciar(async () => {
      const r = await completarGastos(completos.map((i) => ({ id: i.id, monto: valor(i.id).monto, vencimiento: valor(i.id).vencimiento })));
      setLista((l) => l.filter((i) => !r.guardados.includes(i.id)));
      setError(r.error ?? null);
      router.refresh();
    });
  }

  function dejar(id: string) {
    setError(null);
    iniciar(async () => {
      const r = await dejarDeRepetir(id);
      if (r.error) return setError(r.error);
      setLista((l) => l.filter((i) => i.id !== id));
      router.refresh();
    });
  }

  // Los gastos se agrupan por propietario y bien.
  const grupos: { titulo: string; items: ItemVentana[] }[] = [];
  for (const i of lista) {
    const titulo = `${i.propietario} · ${i.bien}`;
    const g = grupos.find((x) => x.titulo === titulo);
    if (g) g.items.push(i);
    else grupos.push({ titulo, items: [i] });
  }

  return (
    <div className="ventana-fondo" role="presentation">
      <div className="ventana" role="dialog" aria-modal="true" aria-labelledby="ventana-titulo">
        <header className="ventana-cabecera">
          <span className="ventana-icono" aria-hidden="true"><Icono nombre="recurrente" tamano={22} /></span>
          <div>
            <h2 id="ventana-titulo">{t("ventana.titulo", { mes })}</h2>
            <p className="muted">{t("ventana.ayuda")}</p>
          </div>
        </header>
        <div className="ventana-progreso">
          <div className="progreso-barra">
            <span style={{ width: `${(completos.length / lista.length) * 100}%` }} />
          </div>
          <span className="muted">{t("ventana.progreso", { hechos: completos.length, total: lista.length })}</span>
        </div>

        <div className="ventana-cuerpo">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <h3 className="ventana-grupo">{g.titulo}</h3>
              {g.items.map((i) => (
                <div key={i.id} className="ventana-fila">
                  <div className="ventana-dato celda-bien-icono">
                    <IconoBien tipo={i.tipoBien} />
                    <div className="ventana-dato-texto">
                    <strong>{i.concepto}</strong>
                    <span className="muted">
                      {t("ventana.periodo", { periodo: i.periodo.slice(0, 7).split("-").reverse().join("/") })}
                      {i.anterior !== null && ` · ${t("ventana.anterior", { monto: formatearImporte(i.anterior, i.moneda) })}`}
                    </span>
                    </div>
                  </div>
                  <div className="campo">
                    <label htmlFor={`m-${i.id}`}>{t("ventana.monto")} ({i.moneda})</label>
                    <input
                      id={`m-${i.id}`}
                      type="text"
                      inputMode="decimal"
                      value={valor(i.id).monto}
                      onChange={(e) => cambiar(i.id, { monto: e.target.value })}
                    />
                  </div>
                  <div className="campo">
                    <label htmlFor={`v-${i.id}`}>{t("ventana.vencimiento")}</label>
                    <input id={`v-${i.id}`} type="date" value={valor(i.id).vencimiento} onChange={(e) => cambiar(i.id, { vencimiento: e.target.value })} />
                  </div>
                  <div className="ventana-acciones">
                    <button
                      type="button"
                      className="boton boton-secundario"
                      disabled={i.anterior === null}
                      onClick={() => i.anterior !== null && cambiar(i.id, { monto: aTextoEditable(i.anterior) })}
                    >
                      {t("ventana.usar_anterior")}
                    </button>
                    <button type="button" className="boton-texto" disabled={pendiente} onClick={() => dejar(i.id)}>
                      {t("ventana.dejar_de_repetir")}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        {error && <p className="aviso-error" role="alert">{t(error)}</p>}
        <footer className="ventana-pie">
          <p className="muted">{t("ventana.pie")}</p>
          <div className="acciones">
            <button type="button" className="boton boton-secundario" onClick={posponer}>{t("ventana.mas_tarde")}</button>
            <button type="button" className="boton" disabled={pendiente || completos.length === 0} onClick={guardar}>
              {completos.length === 1 ? t("ventana.guardar_uno") : t("ventana.guardar", { cantidad: completos.length })}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
