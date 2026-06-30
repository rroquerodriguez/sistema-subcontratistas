import * as XLSX from 'xlsx';
import type { Subcontratista } from '@/types';
import { todayISO } from './utils-app';

const PLANTILLA_HEADERS = ['Nombre', 'Especialidad', 'Contacto', 'Teléfono', 'Correo', 'Notas'];

/** Genera y descarga la plantilla vacía para cargar subcontratistas en lote */
export function descargarPlantillaMaestro() {
  const wb = XLSX.utils.book_new();

  const filaEjemplo = {
    Nombre: 'Nombre del subcontratista',
    Especialidad: 'Ej: Electricidad, Plomería, Pintura',
    Contacto: 'Nombre de la persona de contacto',
    Teléfono: '809-000-0000',
    Correo: 'correo@ejemplo.com',
    Notas: '',
  };
  const wsDatos = XLSX.utils.json_to_sheet([filaEjemplo], { header: PLANTILLA_HEADERS });
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Subcontratistas');

  const instrucciones = [
    { Instrucciones: 'Llena una fila por cada subcontratista. No cambies los nombres de las columnas.' },
    { Instrucciones: 'Nombre es obligatorio. Los demás campos son opcionales.' },
    { Instrucciones: 'Si un nombre ya existe en el maestro (coincidencia exacta, sin importar mayúsculas), esa fila se omitirá al importar para evitar duplicados.' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instrucciones), 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_maestro_subcontratistas.xlsx');
}

export interface FilaMaestroResultado {
  subcontratistas: Omit<Subcontratista, 'id'>[];
  totalFilas: number;
  erroresFila: { fila: number; motivo: string }[];
  duplicados: number;
}

/** Lee la plantilla rellenada y la convierte en subcontratistas nuevos, omitiendo duplicados por nombre */
export async function parsePlantillaMaestro(file: File, subsActuales: Subcontratista[]): Promise<FilaMaestroResultado> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames.includes('Subcontratistas') ? 'Subcontratistas' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const erroresFila: { fila: number; motivo: string }[] = [];
  const subcontratistas: Omit<Subcontratista, 'id'>[] = [];
  let duplicados = 0;

  const nombresExistentes = new Set(subsActuales.map((s) => s.nombre.trim().toLowerCase()));

  rows.forEach((r, idx) => {
    const numFila = idx + 2;
    const nombre = String(r['Nombre'] ?? '').trim();
    if (!nombre) {
      const algunOtroValor = ['Especialidad', 'Contacto', 'Teléfono', 'Correo', 'Notas'].some((k) => String(r[k] ?? '').trim());
      if (algunOtroValor) erroresFila.push({ fila: numFila, motivo: 'Falta el nombre del subcontratista.' });
      return;
    }
    if (nombresExistentes.has(nombre.toLowerCase())) { duplicados++; return; }

    subcontratistas.push({
      nombre,
      especialidad: String(r['Especialidad'] ?? '').trim(),
      contacto: String(r['Contacto'] ?? '').trim(),
      telefono: String(r['Teléfono'] ?? '').trim(),
      correo: String(r['Correo'] ?? '').trim(),
      notas: String(r['Notas'] ?? '').trim(),
    });
    nombresExistentes.add(nombre.toLowerCase());
  });

  return { subcontratistas, totalFilas: rows.length, erroresFila, duplicados };
}

/** Exporta el maestro completo de subcontratistas a Excel */
export function exportMaestroExcel(subs: Subcontratista[]) {
  const wb = XLSX.utils.book_new();
  const rows = subs.map((s) => ({
    Nombre: s.nombre,
    Especialidad: s.especialidad,
    Contacto: s.contacto,
    Teléfono: s.telefono,
    Correo: s.correo,
    Notas: s.notas,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Subcontratistas');
  XLSX.writeFile(wb, `maestro_subcontratistas_${todayISO()}.xlsx`);
}
