import { useMemo, useState } from 'react';
import { TrendingUp, ChevronRight, Check, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { ProjectFilter } from '@/components/shared/project-filter';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { ExpandCollapseAllButtons } from '@/components/shared/expand-collapse-all-button';
import { useCollapseState } from '@/lib/use-collapse-state';
import { ExportarButton } from '@/components/shared/exportar-button';
import { calcularRendimientoReal, MINIMO_CASOS_CONFIABLE, type RendimientoActividad } from '@/lib/rendimiento-real';
import { resumenDiasLaborables } from '@/lib/calendario-laboral';
import { fmtDate, uid } from '@/lib/utils-app';
import { exportRendimientoExcel } from '@/lib/export-rendimiento-excel';
import { exportRendimientoPDF } from '@/lib/export-rendimiento-pdf';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { puedeEditar } from '@/lib/auth';
import { persistir } from '@/lib/persistir';
import type { Subcontratista, Taller, CicloTaller, Validacion, Queja, TallerCatalogo, CalendarioLaboral } from '@/types';

interface RendimientoRealProps {
  subs: Subcontratista[];
  talleres: Taller[];
  ciclos: CicloTaller[];
  validaciones: Validacion[];
  quejas: Queja[];
  catalogo: TallerCatalogo[];
  setCatalogo: (c: TallerCatalogo[]) => void;
  calendario: CalendarioLaboral;
  showToast: (msg: string) => void;
}

function DiffBadge({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-muted-foreground">—</span>;
  if (Math.abs(valor) < 0.5) return <Badge variant="secondary">Igual al estándar</Badge>;
  if (valor > 0) return <Badge variant="destructive">+{valor} día{valor === 1 ? '' : 's'} más lento</Badge>;
  return <Badge variant="success">{Math.abs(valor)} día{Math.abs(valor) === 1 ? '' : 's'} más rápido</Badge>;
}

function FilaActividad({
  r, expandido, onToggle, onAplicar, soloLectura,
}: {
  r: RendimientoActividad;
  expandido: boolean;
  onToggle: () => void;
  onAplicar: (r: RendimientoActividad) => void;
  soloLectura?: boolean;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <ChevronRight size={14} className={`flex-shrink-0 transition-transform ${expandido ? 'rotate-90' : ''}`} />
            {r.actividad}
          </span>
        </TableCell>
        <TableCell className="whitespace-nowrap text-caption">
          {r.casosLimpios} limpio{r.casosLimpios === 1 ? '' : 's'}{r.casosAfectados > 0 && <span className="text-muted-foreground"> · {r.casosAfectados} afectado{r.casosAfectados === 1 ? '' : 's'}</span>}
        </TableCell>
        <TableCell>
          {r.confiable ? (
            <span className="font-medium">{r.duracionSugeridaDias} día{r.duracionSugeridaDias === 1 ? '' : 's'}</span>
          ) : (
            <Badge variant="secondary">Datos insuficientes ({r.casosLimpios}/{MINIMO_CASOS_CONFIABLE})</Badge>
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap text-caption text-muted-foreground">
          {r.estandarActualDias != null ? `${r.estandarActualDias} día${r.estandarActualDias === 1 ? '' : 's'}` : 'Sin definir'}
        </TableCell>
        <TableCell><DiffBadge valor={r.diferenciaVsEstandar} /></TableCell>
        <TableCell className="whitespace-nowrap text-caption">
          {r.holguraSugeridaDias != null ? `${r.holguraSugeridaDias} día${r.holguraSugeridaDias === 1 ? '' : 's'}` : '—'}
        </TableCell>
        <TableCell className="whitespace-nowrap text-caption text-muted-foreground">
          {r.esperaPromedioDias != null ? `${r.esperaPromedioDias} día${r.esperaPromedioDias === 1 ? '' : 's'}` : '—'}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm" variant="outline" disabled={!r.confiable || soloLectura}
            onClick={() => onAplicar(r)}
          >
            <Check size={13} />Aplicar al catálogo
          </Button>
        </TableCell>
      </TableRow>
      {expandido && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/20 p-0">
            <div className="p-3">
              <div className="mb-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                Talleres usados en este cálculo ({r.casos.length})
              </div>
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidad</TableHead><TableHead>Liberación</TableHead><TableHead>Inicio</TableHead><TableHead>Cierre</TableHead>
                      <TableHead>Total</TableHead><TableHead>Espera</TableHead><TableHead>Ejecución</TableHead><TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.casos.map((c) => (
                      <TableRow key={c.tallerId}>
                        <TableCell className="text-caption">{c.edificioUnidad}</TableCell>
                        <TableCell className="text-caption">{fmtDate(c.fechaLiberacion)}</TableCell>
                        <TableCell className="text-caption">{fmtDate(c.fechaInicio)}</TableCell>
                        <TableCell className="text-caption">{fmtDate(c.fechaCierre)}</TableCell>
                        <TableCell className="text-caption font-medium">{c.duracionTotalDias}d</TableCell>
                        <TableCell className="text-caption text-muted-foreground">{c.esperaDias}d</TableCell>
                        <TableCell className="text-caption text-muted-foreground">{c.ejecucionDias}d</TableCell>
                        <TableCell>{c.afectadoPorCausaNuestra && <Badge variant="secondary">Excluido (causa nuestra)</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function RendimientoReal({ subs, talleres, ciclos, validaciones, quejas, catalogo, setCatalogo, calendario, showToast }: RendimientoRealProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'catalogo');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [filtroSub, setFiltroSub] = useState('todos');
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  const colapso = useCollapseState();

  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';

  const talleresFiltrados = useMemo(
    () => talleres.filter((t) => (filtroProyecto === 'todos' || t.proyecto === filtroProyecto) && (filtroSub === 'todos' || t.subcontratistaId === filtroSub)),
    [talleres, filtroProyecto, filtroSub]
  );

  const resultados = useMemo(
    () => calcularRendimientoReal(talleresFiltrados, ciclos, validaciones, quejas, catalogo, calendario),
    [talleresFiltrados, ciclos, validaciones, quejas, catalogo, calendario]
  );

  const porContratista = useMemo(() => {
    const ids = [...new Set(resultados.map((r) => r.subcontratistaId))];
    return ids.map((id) => ({ id, nombre: subName(id), items: resultados.filter((r) => r.subcontratistaId === id) })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [resultados, subs]);

  const toggleExpandido = (key: string) => setExpandidas((prev) => ({ ...prev, [key]: !prev[key] }));

  const aplicarAlCatalogo = async (r: RendimientoActividad) => {
    if (r.duracionSugeridaDias === null) return;
    if (!confirm(`¿Actualizar el estándar de "${r.actividad}" (${subName(r.subcontratistaId)}) a ${r.duracionSugeridaDias} día(s)${r.holguraSugeridaDias ? ` con ${r.holguraSugeridaDias} día(s) de holgura` : ''}, según el rendimiento real?`)) return;

    let next: TallerCatalogo[];
    if (r.catalogoId) {
      next = catalogo.map((c) => c.id === r.catalogoId ? { ...c, duracionEstandarDias: r.duracionSugeridaDias!, holguraDias: r.holguraSugeridaDias ?? c.holguraDias ?? 0 } : c);
    } else {
      const nuevo: TallerCatalogo = {
        id: uid('cat'), subcontratistaId: r.subcontratistaId, actividad: r.actividad, notas: '',
        duracionEstandarDias: r.duracionSugeridaDias, holguraDias: r.holguraSugeridaDias ?? 0,
      };
      next = [...catalogo, nuevo];
    }
    setCatalogo(next);
    if (!(await persistir('catalogo_talleres', next))) return;
    showToast('Estándar actualizado en el catálogo con el dato real');
  };

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 flex items-center gap-2 text-title font-semibold"><TrendingUp size={18} />Rendimiento real</div>
          <div className="mb-1 text-caption text-muted-foreground">
            Compara la duración estándar del catálogo contra lo que realmente tomó cada actividad, medido desde la liberación
            hasta el cierre del ciclo (en días laborables: {resumenDiasLaborables(calendario)}).
          </div>
          <div className="mb-4 flex items-start gap-1.5 rounded-md bg-muted/30 px-3 py-2 text-micro text-muted-foreground">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            Los casos con una incidencia de causa "nuestra" durante el ciclo se excluyen del cálculo de duración estándar
            (no es lentitud real), pero sí se usan para sugerir la holgura. Se requieren al menos {MINIMO_CASOS_CONFIABLE} casos limpios para confiar en el número.
          </div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
              <Select value={filtroSub} onValueChange={setFiltroSub}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <ExpandCollapseAllButtons onExpandAll={colapso.expandAll} onCollapseAll={() => colapso.collapseAll(porContratista.map((g) => g.id))} />
            </div>
            <ExportarButton
              onExcel={() => exportRendimientoExcel(resultados, subs)}
              onPDF={() => exportRendimientoPDF(resultados, subs)}
            />
          </div>

          {porContratista.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres completados con liberación registrada para analizar todavía.</div>
          ) : (
            porContratista.map((g) => (
              <CollapsibleGroup
                key={g.id}
                open={!colapso.isCollapsed(g.id)}
                onToggle={() => colapso.toggle(g.id)}
                header={
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SubAvatar name={g.nombre} id={g.id} />{g.nombre}
                    <Badge variant="secondary">{g.items.length} actividad(es)</Badge>
                  </div>
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Casos</TableHead>
                      <TableHead>Duración real sugerida</TableHead>
                      <TableHead>Estándar actual</TableHead>
                      <TableHead>Diferencia</TableHead>
                      <TableHead>Holgura sugerida</TableHead>
                      <TableHead>Espera promedio</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((r) => (
                      <FilaActividad
                        key={`${r.subcontratistaId}::${r.actividad}`}
                        r={r}
                        expandido={!!expandidas[`${r.subcontratistaId}::${r.actividad}`]}
                        onToggle={() => toggleExpandido(`${r.subcontratistaId}::${r.actividad}`)}
                        onAplicar={aplicarAlCatalogo}
                        soloLectura={soloLectura}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CollapsibleGroup>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
