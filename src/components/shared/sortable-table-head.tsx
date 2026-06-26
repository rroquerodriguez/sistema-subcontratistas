import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SortDir } from '@/lib/use-sortable-table';

interface SortableTableHeadProps {
  label: string;
  columnKey: string;
  sortKey: string | null;
  sortDir: SortDir;
  onToggleSort: (key: string) => void;
  filterValue?: string;
  onFilterChange?: (key: string, value: string) => void;
  filterable?: boolean;
  className?: string;
}

export function SortableTableHead({
  label, columnKey, sortKey, sortDir, onToggleSort, filterValue, onFilterChange, filterable = true, className,
}: SortableTableHeadProps) {
  const isActive = sortKey === columnKey;
  const Icon = isActive ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  const hasFilter = !!filterValue?.trim();

  return (
    <TableHead className={className}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex items-center gap-1 whitespace-nowrap text-left hover:text-foreground"
          onClick={() => onToggleSort(columnKey)}
        >
          {label}
          <Icon size={12} className={isActive ? 'text-foreground' : 'text-muted-foreground/60'} />
        </button>
        {filterable && onFilterChange && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="rounded p-0.5 hover:bg-muted" aria-label={`Filtrar ${label}`}>
                <Filter size={11} className={hasFilter ? 'text-primary' : 'text-muted-foreground/50'} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="start">
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  className="h-8 text-xs"
                  placeholder={`Filtrar ${label.toLowerCase()}...`}
                  value={filterValue || ''}
                  onChange={(e) => onFilterChange(columnKey, e.target.value)}
                />
                {hasFilter && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => onFilterChange(columnKey, '')} aria-label="Limpiar filtro">
                    <X size={13} />
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TableHead>
  );
}
