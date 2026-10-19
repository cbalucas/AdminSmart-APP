"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import {
  calcularRecorteCuadrado,
  carpetaAvatarPropietario,
  esImagenDeAvatar,
  generarUuidV7,
  LADO_AVATAR,
  ZOOM_MAXIMO_AVATAR,
} from "@ai/domain";
import { guardarAvatarPropietario } from "@/app/(gestion)/propietarios/acciones";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { Avatar } from "./Avatar";
import { Icono } from "./Iconos";

const TAMANO_MAXIMO = 15 * 1024 * 1024;

// Avatar de la ficha con el botón de cámara (PRO-12): se elige una imagen, se encuadra en un
// cuadrado con zoom y desplazamiento, se reduce a 512 px y se sube al almacén de avatares.
export function CambiarFoto({
  propietarioId,
  organizacionId,
  nombre,
  url,
  tieneFoto,
}: {
  propietarioId: string;
  organizacionId: string;
  nombre: string;
  url: string | null;
  tieneFoto: boolean;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [imagen, setImagen] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  // Dibuja la vista previa con el recorte elegido.
  useEffect(() => {
    if (!imagen || !lienzo.current) return;
    const r = calcularRecorteCuadrado(imagen.width, imagen.height, zoom, dx, dy);
    const ctx = lienzo.current.getContext("2d");
    if (!ctx) return;
    lienzo.current.width = 256;
    lienzo.current.height = 256;
    ctx.drawImage(imagen, r.x, r.y, r.lado, r.lado, 0, 0, 256, 256);
  }, [imagen, zoom, dx, dy]);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const campo = e.target;
    const archivo = campo.files?.[0];
    if (!archivo) return;
    setError(null);
    try {
      if (!esImagenDeAvatar(archivo.type)) return setError("avatar.error_tipo");
      if (archivo.size > TAMANO_MAXIMO) return setError("avatar.error_grande");
      setImagen(await createImageBitmap(archivo));
      setZoom(1);
      setDx(0);
      setDy(0);
    } catch {
      setError("avatar.error_leer");
    } finally {
      // Se limpia al final para poder elegir de nuevo la misma imagen.
      campo.value = "";
    }
  }

  function cancelar() {
    setImagen(null);
    setError(null);
  }

  function guardar() {
    if (!imagen) return;
    iniciar(async () => {
      setError(null);
      // Recorte final a 512 × 512.
      const r = calcularRecorteCuadrado(imagen.width, imagen.height, zoom, dx, dy);
      const salida = document.createElement("canvas");
      salida.width = LADO_AVATAR;
      salida.height = LADO_AVATAR;
      salida.getContext("2d")!.drawImage(imagen, r.x, r.y, r.lado, r.lado, 0, 0, LADO_AVATAR, LADO_AVATAR);
      let tipo = "image/webp";
      let blob = await new Promise<Blob | null>((ok) => salida.toBlob(ok, tipo, 0.85));
      if (!blob || blob.type !== tipo) {
        tipo = "image/jpeg";
        blob = await new Promise<Blob | null>((ok) => salida.toBlob(ok, tipo, 0.85));
      }
      if (!blob) return setError("avatar.error_subir");

      // Nunca se pisa ni se borra un archivo: cada foto nueva lleva su propio nombre.
      const ruta = `${carpetaAvatarPropietario(organizacionId, propietarioId)}${generarUuidV7()}.${tipo === "image/webp" ? "webp" : "jpg"}`;
      const supabase = crearClienteNavegador();
      const { error: errorSubida } = await supabase.storage.from("avatares").upload(ruta, blob, { contentType: tipo });
      if (errorSubida) return setError("avatar.error_subir");

      const r2 = await guardarAvatarPropietario(propietarioId, ruta);
      if (r2.error) return setError(r2.error);
      setImagen(null);
      router.refresh();
    });
  }

  function quitar() {
    iniciar(async () => {
      const r = await guardarAvatarPropietario(propietarioId, null);
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="ficha-avatar">
      <div className="avatar-con-boton">
        <Avatar nombre={nombre} tamano={72} url={url} />
        <button
          type="button"
          className="avatar-boton"
          onClick={() => entrada.current?.click()}
          aria-label={t("avatar.cambiar")}
          title={t("avatar.cambiar")}
        >
          <Icono nombre="camara" tamano={15} />
        </button>
        <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={elegir} />
      </div>

      {error && <p className="error-campo" role="alert">{t(error)}</p>}

      {imagen && (
        <div className="recorte">
          <p className="muted">{t("avatar.ayuda")}</p>
          <canvas ref={lienzo} aria-label={t("avatar.titulo")} />
          <label>
            {t("avatar.zoom")}
            <input type="range" min={1} max={ZOOM_MAXIMO_AVATAR} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
          <label>
            {t("avatar.horizontal")}
            <input type="range" min={-1} max={1} step={0.02} value={dx} onChange={(e) => setDx(Number(e.target.value))} />
          </label>
          <label>
            {t("avatar.vertical")}
            <input type="range" min={-1} max={1} step={0.02} value={dy} onChange={(e) => setDy(Number(e.target.value))} />
          </label>
          <div className="acciones">
            <button type="button" className="boton boton-secundario" onClick={cancelar} disabled={pendiente}>{t("app.cancelar")}</button>
            <button type="button" className="boton" onClick={guardar} disabled={pendiente}>{t("avatar.guardar")}</button>
          </div>
        </div>
      )}

      {!imagen && tieneFoto && (
        <button type="button" className="boton-texto" onClick={quitar} disabled={pendiente}>{t("avatar.quitar")}</button>
      )}
    </div>
  );
}
