import { ChevronsDown, ChevronsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { useExpandCollapseState } from '@/lib/use-expand-collapse-state';

interface NivelInfo {
  nivel: number;
  label: string;
}

interface ExpandCollapseToolbarProps {
  controles: ReturnType<typeof useExpandCollapseState>;
  /** Niveles activos con su etiqueta (ej: [{nivel: 0, label: 'Subcontratista'}, {nivel: 1, label: 'Proyecto'}]).
   * Si se pasan 2 o más, además del par global se muestran botones por nivel. */
  niveles?: NivelInfo[];
}

/** Par compacto de solo íconos "Expandir todo / Colapsar todo" (con tooltip nativo), y
 * opcionalmente un control por cada nivel de agrupación activo (solo cuando hay más de un
 * nivel, para no saturar la barra con un solo nivel). */
export function ExpandCollapseToolbar({ controles, niveles }: ExpandCollapseToolbarProps) {
  const mostrarPorNivel = niveles && niveles.length > 1;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="inline-flex overflow-hidden rounded-md border border-input">
        <button
          type="button"
          onClick={controles.expandirTodo}
          title="Expandir todo"
          aria-label="Expandir todo"
          className="flex h-9 items-center px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronsDown size={14} />
        </button>
        <div className="w-px bg-input" />
        <button
          type="button"
          onClick={controles.colapsarTodo}
          title="Colapsar todo"
          aria-label="Colapsar todo"
          className="flex h-9 items-center px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronsUp size={14} />
        </button>
      </div>
      {mostrarPorNivel && niveles!.map((n) => (
        <div key={n.nivel} className="flex items-center gap-0.5 rounded-md border border-input pl-2 text-[11.5px] text-muted-foreground">
          {n.label}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => controles.expandirNivel(n.nivel)} title={`Expandir ${n.label}`} aria-label={`Expandir ${n.label}`}>
            <ChevronsDown size={12} />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => controles.colapsarNivel(n.nivel)} title={`Colapsar ${n.label}`} aria-label={`Colapsar ${n.label}`}>
            <ChevronsUp size={12} />
          </Button>
        </div>
      ))}
    </div>
  );
}
