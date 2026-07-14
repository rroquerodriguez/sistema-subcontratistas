import { useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { persistir } from '@/lib/persistir';
import { resumenDiasLaborables } from '@/lib/calendario-laboral';
import { CALENDARIO_LABORAL_DEFAULT, type CalendarioLaboral, type DiaSemanaCompleto } from '@/types';

interface CalendarioLaboralPanelProps {
  calendario: CalendarioLaboral;
  onChange: (cal: CalendarioLaboral) => void;
  showToast: (msg: string) => void;
  soloLectura?: boolean;
}

const DIAS: DiaSemanaCompleto[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Configuración global del calendario laboral de la obra: qué días se trabaja y el horario de
 * jornada. Es la base contra la que se cuentan las duraciones estándar de las actividades y las
 * fechas de conclusión esperadas. Único para toda la obra. */
export function CalendarioLaboralPanel({ calendario, onChange, showToast, soloLectura }: CalendarioLaboralPanelProps) {
  const [borrador, setBorrador] = useState<CalendarioLaboral>(calendario);
  const [guardando, setGuardando] = useState(false);

  const toggleDia = (dia: DiaSemanaCompleto) => {
    setBorrador((prev) => {
      const activo = prev.diasLaborables.includes(dia);
      // Mantener el orden natural de la semana al reconstruir la lista
      const nuevos = activo
        ? prev.diasLaborables.filter((d) => d !== dia)
        : [...prev.diasLaborables, dia];
      const ordenados = DIAS.filter((d) => nuevos.includes(d));
      return { ...prev, diasLaborables: ordenados };
    });
  };

  const guardar = async () => {
    if (borrador.diasLaborables.length === 0) {
      showToast('Debes marcar al menos un día laborable.');
      return;
    }
    if (borrador.horaSalida <= borrador.horaEntrada) {
      showToast('La hora de salida debe ser posterior a la de entrada.');
      return;
    }
    setGuardando(true);
    try {
      if (!(await persistir('calendario_laboral', borrador))) return;
      onChange(borrador);
      showToast('Calendario laboral guardado.');
    } finally {
      setGuardando(false);
    }
  };

  const restaurarDefault = () => setBorrador(CALENDARIO_LABORAL_DEFAULT);
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(calendario);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2 text-title font-medium">
          <CalendarClock size={16} />
          Calendario laboral de la obra
        </div>
        <p className="mb-4 text-caption leading-relaxed text-muted-foreground">
          Define qué días se trabaja y el horario de jornada. Esto determina cómo el sistema cuenta los
          días laborables para las duraciones estándar de las actividades y las fechas de conclusión
          esperadas. Los días no marcados (y los feriados) se saltan al contar.
        </p>

        <div className="mb-4">
          <Label className="mb-2 block text-body">Días laborables</Label>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((dia) => {
              const activo = borrador.diasLaborables.includes(dia);
              return (
                <label
                  key={dia}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors ${
                    activo ? 'border-primary bg-primary/10 font-medium' : 'border-border text-muted-foreground'
                  } ${soloLectura ? 'pointer-events-none opacity-70' : 'hover:bg-muted/40'}`}
                >
                  <Checkbox checked={activo} onCheckedChange={() => toggleDia(dia)} disabled={soloLectura} />
                  {dia}
                </label>
              );
            })}
          </div>
          <p className="mt-1.5 text-caption text-muted-foreground">Configuración actual: <strong>{resumenDiasLaborables(borrador)}</strong></p>
        </div>

        <div className="mb-4 grid max-w-sm grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-body">Hora de entrada</Label>
            <Input type="time" value={borrador.horaEntrada} disabled={soloLectura} onChange={(e) => setBorrador((p) => ({ ...p, horaEntrada: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-body">Hora de salida</Label>
            <Input type="time" value={borrador.horaSalida} disabled={soloLectura} onChange={(e) => setBorrador((p) => ({ ...p, horaSalida: e.target.value }))} />
          </div>
        </div>
        <p className="mb-4 text-caption text-muted-foreground">
          El horario queda documentado como jornada oficial de la obra. En esta versión las duraciones
          se cuentan en días completos; el horario es informativo y aparece en reportes.
        </p>

        {!soloLectura && (
          <div className="flex items-center gap-2">
            <Button onClick={guardar} disabled={!hayCambios || guardando}>
              <Save size={14} />{guardando ? 'Guardando…' : 'Guardar calendario'}
            </Button>
            <Button variant="ghost" size="sm" onClick={restaurarDefault} disabled={guardando}>Restaurar valores por defecto (Lun–Sáb, 8:00–17:00)</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
