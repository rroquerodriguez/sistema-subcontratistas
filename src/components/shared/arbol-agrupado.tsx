import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { contarItems, type NodoAgrupado } from '@/lib/agrupacion-multinivel';
import type { ExpandState } from '@/lib/use-expand-collapse-state';

interface ArbolAgrupadoProps<T> {
  nodos: NodoAgrupado<T>[];
  renderHoja: (items: T[]) => ReactNode;
  renderLabelNivel?: (valor: string, label: string) => ReactNode;
  profundidad?: number;
  /** Estado de expandir/colapsar por nivel (0 = el más externo). Si el nivel actual no tiene
   * entrada, el grupo se comporta con su defaultOpen normal (abierto). */
  expandPorNivel?: Record<number, ExpandState>;
}

/** Renderiza recursivamente el árbol de agrupación: cada nivel intermedio es un CollapsibleGroup
 * con su contador de items, y el último nivel (hoja) usa renderHoja para mostrar el contenido real
 * (tabla, tarjetas, etc.) — definido por cada pantalla según lo que necesite mostrar. */
export function ArbolAgrupado<T>({ nodos, renderHoja, renderLabelNivel, profundidad = 0, expandPorNivel }: ArbolAgrupadoProps<T>) {
  const estadoNivel = expandPorNivel?.[profundidad];
  return (
    <div className={profundidad > 0 ? 'ml-4 border-l border-border/60 pl-3' : ''}>
      {nodos.map((nodo) => {
        if (nodo.esHoja && nodo.key === 'todos') {
          return <div key={nodo.key}>{renderHoja(nodo.items)}</div>;
        }
        const total = contarItems(nodo);
        const key = estadoNivel ? `${nodo.key}-v${estadoNivel.version}` : nodo.key;
        return (
          <CollapsibleGroup
            key={key}
            defaultOpen={estadoNivel ? estadoNivel.open : true}
            header={
              <div className="flex items-center gap-2 text-sm font-medium">
                {renderLabelNivel ? renderLabelNivel(nodo.valor, nodo.label) : <span>{nodo.valor}</span>}
                <Badge variant="secondary">{total}</Badge>
              </div>
            }
          >
            {nodo.esHoja ? renderHoja(nodo.items) : <ArbolAgrupado nodos={nodo.hijos} renderHoja={renderHoja} renderLabelNivel={renderLabelNivel} profundidad={profundidad + 1} expandPorNivel={expandPorNivel} />}
          </CollapsibleGroup>
        );
      })}
      {nodos.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</div>}
    </div>
  );
}
