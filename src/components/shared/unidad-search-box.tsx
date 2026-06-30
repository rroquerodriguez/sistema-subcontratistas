import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UnidadSearchBoxProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

/** Campo de búsqueda libre por edificio/unidad, pensado para encontrar rápido una unidad específica
 * sin tener que usar el filtro por columna. El texto se compara contra "edificio unidad" combinados. */
export function UnidadSearchBox({ value, onChange, placeholder = 'Buscar unidad (ej: G6 101)...', className }: UnidadSearchBoxProps) {
  return (
    <div className={`relative ${className || 'w-[220px]'}`}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8 pr-8 text-xs"
      />
      {value && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
        >
          <X size={13} />
        </Button>
      )}
    </div>
  );
}

/** Texto normalizado (minúsculas, sin espacios extra) para comparar contra la búsqueda de unidad */
export function unidadMatchesSearch(edificio: string, unidad: string, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  const combined = `${edificio} ${unidad}`.toLowerCase();
  return combined.includes(q);
}
