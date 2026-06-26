import * as XLSX from 'xlsx';
import type { Subcontratista, Stats, Queja } from '@/types';
import type { TallerDetailExt } from './stats-engine';
import { historialIncidenciasContratista } from './stats-engine';
import { fmtDate } from './utils-app';

export function exportEvaluacionExcel(
  detailList: TallerDetailExt[],
  subs: Subcontratista[],
  periodoLabel: string,
  stats: Stats,
  subFiltro: Subcontratista | null,
  todasLasQuejas: Queja[] = [],
  parrafoAnalisis: string = ''
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';

  const rows = detailList.map(({ taller, validacion, entrega, dias, quejasAsociadas, comentario, fechasAsociadas }) => ({
    Subcontratista: subName(taller.subcontratistaId),
    Proyecto: taller.proyecto,
    Edificio: taller.edificio,
    Unidad: taller.unidad,
    Actividad: taller.actividad,
    Prioridad: taller.prioridad,
    Dia: taller.dia,
    Tecnico: taller.tecnico,
    'Estado liberación': validacion?.resultado || 'PENDIENTE',
    'Fecha liberación': validacion?.fecha ? fmtDate(validacion.fecha) : '',
    'Validado por': validacion?.validadoPor || '',
    'Fotos liberación': validacion?.fotos?.length || 0,
    'Estado entrega': entrega?.estado || 'NO ENTREGADO',
    'Fecha entrega': entrega?.fechaEntrega ? fmtDate(entrega.fechaEntrega) : '',
    'Fotos entrega': entrega?.fotos?.length || 0,
    'Días liberación-entrega': dias ?? '',
    Calidad: entrega?.calidad || '',
    Observaciones: validacion?.observaciones || '',
    'Cantidad incidencias': quejasAsociadas.length,
    'Cantidad fechas prometidas': fechasAsociadas?.length || 0,
    'Cantidad registros bitácora': 0, // se completa abajo
    Comentario: comentario.map((l) => `• ${l}`).join('\n'),
  }));

  // Completar la cantidad de registros de bitácora por taller (no estaba en el destructuring por claridad)
  detailList.forEach((d, i) => { rows[i]['Cantidad registros bitácora'] = d.bitacora.length; });

  const resumenRows = [
    { Indicador: 'Talleres planificados', Valor: stats.totalTalleres },
    { Indicador: 'Liberados', Valor: stats.liberados },
    { Indicador: 'No liberados', Valor: stats.noLiberados },
    { Indicador: 'Pendientes de validar', Valor: stats.pendientesVal },
    { Indicador: '% liberado para trabajar', Valor: `${stats.pctLiberado}%` },
    { Indicador: 'Entregados', Valor: stats.entregados },
    { Indicador: 'Sin entregar (liberados)', Valor: stats.sinEntregar },
    { Indicador: '% entregado sobre liberados', Valor: `${stats.pctEntregado}%` },
    { Indicador: 'Promedio días liberación-entrega', Valor: stats.promedioDias ?? '—' },
    { Indicador: 'Incidencias registradas esta semana', Valor: stats.quejasCount },
  ];

  // Detalle de incidencias por taller — una fila por cada incidencia asociada, igual que se ve en pantalla
  const incidenciasRows: Record<string, string | number>[] = [];
  detailList.forEach((d) => {
    d.quejasAsociadas.forEach((q) => {
      incidenciasRows.push({
        Subcontratista: subName(d.taller.subcontratistaId),
        Taller: `${d.taller.edificio} ${d.taller.unidad}`,
        'Fecha incidencia': fmtDate(q.fecha),
        Tipo: q.tipo,
        Descripción: q.descripcion,
        Causa: q.causa,
        General: q.esGeneral ? 'SI' : 'NO',
        'Cantidad de fotos': q.fotos?.length || 0,
      });
    });
  });

  // Historial completo de incidencias por contratista (sin filtrar por semana), igual que se ve en pantalla
  const historialRows: Record<string, string | number>[] = [];
  const subsAIncluir = subFiltro ? [subFiltro] : subs.filter((s) => detailList.some((d) => d.taller.subcontratistaId === s.id));
  subsAIncluir.forEach((s) => {
    historialIncidenciasContratista(s.id, todasLasQuejas).forEach((q) => {
      historialRows.push({
        Subcontratista: s.nombre,
        Fecha: fmtDate(q.fecha),
        Tipo: q.tipo,
        Descripción: q.descripcion,
        Causa: q.causa,
        'Unidades / General': q.esGeneral ? 'GENERAL' : q.unidades,
        'Impacto (días)': q.impactoDias,
        'Cantidad de fotos': q.fotos?.length || 0,
      });
    });
  });

  // Detalle de bitácora por taller — una fila por cada registro, igual que se ve en pantalla
  const bitacoraRows: Record<string, string | number>[] = [];
  detailList.forEach((d) => {
    d.bitacora.forEach((b) => {
      bitacoraRows.push({
        Subcontratista: subName(d.taller.subcontratistaId),
        Taller: `${d.taller.edificio} ${d.taller.unidad}`,
        Fecha: fmtDate(b.fecha),
        Llegó: b.llego,
        Completó: b.completo,
        Motivo: b.motivo,
        Responsable: b.responsable,
        Acción: b.accion,
        Notas: b.notas,
        'Cantidad de fotos': b.fotos?.length || 0,
      });
    });
  });

  // Detalle de fechas prometidas por taller — una fila por cada compromiso asociado, igual que se ve en pantalla
  const fechasRows: Record<string, string | number>[] = [];
  detailList.forEach((d) => {
    (d.fechasAsociadas || []).forEach((fp) => {
      fechasRows.push({
        Subcontratista: subName(d.taller.subcontratistaId),
        Taller: `${d.taller.edificio} ${d.taller.unidad}`,
        Descripción: fp.descripcion,
        'Fecha prometida': fmtDate(fp.fechaPrometidaActual),
        'Fecha cumplida': fp.fechaCumplida ? fmtDate(fp.fechaCumplida) : '',
        General: fp.esGeneral ? 'SI' : 'NO',
        'Cantidad de fotos': fp.fotos?.length || 0,
      });
    });
  });

  const wb = XLSX.utils.book_new();
  if (parrafoAnalisis) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Análisis: parrafoAnalisis }]), 'Análisis');
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), 'Resumen');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detalle talleres');
  if (incidenciasRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incidenciasRows), 'Incidencias por taller');
  if (historialRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historialRows), 'Historial incidencias');
  if (bitacoraRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bitacoraRows), 'Bitácora por taller');
  if (fechasRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fechasRows), 'Fechas prometidas por taller');

  const fname = `evaluacion_${subFiltro ? subFiltro.nombre.replace(/\s+/g, '_') : 'general'}_${periodoLabel.replace(/[\s/]+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fname);
}
