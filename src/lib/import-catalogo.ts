import * as XLSX from 'xlsx';
import type { Subcontratista, TallerCatalogo } from '@/types';

const PLANTILLA_HEADERS = ['Subcontratista', 'Actividad', 'Notas'];

/** Genera y descarga la plantilla vacía del catálogo, con hoja de instrucciones y subcontratistas válidos */
export function descargarPlantillaCatalogo(subs: Subcontratista[]) {
  const wb = XLSX.utils.book_new();

  const filaEjemplo = {
    Subcontratista: subs[0]?.nombre || 'Nombre exacto del subcontratista',
    Actividad: 'Instalación de ventanas',
    Notas: '',
  };
  const wsDatos = XLSX.utils.json_to_sheet([filaEjemplo], { header: PLANTILLA_HEADERS });
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Catálogo');

  const instrucciones = [
    { Instrucciones: 'Llena una fila por cada actividad típica del subcontratista. No cambies los nombres de las columnas.' },
    { Instrucciones: 'Subcontratista debe coincidir exactamente con el nombre registrado en la pestaña Subcontratistas.' },
    { Instrucciones: 'Actividad no puede estar vacía. Notas es opcional.' },
    { Instrucciones: 'Si una actividad ya existe en el catálogo para ese subcontratista (mismo nombre), no se duplicará al importar.' },
    { Instrucciones: '' },
    { Instrucciones: 'Subcontratistas disponibles:' },
    ...subs.map((s) => ({ Instrucciones: `- ${s.nombre}` })),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instrucciones), 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_catalogo_talleres.xlsx');
}

export interface FilaCatalogoResultado {
  actividades: Omit<TallerCatalogo, 'id'>[];
  totalFilas: number;
  erroresFila: { fila: number; motivo: string }[];
  duplicadas: number;
}

/** Lee la plantilla rellenada y la convierte en entradas de catálogo, descartando duplicados exactos ya existentes */
export async function parsePlantillaCatalogo(file: File, subs: Subcontratista[], catalogoActual: TallerCatalogo[]): Promise<FilaCatalogoResultado> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames.includes('Catálogo') ? 'Catálogo' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const erroresFila: { fila: number; motivo: string }[] = [];
  const actividades: Omit<TallerCatalogo, 'id'>[] = [];
  let duplicadas = 0;

  const subByName = new Map(subs.map((s) => [s.nombre.trim().toLowerCase(), s]));

  rows.forEach((r, idx) => {
    const numFila = idx + 2;
    const nombreSub = String(r['Subcontratista'] ?? '').trim();
    const actividad = String(r['Actividad'] ?? '').trim();

    if (!nombreSub && !actividad) return;
    if (!nombreSub) { erroresFila.push({ fila: numFila, motivo: 'Falta el nombre del subcontratista.' }); return; }
    if (!actividad) { erroresFila.push({ fila: numFila, motivo: 'Falta el nombre de la actividad.' }); return; }

    const sub = subByName.get(nombreSub.toLowerCase());
    if (!sub) { erroresFila.push({ fila: numFila, motivo: `Subcontratista "${nombreSub}" no coincide con ninguno registrado.` }); return; }

    const yaExiste = catalogoActual.some((c) => c.subcontratistaId === sub.id && c.actividad.toLowerCase() === actividad.toLowerCase());
    if (yaExiste) { duplicadas++; return; }

    actividades.push({ subcontratistaId: sub.id, actividad, notas: String(r['Notas'] ?? '').trim() });
  });

  return { actividades, totalFilas: rows.length, erroresFila, duplicadas };
}

/** Exporta el catálogo completo (o filtrado) a Excel, agrupado por subcontratista */
export function exportCatalogoExcel(catalogo: TallerCatalogo[], subs: Subcontratista[], subFiltro: Subcontratista | null) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const wb = XLSX.utils.book_new();

  const rows = (subFiltro ? catalogo.filter((c) => c.subcontratistaId === subFiltro.id) : catalogo).map((c) => ({
    Subcontratista: subName(c.subcontratistaId),
    Actividad: c.actividad,
    Notas: c.notas,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Catálogo');

  const fname = `catalogo_talleres_${subFiltro ? subFiltro.nombre.replace(/\s+/g, '_') : 'general'}.xlsx`;
  XLSX.writeFile(wb, fname);
}
