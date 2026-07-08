import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eutfbcxxrsqjiolywnvz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Zq0PM3MHhkwE8hZLZLMvKw_OFXqeGfK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/** Cada "key" de la app (ej: 'talleres', 'subcontratistas') corresponde a una tabla en Supabase
 * con el mismo nombre, donde se guarda una única fila (id fijo) con todos los datos en la columna "data". */
const ROW_ID = 'main';

/* ------------------------------------------------------------------------------------------------
 * PROTECCIÓN ANTI-BORRADO
 *
 * Como cada guardado reescribe la lista COMPLETA de una clave, hay un escenario de pérdida de datos
 * silenciosa: si la lectura inicial de una clave falla (mala señal, timeout), la app quedaría con
 * una lista vacía en memoria; el siguiente guardado escribiría esa lista casi vacía encima de todos
 * los datos reales, sin ningún error visible.
 *
 * Para evitarlo, esta capa lleva registro de qué claves se leyeron correctamente ("confiables") y
 * cuáles fallaron al leerse ("no confiables"). dbSet se NIEGA a escribir sobre una clave no
 * confiable, y avisa a la interfaz (via listeners) para que muestre el error al usuario y ofrezca
 * recargar. Una clave vuelve a ser confiable cuando una lectura posterior (ej: al recargar) tiene éxito.
 *
 * Nota: que una clave no exista todavía en la base (proyecto nuevo, primera vez) NO es un fallo —
 * la lectura fue exitosa y devolvió "no hay fila"; en ese caso sí se permite escribir.
 * ---------------------------------------------------------------------------------------------- */

const clavesFallidas = new Set<string>();

type ListenerBloqueo = (key: string) => void;
const listenersBloqueo = new Set<ListenerBloqueo>();

/** Suscribe un callback que se dispara cada vez que un guardado es bloqueado por protección de datos.
 * Devuelve la función para desuscribirse. */
export function onEscrituraBloqueada(cb: ListenerBloqueo): () => void {
  listenersBloqueo.add(cb);
  return () => listenersBloqueo.delete(cb);
}

/** Claves cuya última lectura falló (datos no confiables en memoria). Vacío = todo cargó bien. */
export function clavesNoConfiables(): string[] {
  return [...clavesFallidas];
}

export async function dbGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase.from(key).select('data').eq('id', ROW_ID).maybeSingle();
    if (error) {
      console.error('storage get failed', key, error);
      clavesFallidas.add(key);
      return fallback;
    }
    // Lectura exitosa (aunque no exista la fila todavía): la clave es confiable
    clavesFallidas.delete(key);
    return data ? (data.data as T) : fallback;
  } catch (e) {
    console.error('storage get failed', key, e);
    clavesFallidas.add(key);
    return fallback;
  }
}

export async function dbSet<T>(key: string, value: T): Promise<boolean> {
  // Protección anti-borrado: si la última lectura de esta clave falló, lo que hay en memoria es un
  // fallback vacío, NO los datos reales. Escribir ahora destruiría los datos en la base. Se bloquea.
  if (clavesFallidas.has(key)) {
    console.error(`storage set BLOQUEADO para "${key}": la carga inicial de esta clave falló y escribir ahora sobrescribiría los datos reales con datos incompletos. Recarga la aplicación.`);
    listenersBloqueo.forEach((cb) => cb(key));
    return false;
  }
  try {
    const { error } = await supabase.from(key).upsert({ id: ROW_ID, data: value, updated_at: new Date().toISOString() });
    if (error) {
      console.error('storage set failed', key, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('storage set failed', key, e);
    return false;
  }
}
