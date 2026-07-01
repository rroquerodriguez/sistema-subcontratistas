export interface DimensionAgrupacion<T> {
  key: string;
  label: string;
  getValue: (row: T) => string;
}

export interface NodoAgrupado<T> {
  key: string;
  label: string;
  valor: string;
  items: T[]; // solo en el último nivel (hoja)
  hijos: NodoAgrupado<T>[]; // solo en niveles intermedios
  esHoja: boolean;
}

/** Construye un árbol de agrupación anidado según las dimensiones elegidas, en el orden dado.
 * Ej: dimensiones = [contratista, proyecto] agrupa primero por contratista, y dentro de cada
 * contratista por proyecto. Si dimensiones está vacío, devuelve un único nodo "hoja" con todo. */
export function construirArbolAgrupado<T>(
  rows: T[],
  dimensiones: DimensionAgrupacion<T>[],
  nivel = 0
): NodoAgrupado<T>[] {
  if (nivel >= dimensiones.length || !dimensiones.length) {
    return [{ key: 'todos', label: '', valor: '', items: rows, hijos: [], esHoja: true }];
  }

  const dim = dimensiones[nivel];
  const grupos = new Map<string, T[]>();
  rows.forEach((row) => {
    const valor = dim.getValue(row) || '—';
    if (!grupos.has(valor)) grupos.set(valor, []);
    grupos.get(valor)!.push(row);
  });

  return [...grupos.entries()].map(([valor, items]) => {
    const esUltimoNivel = nivel === dimensiones.length - 1;
    return {
      key: `${dim.key}:${valor}`,
      label: dim.label,
      valor,
      items: esUltimoNivel ? items : [],
      hijos: esUltimoNivel ? [] : construirArbolAgrupado(items, dimensiones, nivel + 1),
      esHoja: esUltimoNivel,
    };
  });
}

/** Cuenta cuántos items hay en total dentro de un nodo (sumando recursivamente sus hijos) */
export function contarItems<T>(nodo: NodoAgrupado<T>): number {
  if (nodo.esHoja) return nodo.items.length;
  return nodo.hijos.reduce((sum, h) => sum + contarItems(h), 0);
}

/** Recolecta las keys de todos los nodos agrupables (no hoja) del árbol, en cualquier nivel.
 * Útil para el botón global "Colapsar todo" / "Expandir todo". */
export function todasLasKeysAgrupables<T>(nodos: NodoAgrupado<T>[]): string[] {
  const keys: string[] = [];
  const recorrer = (lista: NodoAgrupado<T>[]) => {
    lista.forEach((n) => {
      if (n.key === 'todos' && n.esHoja) return; // nodo raíz sin agrupación real, no es colapsable
      keys.push(n.key);
      if (!n.esHoja) recorrer(n.hijos);
    });
  };
  recorrer(nodos);
  return keys;
}

/** Agrupa las keys de los nodos por profundidad (0 = nivel más externo). El resultado es un
 * arreglo donde cada posición contiene las keys de ese nivel de agrupación — permite ofrecer
 * un control de "colapsar/expandir" específico por cada nivel elegido (ej: colapsar todos los
 * subcontratistas pero dejar los proyectos abiertos). */
export function keysPorNivel<T>(nodos: NodoAgrupado<T>[]): string[][] {
  const niveles: string[][] = [];
  const recorrer = (lista: NodoAgrupado<T>[], profundidad: number) => {
    lista.forEach((n) => {
      if (n.key === 'todos' && n.esHoja) return;
      if (!niveles[profundidad]) niveles[profundidad] = [];
      niveles[profundidad].push(n.key);
      if (!n.esHoja) recorrer(n.hijos, profundidad + 1);
    });
  };
  recorrer(nodos, 0);
  return niveles;
}
