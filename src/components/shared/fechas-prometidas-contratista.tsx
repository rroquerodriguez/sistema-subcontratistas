import { Badge } from '@/components/ui/badge';
import { fmtDate } from '@/lib/utils-app';
import { diasAtrasoFechaPrometida, estaAtrasada, estaCumplida } from '@/lib/stats-engine';
import type { FechaPrometida } from '@/types';

interface FechasPrometidasContratistaProps {
  fechas: FechaPrometida[];
}

export function FechasPrometidasContratista({ fechas }: FechasPrometidasContratistaProps) {
  if (!fechas.length) return null;
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        Fechas prometidas del contratista ({fechas.length})
      </div>
      <div className="space-y-1.5">
        {fechas.map((fp) => {
          const dias = diasAtrasoFechaPrometida(fp);
          const cumplida = estaCumplida(fp);
          const atrasada = estaAtrasada(fp);
          return (
            <div key={fp.id} className="rounded-md border border-border/70 bg-white/60 px-2.5 py-1.5 text-caption">
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <span className="font-medium">{fp.descripcion}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-micro text-muted-foreground">Prometida: {fmtDate(fp.fechaPrometidaActual)}</span>
                  {cumplida ? (
                    <Badge variant="success">Cumplida</Badge>
                  ) : atrasada ? (
                    <Badge variant="destructive">Atrasada{dias ? ` (${dias}d)` : ''}</Badge>
                  ) : (
                    <Badge variant="secondary">Pendiente</Badge>
                  )}
                </div>
              </div>
              <div className="text-muted-foreground">{fp.esGeneral ? 'General' : fp.unidades || '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
