import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InspectorFilterProps {
  value: string; // 'todos' | nombre del inspector
  onChange: (v: string) => void;
  opciones: string[]; // inspectores únicos disponibles en el contexto actual (ya filtrado/ordenado)
  className?: string;
}

/** Filtro por Inspector de Calidad. A diferencia de ProjectFilter (lista fija de proyectos), los
 * inspectores son nombres libres que vienen de los datos, así que las opciones se calculan en cada
 * módulo a partir de los talleres visibles. Si no hay ningún inspector en los datos, no se muestra
 * el filtro (no tiene sentido ofrecer un selector vacío). */
export function InspectorFilter({ value, onChange, opciones, className }: InspectorFilterProps) {
  if (!opciones.length) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || 'h-9 w-[200px] text-xs'}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos los inspectores</SelectItem>
        {opciones.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
