import { useState, useEffect } from 'react';

/** Como useState, pero la preferencia persiste en el navegador (localStorage) bajo la clave dada.
 * Pensado para recordar filtros, vista elegida, columnas y agrupación de cada módulo entre visitas,
 * sin tocar la base de datos (son preferencias del dispositivo/usuario, no datos del proyecto).
 * Si localStorage no está disponible, se comporta como un useState normal. */
export function usePersistedState<T>(clave: string, inicial: T): [T, (v: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado != null ? (JSON.parse(guardado) as T) : inicial;
    } catch {
      return inicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      /* almacenamiento no disponible; el estado sigue funcionando en memoria */
    }
  }, [clave, valor]);

  return [valor, setValor];
}
