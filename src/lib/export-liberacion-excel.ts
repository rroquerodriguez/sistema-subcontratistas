import * as XLSX from 'xlsx';
import type { Subcontratista, Taller, Validacion, Entrega } from '@/types';
import { todayISO, diffDays, fechaDeISODia, excelDateValue } from './utils-app';

const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface ColumnaLiberacion {
  key: string;
  label: string;
}

export const COLUMNAS_LIBERACION: ColumnaLiberacion[] = [
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'edificio', label: 'Edificio/Villa/Townhouse' },
  { key: 'unidad', label: 'Unidad' },
  { key: 'actividad', label: 'Actividad' },
  { key: 'dia', label: 'Día' },
  { key: 'estadoLiberacion', label: 'Estado liberación' },
  { key: 'fechaLiberacion', label: 'Fecha liberación' },
  { key: 'validadoPor', label: 'Validado por' },
  { key: 'observacionesLiberacion', label: 'Observaciones liberación' },
  { key: 'estadoEntrega', label: 'Estado entrega' },
  { key: 'fechaEntrega', label: 'Fecha entrega' },
  { key: 'calidad', label: 'Calidad' },
  { key: 'dias', label: 'Días liberación-entrega' },
];

export const COLUMNAS_LIBERACION_DEFAULT = COLUMNAS_LIBERACION.map((c) => c.key);

function sortByDia(a: Taller, b: Taller): number {
  return DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia);
}

function buildRows(
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  subName: (id: string) => string,
  showSub: boolean,
  columnas: string[]
) {
  const incluye = (key: string) => columnas.includes(key);
  return [...talleres].sort(sortByDia).map((t) => {
    const v = validaciones.find((x) => x.tallerId === t.id);
    const e = entregas.find((x) => x.tallerId === t.id);
    let dias: number | string = '';
    if (v?.resultado === 'LISTO' && v.fecha) {
      const hasta = e?.estado === 'ENTREGADO' && e.fechaEntrega ? e.fechaEntrega : todayISO();
      dias = diffDays(v.fecha, hasta) ?? '';
    }
    const row: Record<string, string | number | Date | null> = {};
    if (showSub) row['Subcontratista'] = subName(t.subcontratistaId);
    if (incluye('proyecto')) row['Proyecto'] = t.proyecto;
    if (incluye('edificio')) row['Edificio/Villa/Townhouse'] = t.edificio;
    if (incluye('unidad')) row['Unidad'] = t.esGeneral ? 'GENERAL' : t.unidad;
    if (incluye('actividad')) row['Actividad'] = t.actividad;
    if (incluye('dia')) row['Día'] = excelDateValue(fechaDeISODia(t.semana, t.dia));
    if (incluye('estadoLiberacion')) row['Estado liberación'] = v?.resultado || 'PENDIENTE';
    if (incluye('fechaLiberacion')) row['Fecha liberación'] = excelDateValue(v?.fecha || '');
    if (incluye('validadoPor')) row['Validado por'] = v?.validadoPor || '';
    if (incluye('observacionesLiberacion')) row['Observaciones liberación'] = v?.observaciones || '';
    if (incluye('estadoEntrega')) row['Estado entrega'] = e?.estado || 'NO ENTREGADO';
    if (incluye('fechaEntrega')) row['Fecha entrega'] = excelDateValue(e?.fechaEntrega || '');
    if (incluye('calidad')) row['Calidad'] = e?.calidad || '';
    if (incluye('dias')) row['Días liberación-entrega'] = dias;
    return row;
  });
}

export function exportLiberacionExcel(
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  subs: Subcontratista[],
  periodoLabel: string,
  subFiltro: Subcontratista | null,
  columnas: string[] = COLUMNAS_LIBERACION_DEFAULT
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const wb = XLSX.utils.book_new();

  if (subFiltro) {
    const rows = buildRows(talleres, validaciones, entregas, subName, false, columnas);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), subFiltro.nombre.slice(0, 28) || 'Liberación');
  } else {
    const todasRows = buildRows(talleres, validaciones, entregas, subName, true, columnas);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(todasRows), 'Todas');

    const subIds = [...new Set(talleres.map((t) => t.subcontratistaId))];
    subIds.forEach((subId) => {
      const subTalleres = talleres.filter((t) => t.subcontratistaId === subId);
      const rows = buildRows(subTalleres, validaciones, entregas, subName, false, columnas);
      const sheetName = (subName(subId) || 'Sub').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Sub';
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    });
  }

  const fname = `liberacion_${subFiltro ? subFiltro.nombre.replace(/\s+/g, '_') : 'general'}_${periodoLabel.replace(/[\s/]+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fname);
}
