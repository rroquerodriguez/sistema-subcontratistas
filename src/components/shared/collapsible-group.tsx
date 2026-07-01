import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleGroupProps {
  header: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  headerClassName?: string;
  /** Si se pasan open + onToggle, el estado abierto/cerrado lo controla el padre (por ejemplo,
   * para que un botón "Expandir todo"/"Colapsar todo" mueva varios grupos a la vez). Si se omiten,
   * el componente sigue manejando su propio estado interno exactamente como antes. */
  open?: boolean;
  onToggle?: () => void;
}

export function CollapsibleGroup({ header, defaultOpen = true, children, headerClassName, open: openControlado, onToggle }: CollapsibleGroupProps) {
  const [openInterno, setOpenInterno] = useState(defaultOpen);
  const esControlado = openControlado !== undefined && !!onToggle;
  const open = esControlado ? openControlado : openInterno;
  const handleClick = () => {
    if (esControlado) onToggle!();
    else setOpenInterno((o) => !o);
  };
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={handleClick}
        className={headerClassName || 'mb-2.5 flex w-full items-center gap-2 text-left'}
      >
        {!headerClassName && (open ? <ChevronDown size={15} className="flex-shrink-0 text-muted-foreground" /> : <ChevronRight size={15} className="flex-shrink-0 text-muted-foreground" />)}
        <div className="flex flex-1 items-center gap-2">
          {headerClassName && (open ? <ChevronDown size={15} className="flex-shrink-0 text-muted-foreground" /> : <ChevronRight size={15} className="flex-shrink-0 text-muted-foreground" />)}
          <div className="min-w-0 flex-1 text-left">{header}</div>
        </div>
      </button>
      {open && children}
    </div>
  );
}
