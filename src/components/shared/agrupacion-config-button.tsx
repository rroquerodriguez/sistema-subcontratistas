import { Layers, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface OpcionAgrupacion {
  key: string;
  label: string;
}

interface AgrupacionConfigButtonProps {
  opciones: OpcionAgrupacion[];
  seleccion: string[];
  onChange: (seleccion: string[]) => void;
}

/** Botón "Agrupar por" que abre un popover para elegir uno o varios niveles de agrupación,
 * en el orden en que se eligen (el primero elegido es el nivel más externo). */
export function AgrupacionConfigButton({ opciones, seleccion, onChange }: AgrupacionConfigButtonProps) {
  const disponibles = opciones.filter((o) => !seleccion.includes(o.key));

  const agregarNivel = (key: string) => onChange([...seleccion, key]);
  const quitarNivel = (key: string) => onChange(seleccion.filter((k) => k !== key));
  const moverNivel = (idx: number, delta: number) => {
    const next = [...seleccion];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const labelOf = (key: string) => opciones.find((o) => o.key === key)?.label || key;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Layers size={14} />
          Agrupar por{seleccion.length ? ` (${seleccion.length})` : ''}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px]" align="start">
        <div className="mb-2 text-[12px] font-medium">Niveles de agrupación</div>
        <div className="mb-2.5 text-[11px] text-muted-foreground">
          El primer nivel agrupa por fuera; los siguientes agrupan dentro de cada grupo anterior.
        </div>

        {seleccion.length === 0 && (
          <div className="mb-2.5 rounded-md border border-dashed border-border px-2.5 py-2 text-[11.5px] text-muted-foreground">
            Sin agrupación — se muestra la lista completa.
          </div>
        )}

        <div className="mb-2.5 space-y-1.5">
          {seleccion.map((key, idx) => (
            <div key={key} className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5">
              <GripVertical size={13} className="flex-shrink-0 text-muted-foreground/50" />
              <span className="flex-1 text-[12px]">{idx + 1}. {labelOf(key)}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => moverNivel(idx, -1)} aria-label="Subir nivel">
                ↑
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === seleccion.length - 1} onClick={() => moverNivel(idx, 1)} aria-label="Bajar nivel">
                ↓
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => quitarNivel(key)} aria-label="Quitar nivel">
                <X size={12} />
              </Button>
            </div>
          ))}
        </div>

        {disponibles.length > 0 && (
          <Select value="" onValueChange={agregarNivel}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Agregar nivel..." /></SelectTrigger>
            <SelectContent>
              {disponibles.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {seleccion.length > 0 && (
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onChange([])}>
            Quitar toda la agrupación
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
