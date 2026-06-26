import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eutfbcxxrsqjiolywnvz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Zq0PM3MHhkwE8hZLZLMvKw_OFXqeGfK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/** Cada "key" de la app (ej: 'talleres', 'subcontratistas') corresponde a una tabla en Supabase
 * con el mismo nombre, donde se guarda una única fila (id fijo) con todos los datos en la columna "data". */
const ROW_ID = 'main';

export async function dbGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase.from(key).select('data').eq('id', ROW_ID).maybeSingle();
    if (error) {
      console.error('storage get failed', key, error);
      return fallback;
    }
    return data ? (data.data as T) : fallback;
  } catch (e) {
    console.error('storage get failed', key, e);
    return fallback;
  }
}

export async function dbSet<T>(key: string, value: T): Promise<boolean> {
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
