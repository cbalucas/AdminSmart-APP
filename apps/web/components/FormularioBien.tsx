"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { t } from "@ai/i18n";
import { ESTADOS_POR_TIPO, TIPOS_BIEN, estadoInicial, subtiposDe, tieneDireccion, type TipoBien } from "@ai/domain";
import type { EstadoFormularioBien } from "@/lib/formulario-bien";

export interface ValoresBien {
  tipoBien: TipoBien;
  subtipo: string;
  alias: string;
  calle: string;
  numero: string;
  piso: string;
  departamento: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  latitud: string;
  longitud: string;
  dominio: string;
  marcaModelo: string;
  anio: string;
  estado: string;
  edificioNombre: string;
  unidadFuncional: string;
  observaciones: string;
}

export const VALORES_BIEN_NUEVO: ValoresBien = {
  tipoBien: "inmueble",
  subtipo: "",
  alias: "",
  calle: "",
  numero: "",
  piso: "",
  departamento: "",
  localidad: "Córdoba",
  provincia: "Córdoba",
  codigoPostal: "",
  latitud: "",
  longitud: "",
  dominio: "",
  marcaModelo: "",
  anio: "",
  estado: "",
  edificioNombre: "",
  unidadFuncional: "",
  observaciones: "",
};

export interface EdificioOpcion {
  id: string;
  nombre: string;
  direccion: string;
}
export interface PropietarioOpcion {
  id: string;
  nombre: string;
}

type Accion = (anterior: EstadoFormularioBien, formulario: FormData) => Promise<EstadoFormularioBien>;

