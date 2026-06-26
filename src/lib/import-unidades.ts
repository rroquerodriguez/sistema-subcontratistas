import * as XLSX from 'xlsx';
import type { UnidadProyecto } from '@/types';
import { uid, nowISODatetime } from './utils-app';

/** Convierte una fecha de Excel (string DD/MM/YYYY, número serial, o vacío) a ISO YYYY-MM-DD */
function excelFechaToISO(valor: unknown): string {
  if (!valor) return '';
  if (typeof valor === 'number') {
    const date = new Date(Math.round((valor - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }
  const str = String(valor).trim();
  if (!str) return '';
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return '';
}

export interface ImportResultado {
  unidades: UnidadProyecto[];
  totalFilas: number;
  columnasDetectadas: string[];
  advertencias: string[];
}

/** Lee el archivo del reporte de unidades y devuelve la lista de UnidadProyecto */
export async function parseReporteUnidades(file: File): Promise<ImportResultado> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });

  const sheetName = wb.SheetNames.includes('Unidades') ? 'Unidades' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const advertencias: string[] = [];
  if (!rows.length) {
    return { unidades: [], totalFilas: 0, columnasDetectadas: [], advertencias: ['El archivo no contiene filas de datos.'] };
  }

  const columnasDetectadas = Object.keys(rows[0]);

  const findCol = (candidatos: string[]): string | null => {
    for (const c of candidatos) {
      const match = columnasDetectadas.find((col) => col.trim().toLowerCase() === c.toLowerCase());
      if (match) return match;
    }
    return null;
  };

  const colProyecto = findCol(['Proyecto']);
  const colEdificio = findCol(['Vivienda (N°)', 'Vivienda (N\u00b0)', 'Tipo de Vivienda', 'Edificio']);
  const colUnidad = findCol(['Unidad']);
  const colEstado = findCol(['Estado']);
  const colTecnico = findCol(['Técnico Asignado', 'Tecnico Asignado', 'Técnico']);
  const colInspector = findCol(['Inspector Calidad Asignado', 'Inspector de Calidad', 'Inspector Calidad']);
  const colFechaPromesa = findCol(['Fecha Promesa']);

  if (!colUnidad) advertencias.push('No se encontró la columna "Unidad" — verifica el archivo.');
  if (!colEdificio) advertencias.push('No se encontró una columna de edificio/vivienda; se usará vacío.');
  if (!colFechaPromesa) advertencias.push('No se encontró la columna "Fecha Promesa"; las unidades importadas no tendrán fecha.');

  const ahora = nowISODatetime();
  const unidades: UnidadProyecto[] = rows
    .filter((r) => colUnidad && String(r[colUnidad] ?? '').trim())
    .map((r) => ({
      id: uid('uni'),
      proyecto: colProyecto ? String(r[colProyecto] ?? '').trim() : '',
      edificio: colEdificio ? String(r[colEdificio] ?? '').trim() : '',
      unidad: colUnidad ? String(r[colUnidad] ?? '').trim() : '',
      estado: colEstado ? String(r[colEstado] ?? '').trim() : '',
      tecnico: colTecnico ? String(r[colTecnico] ?? '').trim() : '',
      inspector: colInspector ? String(r[colInspector] ?? '').trim() : '',
      fechaPromesa: colFechaPromesa ? excelFechaToISO(r[colFechaPromesa]) : '',
      importadoEn: ahora,
    }));

  return { unidades, totalFilas: rows.length, columnasDetectadas, advertencias };
}

/** Combina unidades nuevas importadas con las existentes: actualiza por (proyecto+edificio+unidad), agrega las nuevas */
export function combinarUnidades(existentes: UnidadProyecto[], nuevas: UnidadProyecto[]): UnidadProyecto[] {
  const key = (u: UnidadProyecto) => `${u.proyecto}|${u.edificio}|${u.unidad}`.toLowerCase();
  const map = new Map(existentes.map((u) => [key(u), u]));
  nuevas.forEach((u) => {
    map.set(key(u), u);
  });
  return [...map.values()];
}
