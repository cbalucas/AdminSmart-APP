"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { formatoDeLogoGuardado, generarUuidV7, logoSaleEnPdf, validarLogo } from "@ai/domain";
import { guardarLogo, quitarLogo } from "@/app/(gestion)/configuracion/administracion/acciones";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

// P-40 Logo de la administración: PNG, JPG o SVG de hasta 2 MB. Se sube al almacén privado y se enlaza.
// Un logo SVG se ve en la aplicación pero no sale en los PDF (el motor de PDF no lo dibuja).
export function LogoAdministracion({ organizacionId, rutaActual, url }: { organizacionId: string; rutaActual: string | null; url: string | null }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formatoActual = rutaActual ? formatoDeLogoGuardado(rutaActual) : null;

  function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    const valido = validarLogo({ tipoMime: archivo.type, tamano: archivo.size });
    if (!valido.ok) return setError(valido.error);
    iniciar(async () => {
      // Cada logo nuevo lleva su propio nombre: nunca se pisa ni se borra el anterior.
      const ruta = `${organizacionId}/logo-${generarUuidV7()}.${valido.formato}`;
      const { error: errorSubida } = await crearClienteNavegador().storage.from("marca").upload(ruta, archivo, { contentType: archivo.type });
      if (errorSubida) return setError("administracion.error_logo");
      const r = await guardarLogo(ruta);
      if (r.error) return setError(r.error);
      router.refresh();
    });
    if (entrada.current) entrada.current.value = "";
  }

  function quitar() {
    setError(null);
    iniciar(async () => {
      const r = await quitarLogo();
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="logo-admin">
      <div className="logo-vista" aria-label={t("administracion.logo")}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={t("administracion.logo")} />
        ) : (
          <span className="muted">{t("administracion.sin_logo")}</span>
        )}
      </div>
      <div className="logo-acciones">
        <input ref={entrada} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={(e) => elegir(e.target.files?.[0])} />
        <div className="acciones-fila">
          <button type="button" className="boton boton-secundario" disabled={pendiente} onClick={() => entrada.current?.click()}>
            {pendiente ? t("adjuntos.subiendo") : url ? t("administracion.cambiar_logo") : t("administracion.subir_logo")}
          </button>
          {url && (
            <button type="button" className="boton-texto" disabled={pendiente} onClick={quitar}>
              {t("administracion.quitar_logo")}
            </button>
          )}
        </div>
        <p className="muted">{t("administracion.ayuda_logo")}</p>
        <p className={formatoActual === "svg" ? "aviso-advertencia" : "muted"}>{t("administracion.leyenda_svg")}</p>
        {formatoActual && logoSaleEnPdf(formatoActual) && <p className="muted">{t("administracion.logo_en_pdf")}</p>}
        {error && <p className="error-campo" role="alert">{t(error)}</p>}
      </div>
    </div>
  );
}
