import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, CalendarClock, LockOpen, Package, Clock3, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { BulletList } from '@/components/shared/bullet-list';
import { HistorialIncidenciasContratista } from '@/components/shared/historial-incidencias-contratista';
import { FechasPrometidasContratista } from '@/components/shared/fechas-prometidas-contratista';
import { PhotoViewer } from '@/components/shared/photo-viewer';
import { MetricCard } from '@/components/shared/metric-card';
import { WeekCalendarPicker } from '@/components/shared/week-calendar-picker';
import { MonthPicker } from '@/components/shared/month-picker';
import { ProjectFilter } from '@/components/shared/project-filter';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { TallerDetailTable } from './taller-detail-table';
import {
  computeStats, tallerDetailListExt, buildNarrative, historialIncidenciasContratista, buildParrafoAnalisisEvaluacion,
  fechasPrometidasDelContratista, estaAtrasada, estaCumplida, tallerEnPeriodo } from '@/lib/stats-engine';
import { exportEvaluacionExcel } from '@/lib/export-excel';
import { exportEvaluacionPDF } from '@/lib/export-pdf';
import { weekRangeLabel, mesKeyActual, mesLabel } from '@/lib/utils-app';
import type { Subcontratista, Taller, Validacion, Entrega, RegistroBitacora, Queja, CicloTaller, FechaPrometida } from '@/types';

interface EvaluacionSemanalProps {
  subs: Subcontratista[];
  talleres: Taller[];
  validaciones: Validacion[];
  entregas: Entrega[];
  bitacora: RegistroBitacora[];
  quejas: Queja[];
  ciclos: CicloTaller[];
  semanaActual: string;
  setSemanaActual: (s: string) => void;
  fechas: FechaPrometida[];
}

