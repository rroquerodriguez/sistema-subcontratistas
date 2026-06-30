import { dbGet, dbSet } from './storage';
import { todayISO } from './utils-app';

/** Todas las claves de almacenamiento que usa la app. Si se agrega una nueva en el futuro, debe añadirse aquí también. */
export const STORAGE_KEYS = [
  'subcontratistas',
  'talleres',
  'validaciones',
  'entregas',
  'bitacora',
  'quejas',
  'ciclos_taller',
  'fechas_prometidas',
  'catalogo_talleres',
  'unidades_proyecto',
  'unidades_proyecto_meta',
] as const;

export interface RespaldoCompleto {
  version: 1;
  generadoEn: string;
  datos: Record<string, unknown>;
}

/** Lee todas las claves de storage y arma un único objeto de respaldo */
export async function generarRespaldo(): Promise<RespaldoCompleto> {
  const datos: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    datos[key] = await dbGet(key, []);
  }
  return { version: 1, generadoEn: new Date().toISOString(), datos };
}

/** Descarga el respaldo como archivo .json */
export async function descargarRespaldo() {
  const respaldo = await generarRespaldo();
  const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = todayISO();
  a.href = url;
  a.download = `respaldo_subcontratistas_${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ResultadoRestauracion {
  ok: boolean;
  mensaje: string;
  clavesRestauradas: string[];
}

/** Lee un archivo de respaldo y escribe sus datos de vuelta en storage.
 * modo 'reemplazar': sobrescribe cada clave por completo con lo del respaldo.
 * modo 'fusionar': combina por id, agregando lo que falte sin borrar lo ya existente en cada lista. */
export async function restaurarRespaldo(file: File, modo: 'reemplazar' | 'fusionar' = 'reemplazar'): Promise<ResultadoRestauracion> {
  let parsed: RespaldoCompleto;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, mensaje: 'El archivo no es un JSON de respaldo válido.', clavesRestauradas: [] };
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.datos) {
    return { ok: false, mensaje: 'El archivo no tiene el formato esperado de respaldo.', clavesRestauradas: [] };
  }

  const clavesRestauradas: string[] = [];
  for (const key of STORAGE_KEYS) {
    if (!(key in parsed.datos)) continue;
    const nuevoValor = parsed.datos[key];
    // Esta clave es un objeto único de metadata, no una lista — siempre se reemplaza directo, sin fusión por id
    if (key === 'unidades_proyecto_meta') {
      await dbSet(key, nuevoValor);
      clavesRestauradas.push(key);
      continue;
    }
    if (modo === 'reemplazar') {
      await dbSet(key, nuevoValor);
    } else {
      const actual = await dbGet<Record<string, unknown>[]>(key, []);
      const nuevo = Array.isArray(nuevoValor) ? (nuevoValor as Record<string, unknown>[]) : [];
      const existentesIds = new Set(actual.map((x) => x?.id));
      const combinado = [...actual, ...nuevo.filter((x) => !existentesIds.has(x?.id))];
      await dbSet(key, combinado);
    }
    clavesRestauradas.push(key);
  }

  return {
    ok: true,
    mensaje: `Restauración completa (${modo === 'reemplazar' ? 'reemplazando' : 'fusionando'} datos). Generado originalmente el ${new Date(parsed.generadoEn).toLocaleString('es-DO')}.`,
    clavesRestauradas,
  };
}
