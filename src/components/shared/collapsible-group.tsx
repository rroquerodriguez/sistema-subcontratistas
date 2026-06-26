import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleGroupProps {
  header: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  headerClassName?: string;
}

export function CollapsibleGroup({ header, defaultOpen = true, children, headerClassName }: CollapsibleGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
