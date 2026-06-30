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
