import { dbSet, clavesNoConfiables } from '@/lib/storage';

/* ------------------------------------------------------------------------------------------------
 * GUARDADO CON CONFIRMACIÓN HONESTA
 *
 * Antes, los módulos hacían `await dbSet(...)` y mostraban el toast de éxito sin mirar el resultado:
 * si la escritura fallaba (mala señal, sesión caducada), el usuario veía "Guardado" sobre un dato
 * que nunca llegó a la base. Este helper envuelve dbSet y centraliza el manejo del fallo:
 *
 * - Devuelve true/false igual que dbSet, para que el llamador decida si continuar (mostrar el toast
 *   de éxito, cerrar el diálogo, encadenar el siguiente guardado).
 * - Si falla, notifica a la app (via listener) para mostrar un error prominente con la opción de
 *   recargar los datos — recargar desde la base es la forma más segura de "revertir" la pantalla
 *   al estado real.
 * - Si el fallo fue por la protección anti-borrado (clave no confiable), NO emite su propio aviso,
 *   porque la capa de storage ya emitió el suyo con el mensaje específico de esa situación.
 *
 * Patrón de uso en los módulos:  if (!(await persistir('talleres', next))) return;
 * El return temprano evita el toast de éxito mentiroso y deja el formulario abierto con los datos
 * del usuario intactos para que pueda reintentar.
 * ---------------------------------------------------------------------------------------------- */

type ListenerFallo = (key: string) => void;
const listenersFallo = new Set<ListenerFallo>();

/** Suscribe un callback que se dispara cuando un guardado falla por red/servidor (no por protección
 * anti-borrado, que tiene su propio aviso). Devuelve la función para desuscribirse. */
export function onFalloGuardado(cb: ListenerFallo): () => void {
  listenersFallo.add(cb);
  return () => listenersFallo.delete(cb);
}

export async function persistir<T>(key: string, value: T): Promise<boolean> {
  const ok = await dbSet(key, value);
  if (!ok && !clavesNoConfiables().includes(key)) {
    listenersFallo.forEach((cb) => cb(key));
  }
  return ok;
}
