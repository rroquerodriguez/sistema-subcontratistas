import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COLUMNAS_PLANIFICACION } from '@/lib/export-planificacion-excel';

interface ColumnaConfig {
  key: string;
  label: string;
}

interface ColumnSelectorProps {
  seleccionadas: string[];
  onChange: (cols: string[]) => void;
  columnas?: ColumnaConfig[];
}

export function ColumnSelector({ seleccionadas, onChange, columnas = COLUMNAS_PLANIFICACION }: ColumnSelectorProps) {
  const toggle = (key: string) => {
    onChange(seleccionadas.includes(key) ? seleccionadas.filter((k) => k !== key) : [...seleccionadas, key]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Columns3 size={14} />Columnas ({seleccionadas.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px]">
        <div className="mb-2 text-[12px] font-medium">Columnas a incluir en la exportación</div>
        <div className="max-h-[260px] space-y-1.5 overflow-y-auto">
          {columnas.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <Checkbox id={`col-${c.key}`} checked={seleccionadas.includes(c.key)} onCheckedChange={() => toggle(c.key)} />
              <label htmlFor={`col-${c.key}`} className="text-[12.5px]">{c.label}</label>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => onChange(columnas.map((c) => c.key))}>Todas</Button>
          <Button size="sm" variant="outline" onClick={() => onChange([])}>Ninguna</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
