import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fmtDate } from '@/lib/utils-app';
import type { Queja } from '@/types';

interface HistorialIncidenciasContratistaProps {
  quejas: Queja[];
  onViewPhotos: (fotos: string[]) => void;
}

export function HistorialIncidenciasContratista({ quejas, onViewPhotos }: HistorialIncidenciasContratistaProps) {
  if (!quejas.length) return null;
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Historial de incidencias del contratista ({quejas.length})
      </div>
      <div className="space-y-1.5">
        {quejas.map((q) => (
          <div key={q.id} className="rounded-md border border-border/70 bg-white/60 px-2.5 py-1.5 text-[12px]">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <span className="font-medium">{q.tipo}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{fmtDate(q.fecha)}</span>
                {q.causa && <Badge variant="secondary">{q.causa}</Badge>}
                {q.esGeneral ? (
                  <Badge variant="secondary">General</Badge>
                ) : q.unidades ? (
                  <span className="text-[11px] text-muted-foreground">{q.unidades}</span>
                ) : null}
              </div>
            </div>
            {q.descripcion && <div className="text-muted-foreground">{q.descripcion}</div>}
            {!!q.fotos?.length && (
              <Button size="sm" variant="outline" className="mt-1.5 h-6 px-2 text-[11px]" onClick={() => onViewPhotos(q.fotos)}>
                {q.fotos.length} foto(s)
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
