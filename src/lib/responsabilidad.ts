import type { Taller, Validacion, Entrega, TallerCatalogo, CalendarioLaboral } from '@/types';
import { diffDays } from './utils-app';
import { diasLaborablesEntre } from './calendario-laboral';

/* ------------------------------------------------------------------------------------------------
 * ANÁLISIS DE RESPONSABILIDAD DE CUMPLIMIENTO (punto 7c)
 *
 * Descompone el atraso de una entrega en dos tramos con dueños distintos, para no cargarle al
 * contratista demoras que son nuestras (o al revés):
 *
 *   Fecha promesa ──► Fecha liberado ──► Fecha entregado
 *          │  TRAMO 1 (NUESTRO)  │  TRAMO 2 (CONTRATISTA)  │
 *
 *   - TRAMO 1 (liberación, responsabilidad NUESTRA): días entre la fecha prometida y la fecha en que
 *     efectivamente liberamos la unidad. Si liberamos tarde, el contratista ni pudo empezar.
 *   - TRAMO 2 (ejecución, responsabilidad del CONTRATISTA): días LABORABLES que el contratista tardó
 *     desde que se le liberó hasta que concluyó, comparados contra el estándar de la actividad.
 *   - ENTREGA FINAL (ante cliente): ¿se entregó en o antes de la fecha prometida? Es el número global,
 *     con el desglose de cuánto del atraso fue nuestro vs. del contratista.
 *
 * Convención acordada: sin tolerancia (un día tarde ya es incumplimiento). El tramo 1 y la entrega
 * final se miden en días CALENDARIO (el compromiso con el cliente es en fecha calendario). El tramo 2
 * se mide en días LABORABLES contra el estándar (así se compara peras con peras: el estándar también
 * está en días laborables).
 * ---------------------------------------------------------------------------------------------- */

export interface AnalisisResponsabilidad {
  tallerId: string;
  /** ¿tiene los datos mínimos para analizarse? (fecha promesa + liberación + entrega) */
  analizable: boolean;

  // --- Tramo 1: liberación (nuestro) ---
  /** días entre promesa y liberación; negativo o 0 = liberamos a tiempo */
  atrasoLiberacion: number | null;
  liberacionATiempo: boolean | null;

  // --- Tramo 2: ejecución (contratista) ---
  /** días laborables reales que tardó el contratista desde liberado hasta entregado */
  diasEjecucionReales: number | null;
  /** estándar de la actividad en días laborables (si está definido en el catálogo) */
  estandarEjecucion: number | null;
  /** días laborables por encima del estándar; negativo o 0 = dentro del estándar. null si no hay estándar */
  excesoEjecucion: number | null;
  ejecucionATiempo: boolean | null;
  /** true si la actividad no tiene estándar definido (no se puede juzgar la ejecución) */
  ejecucionSinEstandar: boolean;

  // --- Entrega final (ante cliente) ---
  /** días entre promesa y entrega; negativo o 0 = entregado a tiempo */
  atrasoEntregaFinal: number | null;
  entregaATiempo: boolean | null;
  /** de los días de atraso final, cuántos son atribuibles a cada responsable (para el desglose) */
  atrasoAtribuibleNuestro: number | null;
  atrasoAtribuibleContratista: number | null;
}