export function EvaluacionSemanal({ subs, talleres: talleresTodos, validaciones, entregas, bitacora, quejas, ciclos, semanaActual, setSemanaActual, fechas }: EvaluacionSemanalProps) {
  const [subFiltroId, setSubFiltroId] = useState('todos');
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);
  const [periodo, setPeriodo] = useState<'semanal' | 'mensual'>('semanal');
  const [mesActual, setMesActual] = useState(mesKeyActual());
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const subFiltro = subFiltroId === 'todos' ? null : subs.find((s) => s.id === subFiltroId) || null;

  const talleres = useMemo(
    () => (filtroProyecto === 'todos' ? talleresTodos : talleresTodos.filter((t) => t.proyecto === filtroProyecto)),
    [talleresTodos, filtroProyecto]
  );

  const semanaOMes = periodo === 'mensual' ? `mes:${mesActual}` : semanaActual;
  const periodoLabel = periodo === 'mensual' ? `el mes de ${mesLabel(mesActual)}` : `la semana del ${weekRangeLabel(semanaActual)}`;
  const periodoLabelCorto = periodo === 'mensual' ? mesLabel(mesActual) : `Semana del ${weekRangeLabel(semanaActual)}`;

  const stats = useMemo(
    () => computeStats(subFiltro?.id || null, semanaOMes, talleres, validaciones, entregas, bitacora, quejas),
    [subFiltro, semanaOMes, talleres, validaciones, entregas, bitacora, quejas]
  );
  const detailList = useMemo(
    () => tallerDetailListExt(subFiltro?.id || null, semanaOMes, talleres, validaciones, entregas, bitacora, quejas, ciclos, fechas),
    [subFiltro, semanaOMes, talleres, validaciones, entregas, bitacora, quejas, ciclos, fechas]
  );
  const narrativa = useMemo(() => buildNarrative(subFiltro, stats, detailList), [subFiltro, stats, detailList]);
  const parrafoAnalisis = useMemo(() => buildParrafoAnalisisEvaluacion(subFiltro, stats, periodoLabel), [subFiltro, stats, periodoLabel]);

  const historialIncidencias = useMemo(
    () => (subFiltro ? historialIncidenciasContratista(subFiltro.id, quejas) : []),
    [subFiltro, quejas]
  );

  const fechasContratista = useMemo(
    () => (subFiltro ? fechasPrometidasDelContratista(subFiltro.id, fechas) : []),
    [subFiltro, fechas]
  );

  const subsConTalleres = useMemo(() => {
    return subs.filter((s) => talleres.some((t) => tallerEnPeriodo(t, semanaOMes) && t.subcontratistaId === s.id));
  }, [subs, talleres, semanaOMes]);

  const grupos = useMemo(() => {
    if (subFiltro) return [];
    return subsConTalleres.map((s) => {
      const sStats = computeStats(s.id, semanaOMes, talleres, validaciones, entregas, bitacora, quejas);
      const sDetail = tallerDetailListExt(s.id, semanaOMes, talleres, validaciones, entregas, bitacora, quejas, ciclos, fechas);
      const sNarrativa = buildNarrative(s, sStats, sDetail);
      const sParrafo = buildParrafoAnalisisEvaluacion(s, sStats, periodoLabel);
      const sHistorial = historialIncidenciasContratista(s.id, quejas);
      const sFechas = fechasPrometidasDelContratista(s.id, fechas);
      return { sub: s, stats: sStats, detailList: sDetail, narrativa: sNarrativa, parrafo: sParrafo, historialIncidencias: sHistorial, fechasContratista: sFechas };
    });
  }, [subFiltro, subsConTalleres, semanaOMes, talleres, validaciones, entregas, bitacora, quejas, ciclos, periodoLabel, fechas]);

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Evaluación</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Resultados de cumplimiento por subcontratista, por semana o por mes. "Liberado para trabajar" significa que el área quedó lista para que el subcontratista pueda iniciar.</div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex gap-1.5">
                <Button size="sm" variant={periodo === 'semanal' ? 'default' : 'outline'} onClick={() => setPeriodo('semanal')}>Semanal</Button>
                <Button size="sm" variant={periodo === 'mensual' ? 'default' : 'outline'} onClick={() => setPeriodo('mensual')}>Mensual</Button>
              </div>
              {periodo === 'semanal' ? (
                <WeekCalendarPicker semanaActual={semanaActual} onChange={setSemanaActual} />
              ) : (
                <MonthPicker mesKey={mesActual} onChange={setMesActual} />
              )}
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={subFiltroId} onValueChange={setSubFiltroId}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => exportEvaluacionExcel(detailList, subs, periodoLabelCorto, stats, subFiltro, quejas, parrafoAnalisis)}>
                <FileSpreadsheet size={14} />Excel
              </Button>
              <Button variant="outline" onClick={() => exportEvaluacionPDF(detailList, subs, periodoLabelCorto, stats, narrativa, subFiltro, quejas, parrafoAnalisis)}>
                <FileText size={14} />PDF
              </Button>
            </div>
          </div>

          {subFiltro && (
            <div className="mb-4 flex items-center gap-2.5">
              <SubAvatar name={subFiltro.nombre} id={subFiltro.id} />
              <div>
                <div className="text-sm font-medium">{subFiltro.nombre}</div>
                <div className="text-xs text-muted-foreground">{subFiltro.especialidad}</div>
              </div>
            </div>
          )}

          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Talleres" value={stats.totalTalleres} icon={CalendarClock} colorBg="#D3D3D3" colorFg="#36454F" />
            <MetricCard label="% liberado para trabajar" value={`${stats.pctLiberado}%`} icon={LockOpen} colorBg="hsl(142 71% 92%)" colorFg="hsl(142 71% 30%)" />
            <MetricCard label="% cumplimiento (entregado/planificado)" value={`${stats.pctCumplimiento}%`} icon={Package} colorBg="hsl(38 92% 92%)" colorFg="hsl(38 92% 35%)" />
            <MetricCard label="Prom. días" value={stats.promedioDias ?? '—'} icon={Clock3} colorBg="hsl(204 19% 90%)" colorFg="#36454F" />
          </div>

          {subFiltro && (
            <>
              <div className="mb-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">Resumen del periodo</div>
                <div className="rounded-xl bg-muted/30 px-4 py-3 text-[12.5px] leading-relaxed">
                  {parrafoAnalisis}
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <ClipboardList size={13} />Evaluación detallada
                </div>
                <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
                  <BulletList items={narrativa} className="text-[13px] leading-relaxed" />
                </div>
              </div>

              {historialIncidencias.length > 0 && (
                <div className="mb-5">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-destructive">Incidencias</div>
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <HistorialIncidenciasContratista quejas={historialIncidencias} onViewPhotos={setViewPhotos} />
                  </div>
                </div>
              )}

              {fechasContratista.length > 0 && (
                <div className="mb-5">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-warning">Fechas prometidas</div>
                  <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                    <FechasPrometidasContratista fechas={fechasContratista} />
                  </div>
                </div>
              )}

              <div className="mb-2 border-t-2 border-border pt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-foreground">Detalle de talleres</div>
              </div>
              <TallerDetailTable detailList={detailList} subs={subs} />
            </>
          )}

          {!subFiltro && (
            <div>
              <div className="mb-3 text-sm font-medium">Detalle agrupado por contratista</div>
              {grupos.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres planificados en este periodo.</div>
              )}
              <div className="space-y-3.5">
                {grupos.map(({ sub, stats: gStats, detailList: gDetail, narrativa: gNarrativa, parrafo: gParrafo, historialIncidencias: gHistorial, fechasContratista: gFechas }) => (
                  <div key={sub.id} className="overflow-hidden rounded-xl border-2 border-border">
                    <CollapsibleGroup
                      headerClassName="flex w-full items-center bg-muted/50 px-4 py-3 text-left hover:bg-muted/70"
                      header={
                        <div className="flex flex-1 flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <SubAvatar name={sub.nombre} id={sub.id} />
                            <div>
                              <div className="text-[14px] font-semibold">{sub.nombre}</div>
                              <div className="text-[11px] text-muted-foreground">{sub.especialidad}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[12px]">
                            <span>Talleres: <strong>{gStats.totalTalleres}</strong></span>
                            <span>% liberado para trabajar: <strong className={gStats.pctLiberado >= 90 ? 'text-success' : gStats.pctLiberado >= 70 ? 'text-warning' : 'text-destructive'}>{gStats.pctLiberado}%</strong></span>
                            <span>% cumplimiento: <strong className={gStats.pctCumplimiento >= 90 ? 'text-success' : gStats.pctCumplimiento >= 70 ? 'text-warning' : 'text-destructive'}>{gStats.pctCumplimiento}%</strong></span>
                            <span>Prom. días: <strong>{gStats.promedioDias ?? '—'}</strong></span>
                            {gHistorial.length > 0 && <Badge variant="secondary">{gHistorial.length} incid. histórico</Badge>}
                            {gFechas.filter((f) => estaAtrasada(f) && !estaCumplida(f)).length > 0 && (
                              <Badge variant="destructive">{gFechas.filter((f) => estaAtrasada(f) && !estaCumplida(f)).length} fecha(s) atrasada(s)</Badge>
                            )}
                          </div>
                        </div>
                      }
                    >
                    <div className="p-4">
                      <div className="mb-4">
                        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-primary">Resumen del periodo</div>
                        <div className="rounded-lg bg-muted/30 px-3 py-2 text-[12.5px] leading-relaxed">
                          {gParrafo}
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-primary">
                          <ClipboardList size={12} />Evaluación detallada
                        </div>
                        <div className="rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-2">
                          <BulletList items={gNarrativa} className="text-[12.5px] leading-relaxed" />
                        </div>
                      </div>
                      {gHistorial.length > 0 && (
                        <div className="mb-4">
                          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-destructive">Incidencias</div>
                          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                            <HistorialIncidenciasContratista quejas={gHistorial} onViewPhotos={setViewPhotos} />
                          </div>
                        </div>
                      )}
                      {gFechas.length > 0 && (
                        <div className="mb-4">
                          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-warning">Fechas prometidas</div>
                          <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                            <FechasPrometidasContratista fechas={gFechas} />
                          </div>
                        </div>
                      )}
                      <div className="mb-2 border-t-2 border-border pt-3">
                        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-foreground">Detalle de talleres</div>
                      </div>
                      <TallerDetailTable detailList={gDetail} subs={subs} />
                    </div>
                    </CollapsibleGroup>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <PhotoViewer photos={viewPhotos} onClose={() => setViewPhotos(null)} title="Fotos de incidencia" />
    </div>
  );
}
