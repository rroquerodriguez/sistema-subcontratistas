import { useCallback, useState } from 'react';

/** Maneja qué grupos colapsables (identificados por su key única) están colapsados dentro de una
 * vista con paneles tipo CollapsibleGroup / ArbolAgrupado. Por defecto todos empiezan expandidos
 * (el set de colapsados arranca vacío). Se usa junto con los botones de "Expandir todo"/"Colapsar
 * todo" y con los controles de colapso por nivel de agrupación. */
export function useCollapseState() {
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  const isCollapsed = useCallback((key: string) => colapsados.has(key), [colapsados]);

  const toggle = useCallback((key: string) => {
    setColapsados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /** Colapsa un conjunto de keys puntual (ej: solo las de un nivel de agrupación), sin tocar el resto */
  const collapseKeys = useCallback((keys: string[]) => {
    setColapsados((prev) => new Set([...prev, ...keys]));
  }, []);

  /** Expande un conjunto de keys puntual, sin tocar el resto */
  const expandKeys = useCallback((keys: string[]) => {
    setColapsados((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  }, []);

  /** Colapsa TODOS los grupos actualmente visibles (reemplaza el set completo por estas keys) */
  const collapseAll = useCallback((keys: string[]) => setColapsados(new Set(keys)), []);

  /** Expande todo (vacía el set de colapsados) */
  const expandAll = useCallback(() => setColapsados(new Set()), []);

  return { isCollapsed, toggle, collapseKeys, expandKeys, collapseAll, expandAll };
}
