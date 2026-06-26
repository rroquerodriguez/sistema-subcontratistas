import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROYECTOS } from '@/lib/seed-data';

interface ProjectFilterProps {
  value: string; // 'todos' | Proyecto
  onChange: (v: string) => void;
  className?: string;
}

export function ProjectFilter({ value, onChange, className }: ProjectFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || 'h-9 w-[190px] text-xs'}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos los proyectos</SelectItem>
        {PROYECTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
