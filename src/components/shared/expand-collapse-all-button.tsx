import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExpandCollapseAllButtonsProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  className?: string;
}

/** Par de botones para expandir o colapsar TODOS los grupos visibles de una vista con paneles
 * colapsables (CollapsibleGroup / ArbolAgrupado). Se usa junto con el hook useCollapseState:
 * onExpandAll -> expandAll(), onCollapseAll -> collapseAll(keys) con las keys visibles actuales. */
export function ExpandCollapseAllButtons({ onExpandAll, onCollapseAll, className }: ExpandCollapseAllButtonsProps) {
  return (
    <div className={className || 'flex gap-1.5'}>
      <Button size="sm" variant="outline" onClick={onExpandAll} title="Expandir todos los grupos">
        <ChevronsUpDown size={13} />Expandir todo
      </Button>
      <Button size="sm" variant="outline" onClick={onCollapseAll} title="Colapsar todos los grupos">
        <ChevronsDownUp size={13} />Colapsar todo
      </Button>
    </div>
  );
}
