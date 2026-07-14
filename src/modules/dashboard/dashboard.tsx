import { useMemo, useState } from 'react';
import { CalendarPlus, ClipboardCheck, AlertTriangle, CalendarClock, LockOpen, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/shared/metric-card';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { WeekCalendarPicker } from '@/components/shared/week-calendar-picker';
import { MonthPicker } from '@/components/shared/month-picker';
import { ProjectFilter } from '@/components/shared/project-filter';
import {
  computeStats, tallerDetailList, talleresAtrasados, fechasPrometidasAtrasadas, fechasPrometidasProximas,
  diasAtrasoFechaPrometida, buildParrafoAnalisisEvaluacion, tallerEnPeriodo } from '@/lib/stats-engine';
import { analizarResponsabilidad, resumenResponsabilidad } from '@/lib/responsabilidad';
import { ResponsabilidadPanel } from '@/components/shared/responsabilidad-panel';
import { weekRangeLabel, mondayOf, fmtDate, mesKeyActual, mesLabel, semanasDelMes } from '@/lib/utils-app';
import type { Subcontratista, Taller, Validacion, Entrega, RegistroBitacora, Queja, FechaPrometida, TabId, TallerCatalogo, CalendarioLaboral } from '@/types';

interface DashboardProps {
  subs: Subcontratista[];
  talleres: Taller[];
  validaciones: Validacion[];
  entregas: Entrega[];
  bitacora: RegistroBitacora[];
  quejas: Queja[];
  fechas: FechaPrometida[];
  catalogo: TallerCatalogo[];
  calendario: CalendarioLaboral;
  semanaActual: string;
  goTo: (tab: TabId) => void;
}

export function Dashboard({ subs, talleres: talleresTodos, validaciones, entregas, bitacora, quejas, fechas, catalogo, calendario, semanaActual, goTo }: DashboardProps) {
  const [periodo, setPeriodo] = useState<'semanal' | 'mensual'>('semanal');
  const [mesActual, setMesActual] = useState(mesKeyActual());
  const [semanaSel, setSemanaSel] = useState(semanaActual);
  const [filtroProyecto, setFiltroProyecto] = useState('todos');

  const semanasDelMesActual = useMemo(() => semanasDelMes(mesActual), [mesActual]);
  const semanaOMes = periodo === 'mensual' ? `mes:${mesActual}` : semanaSel;
  const periodoLabel = periodo === 'mensual' ? `el mes de ${mesLabel(mesActual)}` : `la semana del ${weekRangeLabel(semanaSel)}`;

  const talleres = useMemo(
    () => (filtroProyecto === 'todos' ? talleresTodos : talleresTodos.filter((t) => t.proyecto === filtroProyecto)),
    [talleresTodos, filtroProyecto]
  );

  const stats = computeStats(null, semanaOMes, talleres, validaciones, entregas, bitacora, quejas);
  const parrafoAnalisis = buildParrafoAnalisisEvaluacion(null, stats, periodoLabel);

  const perSub = subs
    .map((s) => ({ sub: s, stats: computeStats(s.id, semanaOMes, talleres, validaciones, entregas, bitacora, quejas) }))
    .filter((x) => x.stats.totalTalleres > 0)
    .sort((a, b) => b.stats.totalTalleres - a.stats.totalTalleres);

  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const quejasDelPeriodo = quejas.filter((q) =>
    periodo === 'mensual' ? q.fecha.slice(0, 7) === mesActual : mondayOf(q.fecha) === semanaSel
  );

  const noLiberadoActual = talleres.filter((t) => {
    const v = validaciones.find((x) => x.tallerId === t.id);
    return tallerEnPeriodo(t, semanaOMes) && v?.resultado === 'NO LISTO';
  });
  const pendientesActual = talleres.filter((t) => {
    const v = validaciones.find((x) => x.tallerId === t.id);
    return tallerEnPeriodo(t, semanaOMes) && (!v || v.resultado === 'PENDIENTE');
  });
  const sinEntregarUrgente = tallerDetailList(null, semanaOMes, talleres, validaciones, entregas, bitacora).filter(
    (d) => d.dias !== null && d.dias > 5 && d.entrega?.estado !== 'ENTREGADO'
  );
  const refSemana = periodo === 'mensual' ? (semanasDelMesActual[semanasDelMesActual.length - 1] || semanaActual) : semanaSel;
  const atrasados = talleresAtrasados(talleres, validaciones, entregas, refSemana).filter((t) => !tallerEnPeriodo(t, semanaOMes));
  const fechasAtrasadas = fechasPrometidasAtrasadas(fechas);
  const fechasProximas = fechasPrometidasProximas(fechas, 5);

  // Análisis de responsabilidad: entregas del periodo (por fecha real del taller), descompuestas en
  // liberación (nuestra) vs. ejecución (contratista) vs. entrega final (cliente).
  const resumenResp = useMemo(() => {
    const entregadosPeriodo = talleres.filter((t) => tallerEnPeriodo(t, semanaOMes) && entregas.some((e) => e.tallerId === t.id && e.estado === 'ENTREGADO'));
    const analisis = entregadosPeriodo.map((t) =>
      analizarResponsabilidad(t, validaciones.find((v) => v.tallerId === t.id), entregas.find((e) => e.tallerId === t.id), catalogo, calendario)
    );
    return resumenResponsabilidad(analisis);
  }, [talleres, validaciones, entregas, catalogo, calendario, semanaOMes]);

  const hayAtencion = noLiberadoActual.length || pendientesActual.length || quejasDelPeriodo.length || sinEntregarUrgente.length || atrasados.length || fechasAtrasadas.length || fechasProximas.length;

  return (
    <div className="space-y-4">
      <Card className="border-border bg-gradient-to-br from-muted/70 to-white">
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex gap-1.5">
                <Button size="sm" variant={periodo === 'semanal' ? 'default' : 'outline'} onClick={() => setPeriodo('semanal')}>Semanal</Button>
                <Button size="sm" variant={periodo === 'mensual' ? 'default' : 'outline'} onClick={() => setPeriodo('mensual')}>Mensual</Button>
              </div>
              {periodo === 'semanal' ? (
                <WeekCalendarPicker semanaActual={semanaSel} onChange={setSemanaSel} />
              ) : (
                <MonthPicker mesKey={mesActual} onChange={setMesActual} />
              )}
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
            </div>
          </div>
          <div className="mb-1 text-body font-medium text-primary">Resumen — {periodoLabel}</div>
          <div className="text-body leading-relaxed">{parrafoAnalisis}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Talleres del periodo" value={stats.totalTalleres} icon={CalendarClock} colorBg="#D3D3D3" colorFg="#36454F" />
        <MetricCard label="% liberado para trabajar" value={`${stats.pctLiberado}%`} icon={LockOpen} colorBg="hsl(142 71% 92%)" colorFg="hsl(142 71% 30%)" />
        <MetricCard label="% cumplimiento (entregado/planificado)" value={`${stats.pctCumplimiento}%`} icon={Package} colorBg="hsl(38 92% 92%)" colorFg="hsl(38 92% 35%)" />
        <MetricCard label="Incidencias del periodo" value={quejasDelPeriodo.length} icon={AlertTriangle} colorBg="hsl(0 70% 93%)" colorFg="hsl(0 70% 45%)" />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-title font-medium">Cumplimiento por responsabilidad</div>
          <div className="mb-3 text-caption text-muted-foreground">
            De las entregas del periodo: separa lo que depende de nosotros (liberar la unidad a tiempo) de lo que depende del contratista (ejecutar dentro del estándar), y el cumplimiento final ante el cliente.
          </div>
          <ResponsabilidadPanel resumen={resumenResp} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 text-title font-medium">Atención requerida</div>
            {!hayAtencion ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Todo en orden en este periodo. No hay pendientes urgentes.</div>
            ) : (
              <div>
                {fechasAtrasadas.slice(0, 3).map((fp) => {
                  const dias = diasAtrasoFechaPrometida(fp);
                  return (
                    <div key={fp.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                      <div className="text-body">
                        <span className="font-medium">{subName(fp.subcontratistaId)}</span> — {fp.descripcion}: <Badge variant="destructive">atrasada{dias ? ` ${dias}d` : ''}</Badge>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => goTo('fechas')}>Ver</Button>
                    </div>
                  );
                })}
                {fechasProximas.slice(0, 2).map((fp) => (
                  <div key={fp.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div className="text-body">
                      <span className="font-medium">{subName(fp.subcontratistaId)}</span> — {fp.descripcion}: prometida para {fmtDate(fp.fechaPrometidaActual)}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => goTo('fechas')}>Ver</Button>
                  </div>
                ))}
                {atrasados.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div className="text-body">
                      <span className="font-medium">{subName(t.subcontratistaId)}</span> — {t.edificio} {t.unidad}: atrasado de semana del {weekRangeLabel(t.semana)}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => goTo('planificacion')}>Mover</Button>
                  </div>
                ))}
                {sinEntregarUrgente.slice(0, 4).map((d) => (
                  <div key={d.taller.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div className="text-body">
                      <span className="font-medium">{subName(d.taller.subcontratistaId)}</span> — {d.taller.edificio} {d.taller.unidad}: {d.dias} días liberado sin entrega
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => goTo('validacion')}>Ver</Button>
                  </div>
                ))}
                {noLiberadoActual.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div className="text-body">
                      <span className="font-medium">{subName(t.subcontratistaId)}</span> — {t.edificio} {t.unidad}: no liberado
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => goTo('validacion')}>Resolver</Button>
                  </div>
                ))}
                {pendientesActual.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div className="text-body">
                      <span className="font-medium">{subName(t.subcontratistaId)}</span> — {t.edificio} {t.unidad}: validación pendiente
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => goTo('validacion')}>Validar</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-title font-medium">Cumplimiento por subcontratista</span>
              <Button size="sm" variant="outline" onClick={() => goTo('evaluacion')}>Ver evaluación</Button>
            </div>
            {perSub.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No hay datos en este periodo todavía.</div>
            ) : (
              <div>
                {perSub.slice(0, 6).map(({ sub, stats: s }) => (
                  <div key={sub.id} className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-0">
                    <SubAvatar name={sub.nombre} id={sub.id} />
                    <div className="min-w-0 flex-1">
                      <div className="text-body font-medium">{sub.nombre}</div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                          style={{
                            width: `${s.pctCumplimiento}%`,
                            background: s.pctCumplimiento >= 90 ? 'hsl(142 71% 40%)' : s.pctCumplimiento >= 70 ? 'hsl(38 92% 45%)' : 'hsl(0 70% 50%)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-10 text-right text-body font-medium">{s.pctCumplimiento}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-title font-medium">Incidencias del periodo ({quejasDelPeriodo.length})</span>
              <Button size="sm" variant="outline" onClick={() => goTo('quejas')}>Ver todas</Button>
            </div>
            {quejasDelPeriodo.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No se registraron incidencias en este periodo.</div>
            ) : (
              <div className="space-y-1.5">
                {quejasDelPeriodo.slice(0, 6).map((q) => (
                  <div key={q.id} className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-1.5 text-caption">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="font-medium">{subName(q.subcontratistaId)} — {q.tipo}</span>
                      <span className="text-micro text-muted-foreground">{fmtDate(q.fecha)}</span>
                    </div>
                    {q.descripcion && <div className="text-muted-foreground">{q.descripcion}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-title font-medium">Fechas prometidas vigentes</span>
              <Button size="sm" variant="outline" onClick={() => goTo('fechas')}>Ver todas</Button>
            </div>
            {fechasAtrasadas.length === 0 && fechasProximas.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No hay fechas prometidas atrasadas o próximas a vencer.</div>
            ) : (
              <div className="space-y-1.5">
                {fechasAtrasadas.slice(0, 4).map((fp) => {
                  const dias = diasAtrasoFechaPrometida(fp);
                  return (
                    <div key={fp.id} className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-caption">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className="font-medium">{subName(fp.subcontratistaId)}</span>
                        <Badge variant="destructive">atrasada {dias ? `${dias}d` : ''}</Badge>
                      </div>
                      <div className="text-muted-foreground">{fp.descripcion}</div>
                    </div>
                  );
                })}
                {fechasProximas.slice(0, 4).map((fp) => (
                  <div key={fp.id} className="rounded-md border border-warning/30 bg-warning/5 px-2.5 py-1.5 text-caption">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="font-medium">{subName(fp.subcontratistaId)}</span>
                      <Badge variant="warning">prometida {fmtDate(fp.fechaPrometidaActual)}</Badge>
                    </div>
                    <div className="text-muted-foreground">{fp.descripcion}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => goTo('planificacion')} className="rounded-xl border border-border bg-card p-5 text-left shadow transition-shadow hover:shadow-md">
          <CalendarPlus size={20} className="mb-2.5 text-primary" />
          <div className="text-sm font-medium">Planificar talleres</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Agregar talleres del periodo</div>
        </button>
        <button onClick={() => goTo('validacion')} className="rounded-xl border border-border bg-card p-5 text-left shadow transition-shadow hover:shadow-md">
          <ClipboardCheck size={20} className="mb-2.5 text-primary" />
          <div className="text-sm font-medium">Validar y registrar entrega</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{pendientesActual.length} pendiente(s) de validar</div>
        </button>
        <button onClick={() => goTo('quejas')} className="rounded-xl border border-border bg-card p-5 text-left shadow transition-shadow hover:shadow-md">
          <AlertTriangle size={20} className="mb-2.5 text-primary" />
          <div className="text-sm font-medium">Registrar incidencia</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{quejasDelPeriodo.length} en este periodo</div>
        </button>
        <button onClick={() => goTo('fechas')} className="rounded-xl border border-border bg-card p-5 text-left shadow transition-shadow hover:shadow-md">
          <CalendarClock size={20} className="mb-2.5 text-primary" />
          <div className="text-sm font-medium">Fechas prometidas</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{fechasAtrasadas.length} atrasada(s) actualmente</div>
        </button>
      </div>
    </div>
  );
}
