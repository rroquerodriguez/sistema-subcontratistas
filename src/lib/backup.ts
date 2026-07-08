import { dbGet, dbSet, clavesNoConfiables } from './storage';
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

/** Grupos de datos que el usuario puede borrar selectivamente desde Configuración. Cada módulo
 * agrupa una o varias claves de storage relacionadas. Se define aparte de STORAGE_KEYS porque un
 * "módulo" desde el punto de vista del usuario (ej: "Planificación") puede involucrar varias claves
 * técnicas (talleres + validaciones + entregas), y algunas claves (como los subcontratistas o el
 * catálogo) son datos maestros que conviene poder conservar aunque se borre el resto. */
export interface ModuloBorrable {
  key: string;
  label: string;
  descripcion: string;
  storageKeys: string[];
}

export const MODULOS_BORRABLES: ModuloBorrable[] = [
  {
    key: 'planificacion',
    label: 'Planificación (talleres, liberaciones y entregas)',
    descripcion: 'Todos los talleres planificados junto con sus validaciones de liberación y registros de entrega.',
    storageKeys: ['talleres', 'validaciones', 'entregas'],
  },
  {
    key: 'bitacora',
    label: 'Bitácora diaria',
    descripcion: 'Todos los registros de avance diario de obra.',
    storageKeys: ['bitacora'],
  },
  {
    key: 'quejas',
    label: 'Quejas e incidencias',
    descripcion: 'Todas las incidencias y quejas registradas, junto con su seguimiento por ciclos.',
    storageKeys: ['quejas', 'ciclos_taller'],
  },
  {
    key: 'fechas',
    label: 'Fechas prometidas',
    descripcion: 'Todas las fechas prometidas por los subcontratistas y su historial de cambios.',
    storageKeys: ['fechas_prometidas'],
  },
  {
    key: 'catalogo',
    label: 'Catálogo de talleres',
    descripcion: 'El catálogo de actividades por subcontratista (datos maestros).',
    storageKeys: ['catalogo_talleres'],
  },
  {
    key: 'subcontratistas',
    label: 'Subcontratistas',
    descripcion: 'La lista maestra de subcontratistas. Ojo: borrarla deja sin nombre a los talleres que dependan de ella.',
    storageKeys: ['subcontratistas'],
  },
  {
    key: 'unidades',
    label: 'Unidades del proyecto (Excel importado)',
    descripcion: 'Las unidades importadas del Excel de reporte y la información del último archivo cargado.',
    storageKeys: ['unidades_proyecto', 'unidades_proyecto_meta'],
  },
];

/** Borra por completo las claves de storage de los módulos indicados (deja cada clase de dato como
 * lista vacía). Devuelve las claves efectivamente vaciadas. No pide confirmación — eso lo maneja la UI. */
export async function resetearModulos(keysModulos: string[]): Promise<string[]> {
  const modulos = MODULOS_BORRABLES.filter((m) => keysModulos.includes(m.key));
  const vaciadas: string[] = [];
  for (const modulo of modulos) {
    for (const sk of modulo.storageKeys) {
      // La metadata del archivo es un objeto único, no una lista: se deja en null
      await dbSet(sk, sk === 'unidades_proyecto_meta' ? null : []);
      vaciadas.push(sk);
    }
  }
  return vaciadas;
}

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

/** Respaldo de seguridad AUTOMÁTICO que se descarga justo antes de una operación destructiva
 * (restaurar respaldo, borrar datos). Devuelve true si el respaldo se generó y descargó completo.
 *
 * Detalle importante: si alguna clave no se pudo LEER al generar el respaldo, el archivo contendría
 * listas vacías donde en realidad hay datos — un respaldo así es una trampa (restaurarlo después
 * borraría esos datos). Por eso, si alguna lectura falló, esta función devuelve false y la operación
 * destructiva que la llamó debe ABORTAR. */
export async function respaldoDeSeguridad(motivo: string): Promise<boolean> {
  const respaldo = await generarRespaldo();
  const fallidas = clavesNoConfiables().filter((k) => (STORAGE_KEYS as readonly string[]).includes(k));
  if (fallidas.length > 0) {
    console.error('Respaldo de seguridad incompleto, claves ilegibles:', fallidas);
    return false;
  }
  const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ahora = new Date();
  const marca = `${todayISO()}_${String(ahora.getHours()).padStart(2, '0')}-${String(ahora.getMinutes()).padStart(2, '0')}-${String(ahora.getSeconds()).padStart(2, '0')}`;
  a.href = url;
  a.download = `respaldo_seguridad_${motivo}_${marca}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
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
