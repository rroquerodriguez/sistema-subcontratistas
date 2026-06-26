import { Badge } from '@/components/ui/badge';
import type { ResultadoValidacion, EstadoEntrega, Prioridad } from '@/types';

export function EstadoLiberacionBadge({ estado }: { estado: ResultadoValidacion }) {
  const map: Record<ResultadoValidacion, { variant: 'success' | 'destructive' | 'secondary'; label: string }> = {
    LISTO: { variant: 'success', label: 'Liberado para trabajar' },
    'NO LISTO': { variant: 'destructive', label: 'No liberado' },
    PENDIENTE: { variant: 'secondary', label: 'Por validar' },
  };
  const m = map[estado] ?? map.PENDIENTE;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function EntregaBadge({ estado }: { estado: EstadoEntrega }) {
  const map: Record<EstadoEntrega, { variant: 'success' | 'secondary'; label: string }> = {
    ENTREGADO: { variant: 'success', label: 'Entregado' },
    'NO ENTREGADO': { variant: 'secondary', label: 'Sin entregar' },
  };
  const m = map[estado] ?? map['NO ENTREGADO'];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  const map: Record<Prioridad, { variant: 'destructive' | 'warning' | 'secondary'; label: string }> = {
    '1': { variant: 'destructive', label: 'Alta' },
    '2': { variant: 'warning', label: 'Media' },
    '3': { variant: 'secondary', label: 'Baja' },
  };
  const m = map[prioridad];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function DiasPill({ dias, entregado }: { dias: number | null; entregado: boolean }) {
  if (dias === null || dias === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  let variant: 'success' | 'warning' | 'destructive' = 'success';
  if (!entregado && dias > 5) variant = 'destructive';
  else if (!entregado && dias > 2) variant = 'warning';
  return (
    <Badge variant={variant}>
      {dias} día{dias === 1 ? '' : 's'}
    </Badge>
  );
}