/** Analiza un taller entregado y reparte la responsabilidad del cumplimiento. */
export function analizarResponsabilidad(
  taller: Taller,
  validacion: Validacion | undefined,
  entrega: Entrega | undefined,
  catalogo: TallerCatalogo[],
  calendario: CalendarioLaboral
): AnalisisResponsabilidad {
  const base: AnalisisResponsabilidad = {
    tallerId: taller.id,
    analizable: false,
    atrasoLiberacion: null, liberacionATiempo: null,
    diasEjecucionReales: null, estandarEjecucion: null, excesoEjecucion: null,
    ejecucionATiempo: null, ejecucionSinEstandar: true,
    atrasoEntregaFinal: null, entregaATiempo: null,
    atrasoAtribuibleNuestro: null, atrasoAtribuibleContratista: null,
  };

  const promesa = taller.fechaPromesa;
  const fLiberado = validacion?.fecha;
  const fEntregado = entrega?.fechaEntrega;

  // Sin fecha promesa no hay compromiso contra el cual medir; sin entrega no hay resultado que medir.
  if (!promesa || !fEntregado) return base;

  // --- Entrega final (ante cliente) ---
  const atrasoEntregaFinal = diffDays(promesa, fEntregado); // + = tarde
  base.atrasoEntregaFinal = atrasoEntregaFinal;
  base.entregaATiempo = atrasoEntregaFinal !== null ? atrasoEntregaFinal <= 0 : null;
  base.analizable = true;

  // --- Tramo 1: liberación (nuestro) ---
  if (fLiberado) {
    const atrasoLib = diffDays(promesa, fLiberado); // + = liberamos tarde
    base.atrasoLiberacion = atrasoLib;
    base.liberacionATiempo = atrasoLib !== null ? atrasoLib <= 0 : null;
  }

  // --- Tramo 2: ejecución (contratista), en días laborables ---
  const estandar = catalogo.find(
    (c) => c.subcontratistaId === taller.subcontratistaId
      && c.actividad.trim().toLowerCase() === taller.actividad.trim().toLowerCase()
      && c.duracionEstandarDias != null
  );
  if (fLiberado) {
    const diasReales = diasLaborablesEntre(fLiberado, fEntregado, calendario);
    base.diasEjecucionReales = diasReales;
    if (estandar) {
      const tope = (estandar.duracionEstandarDias || 0) + (estandar.holguraDias || 0);
      base.estandarEjecucion = tope;
      base.excesoEjecucion = diasReales - tope;
      base.ejecucionATiempo = diasReales <= tope;
      base.ejecucionSinEstandar = false;
    }
  }

  // --- Desglose del atraso final entre responsables ---
  // El atraso nuestro es cuánto nos pasamos de la promesa al liberar (si liberamos a tiempo, 0).
  // El resto del atraso final se atribuye al contratista (su tramo de ejecución).
  if (atrasoEntregaFinal !== null && atrasoEntregaFinal > 0) {
    const nuestro = Math.max(0, base.atrasoLiberacion ?? 0);
    const nuestroAcotado = Math.min(nuestro, atrasoEntregaFinal);
    base.atrasoAtribuibleNuestro = nuestroAcotado;
    base.atrasoAtribuibleContratista = atrasoEntregaFinal - nuestroAcotado;
  } else if (atrasoEntregaFinal !== null) {
    base.atrasoAtribuibleNuestro = 0;
    base.atrasoAtribuibleContratista = 0;
  }

  return base;
}

export interface ResumenResponsabilidad {
  totalEntregados: number;
  analizados: number;              // entregados con fecha promesa
  // Liberación (nuestro)
  liberacionATiempo: number;
  pctLiberacionATiempo: number | null;
  atrasoLiberacionPromedio: number | null;
  // Ejecución (contratista) — solo los que tienen estándar
  ejecucionConEstandar: number;
  ejecucionSinEstandar: number;
  ejecucionATiempo: number;
  pctEjecucionATiempo: number | null;
  excesoEjecucionPromedio: number | null;
  // Entrega final (cliente)
  entregaATiempo: number;
  pctEntregaATiempo: number | null;
  atrasoEntregaPromedio: number | null;
  // Desglose de responsabilidad del atraso total (en días acumulados)
  diasAtrasoNuestro: number;
  diasAtrasoContratista: number;
}

/** Agrega los análisis individuales en un resumen para dashboard/evaluación. */
export function resumenResponsabilidad(analisis: AnalisisResponsabilidad[]): ResumenResponsabilidad {
  const analizados = analisis.filter((a) => a.analizable);
  const conLib = analizados.filter((a) => a.atrasoLiberacion != null);
  const conEjecEstandar = analizados.filter((a) => !a.ejecucionSinEstandar && a.excesoEjecucion != null);

  const prom = (nums: number[]) => (nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null);
  const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);

  const libATiempo = conLib.filter((a) => a.liberacionATiempo).length;
  const ejecATiempo = conEjecEstandar.filter((a) => a.ejecucionATiempo).length;
  const entATiempo = analizados.filter((a) => a.entregaATiempo).length;

  return {
    totalEntregados: analisis.length,
    analizados: analizados.length,
    liberacionATiempo: libATiempo,
    pctLiberacionATiempo: pct(libATiempo, conLib.length),
    atrasoLiberacionPromedio: prom(conLib.map((a) => Math.max(0, a.atrasoLiberacion ?? 0))),
    ejecucionConEstandar: conEjecEstandar.length,
    ejecucionSinEstandar: analizados.filter((a) => a.ejecucionSinEstandar).length,
    ejecucionATiempo: ejecATiempo,
    pctEjecucionATiempo: pct(ejecATiempo, conEjecEstandar.length),
    excesoEjecucionPromedio: prom(conEjecEstandar.map((a) => Math.max(0, a.excesoEjecucion ?? 0))),
    entregaATiempo: entATiempo,
    pctEntregaATiempo: pct(entATiempo, analizados.length),
    atrasoEntregaPromedio: prom(analizados.map((a) => Math.max(0, a.atrasoEntregaFinal ?? 0))),
    diasAtrasoNuestro: analizados.reduce((s, a) => s + (a.atrasoAtribuibleNuestro ?? 0), 0),
    diasAtrasoContratista: analizados.reduce((s, a) => s + (a.atrasoAtribuibleContratista ?? 0), 0),
  };
}
