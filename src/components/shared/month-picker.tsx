import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mesLabel, mesKeyActual, addMeses } from '@/lib/utils-app';

interface MonthPickerProps {
  mesKey: string;
  onChange: (mesKey: string) => void;
}

export function MonthPicker({ mesKey, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" onClick={() => onChange(addMeses(mesKey, -1))} aria-label="Mes anterior"><ChevronLeft size={16} /></Button>
      <div className="flex min-w-[170px] items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium">
        <CalendarRange size={15} />
        {mesLabel(mesKey)}
      </div>
      <Button size="icon" variant="outline" onClick={() => onChange(addMeses(mesKey, 1))} aria-label="Mes siguiente"><ChevronRight size={16} /></Button>
      {mesKey !== mesKeyActual() && (
        <Button size="sm" variant="outline" onClick={() => onChange(mesKeyActual())}>Mes actual</Button>
      )}
    </div>
  );
}
