import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NivelCollapseControlsProps {
  /** Uno por nivel de agrupación activo, en el mismo orden elegido en "Agrupar por", con las
   * keys de los nodos que existen en ese nivel dentro del árbol actual. */
  niveles: { label: string; keys: string[] }[];
  onCollapseKeys: (keys: string[]) => void;
  onExpandKeys: (keys: string[]) => void;
}

/** Controles pequeños para colapsar/expandir un nivel específico de la agrupación personalizada
 * (ej: colapsar todos los grupos de "Subcontratista" sin tocar los de "Proyecto" que estén dentro). */
export function NivelCollapseControls({ niveles, onCollapseKeys, onExpandKeys }: NivelCollapseControlsProps) {
  if (!niveles.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-micro text-muted-foreground">Por nivel:</span>
      {niveles.map((n, i) => (
        <div key={i} className="flex items-center gap-0.5 rounded-md border border-border px-1.5 py-0.5">
          <span className="px-1 text-micro text-muted-foreground">{i + 1}. {n.label}</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" title={`Expandir nivel "${n.label}"`} onClick={() => onExpandKeys(n.keys)}>
            <ChevronsUpDown size={12} />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" title={`Colapsar nivel "${n.label}"`} onClick={() => onCollapseKeys(n.keys)}>
            <ChevronsDownUp size={12} />
          </Button>
        </div>
      ))}
    </div>
  );
}
