import { diasLaborablesEntre } from './calendario-laboral';
import { quejasDelTaller } from './stats-engine';
import type { Taller, CicloTaller, Validacion, Queja, TallerCatalogo, CalendarioLaboral } from '@/types';

export const MINIMO_CASOS_CONFIABLE = 3;

function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[mid - 1] + ordenados[mid]) / 2 : ordenados[mid];
}

/** Percentil (0-100) por interpolación lineal simple — suficiente para muestras chicas de obra */
function percentil(valores: number[], p: number): number | null {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  if (ordenados.length === 1) return ordenados[0];
  const idx = (p / 100) * (ordenados.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return ordenados[lo];
  return ordenados[lo] + (ordenados[hi] - ordenados[lo]) * (idx - lo);
}

export interface CasoRendimiento {
  tallerId: string;
  edificioUnidad: string;
  fechaLiberacion: string;
  fechaInicio: string;
  fechaCierre: string;
  duracionTotalDias: number;
  esperaDias: number;
  ejecucionDias: number;
  afectadoPorCausaNuestra: boolean;
}

export interface RendimientoActividad {
  subcontratistaId: string;
  actividad: string;
  catalogoId?: string;
  estandarActualDias?: number;
  holguraActualDias?: number;
  casos: CasoRendimiento[];
  casosLimpios: number;
  casosAfectados: number;
  confiable: boolean;
  duracionSugeridaDias: number | null;
  holguraSugeridaDias: number | null;
  esperaPromedioDias: number | null;
  diferenciaVsEstandar: number | null;
}

/** Calcula el rendimiento real por combinación subcontratista + actividad, a partir de los
 * talleres realmente completados (con ciclo cerrado y liberación registrada).
 *
 * Regla de negocio (confirmada con el usuario):
 * - Un caso "afectado" es aquel donde hubo una incidencia con causa "NUESTRA" durante la ventana
 *   liberación->cierre — un bloqueo externo, no lentitud real del subcontratista. Estos casos NO
 *   se usan para calcular la duración estándar, pero SÍ se usan para calcular la holgura sugerida
 *   (el margen que realmente ha costado ese tipo de bloqueo).
 * - Los casos con causa "DEL SUBCONTRATISTA" SÍ cuentan como rendimiento real (no se excluyen).
 * - Se requiere un mínimo de MINIMO_CASOS_CONFIABLE casos limpios para considerar el dato confiable.
 */
export function calcularRendimientoReal(
  talleres: Taller[],
  ciclos: CicloTaller[],
  validaciones: Validacion[],
  quejas: Queja[],
  catalogo: TallerCatalogo[],
  calendario: CalendarioLaboral
): RendimientoActividad[] {
  const grupos = new Map<string, { subcontratistaId: string; actividad: string; casos: CasoRendimiento[] }>();

  talleres.forEach((t) => {
    const ciclo = ciclos.find((c) => c.tallerId === t.id);
    if (!ciclo || ciclo.estado !== 'COMPLETADO' || !ciclo.fechaInicio || !ciclo.fechaCierre) return;

    const validacion = validaciones.find((v) => v.tallerId === t.id && v.resultado === 'LISTO' && !!v.fecha);
    if (!validacion) return;

    if (validacion.fecha > ciclo.fechaInicio || ciclo.fechaInicio > ciclo.fechaCierre) return;

    const incidenciasTaller = quejasDelTaller(t, quejas);
    const afectado = incidenciasTaller.some(
      (q) => q.causa === 'NUESTRA' && q.fecha >= validacion.fecha && q.fecha <= ciclo.fechaCierre
    );

    const caso: CasoRendimiento = {
      tallerId: t.id,
      edificioUnidad: t.esGeneral ? `${t.edificio} (GENERAL)` : `${t.edificio} ${t.unidad}`,
      fechaLiberacion: validacion.fecha,
      fechaInicio: ciclo.fechaInicio,
      fechaCierre: ciclo.fechaCierre,
      duracionTotalDias: diasLaborablesEntre(validacion.fecha, ciclo.fechaCierre, calendario),
      esperaDias: diasLaborablesEntre(validacion.fecha, ciclo.fechaInicio, calendario),
      ejecucionDias: diasLaborablesEntre(ciclo.fechaInicio, ciclo.fechaCierre, calendario),
      afectadoPorCausaNuestra: afectado,
    };

    const key = `${t.subcontratistaId}::${t.actividad}`;
    if (!grupos.has(key)) grupos.set(key, { subcontratistaId: t.subcontratistaId, actividad: t.actividad, casos: [] });
    grupos.get(key)!.casos.push(caso);
  });

  return [...grupos.values()].map(({ subcontratistaId, actividad, casos }) => {
    const catalogoEntry = catalogo.find((c) => c.subcontratistaId === subcontratistaId && c.actividad === actividad);
    const limpios = casos.filter((c) => !c.afectadoPorCausaNuestra);
    const afectados = casos.filter((c) => c.afectadoPorCausaNuestra);

    const confiable = limpios.length >= MINIMO_CASOS_CONFIABLE;
    const duracionSugeridaDias = confiable ? mediana(limpios.map((c) => c.duracionTotalDias)) : null;

    const deltasAfectados = duracionSugeridaDias !== null
      ? afectados.map((c) => Math.max(0, c.duracionTotalDias - duracionSugeridaDias))
      : [];
    const holguraSugeridaDias = deltasAfectados.length > 0 ? percentil(deltasAfectados, 75) : null;

    const esperaPromedioDias = mediana(casos.map((c) => c.esperaDias));

    return {
      subcontratistaId, actividad,
      catalogoId: catalogoEntry?.id,
      estandarActualDias: catalogoEntry?.duracionEstandarDias,
      holguraActualDias: catalogoEntry?.holguraDias,
      casos,
      casosLimpios: limpios.length,
      casosAfectados: afectados.length,
      confiable,
      duracionSugeridaDias: duracionSugeridaDias !== null ? Math.round(duracionSugeridaDias * 10) / 10 : null,
      holguraSugeridaDias: holguraSugeridaDias !== null ? Math.round(holguraSugeridaDias * 10) / 10 : null,
      esperaPromedioDias: esperaPromedioDias !== null ? Math.round(esperaPromedioDias * 10) / 10 : null,
      diferenciaVsEstandar: duracionSugeridaDias !== null && catalogoEntry?.duracionEstandarDias != null
        ? Math.round((duracionSugeridaDias - catalogoEntry.duracionEstandarDias) * 10) / 10
        : null,
    };
  }).sort((a, b) => a.actividad.localeCompare(b.actividad));
}
