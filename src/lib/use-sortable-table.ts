import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export interface ColumnConfig<T> {
  key: string;
  getValue: (row: T) => string | number | null | undefined;
}

/**
 * Hook genérico para agregar orden (clic en encabezado) y filtro de texto (por columna) a cualquier tabla,
 * sin tener que reescribir el cuerpo de la tabla. Cada pantalla define `getValue` por columna (cómo
 * extraer el valor comparable/buscable de cada fila para esa columna), y el hook se encarga del resto.
 */
export function useSortableFilterableTable<T>(rows: T[], columns: ColumnConfig<T>[]) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const getValueFor = (key: string) => columns.find((c) => c.key === key)?.getValue;

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortDir('asc');
    }
  };

  const setFilter = (key: string, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilter = (key: string) => setFilters((prev) => { const next = { ...prev }; delete next[key]; return next; });
  const clearAllFilters = () => setFilters({});

  const filteredSorted = useMemo(() => {
    let result = rows;

    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim());
    if (activeFilters.length) {
      result = result.filter((row) =>
        activeFilters.every(([key, val]) => {
          const getValue = getValueFor(key);
          if (!getValue) return true;
          const cellVal = getValue(row);
          return String(cellVal ?? '').toLowerCase().includes(val.trim().toLowerCase());
        })
      );
    }

    if (sortKey && sortDir) {
      const getValue = getValueFor(sortKey);
      if (getValue) {
        result = [...result].sort((a, b) => {
          const av = getValue(a);
          const bv = getValue(b);
          if (av === bv) return 0;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'es');
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return result;
  }, [rows, filters, sortKey, sortDir, columns]);

  return {
    rows: filteredSorted,
    sortKey,
    sortDir,
    toggleSort,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters: Object.values(filters).some((v) => v.trim()),
  };
}
