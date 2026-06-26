import type { Taller, Validacion, Entrega, RegistroBitacora, Queja, Stats, TallerDetail, Subcontratista, CicloTaller, FechaPrometida } from '@/types';
import { diffDays, mondayOf, todayISO, fmtDate, semanasDelMes } from './utils-app';

export interface TallerDetailExt extends TallerDetail {
  quejasAsociadas: Queja[];
  comentario: string[];
  ciclo?: CicloTaller;
  fechasAsociadas: FechaPrometida[];
}

/** Normaliza el filtro de semana(s): null = todas, string = una semana, string[] = varias (vista mensual) */
function semanaMatch(tallerSemana: string, semana: string | string[] | null): boolean {
  if (!semana) return true;
  if (Array.isArray(semana)) return semana.includes(tallerSemana);
  return tallerSemana === semana;
}

export function isTallerCompleto(tallerId: string, validaciones: Validacion[], entregas: Entrega[]): boolean {
  const v = validaciones.find((x) => x.tallerId === tallerId);
  const e = entregas.find((x) => x.tallerId === tallerId);
  return v?.resultado === 'LISTO' && e?.estado === 'ENTREGADO';
}

export function talleresAtrasados(
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  semanaActual: string
): Taller[] {
  return talleres.filter((t) => t.semana < semanaActual && !isTallerCompleto(t.id, validaciones, entregas));
}

export function computeStats(
  subId: string | null,
  semana: string | string[] | null,
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  bitacora: RegistroBitacora[],
  quejas: Queja[]
): Stats {
  const tIds = talleres
    .filter((t) => semanaMatch(t.semana, semana) && (!subId || t.subcontratistaId === subId))
    .map((t) => t.id);
  const tSet = new Set(tIds);
  const totalTalleres = tIds.length;

  const valsForWeek = validaciones.filter((v) => tSet.has(v.tallerId));
  const liberados = valsForWeek.filter((v) => v.resultado === 'LISTO').length;
  const noLiberados = valsForWeek.filter((v) => v.resultado === 'NO LISTO').length;
  const pendientesVal = valsForWeek.filter((v) => v.resultado === 'PENDIENTE' || !v.resultado).length;

  const entForWeek = entregas.filter((e) => tSet.has(e.tallerId));
  const entregados = entForWeek.filter((e) => e.estado === 'ENTREGADO').length;
  const sinEntregar = liberados - entregados;

  const diasArr = entForWeek
    .filter((e) => e.estado === 'ENTREGADO')
    .map((e) => {
      const v = validaciones.find((x) => x.tallerId === e.tallerId);
      return v?.fecha ? diffDays(v.fecha, e.fechaEntrega) : null;
    })
    .filter((d): d is number => d !== null && d !== undefined);
  const promedioDias = diasArr.length ? Math.round((diasArr.reduce((a, b) => a + b, 0) / diasArr.length) * 10) / 10 : null;

  const bitForWeek = bitacora.filter((b) => tSet.has(b.tallerId));
  const llegaron = bitForWeek.filter((b) => b.llego === 'SI').length;
  const noLlegaron = bitForWeek.filter((b) => b.llego === 'NO').length;
  const causaNuestra = bitForWeek.filter((b) => b.responsable === 'Nuestro (taller no listo)').length;
  const causaSub = bitForWeek.filter((b) => b.responsable === 'Subcontratista').length;

  const semanasSet = Array.isArray(semana) ? new Set(semana) : null;
  const quejasForSub = quejas.filter((q) => {
    if (subId && q.subcontratistaId !== subId) return false;
    if (!semana) return true;
    const qSemana = mondayOf(q.fecha);
    return semanasSet ? semanasSet.has(qSemana) : qSemana === semana;
  });

  const pctLiberado = totalTalleres ? Math.round((liberados / totalTalleres) * 100) : 0;
  const pctEntregado = liberados ? Math.round((entregados / liberados) * 100) : 0;

  return {
    totalTalleres, liberados, noLiberados, pendientesVal, entregados, sinEntregar, promedioDias,
    llegaron, noLlegaron, causaNuestra, causaSub, quejasForSub, quejasCount: quejasForSub.length,
    pctLiberado, pctEntregado,
  };
}