// P-17 Alta y edición de bien. Qué se pide depende del tipo. En el alta se carga también el primer
// titular; los demás se agregan desde la ficha (no hace falta completar el 100 %).
export function FormularioBien({
  accion,
  valores,
  edificios,
  propietarios,
  cancelarHref,
  editando = false,
}: {
  accion: Accion;
  valores: ValoresBien;
  edificios: EdificioOpcion[];
  propietarios?: PropietarioOpcion[];
  cancelarHref: string;
  editando?: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoFormularioBien);
  const [tipo, setTipo] = useState<TipoBien>(valores.tipoBien);
  const [nombreEdificio, setNombreEdificio] = useState(valores.edificioNombre);
  const errores = estado.errores ?? {};
  const error = (campo: string) =>
    errores[campo] ? (
      <span className="error-campo" role="alert">
        {t(errores[campo])}
      </span>
    ) : null;

  const subtipos = subtiposDe(tipo);
  const conDireccion = tieneDireccion(tipo);
  const edificio = tipo === "inmueble" ? edificios.find((e) => e.nombre.trim().toLowerCase() === nombreEdificio.trim().toLowerCase()) : undefined;
  const heredaDireccion = Boolean(edificio);
  const estados = ESTADOS_POR_TIPO[tipo];

  return (
    <form action={enviar} className="formulario-ancho" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      {/* Las coordenadas se conservan al editar; se cargan marcando el punto en el mapa. */}
      <input type="hidden" name="latitud" value={valores.latitud} />
      <input type="hidden" name="longitud" value={valores.longitud} />

      <fieldset className="grupo">
        <legend>{t("bienes.seccion_tipo")}</legend>
        <div className={subtipos.length > 0 ? "fila fila-3" : "fila fila-2"}>
          <div className="campo">
            <label htmlFor="tipoBien">{t("bienes.campo_tipo")}</label>
            {editando ? (
              <>
                <input type="hidden" name="tipoBien" value={tipo} />
                <input id="tipoBien" type="text" value={t(`tipo_bien.${tipo}`)} readOnly />
              </>
            ) : (
              <select id="tipoBien" name="tipoBien" value={tipo} onChange={(e) => setTipo(e.target.value as TipoBien)}>
                {TIPOS_BIEN.map((tb) => (
                  <option key={tb} value={tb}>{t(`tipo_bien.${tb}`)}</option>
                ))}
              </select>
            )}
          </div>
          {subtipos.length > 0 ? (
            <div className="campo">
              <label htmlFor="subtipo">{t("bienes.campo_subtipo")}</label>
              <select id="subtipo" name="subtipo" defaultValue={valores.subtipo} aria-invalid={Boolean(errores.subtipo)}>
                <option value="">—</option>
                {subtipos.map((s) => (
                  <option key={s} value={s}>{t(`subtipo.${s}`)}</option>
                ))}
              </select>
              {error("subtipo")}
            </div>
          ) : null}
          <div className="campo">
            <label htmlFor="estado">{t("bienes.campo_estado")}</label>
            <select id="estado" name="estado" defaultValue={valores.estado || estadoInicial(tipo)} key={tipo}>
              {estados.map((e) => (
                <option key={e} value={e}>{t(`estado_bien.${e}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="alias">{t("bienes.campo_alias")}</label>
          <input id="alias" name="alias" type="text" defaultValue={valores.alias} aria-invalid={Boolean(errores.alias)} />
          {error("alias")}
        </div>
      </fieldset>

      {tipo === "inmueble" && (
        <fieldset className="grupo">
          <legend>{t("bienes.seccion_edificio")}</legend>
          <p className="muted">{t("bienes.edificio_ayuda")}</p>
          <div className="fila fila-2">
            <div className="campo">
              <label htmlFor="edificioNombre">{t("bienes.campo_edificio")}</label>
              <input
                id="edificioNombre"
                name="edificioNombre"
                type="text"
                list="lista-edificios"
                value={nombreEdificio}
                onChange={(e) => setNombreEdificio(e.target.value)}
                autoComplete="off"
              />
              <datalist id="lista-edificios">
                {edificios.map((e) => (
                  <option key={e.id} value={e.nombre} />
                ))}
              </datalist>
            </div>
            <div className="campo">
              <label htmlFor="unidadFuncional">{t("bienes.campo_unidad")}</label>
              <input id="unidadFuncional" name="unidadFuncional" type="text" defaultValue={valores.unidadFuncional} />
            </div>
          </div>
          {nombreEdificio.trim() !== "" && (
            <p className="aviso-info">
              {edificio ? t("bienes.edificio_existente", { direccion: edificio.direccion }) : t("bienes.edificio_nuevo")}
            </p>
          )}
        </fieldset>
      )}

      {conDireccion && (
        <fieldset className="grupo">
          <legend>{t("bienes.seccion_direccion")}</legend>
          {!heredaDireccion && (
            <>
              <div className="fila fila-calle">
                <div className="campo">
                  <label htmlFor="calle">{t("bienes.campo_calle")}</label>
                  <input id="calle" name="calle" type="text" defaultValue={valores.calle} aria-invalid={Boolean(errores.calle)} />
                  {error("calle")}
                </div>
                <div className="campo">
                  <label htmlFor="numero">{t("bienes.campo_numero")}</label>
                  <input id="numero" name="numero" type="text" defaultValue={valores.numero} aria-invalid={Boolean(errores.numero)} />
                  {error("numero")}
                </div>
              </div>
              <div className="fila fila-3">
                <div className="campo">
                  <label htmlFor="localidad">{t("bienes.campo_localidad")}</label>
                  <input id="localidad" name="localidad" type="text" defaultValue={valores.localidad} aria-invalid={Boolean(errores.localidad)} />
                  {error("localidad")}
                </div>
                <div className="campo">
                  <label htmlFor="provincia">{t("bienes.campo_provincia")}</label>
                  <input id="provincia" name="provincia" type="text" defaultValue={valores.provincia} aria-invalid={Boolean(errores.provincia)} />
                  {error("provincia")}
                </div>
                <div className="campo">
                  <label htmlFor="codigoPostal">{t("bienes.campo_cp")}</label>
                  <input id="codigoPostal" name="codigoPostal" type="text" defaultValue={valores.codigoPostal} />
                </div>
              </div>
            </>
          )}
          <div className="fila fila-2">
            <div className="campo">
              <label htmlFor="piso">{t("bienes.campo_piso")}</label>
              <input id="piso" name="piso" type="text" defaultValue={valores.piso} />
            </div>
            <div className="campo">
              <label htmlFor="departamento">{t("bienes.campo_departamento")}</label>
              <input id="departamento" name="departamento" type="text" defaultValue={valores.departamento} />
            </div>
          </div>
        </fieldset>
      )}

      {tipo === "vehiculo" && (
        <fieldset className="grupo">
          <legend>{t("bienes.seccion_vehiculo")}</legend>
          <div className="fila fila-3">
            <div className="campo">
              <label htmlFor="dominio">{t("bienes.campo_dominio")}</label>
              <input id="dominio" name="dominio" type="text" autoCapitalize="characters" defaultValue={valores.dominio} aria-invalid={Boolean(errores.dominio)} />
              {error("dominio")}
            </div>
            <div className="campo">
              <label htmlFor="marcaModelo">{t("bienes.campo_marca")}</label>
              <input id="marcaModelo" name="marcaModelo" type="text" defaultValue={valores.marcaModelo} />
            </div>
            <div className="campo">
              <label htmlFor="anio">{t("bienes.campo_anio")}</label>
              <input id="anio" name="anio" type="number" min={1900} defaultValue={valores.anio} />
              {error("anio")}
            </div>
          </div>
        </fieldset>
      )}

      {!editando && propietarios && (
        <fieldset className="grupo">
          <legend>{t("bienes.seccion_titular")}</legend>
          <p className="muted">{t("bienes.titular_ayuda")}</p>
          <div className="fila fila-tipo-nombre">
            <div className="campo">
              <label htmlFor="propietarioId">{t("bienes.campo_titular")}</label>
              <select id="propietarioId" name="propietarioId" defaultValue="" aria-invalid={Boolean(errores.propietarioId)}>
                <option value="">{t("bienes.elegir_propietario")}</option>
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {error("propietarioId")}
            </div>
            <div className="campo">
              <label htmlFor="porcentaje">{t("bienes.campo_porcentaje")}</label>
              <input id="porcentaje" name="porcentaje" type="text" inputMode="decimal" defaultValue="100" aria-invalid={Boolean(errores.porcentaje)} />
              {error("porcentaje")}
            </div>
          </div>
        </fieldset>
      )}

      <fieldset className="grupo">
        <legend>{t("bienes.seccion_otros")}</legend>
        <div className="campo">
          <label htmlFor="observaciones">{t(tipo === "otros" ? "bienes.campo_descripcion" : "bienes.campo_observaciones")}</label>
          <textarea id="observaciones" name="observaciones" rows={3} defaultValue={valores.observaciones} />
        </div>
      </fieldset>

      <div className="acciones">
        <Link href={cancelarHref} className="boton boton-secundario">{t("app.cancelar")}</Link>
        <button type="submit" className="boton" disabled={pendiente}>{t("app.guardar")}</button>
      </div>
    </form>
  );
}
