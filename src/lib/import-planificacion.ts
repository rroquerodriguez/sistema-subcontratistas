import * as XLSX from 'xlsx';
import type { Subcontratista, Taller, Proyecto, DiaSemana, Prioridad } from '@/types';

const PLANTILLA_HEADERS = ['Subcontratista', 'Proyecto', 'Edificio / Villa / Townhouse', 'Unidad', 'General (SI/NO)', 'Actividad', 'Prioridad (1/2/3)', 'Día', 'Técnico Asignado', 'Inspector de Calidad', 'Fecha Promesa', 'Observaciones'];

/** Genera y descarga la plantilla vacía (con una hoja de instrucciones y subcontratistas válidos) */
export function descargarPlantillaPlanificacion(subs: Subcontratista[]) {
  const wb = XLSX.utils.book_new();

  const filaEjemplo = {
    Subcontratista: subs[0]?.nombre || 'Nombre exacto del subcontratista',
    Proyecto: 'PANORAMA PARK',
    'Edificio / Villa / Townhouse': 'G6',
    Unidad: '101',
    'General (SI/NO)': 'NO',
    Actividad: 'Instalación de ventanas',
    'Prioridad (1/2/3)': '2',
    Día: 'Lunes',
    'Técnico Asignado': 'Nombre del técnico',
    'Inspector de Calidad': 'Nombre del inspector',
    'Fecha Promesa': '',
    Observaciones: '',
  };
  const wsDatos = XLSX.utils.json_to_sheet([filaEjemplo], { header: PLANTILLA_HEADERS });
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Talleres');

  const instrucciones = [
    { Instrucciones: 'Llena una fila por cada taller a planificar. No cambies los nombres de las columnas.' },
    { Instrucciones: 'Subcontratista debe coincidir exactamente con el nombre registrado en la pestaña Subcontratistas.' },
    { Instrucciones: 'Proyecto debe ser PANORAMA PARK o PANORAMA GARDEN.' },
    { Instrucciones: '"Edificio / Villa / Townhouse" y "Unidad" deben coincidir con el reporte de unidades del proyecto si quieres que técnico, inspector y fecha promesa se autocompleten al planificar manualmente; si las dejas vacías o sin coincidencia, igual se crea el taller con lo que escribas aquí.' },
    { Instrucciones: '"General (SI/NO)": marca SI cuando la actividad aplique a todo el edificio y no a una unidad específica (ej: pintura de fachada exterior). En ese caso, deja Unidad, Técnico Asignado y Fecha Promesa vacíos: no aplican.' },
    { Instrucciones: 'Prioridad (1/2/3): 1 = Alta, 2 = Media, 3 = Baja. Si se deja vacío, se asigna Media.' },
    { Instrucciones: 'Día debe ser uno de: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado. Si se deja vacío, se asigna Lunes.' },
    { Instrucciones: 'Fecha Promesa en formato DD/MM/AAAA (opcional, no aplica si General es SI).' },
    { Instrucciones: 'La semana en la que se crean los talleres es la que esté seleccionada en Planificación al momento de subir este archivo.' },
    { Instrucciones: '' },
    { Instrucciones: 'Subcontratistas disponibles:' },
    ...subs.map((s) => ({ Instrucciones: `- ${s.nombre}` })),
  ];
  const wsInstrucciones = XLSX.utils.json_to_sheet(instrucciones);
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_planificacion_talleres.xlsx');
}

export interface FilaPlantillaResultado {
  talleres: Omit<Taller, 'id' | 'semana'>[];
  totalFilas: number;
  erroresFila: { fila: number; motivo: string }[];
}

const PROYECTOS_VALIDOS: Proyecto[] = ['PANORAMA PARK', 'PANORAMA GARDEN'];
const DIAS_VALIDOS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

/** Lee la plantilla de planificación rellenada y la convierte en talleres listos para guardar */
export async function parsePlantillaPlanificacion(file: File, subs: Subcontratista[]): Promise<FilaPlantillaResultado> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames.includes('Talleres') ? 'Talleres' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const erroresFila: { fila: number; motivo: string }[] = [];
  const talleres: Omit<Taller, 'id' | 'semana'>[] = [];

  const subByName = new Map(subs.map((s) => [s.nombre.trim().toLowerCase(), s]));

  // Acepta tanto el encabezado nuevo como el antiguo "Edificio" por si quedan plantillas viejas en uso
  const colEdificio = (r: Record<string, unknown>) => r['Edificio / Villa / Townhouse'] ?? r['Edificio'] ?? '';
  const colTecnico = (r: Record<string, unknown>) => r['Técnico Asignado'] ?? r['Técnico'] ?? '';

  rows.forEach((r, idx) => {
    const numFila = idx + 2;
    const nombreSub = String(r['Subcontratista'] ?? '').trim();
    const unidad = String(r['Unidad'] ?? '').trim();
    const esGeneral = String(r['General (SI/NO)'] ?? '').trim().toUpperCase() === 'SI';
    const edificio = String(colEdificio(r) ?? '').trim();

    if (!nombreSub && !unidad && !edificio) return;

    if (!nombreSub) { erroresFila.push({ fila: numFila, motivo: 'Falta el nombre del subcontratista.' }); return; }
    if (!esGeneral && !unidad) { erroresFila.push({ fila: numFila, motivo: 'Falta la unidad (o marca General = SI si aplica a todo el edificio).' }); return; }
    if (esGeneral && !edificio) { erroresFila.push({ fila: numFila, motivo: 'Falta el edificio para una actividad general.' }); return; }

    const sub = subByName.get(nombreSub.toLowerCase());
    if (!sub) { erroresFila.push({ fila: numFila, motivo: `Subcontratista "${nombreSub}" no coincide con ninguno registrado.` }); return; }

    let proyecto = String(r['Proyecto'] ?? '').trim().toUpperCase() as Proyecto;
    if (!PROYECTOS_VALIDOS.includes(proyecto)) proyecto = 'PANORAMA PARK';

    let prioridad = String(r['Prioridad (1/2/3)'] ?? '').trim() as Prioridad;
    if (!['1', '2', '3'].includes(prioridad)) prioridad = '2';

    let dia = String(r['Día'] ?? '').trim() as DiaSemana;
    if (!DIAS_VALIDOS.includes(dia)) dia = 'Lunes';

    talleres.push({
      subcontratistaId: sub.id,
      proyecto,
      edificio,
      unidad: esGeneral ? '' : unidad,
      esGeneral,
      actividad: String(r['Actividad'] ?? '').trim(),
      prioridad,
      dia,
      tecnico: esGeneral ? '' : String(colTecnico(r) ?? '').trim(),
      inspector: String(r['Inspector de Calidad'] ?? '').trim(),
      fechaPromesa: esGeneral ? '' : excelFechaToISO(r['Fecha Promesa']),
      observaciones: String(r['Observaciones'] ?? '').trim(),
    });
  });

  return { talleres, totalFilas: rows.length, erroresFila };
}