/** Stats acumulados de un mes completo, sumando todas las semanas que tocan ese mes */
export function computeStatsMensual(
  subId: string | null,
  mesKey: string,
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  bitacora: RegistroBitacora[],
  quejas: Queja[]
): Stats {
  const semanas = semanasDelMes(mesKey);
  return computeStats(subId, semanas, talleres, validaciones, entregas, bitacora, quejas);
}

/** Historial completo de incidencias de un contratista, sin filtrar por semana (para ver todo su histórico) */
export function historialIncidenciasContratista(subId: string | null, quejas: Queja[]): Queja[] {
  return quejas
    .filter((q) => !subId || q.subcontratistaId === subId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function tallerDetailList(
  subId: string | null,
  semana: string | string[] | null,
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  bitacora: RegistroBitacora[]
): TallerDetail[] {
  const mine = talleres.filter((t) => semanaMatch(t.semana, semana) && (!subId || t.subcontratistaId === subId));
  return mine.map((t) => {
    const validacion = validaciones.find((v) => v.tallerId === t.id);
    const entrega = entregas.find((e) => e.tallerId === t.id);
    const bits = bitacora.filter((b) => b.tallerId === t.id);
    let dias: number | null = null;
    if (validacion?.resultado === 'LISTO' && validacion.fecha) {
      const hasta = entrega?.estado === 'ENTREGADO' && entrega.fechaEntrega ? entrega.fechaEntrega : todayISO();
      dias = diffDays(validacion.fecha, hasta);
    }
    return { taller: t, validacion, entrega, bitacora: bits, dias };
  });
}

/** Detecta si la cadena de unidades de una queja menciona la unidad de un taller específico */
function quejaMencionaUnidad(queja: Queja, taller: Taller): boolean {
  if (!queja.unidades) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '');
  const target1 = norm(`${taller.edificio}${taller.unidad}`);
  const target2 = norm(taller.unidad);
  const tokens = queja.unidades.split(',').map((t) => norm(t));
  return tokens.some((t) => t === target1 || t === target2 || (t.length > 2 && (target1.includes(t) || t.includes(target1))));
}

export function quejasDelTaller(taller: Taller, quejas: Queja[]): Queja[] {
  return quejas.filter(
    (q) => q.subcontratistaId === taller.subcontratistaId && (q.esGeneral || quejaMencionaUnidad(q, taller))
  );
}

export function buildComentarioTaller(detail: TallerDetail, quejasAsociadas: Queja[], ciclo?: CicloTaller, fechasAsociadas: FechaPrometida[] = []): string[] {
  const { validacion, entrega, dias, bitacora } = detail;
  const parts: string[] = [];

  if (!validacion || validacion.resultado === 'PENDIENTE') {
    parts.push('Aún no se ha validado si el área está lista para que el subcontratista trabaje.');
  } else if (validacion.resultado === 'NO LISTO') {
    parts.push(`El taller no fue liberado el ${fmtDate(validacion.fecha)}${validacion.observaciones ? `: ${validacion.observaciones}` : '.'}`);
  } else if (validacion.resultado === 'LISTO') {
    parts.push(`Liberado el ${fmtDate(validacion.fecha)}${validacion.validadoPor ? ` por ${validacion.validadoPor}` : ''}.`);

    if (!entrega || entrega.estado !== 'ENTREGADO') {
      if (dias !== null && dias > 5) {
        parts.push(`Lleva ${dias} días sin entrega registrada — requiere seguimiento urgente.`);
      } else if (dias !== null && dias > 2) {
        parts.push(`Lleva ${dias} días sin entrega; dentro de un margen aceptable pero a vigilar.`);
      } else {
        parts.push('Todavía no se ha registrado la entrega del trabajo.');
      }
    } else {
      const calidadTxt = entrega.calidad === 'BUENA' ? 'con buena calidad'
        : entrega.calidad === 'CON OBSERVACIONES' ? 'con observaciones de calidad'
        : entrega.calidad === 'DEFICIENTE' ? 'con calidad deficiente' : '';
      if (dias !== null && dias <= 2) {
        parts.push(`Entregado el ${fmtDate(entrega.fechaEntrega)} (${dias} día${dias === 1 ? '' : 's'} después de la liberación)${calidadTxt ? ', ' + calidadTxt : ''} — buen tiempo de respuesta.`);
      } else if (dias !== null) {
        parts.push(`Entregado el ${fmtDate(entrega.fechaEntrega)}, ${dias} días después de la liberación${calidadTxt ? ', ' + calidadTxt : ''}.`);
      } else {
        parts.push(`Entregado el ${fmtDate(entrega.fechaEntrega)}${calidadTxt ? ', ' + calidadTxt : ''}.`);
      }
      if (entrega.calidad === 'DEFICIENTE') parts.push('Se recomienda dar seguimiento a la calidad de este taller.');
    }
  }

  if (ciclo && ciclo.estado !== 'NO INICIADO') {
    const dur = duracionCiclo(ciclo);
    if (ciclo.estado === 'EN PROCESO') {
      parts.push(`El trabajo está en proceso desde el ${fmtDate(ciclo.fechaInicio)}${dur !== null ? ` (lleva ${dur} día${dur === 1 ? '' : 's'})` : ''}.`);
    } else if (ciclo.estado === 'COMPLETADO') {
      parts.push(`El trabajo se completó el ${fmtDate(ciclo.fechaCierre)}${dur !== null ? `, con una duración total de ${dur} día${dur === 1 ? '' : 's'}` : ''}.`);
    }
    if (ciclo.comentarios.length) {
      parts.push(`Se registraron ${ciclo.comentarios.length} comentario(s) de avance durante la ejecución.`);
    }
  }

  if (bitacora && bitacora.length) {
    const noLlegaron = bitacora.filter((b) => b.llego === 'NO').length;
    const noCompletaron = bitacora.filter((b) => b.completo && b.completo !== 'COMPLETADO').length;
    const causaNuestra = bitacora.filter((b) => b.responsable === 'Nuestro (taller no listo)').length;
    const causaSub = bitacora.filter((b) => b.responsable === 'Subcontratista').length;
    if (noLlegaron > 0) {
      parts.push(`Según la bitácora, el subcontratista no se presentó en ${noLlegaron} de ${bitacora.length} visita(s) registrada(s).`);
    }
    if (noCompletaron > 0) {
      parts.push(`No completó el trabajo en ${noCompletaron} ocasión(es)${causaNuestra || causaSub ? ', ' : '.'}${causaNuestra ? `${causaNuestra} por causa nuestra` : ''}${causaNuestra && causaSub ? ' y ' : ''}${causaSub ? `${causaSub} por causa del subcontratista` : ''}${causaNuestra || causaSub ? '.' : ''}`);
    }
    if (!noLlegaron && !noCompletaron) {
      parts.push(`La bitácora registra ${bitacora.length} visita(s) sin incidentes de asistencia.`);
    }
  }

  if (quejasAsociadas.length) {
    parts.push(
      `Tiene ${quejasAsociadas.length} incidencia(s) asociada(s) (${quejasAsociadas.map((q) => q.tipo).join(', ')}).`
    );
  }

  if (fechasAsociadas.length) {
    const pendientes = fechasAsociadas.filter((fp) => !fp.fechaCumplida);
    const cumplidas = fechasAsociadas.filter((fp) => !!fp.fechaCumplida);
    if (pendientes.length) {
      const atrasadasCount = pendientes.filter((fp) => estaAtrasada(fp)).length;
      parts.push(
        `Depende de ${pendientes.length} compromiso(s) de fecha prometida por el subcontratista (${pendientes.map((fp) => `${fp.descripcion}: ${fmtDate(fp.fechaPrometidaActual)}`).join('; ')})${atrasadasCount ? `, ${atrasadasCount} de ellos ya en atraso` : ''}.`
      );
    }
    if (cumplidas.length) {
      parts.push(`${cumplidas.length} compromiso(s) de fecha relacionados ya fueron cumplidos.`);
    }
  }

  if (!parts.length) parts.push('Sin información registrada todavía para este taller.');
  return parts;
}

export function tallerDetailListExt(
  subId: string | null,
  semana: string | string[] | null,
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  bitacora: RegistroBitacora[],
  quejas: Queja[],
  ciclos: CicloTaller[] = [],
  fechasPrometidas: FechaPrometida[] = []
): TallerDetailExt[] {
  const base = tallerDetailList(subId, semana, talleres, validaciones, entregas, bitacora);
  return base.map((d) => {
    const quejasAsociadas = quejasDelTaller(d.taller, quejas);
    const ciclo = ciclos.find((c) => c.tallerId === d.taller.id);
    const fechasAsociadas = fechasPrometidasDelTaller(d.taller, fechasPrometidas);
    const comentario = buildComentarioTaller(d, quejasAsociadas, ciclo, fechasAsociadas);
    return { ...d, quejasAsociadas, comentario, ciclo, fechasAsociadas };
  });
}
export function buildNarrative(sub: Subcontratista | null, stats: Stats, detailList: TallerDetail[]): string[] {
  const lines: string[] = [];
  const nombre = sub ? sub.nombre : 'Todos los subcontratistas';

  if (stats.totalTalleres === 0) {
    lines.push(`${nombre} no tiene talleres planificados en esta semana.`);
    return lines;
  }

  lines.push(`${nombre} tuvo ${stats.totalTalleres} taller(es) planificado(s) esta semana.`);

  if (stats.liberados > 0 || stats.noLiberados > 0) {
    lines.push(
      `De las validaciones registradas, ${stats.liberados} fueron liberados para trabajar y ${stats.noLiberados} quedaron no liberados${
        stats.pendientesVal ? `, con ${stats.pendientesVal} aún pendientes de validar` : ''
      }.`
    );
  } else {
    lines.push('Todavía no se ha registrado ninguna validación de taller esta semana.');
  }

  if (stats.liberados > 0) {
    lines.push(
      `De los talleres liberados, ${stats.entregados} fueron entregados por el subcontratista${
        stats.sinEntregar > 0 ? ` y ${stats.sinEntregar} siguen sin entregar` : ''
      }.`
    );
    if (stats.promedioDias !== null) {
      lines.push(`El tiempo promedio entre liberación y entrega fue de ${stats.promedioDias} día(s).`);
    }
  }

  if (stats.causaNuestra > 0 || stats.causaSub > 0) {
    if (stats.causaNuestra > 0) lines.push(`Se registraron ${stats.causaNuestra} incumplimiento(s) por causa nuestra (taller no listo).`);
    if (stats.causaSub > 0) lines.push(`${stats.causaSub} incumplimiento(s) se debieron al propio subcontratista.`);
  }

  if (stats.quejasCount > 0) {
    const tipos = [...new Set(stats.quejasForSub.map((q) => q.tipo))];
    lines.push(`Se registraron ${stats.quejasCount} incidencia(s) esta semana (${tipos.join(', ')}).`);
  } else {
    lines.push('No se registraron incidencias o quejas asociadas en el periodo.');
  }

  const noListoConObs = detailList.filter((d) => d.validacion?.resultado === 'NO LISTO' && d.validacion?.observaciones);
  if (noListoConObs.length) {
    lines.push(
      'Observaciones de talleres no liberados: ' +
        noListoConObs.map((d) => `${d.taller.edificio} ${d.taller.unidad} — ${d.validacion?.observaciones}`).join('; ') +
        '.'
    );
  }

  const tardios = detailList.filter((d) => d.dias !== null && d.dias > 5 && d.entrega?.estado !== 'ENTREGADO');
  if (tardios.length) {
    lines.push(
      `Atención: ${tardios.length} taller(es) llevan más de 5 días liberados sin entrega registrada (${tardios
        .map((d) => `${d.taller.edificio} ${d.taller.unidad}`)
        .join(', ')}).`
    );
  }

  return lines;
}

export function buildNarrativeIncidencias(sub: Subcontratista | null, quejas: Queja[]): string[] {
  const lines: string[] = [];
  const nombre = sub ? sub.nombre : 'Todos los subcontratistas';

  if (!quejas.length) {
    lines.push(`${nombre} no tiene incidencias registradas en el periodo seleccionado.`);
    return lines;
  }

  lines.push(`${nombre} tiene ${quejas.length} incidencia(s) registrada(s) en el periodo.`);

  const porTipo = new Map<string, number>();
  quejas.forEach((q) => porTipo.set(q.tipo, (porTipo.get(q.tipo) || 0) + 1));
  const tipoMasFrecuente = [...porTipo.entries()].sort((a, b) => b[1] - a[1])[0];
  if (tipoMasFrecuente && porTipo.size > 1) {
    lines.push(`El tipo más frecuente es "${tipoMasFrecuente[0]}" con ${tipoMasFrecuente[1]} caso(s).`);
  }

  const generales = quejas.filter((q) => q.esGeneral).length;
  if (generales > 0) {
    lines.push(`${generales} incidencia(s) se marcaron como generales (afectan todos los talleres del contratista, no una unidad específica).`);
  }

  const causaNuestra = quejas.filter((q) => q.causa === 'NUESTRA').length;
  const causaSub = quejas.filter((q) => q.causa === 'DEL SUBCONTRATISTA').length;
  const causaComp = quejas.filter((q) => q.causa === 'COMPARTIDA').length;
  if (causaNuestra || causaSub || causaComp) {
    const partes: string[] = [];
    if (causaNuestra) partes.push(`${causaNuestra} por causa nuestra`);
    if (causaSub) partes.push(`${causaSub} por causa del subcontratista`);
    if (causaComp) partes.push(`${causaComp} de causa compartida`);
    lines.push(`Por causa: ${partes.join(', ')}.`);
  }

  if (quejas.length >= 3) {
    lines.push('Por volumen, se recomienda tratar este punto en la próxima reunión de coordinación con el subcontratista, no solo dejarlo en registro.');
  }

  return lines;
}

export function buildNarrativeBitacora(sub: Subcontratista | null, registros: RegistroBitacora[]): string[] {
  const lines: string[] = [];
  const nombre = sub ? sub.nombre : 'Todos los subcontratistas';

  if (!registros.length) {
    lines.push(`${nombre} no tiene registros de bitácora en el periodo seleccionado.`);
    return lines;
  }

  lines.push(`${nombre} tiene ${registros.length} registro(s) de bitácora en el periodo.`);

  const noLlegaron = registros.filter((b) => b.llego === 'NO').length;
  const llegaron = registros.filter((b) => b.llego === 'SI').length;
  if (noLlegaron > 0) {
    const pct = Math.round((noLlegaron / registros.length) * 100);
    lines.push(`No se presentó en ${noLlegaron} de ${registros.length} visita(s) (${pct}%).`);
  } else {
    lines.push(`Se presentó en todas las visitas registradas (${llegaron}).`);
  }

  const noCompletaron = registros.filter((b) => b.completo && b.completo !== 'COMPLETADO').length;
  if (noCompletaron > 0) {
    const causaNuestra = registros.filter((b) => b.responsable === 'Nuestro (taller no listo)').length;
    const causaSub = registros.filter((b) => b.responsable === 'Subcontratista').length;
    lines.push(
      `No completó el trabajo en ${noCompletaron} ocasión(es)${causaNuestra || causaSub ? `: ${causaNuestra} por causa nuestra y ${causaSub} por causa del subcontratista` : ''}.`
    );
  }

  if (noLlegaron >= 3) {
    lines.push('Patrón de inasistencia recurrente — se recomienda dar seguimiento directo.');
  }

  return lines;
}

export interface AtrasoPorCausa {
  causa: string;
  cantidadIncidencias: number;
  diasTotales: number;
}

export function resumenAtrasoPorCausa(quejas: Queja[]): AtrasoPorCausa[] {
  const map = new Map<string, { cantidad: number; dias: number }>();
  quejas.forEach((q) => {
    const causa = q.causa || 'SIN ESPECIFICAR';
    const dias = parseFloat(q.impactoDias) || 0;
    const prev = map.get(causa) || { cantidad: 0, dias: 0 };
    map.set(causa, { cantidad: prev.cantidad + 1, dias: prev.dias + dias });
  });
  return [...map.entries()]
    .map(([causa, v]) => ({ causa, cantidadIncidencias: v.cantidad, diasTotales: v.dias }))
    .sort((a, b) => b.diasTotales - a.diasTotales);
}

export function duracionCiclo(ciclo: CicloTaller | undefined): number | null {
  if (!ciclo || !ciclo.fechaInicio) return null;
  const hasta = ciclo.estado === 'COMPLETADO' && ciclo.fechaCierre ? ciclo.fechaCierre : todayISO();
  return diffDays(ciclo.fechaInicio, hasta);
}

/** Calcula la prioridad sugerida según qué tan próxima o vencida está la fecha promesa.
 * Vencida o a 3 días o menos = Alta (1). Entre 4 y 10 días = Media (2). Más de 10 días o sin fecha = Baja (3). */
export function prioridadPorFechaPromesa(fechaPromesa: string): '1' | '2' | '3' {
  if (!fechaPromesa) return '3';
  const dias = diffDays(todayISO(), fechaPromesa);
  if (dias === null) return '3';
  if (dias <= 3) return '1';
  if (dias <= 10) return '2';
  return '3';
}

/** Busca si ya existe un taller con el mismo contratista + edificio + unidad (case-insensitive), en cualquier semana */
export function tallerDuplicado(talleres: Taller[], subcontratistaId: string, edificio: string, unidad: string, excluirId?: string): Taller | null {
  const norm = (s: string) => s.trim().toLowerCase();
  return talleres.find(
    (t) => t.id !== excluirId &&
      t.subcontratistaId === subcontratistaId &&
      norm(t.edificio) === norm(edificio) &&
      norm(t.unidad) === norm(unidad)
  ) || null;
}

/** Párrafo (no bullets) que interpreta el desempeño general del contratista en el periodo, para Evaluación */
export function buildParrafoAnalisisEvaluacion(sub: Subcontratista | null, stats: Stats, periodoLabel: string): string {
  const nombre = sub ? sub.nombre : 'el conjunto de subcontratistas';
  if (stats.totalTalleres === 0) {
    return `No se registró actividad planificada para ${nombre} durante ${periodoLabel}. Sin frentes de trabajo asignados, no es posible emitir un índice de cumplimiento para este periodo; se recomienda confirmar si la ausencia de planificación obedece a una pausa programada o a un vacío de coordinación que deba corregirse.`;
  }

  const calif = stats.pctLiberado >= 90 && stats.pctEntregado >= 90 ? 'un desempeño sobresaliente, dentro de los parámetros esperados de un proyecto bajo control'
    : stats.pctLiberado >= 75 && stats.pctEntregado >= 75 ? 'un desempeño aceptable, aunque con margen de mejora antes de considerarse dentro de rango óptimo'
    : 'un desempeño por debajo del estándar aceptable, que amerita intervención directa de supervisión y seguimiento diario';

  const tiempoTxt = stats.promedioDias !== null
    ? (stats.promedioDias <= 2 ? `un ciclo de respuesta ágil (${stats.promedioDias} día(s) en promedio entre liberación y entrega), compatible con una ruta crítica saneada`
      : stats.promedioDias <= 5 ? `un ciclo de respuesta moderado (${stats.promedioDias} día(s) en promedio), que aún no compromete la ruta crítica pero debe monitorearse`
      : `un ciclo de respuesta lento (${stats.promedioDias} día(s) en promedio), que representa un riesgo concreto de atraso en cadena sobre actividades sucesoras`)
    : 'sin datos suficientes de tiempo de respuesta para emitir un juicio de ciclo';

  const incidenciasTxt = stats.quejasCount > 0
    ? ` Se documentaron ${stats.quejasCount} incidencia(s) en el periodo, ${stats.quejasCount >= 3 ? 'volumen que sugiere un patrón sistémico y no eventos aislados; corresponde escalar el tema en la próxima reunión de coordinación' : 'que deben quedar cerradas con acción correctiva antes del cierre del periodo'}.`
    : ' No se registraron incidencias en el periodo, indicador favorable de coordinación entre frentes.';

  const causasTxt = stats.causaNuestra > stats.causaSub
    ? ` La causa raíz predominante de los incumplimientos de asistencia fue interna (${stats.causaNuestra} de ${stats.causaNuestra + stats.causaSub} casos), lo que apunta a una falla en la preparación previa del frente de trabajo y no en la capacidad del subcontratista; la acción correctiva debe enfocarse en el proceso de liberación, no en el desempeño del contratista.`
    : stats.causaSub > 0
    ? ` La causa raíz predominante de los incumplimientos de asistencia fue del subcontratista (${stats.causaSub} de ${stats.causaNuestra + stats.causaSub} casos), lo que sí amerita seguimiento de capacidad y compromiso contractual.`
    : '';

  return `Durante ${periodoLabel}, ${nombre} tuvo ${stats.totalTalleres} frente(s) de trabajo planificado(s), con ${stats.pctLiberado}% liberado para trabajar y ${stats.pctEntregado}% de entrega sobre lo liberado, ${tiempoTxt}. En conjunto, el indicador refleja ${calif}.${incidenciasTxt}${causasTxt}`;
}

/** Párrafo (no bullets) que interpreta los datos de bitácora del periodo, con criterio de control de obra */
export function buildParrafoAnalisisBitacora(sub: Subcontratista | null, registros: RegistroBitacora[], periodoLabel: string): string {
  const nombre = sub ? sub.nombre : 'el conjunto de subcontratistas';
  if (!registros.length) {
    return `No se registraron visitas de bitácora para ${nombre} durante ${periodoLabel}. La ausencia de registro impide validar la trazabilidad del avance en campo; se recomienda confirmar si hubo actividad real no documentada.`;
  }
  const noLlegaron = registros.filter((b) => b.llego === 'NO').length;
  const pctAsistencia = Math.round(((registros.length - noLlegaron) / registros.length) * 100);
  const completados = registros.filter((b) => b.completo === 'COMPLETADO').length;
  const enProceso = registros.filter((b) => b.completo === 'EN PROCESO').length;
  const sinIniciar = registros.filter((b) => b.completo === 'SIN INICIAR' || !b.completo).length;

  const asistenciaTxt = pctAsistencia === 100 ? 'asistencia de personal del 100%, sin novedades de disponibilidad'
    : pctAsistencia >= 85 ? 'una tasa de asistencia adecuada, con ausencias puntuales que no comprometen el avance general'
    : pctAsistencia >= 60 ? 'una tasa de asistencia irregular que ya representa un riesgo para el cumplimiento del cronograma'
    : 'un nivel de asistencia crítico que exige intervención inmediata de gerencia de contrato con el subcontratista';

  const avanceTxt = sinIniciar > 0 && completados === 0
    ? `De las visitas registradas, ${sinIniciar} permanecen sin iniciar trabajo efectivo, lo que sugiere un cuello de botella previo a la ejecución (personal, materiales o liberación de área) más que un problema de ejecución en sí.`
    : `Del total de visitas, ${completados} cerraron con trabajo completado y ${enProceso} permanecen en proceso; ${sinIniciar > 0 ? `${sinIniciar} aún sin iniciar trabajo efectivo.` : 'sin frentes pendientes de inicio.'}`;

  return `Durante ${periodoLabel}, ${nombre} acumula ${registros.length} visita(s) de bitácora con ${asistenciaTxt}. ${avanceTxt}`;
}

// ===================== FECHAS PROMETIDAS =====================

/** Calcula los días de atraso de una fecha prometida respecto a hoy (o a la fecha de cumplimiento si ya se cumplió) */
export function diasAtrasoFechaPrometida(fp: FechaPrometida): number | null {
  if (!fp.fechaPrometidaActual) return null;
  const hasta = fp.fechaCumplida || todayISO();
  const atraso = diffDays(fp.fechaPrometidaActual, hasta);
  return atraso !== null ? Math.max(0, atraso) : null;
}

export function estaAtrasada(fp: FechaPrometida): boolean {
  if (fp.fechaCumplida) return fp.fechaCumplida > fp.fechaPrometidaActual;
  return fp.fechaPrometidaActual < todayISO();
}

export function estaCumplida(fp: FechaPrometida): boolean {
  return !!fp.fechaCumplida;
}

/** Fechas prometidas relacionadas a un taller específico (por contratista + unidad o general) */
export function fechasPrometidasDelTaller(taller: Taller, fechas: FechaPrometida[]): FechaPrometida[] {
  return fechas.filter(
    (fp) => fp.subcontratistaId === taller.subcontratistaId && (fp.esGeneral || quejaMencionaUnidadGenerico(fp.unidades, taller))
  );
}

function quejaMencionaUnidadGenerico(unidadesStr: string, taller: Taller): boolean {
  if (!unidadesStr) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '');
  const target1 = norm(`${taller.edificio}${taller.unidad}`);
  const target2 = norm(taller.unidad);
  const tokens = unidadesStr.split(',').map((t) => norm(t));
  return tokens.some((t) => t === target1 || t === target2 || (t.length > 2 && (target1.includes(t) || t.includes(target1))));
}

export function fechasPrometidasDelContratista(subId: string | null, fechas: FechaPrometida[]): FechaPrometida[] {
  return fechas
    .filter((fp) => !subId || fp.subcontratistaId === subId)
    .sort((a, b) => a.fechaPrometidaActual.localeCompare(b.fechaPrometidaActual));
}

/** Fechas prometidas vencidas y aún no cumplidas, para alertas en Dashboard */
export function fechasPrometidasAtrasadas(fechas: FechaPrometida[]): FechaPrometida[] {
  return fechas.filter((fp) => !fp.fechaCumplida && fp.fechaPrometidaActual < todayISO());
}

/** Fechas prometidas próximas a vencer (dentro de N días), aún no cumplidas */
export function fechasPrometidasProximas(fechas: FechaPrometida[], diasVentana = 3): FechaPrometida[] {
  const hoy = todayISO();
  return fechas.filter((fp) => {
    if (fp.fechaCumplida) return false;
    const dias = diffDays(hoy, fp.fechaPrometidaActual);
    return dias !== null && dias >= 0 && dias <= diasVentana;
  });
}
