import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EstadoLiberacionBadge, EntregaBadge, DiasPill } from '@/components/shared/status-badges';
import { PhotoViewer } from '@/components/shared/photo-viewer';
import { BulletList } from '@/components/shared/bullet-list';
import { fmtDate, fmtHora, soloFecha } from '@/lib/utils-app';
import { diasAtrasoFechaPrometida, estaAtrasada, estaCumplida } from '@/lib/stats-engine';
import type { Subcontratista } from '@/types';
import type { TallerDetailExt } from '@/lib/stats-engine';

export function TallerDetailTable({ detailList, subs }: { detailList: TallerDetailExt[]; subs: Subcontratista[] }) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);

  if (!detailList.length) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres para mostrar.</div>;
  }
  return (
    <div className="space-y-3">
      {detailList.map((d) => (
        <div key={d.taller.id} className="rounded-xl border border-border p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13.5px] font-medium">
              {subName(d.taller.subcontratistaId)} — {d.taller.edificio} {d.taller.unidad}
              <span className="ml-1.5 font-normal text-muted-foreground">{d.taller.actividad}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <EstadoLiberacionBadge estado={d.validacion?.resultado || 'PENDIENTE'} />
              {d.entrega ? <EntregaBadge estado={d.entrega.estado} /> : null}
              <DiasPill dias={d.dias} entregado={d.entrega?.estado === 'ENTREGADO'} />
            </div>
          </div>

          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-muted-foreground">
            <span>Fecha de liberación: <strong className="text-foreground">{d.validacion?.fecha ? fmtDate(d.validacion.fecha) : '—'}</strong></span>
            {d.entrega?.estado === 'ENTREGADO' && <span>Fecha de entrega: <strong className="text-foreground">{fmtDate(d.entrega.fechaEntrega)}</strong></span>}
          </div>

          <div className="rounded-md bg-muted/40 px-3 py-2">
            <BulletList items={d.comentario} className="text-[12.5px] leading-relaxed" />
          </div>

          {(d.validacion?.fotos?.length || d.entrega?.fotos?.length) ? (
            <div className="mt-2 flex flex-wrap gap-3">
              {!!d.validacion?.fotos?.length && (
                <Button size="sm" variant="outline" onClick={() => setViewPhotos(d.validacion!.fotos)}>
                  {d.validacion!.fotos.length} foto(s) de liberación
                </Button>
              )}
              {!!d.entrega?.fotos?.length && (
                <Button size="sm" variant="outline" onClick={() => setViewPhotos(d.entrega!.fotos)}>
                  {d.entrega!.fotos.length} foto(s) de entrega
                </Button>
              )}
            </div>
          ) : null}

          {d.quejasAsociadas.length > 0 && (
            <div className="mt-2.5">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Incidencias de este taller ({d.quejasAsociadas.length})
              </div>
              <div className="space-y-1.5">
                {d.quejasAsociadas.map((q) => (
                  <div key={q.id} className="rounded-md border border-border/70 bg-white/60 px-2.5 py-1.5 text-[12px]">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="font-medium">{q.tipo}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">{fmtDate(q.fecha)}</span>
                        {q.esGeneral && <Badge variant="secondary">General</Badge>}
                        {q.causa && <Badge variant="secondary">{q.causa}</Badge>}
                      </div>
                    </div>
                    {q.descripcion && <div className="text-muted-foreground">{q.descripcion}</div>}
                    {!!q.fotos?.length && (
                      <Button size="sm" variant="outline" className="mt-1.5 h-6 px-2 text-[11px]" onClick={() => setViewPhotos(q.fotos)}>
                        {q.fotos.length} foto(s)
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.bitacora.length > 0 && (
            <div className="mt-2.5">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Bitácora de este taller ({d.bitacora.length})
              </div>
              <div className="space-y-1.5">
                {[...d.bitacora].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((b) => (
                  <div key={b.id} className="rounded-md border border-border/70 bg-white/60 px-2.5 py-1.5 text-[12px]">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="font-medium">{fmtDate(b.fecha)}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={b.llego === 'SI' ? 'success' : 'destructive'}>{b.llego === 'SI' ? 'Personal asignado' : 'Sin personal'}</Badge>
                        {b.completo === 'COMPLETADO' && <Badge variant="success">Completado</Badge>}
                        {b.completo === 'EN PROCESO' && <Badge variant="warning">En proceso</Badge>}
                        {b.completo === 'SIN INICIAR' && <Badge variant="secondary">Sin iniciar</Badge>}
                      </div>
                    </div>
                    {b.motivo && <div className="text-muted-foreground">Motivo: {b.motivo}{b.responsable ? ` (${b.responsable})` : ''}</div>}
                    {b.accion && <div className="text-muted-foreground">Acción: {b.accion}</div>}
                    {b.notas && <div className="text-muted-foreground">{b.notas}</div>}
                    {!!b.fotos?.length && (
                      <Button size="sm" variant="outline" className="mt-1.5 h-6 px-2 text-[11px]" onClick={() => setViewPhotos(b.fotos)}>
                        {b.fotos.length} foto(s)
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!d.ciclo?.comentarios?.length && (
            <div className="mt-2.5">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Comentarios de avance del taller ({d.ciclo.comentarios.length})
              </div>
              <div className="space-y-1.5">
                {(() => {
                  const grupos = new Map<string, { fecha: string; texto: string }[]>();
                  [...d.ciclo!.comentarios].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((c) => {
                    const dia = soloFecha(c.fecha);
                    if (!grupos.has(dia)) grupos.set(dia, []);
                    grupos.get(dia)!.push(c);
                  });
                  return [...grupos.entries()].map(([dia, items]) => (
                    <div key={dia} className="rounded-md border border-border/70 bg-white/60 px-2.5 py-1.5 text-[12px]">
                      <div className="mb-0.5 font-medium">{fmtDate(dia)}</div>
                      {items.map((c, i) => (
                        <div key={i} className="text-muted-foreground">
                          <span className="text-[10.5px]">{fmtHora(c.fecha)}</span> — {c.texto}
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
          {!!d.fechasAsociadas?.length && (
            <div className="mt-2.5">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fechas prometidas de este taller ({d.fechasAsociadas.length})
              </div>
              <div className="space-y-1.5">
                {d.fechasAsociadas.map((fp) => {
                  const dias = diasAtrasoFechaPrometida(fp);
                  const cumplida = estaCumplida(fp);
                  const atrasada = estaAtrasada(fp);
                  return (
                    <div key={fp.id} className="rounded-md border border-border/70 bg-white/60 px-2.5 py-1.5 text-[12px]">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className="font-medium">{fp.descripcion}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">Prometida: {fmtDate(fp.fechaPrometidaActual)}</span>
                          {fp.esGeneral && <Badge variant="secondary">General</Badge>}
                          {cumplida ? (
                            <Badge variant="success">Cumplida</Badge>
                          ) : atrasada ? (
                            <Badge variant="destructive">Atrasada{dias ? ` (${dias}d)` : ''}</Badge>
                          ) : (
                            <Badge variant="secondary">Pendiente</Badge>
                          )}
                        </div>
                      </div>
                      {!!fp.fotos?.length && (
                        <Button size="sm" variant="outline" className="mt-1.5 h-6 px-2 text-[11px]" onClick={() => setViewPhotos(fp.fotos)}>
                          {fp.fotos.length} foto(s)
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <PhotoViewer photos={viewPhotos} onClose={() => setViewPhotos(null)} />
    </div>
  );
}
