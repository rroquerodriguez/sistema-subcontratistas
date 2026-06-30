import { createContext, useContext } from 'react';
import type { Perfil } from '@/types';

export interface UsuarioActual {
  id: string;
  nombre: string;
  perfil: Perfil;
  /** Todos los perfiles del sistema, útil para resolver "quién hizo esto" a partir de un id guardado */
  perfiles: Perfil[];
  /** Devuelve el nombre de un usuario a partir de su id, o '—' si no se encuentra */
  nombrePorId: (id: string | undefined) => string;
}

export const UsuarioActualContext = createContext<UsuarioActual | null>(null);

/** Hook para obtener el usuario actualmente logueado desde cualquier componente.
 * Lanza un error si se usa fuera del Provider (lo cual no debería pasar, ya que todo
 * el árbol de la app después del login está envuelto en UsuarioActualContext.Provider). */
export function useUsuarioActual(): UsuarioActual {
  const ctx = useContext(UsuarioActualContext);
  if (!ctx) {
    throw new Error('useUsuarioActual debe usarse dentro de UsuarioActualContext.Provider');
  }
  return ctx;
}
