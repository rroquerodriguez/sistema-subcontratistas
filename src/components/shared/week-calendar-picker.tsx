import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { weekRangeLabel, mondayOf, dateToISOLocal, todayISO } from '@/lib/utils-app';
import { cn } from '@/lib/utils';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_CORTOS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dateToISOLocal(d);
}

/** Devuelve los lunes de todas las semanas que tocan el mes (mes/año en base 0-index para mes) */
function weeksOfMonth(year: number, month: number): string[] {
  const firstOfMonth = dateToISOLocal(new Date(year, month, 1));
  const lastOfMonth = dateToISOLocal(new Date(year, month + 1, 0));
  let cursor = mondayOf(firstOfMonth);
  const weeks: string[] = [];
  while (cursor <= lastOfMonth) {
    weeks.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

interface WeekCalendarPickerProps {
  semanaActual: string; // monday ISO
  onChange: (monday: string) => void;
}

export function WeekCalendarPicker({ semanaActual, onChange }: WeekCalendarPickerProps) {
  const baseDate = new Date(semanaActual + 'T00:00:00');
  const [viewYear, setViewYear] = useState(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(baseDate.getMonth());
  const [open, setOpen] = useState(false);

  const weeks = weeksOfMonth(viewYear, viewMonth);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const selectWeek = (monday: string) => {
    onChange(monday);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setViewYear(baseDate.getFullYear()); setViewMonth(baseDate.getMonth()); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[210px] justify-center gap-2 text-center">
          <CalendarDays size={15} />
          <span className="text-sm font-medium">Semana del {weekRangeLabel(semanaActual)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-3" align="center">
        <div className="mb-2.5 flex items-center justify-between">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => changeMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={15} /></Button>
          <div className="text-sm font-semibold">{MESES[viewMonth]} {viewYear}</div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => changeMonth(1)} aria-label="Mes siguiente"><ChevronRight size={15} /></Button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-micro font-medium text-muted-foreground">
          {DIAS_CORTOS.map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="space-y-1">
          {weeks.map((monday) => {
            const isSelected = monday === semanaActual;
            const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
            return (
              <button
                key={monday}
                onClick={() => selectWeek(monday)}
                className={cn(
                  'grid w-full grid-cols-7 gap-1 rounded-md py-1 text-caption transition-colors hover:bg-muted',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {days.map((d) => {
                  const dayNum = new Date(d + 'T00:00:00').getDate();
                  const inMonth = new Date(d + 'T00:00:00').getMonth() === viewMonth;
                  return (
                    <span key={d} className={cn('text-center', !inMonth && !isSelected && 'text-muted-foreground/40')}>
                      {dayNum}
                    </span>
                  );
                })}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 border-t border-border pt-2.5">
          <Button size="sm" variant="outline" className="w-full" onClick={() => selectWeek(mondayOf(todayISO()))}>
            Ir a la semana actual
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
