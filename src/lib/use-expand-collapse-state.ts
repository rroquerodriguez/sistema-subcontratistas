import { useState } from 'react';

export interface ExpandState {
  open: boolean;
  version: number; // cambia en cada acción, para forzar remount de CollapsibleGroup vía key
}

/** Controla el estado de expandir/colapsar de grupos colapsables, tanto de forma global
 * (todos los niveles a la vez) como por nivel individual (para agrupación multinivel).
 * Se usa junto con ArbolAgrupado (pasando expandPorNivel) o directamente con CollapsibleGroup
 * (usando key={`${id}-${estado.version}`} defaultOpen={estado.open} en cada grupo, nivel 0). */
export function useExpandCollapseState(maxNiveles = 6) {
  const [porNivel, setPorNivel] = useState<Record<number, ExpandState>>({});

  const bump = (nivel: number, open: boolean) =>
    setPorNivel((prev) => ({ ...prev, [nivel]: { open, version: (prev[nivel]?.version ?? 0) + 1 } }));

  const expandirNivel = (nivel: number) => bump(nivel, true);
  const colapsarNivel = (nivel: number) => bump(nivel, false);

  const expandirTodo = () => {
    setPorNivel((prev) => {
      const next = { ...prev };
      for (let i = 0; i < maxNiveles; i++) next[i] = { open: true, version: (prev[i]?.version ?? 0) + 1 };
      return next;
    });
  };

  const colapsarTodo = () => {
    setPorNivel((prev) => {
      const next = { ...prev };
      for (let i = 0; i < maxNiveles; i++) next[i] = { open: false, version: (prev[i]?.version ?? 0) + 1 };
      return next;
    });
  };

  return { porNivel, expandirNivel, colapsarNivel, expandirTodo, colapsarTodo };
}
