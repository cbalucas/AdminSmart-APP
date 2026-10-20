"use client";

import { useActionState, useState } from "react";
import { t } from "@ai/i18n";
import { ESTADOS_POR_TIPO, TIPOS_BIEN, estadoInicial, subtiposDe, tieneDireccion, type TipoBien } from "@ai/domain";
import { AccionesFormulario, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
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

      <SeccionFormulario icono="bienes" titulo={t("bienes.seccion_tipo")}>
        <div className={subtipos.length > 0 ? "fila fila-3" : "fila fila-2"}>
          <div className="campo">
            <label htmlFor="tipoBien">{t("bienes.campo_tipo")}</label>
            {editando ? (
              <>
                <input type="hidden" name="tipoBien" value={tipo} />
                <CampoIcono icono="bienes">
                  <input id="tipoBien" type="text" value={t(`tipo_bien.${tipo}`)} readOnly />
                </CampoIcono>
              </>
            ) : (
              <CampoIcono icono="bienes">
                <select id="tipoBien" name="tipoBien" value={tipo} onChange={(e) => setTipo(e.target.value as TipoBien)}>
                {TIPOS_BIEN.map((tb) => (
                  <option key={tb} value={tb}>{t(`tipo_bien.${tb}`)}</option>
                ))}
              </select>
              </CampoIcono>
            )}
          </div>
          {subtipos.length > 0 ? (
            <div className="campo">
              <label htmlFor="subtipo">{t("bienes.campo_subtipo")}</label>
              <CampoIcono icono="otros">
                <select id="subtipo" name="subtipo" defaultValue={valores.subtipo} aria-invalid={Boolean(errores.subtipo)}>
                  <option value="">—</option>
                  {subtipos.map((s) => (
                    <option key={s} value={s}>{t(`subtipo.${s}`)}</option>
                  ))}
                </select>
              </CampoIcono>
              {error("subtipo")}
            </div>
          ) : null}
          <div className="campo">
            <label htmlFor="estado">{t("bienes.campo_estado")}</label>
            <CampoIcono icono="info">
              <select id="estado" name="estado" defaultValue={valores.estado || estadoInicial(tipo)} key={tipo}>
                {estados.map((e) => (
                  <option key={e} value={e}>{t(`estado_bien.${e}`)}</option>
                ))}
              </select>
            </CampoIcono>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="alias">{t("bienes.campo_alias")}</label>
          <CampoIcono icono="contratos">
            <input id="alias" name="alias" type="text" defaultValue={valores.alias} aria-invalid={Boolean(errores.alias)} />
          </CampoIcono>
          {error("alias")}
        </div>
      </SeccionFormulario>

      {tipo === "inmueble" && (
        <SeccionFormulario icono="edificios" titulo={t("bienes.seccion_edificio")}>
          <p className="muted">{t("bienes.edificio_ayuda")}</p>
          <div className="fila fila-2">
            <div className="campo">
              <label htmlFor="edificioNombre">{t("bienes.campo_edificio")}</label>
              <CampoIcono icono="edificios">
                <input
                  id="edificioNombre"
                  name="edificioNombre"
                  type="text"
                  list="lista-edificios"
                  value={nombreEdificio}
                  onChange={(e) => setNombreEdificio(e.target.value)}
                  autoComplete="off"
                />
              </CampoIcono>
              <datalist id="lista-edificios">
                {edificios.map((e) => (
                  <option key={e.id} value={e.nombre} />
                ))}
              </datalist>
            </div>
            <div className="campo">
              <label htmlFor="unidadFuncional">{t("bienes.campo_unidad")}</label>
              <CampoIcono icono="numero">
                <input id="unidadFuncional" name="unidadFuncional" type="text" defaultValue={valores.unidadFuncional} />
              </CampoIcono>
            </div>
          </div>
          {nombreEdificio.trim() !== "" && (
            <p className="aviso-info">
              {edificio ? t("bienes.edificio_existente", { direccion: edificio.direccion }) : t("bienes.edificio_nuevo")}
            </p>
          )}
        </SeccionFormulario>
      )}

      {conDireccion && (
        <SeccionFormulario icono="ubicacion" titulo={t("bienes.seccion_direccion")}>
          {!heredaDireccion && (
            <>
              <div className="fila fila-calle">
                <div className="campo">
                  <label htmlFor="calle">{t("bienes.campo_calle")}</label>
                  <CampoIcono icono="ubicacion">
                    <input id="calle" name="calle" type="text" defaultValue={valores.calle} aria-invalid={Boolean(errores.calle)} />
                  </CampoIcono>
                  {error("calle")}
                </div>
                <div className="campo">
                  <label htmlFor="numero">{t("bienes.campo_numero")}</label>
                  <CampoIcono icono="numero">
                    <input id="numero" name="numero" type="text" defaultValue={valores.numero} aria-invalid={Boolean(errores.numero)} />
                  </CampoIcono>
                  {error("numero")}
                </div>
              </div>
              <div className="fila fila-3">
                <div className="campo">
                  <label htmlFor="localidad">{t("bienes.campo_localidad")}</label>
                  <CampoIcono icono="ubicacion">
                    <input id="localidad" name="localidad" type="text" defaultValue={valores.localidad} aria-invalid={Boolean(errores.localidad)} />
                  </CampoIcono>
                  {error("localidad")}
                </div>
                <div className="campo">
                  <label htmlFor="provincia">{t("bienes.campo_provincia")}</label>
                  <CampoIcono icono="ubicacion">
                    <input id="provincia" name="provincia" type="text" defaultValue={valores.provincia} aria-invalid={Boolean(errores.provincia)} />
                  </CampoIcono>
                  {error("provincia")}
                </div>
                <div className="campo">
                  <label htmlFor="codigoPostal">{t("bienes.campo_cp")}</label>
                  <CampoIcono icono="numero">
                    <input id="codigoPostal" name="codigoPostal" type="text" defaultValue={valores.codigoPostal} />
                  </CampoIcono>
                </div>
              </div>
            </>
          )}
          <div className="fila fila-2">
            <div className="campo">
              <label htmlFor="piso">{t("bienes.campo_piso")}</label>
              <CampoIcono icono="numero">
                <input id="piso" name="piso" type="text" defaultValue={valores.piso} />
              </CampoIcono>
            </div>
            <div className="campo">
              <label htmlFor="departamento">{t("bienes.campo_departamento")}</label>
              <CampoIcono icono="numero">
                <input id="departamento" name="departamento" type="text" defaultValue={valores.departamento} />
              </CampoIcono>
            </div>
          </div>
        </SeccionFormulario>
      )}

      {tipo === "vehiculo" && (
        <SeccionFormulario icono="vehiculo" titulo={t("bienes.seccion_vehiculo")}>
          <div className="fila fila-3">
            <div className="campo">
              <label htmlFor="dominio">{t("bienes.campo_dominio")}</label>
              <CampoIcono icono="vehiculo">
                <input id="dominio" name="dominio" type="text" autoCapitalize="characters" defaultValue={valores.dominio} aria-invalid={Boolean(errores.dominio)} />
              </CampoIcono>
              {error("dominio")}
            </div>
            <div className="campo">
              <label htmlFor="marcaModelo">{t("bienes.campo_marca")}</label>
              <CampoIcono icono="vehiculo">
                <input id="marcaModelo" name="marcaModelo" type="text" defaultValue={valores.marcaModelo} />
              </CampoIcono>
            </div>
            <div className="campo">
              <label htmlFor="anio">{t("bienes.campo_anio")}</label>
              <CampoIcono icono="calendario">
                <input id="anio" name="anio" type="number" min={1900} defaultValue={valores.anio} />
              </CampoIcono>
              {error("anio")}
            </div>
          </div>
        </SeccionFormulario>
      )}

      {!editando && propietarios && (
        <SeccionFormulario icono="propietarios" titulo={t("bienes.seccion_titular")}>
          <p className="muted">{t("bienes.titular_ayuda")}</p>
          <div className="fila fila-tipo-nombre">
            <div className="campo">
              <label htmlFor="propietarioId">{t("bienes.campo_titular")}</label>
              <CampoIcono icono="propietarios">
                <select id="propietarioId" name="propietarioId" defaultValue="" aria-invalid={Boolean(errores.propietarioId)}>
                  <option value="">{t("bienes.elegir_propietario")}</option>
                  {propietarios.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </CampoIcono>
              {error("propietarioId")}
            </div>
            <div className="campo">
              <label htmlFor="porcentaje">{t("bienes.campo_porcentaje")}</label>
              <CampoIcono icono="porcentaje">
                <input id="porcentaje" name="porcentaje" type="text" inputMode="decimal" defaultValue="100" aria-invalid={Boolean(errores.porcentaje)} />
              </CampoIcono>
              {error("porcentaje")}
            </div>
          </div>
        </SeccionFormulario>
      )}

      <SeccionFormulario icono="nota" titulo={t("bienes.seccion_otros")}>
        <div className="campo">
          <label htmlFor="observaciones">{t(tipo === "otros" ? "bienes.campo_descripcion" : "bienes.campo_observaciones")}</label>
          <textarea id="observaciones" name="observaciones" rows={3} defaultValue={valores.observaciones} />
        </div>
      </SeccionFormulario>

      <AccionesFormulario cancelarHref={cancelarHref} pendiente={pendiente} />
    </form>
  );
}
