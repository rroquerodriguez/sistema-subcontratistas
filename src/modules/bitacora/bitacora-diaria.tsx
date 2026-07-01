import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PhotoViewer } from '@/components/shared/photo-viewer';
import { CicloTallerPanel } from '@/components/shared/ciclo-taller-panel';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { WeekCalendarPicker } from '@/components/shared/week-calendar-picker';
import { MonthPicker } from '@/components/shared/month-picker';
import { ProjectFilter } from '@/components/shared/project-filter';
import { InspectorFilter } from '@/components/shared/inspector-filter';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { ExpandCollapseAllButtons } from '@/components/shared/expand-collapse-all-button';
import { NivelCollapseControls } from '@/components/shared/nivel-collapse-controls';
import { useCollapseState } from '@/lib/use-collapse-state';
import { SortableTableHead } from '@/components/shared/sortable-table-head';
import { useSortableFilterableTable, type ColumnConfig } from '@/lib/use-sortable-table';
import { UnidadSearchBox, unidadMatchesSearch } from '@/components/shared/unidad-search-box';
import { AgrupacionConfigButton, type OpcionAgrupacion } from '@/components/shared/agrupacion-config-button';
import { ArbolAgrupado } from '@/components/shared/arbol-agrupado';
import { construirArbolAgrupado, todasLasKeysAgrupables, keysPorNivel, type DimensionAgrupacion } from '@/lib/agrupacion-multinivel';
import { ExportarButton } from '@/components/shared/exportar-button';
import { BitacoraForm } from './bitacora-form';
import { dbSet } from '@/lib/storage';
import { fmtDate, fmtDateTime, uid, todayISO, mesKeyActual, mesLabel, semanasDelMes, weekRangeLabel, mondayOf } from '@/lib/utils-app';
import { buildParrafoAnalisisBitacora, quejasDelTaller } from '@/lib/stats-engine';
import { exportBitacoraExcel, COLUMNAS_BITACORA, COLUMNAS_BITACORA_DEFAULT } from '@/lib/export-bitacora-excel';
import { exportBitacoraPDF } from '@/lib/export-bitacora-pdf';
import { ColumnSelector } from '@/components/shared/column-selector';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { puedeEditar } from '@/lib/auth';
import type { Subcontratista, Taller, RegistroBitacora, CicloTaller, Queja } from '@/types';

type PeriodoBitacora = 'dia' | 'semana' | 'mes';

interface BitacoraDiariaProps {
  subs: Subcontratista[];
  talleres: Taller[];
  bitacora: RegistroBitacora[];
  setBitacora: (b: RegistroBitacora[]) => void;
  ciclos: CicloTaller[];
  setCiclos: (c: CicloTaller[]) => void;
  quejas: Queja[];
  semanaActual: string;
  showToast: (msg: string) => void;
}

const OPCIONES_AGRUPACION_BITACORA: OpcionAgrupacion[] = [
  { key: 'contratista', label: 'Subcontratista' },
  { key: 'estadoTrabajo', label: 'Estado del trabajo' },
  { key: 'personalAsignado', label: 'Personal asignado' },
  { key: 'inspector', label: 'Inspector de calidad' },
];

function RegistrosTabla({
  items, tallerLabel, onEdit, onRemove, onViewPhotos, soloLectura,
}: {
  items: RegistroBitacora[];
  tallerLabel: (id: string) => string;
  onEdit: (b: RegistroBitacora) => void;
  onRemove: (id: string) => void;
  onViewPhotos: (fotos: string[]) => void;
  soloLectura?: boolean;
}) {
  const columnas: ColumnConfig<RegistroBitacora>[] = [
    { key: 'fecha', getValue: (b) => b.fecha },
    { key: 'taller', getValue: (b) => tallerLabel(b.tallerId) },
    { key: 'llego', getValue: (b) => b.llego },
    { key: 'completo', getValue: (b) => b.completo },
    { key: 'motivo', getValue: (b) => b.motivo },
    { key: 'responsable', getValue: (b) => b.responsable },
    { key: 'registradoPor', getValue: (b) => b.registradoPor || '' },
  ];
  const { rows, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(items, columnas);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead label="Fecha" columnKey="fecha" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Taller" columnKey="taller" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.taller} onFilterChange={setFilter} />
          <SortableTableHead label="Personal asignado" columnKey="llego" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Estado del trabajo" columnKey="completo" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Motivo" columnKey="motivo" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.motivo} onFilterChange={setFilter} />
          <SortableTableHead label="Responsable" columnKey="responsable" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.responsable} onFilterChange={setFilter} />
          <SortableTableHead label="Registrado por" columnKey="registradoPor" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.registradoPor} onFilterChange={setFilter} />
          <TableHead>Fotos</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={b.id}>
            <TableCell>{fmtDate(b.fecha)}</TableCell>
            <TableCell>{tallerLabel(b.tallerId)}</TableCell>
            <TableCell>{b.llego === 'SI' ? <Badge variant="success">SI</Badge> : <Badge variant="destructive">NO</Badge>}</TableCell>
            <TableCell>
              {b.completo === 'COMPLETADO' ? <Badge variant="success">Completado</Badge>
                : b.completo === 'EN PROCESO' ? <Badge variant="warning">En proceso</Badge>
                : b.completo === 'SIN INICIAR' ? <Badge variant="secondary">Sin iniciar</Badge>
                : '—'}
            </TableCell>
            <TableCell>{b.motivo || '—'}</TableCell>
            <TableCell>{b.responsable || '—'}</TableCell>
            <TableCell className="text-[11.5px] text-muted-foreground" title={b.registradoEn ? fmtDateTime(b.registradoEn) : ''}>
              {b.registradoPor || '—'}
            </TableCell>
            <TableCell>{b.fotos.length ? <Button size="sm" variant="outline" onClick={() => onViewPhotos(b.fotos)}>{b.fotos.length} foto(s)</Button> : '—'}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8" onClick={() => onEdit(b)} aria-label="Editar" disabled={soloLectura}><Pencil size={14} /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => onRemove(b.id)} aria-label="Eliminar" disabled={soloLectura}><Trash2 size={14} /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function BitacoraDiaria({ subs, talleres, bitacora, setBitacora, ciclos, setCiclos, quejas, semanaActual, showToast }: BitacoraDiariaProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'bitacora');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<RegistroBitacora | null>(null);
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [buscadorUnidad, setBuscadorUnidad] = useState('');
  const [nivelesAgrupacion, setNivelesAgrupacion] = useState<string[]>([]);
  const [vistaRegistros, setVistaRegistros] = useState<'contratista' | 'personalizada'>('contratista');
  const [periodo, setPeriodo] = useState<PeriodoBitacora>('dia');
  const [diaSeleccionado, setDiaSeleccionado] = useState(todayISO());
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(semanaActual);
  const [mesSeleccionado, setMesSeleccionado] = useState(mesKeyActual());
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_BITACORA_DEFAULT);
  const colapsoAvance = useCollapseState();
  const colapsoContratista = useCollapseState();
  const colapsoPersonalizada = useCollapseState();

  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const tallerLabel = (id: string) => { const t = talleres.find((x) => x.id === id); return t ? `${subName(t.subcontratistaId)} — ${t.edificio} ${t.unidad}` : '—'; };

  const cicloDe = (tallerId: string): CicloTaller =>
    ciclos.find((c) => c.tallerId === tallerId) || { id: uid('cic'), tallerId, estado: 'NO INICIADO', fechaInicio: '', fechaCierre: '', comentarios: [] };

  const registroHoyDe = (tallerId: string): RegistroBitacora | undefined =>
    bitacora.find((b) => b.tallerId === tallerId && b.fecha === todayISO());

  const saveCiclo = async (c: CicloTaller) => {
    const exists = ciclos.find((x) => x.id === c.id);
    const next = exists ? ciclos.map((x) => (x.id === c.id ? c : x)) : [...ciclos, c];
    setCiclos(next);
    await dbSet('ciclos_taller', next);
  };

  /** Crea o actualiza el registro diario de hoy para un taller, desde el panel de ciclo */
  const upsertRegistroDiario = async (tallerId: string, partial: Pick<RegistroBitacora, 'llego' | 'completo' | 'notas' | 'motivo'>) => {
    const hoy = todayISO();
    const existing = bitacora.find((b) => b.tallerId === tallerId && b.fecha === hoy);
    let next: RegistroBitacora[];
    if (existing) {
      next = bitacora.map((b) =>
        b.tallerId === tallerId && b.fecha === hoy
          ? { ...b, llego: partial.llego || b.llego, completo: partial.completo || b.completo, notas: partial.notas || b.notas, motivo: partial.motivo || b.motivo }
          : b
      );
    } else {
      const nuevo: RegistroBitacora = {
        id: uid('bit'), fecha: hoy, tallerId,
        llego: partial.llego, completo: partial.completo,
        motivo: partial.motivo, responsable: '', accion: '', notas: partial.notas, fotos: [],
      };
      next = [...bitacora, nuevo];
    }
    setBitacora(next);
    await dbSet('bitacora', next);
  };

  const save = async (b: RegistroBitacora) => {
    const exists = bitacora.find((x) => x.id === b.id);
    const registro = exists ? b : { ...b, registradoPor: usuario.nombre, registradoPorId: usuario.id, registradoEn: new Date().toISOString() };
    const next = exists ? bitacora.map((x) => (x.id === b.id ? registro : x)) : [...bitacora, registro];
    setBitacora(next);
    await dbSet('bitacora', next);
    setShowNew(false);
    setEditing(null);
    showToast('Registro de bitácora guardado');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const next = bitacora.filter((x) => x.id !== id);
    setBitacora(next);
    await dbSet('bitacora', next);
    showToast('Registro eliminado');
  };

  const semanasDelMesSeleccionado = useMemo(() => semanasDelMes(mesSeleccionado), [mesSeleccionado]);

  // Filtra registros según el periodo elegido (día exacto, semana completa, o mes completo)
  let filtered = bitacora;
  if (periodo === 'dia') filtered = filtered.filter((b) => b.fecha === diaSeleccionado);
  else if (periodo === 'semana') filtered = filtered.filter((b) => mondayOf(b.fecha) === semanaSeleccionada);
  else filtered = filtered.filter((b) => semanasDelMesSeleccionado.includes(mondayOf(b.fecha)));
  filtered = filtroSub === 'todos' ? filtered : filtered.filter((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId === filtroSub);
  filtered = filtroProyecto === 'todos' ? filtered : filtered.filter((b) => talleres.find((t) => t.id === b.tallerId)?.proyecto === filtroProyecto);
  filtered = filtroInspector === 'todos' ? filtered : filtered.filter((b) => talleres.find((t) => t.id === b.tallerId)?.inspector === filtroInspector);
  if (buscadorUnidad.trim()) {
    filtered = filtered.filter((b) => {
      const t = talleres.find((x) => x.id === b.tallerId);
      return t && unidadMatchesSearch(t.edificio, t.esGeneral ? 'general' : t.unidad, buscadorUnidad);
    });
  }
  const sorted = [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const periodoLabel = periodo === 'dia' ? `el día ${fmtDate(diaSeleccionado)}`
    : periodo === 'semana' ? `la semana del ${weekRangeLabel(semanaSeleccionada)}`
    : `el mes de ${mesLabel(mesSeleccionado)}`;
  const periodoLabelCorto = periodo === 'dia' ? fmtDate(diaSeleccionado)
    : periodo === 'semana' ? `Semana del ${weekRangeLabel(semanaSeleccionada)}`
    : mesLabel(mesSeleccionado);

  const parrafoAnalisis = useMemo(
    () => buildParrafoAnalisisBitacora(filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, filtered, periodoLabel),
    [filtered, filtroSub, subs, periodoLabel]
  );

  const inspectoresDisponibles = useMemo(
    () => [...new Set(talleres.map((t) => t.inspector).filter(Boolean))].sort(),
    [talleres]
  );

  const sortedPorContratista = useMemo(() => {
    const ids = [...new Set(sorted.map((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId).filter(Boolean))] as string[];
    return ids.map((id) => ({ id, nombre: subName(id), items: sorted.filter((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId === id) }));
  }, [sorted, talleres, subs]);

  const dimensionesDisponibles: Record<string, DimensionAgrupacion<RegistroBitacora>> = {
    contratista: { key: 'contratista', label: 'Subcontratista', getValue: (b) => { const t = talleres.find((x) => x.id === b.tallerId); return t ? subName(t.subcontratistaId) : '—'; } },
    estadoTrabajo: { key: 'estadoTrabajo', label: 'Estado del trabajo', getValue: (b) => b.completo || 'SIN REGISTRO' },
    personalAsignado: { key: 'personalAsignado', label: 'Personal asignado', getValue: (b) => (b.llego === 'SI' ? 'Asignado' : 'Sin personal') },
    inspector: { key: 'inspector', label: 'Inspector de calidad', getValue: (b) => { const t = talleres.find((x) => x.id === b.tallerId); return t?.inspector || 'Sin asignar'; } },
  };
  const arbolPersonalizado = useMemo(() => {
    const dims = nivelesAgrupacion.map((k) => dimensionesDisponibles[k]).filter(Boolean);
    return construirArbolAgrupado(sorted, dims);
  }, [sorted, nivelesAgrupacion]);
  const keysPorNivelPersonalizada = useMemo(() => keysPorNivel(arbolPersonalizado), [arbolPersonalizado]);
  const nivelesConLabel = nivelesAgrupacion.map((k, i) => ({ label: dimensionesDisponibles[k]?.label || k, keys: keysPorNivelPersonalizada[i] || [] }));

  const talleresSemana = talleres.filter((t) =>
    t.semana === semanaActual && (filtroSub === 'todos' || t.subcontratistaId === filtroSub) && (filtroProyecto === 'todos' || t.proyecto === filtroProyecto) && (filtroInspector === 'todos' || t.inspector === filtroInspector)
  );

  const talleresSemanaPorContratista = useMemo(() => {
    const ids = [...new Set(talleresSemana.map((t) => t.subcontratistaId))];
    return ids.map((id) => ({ id, nombre: subName(id), items: talleresSemana.filter((t) => t.subcontratistaId === id) }));
  }, [talleresSemana, subs]);

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Bitácora de obra</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Da seguimiento diario a la asistencia y registra el avance de ejecución de cada taller.</div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
              <Select value={filtroSub} onValueChange={setFiltroSub}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <InspectorFilter value={filtroInspector} onChange={setFiltroInspector} opciones={inspectoresDisponibles} />
            </div>
            <Button onClick={() => setShowNew(true)} disabled={soloLectura}><Plus size={14} />Nuevo registro</Button>
          </div>

          <Tabs defaultValue="avance">
            <TabsList className="mb-4">
              <TabsTrigger value="avance">Avance de talleres</TabsTrigger>
              <TabsTrigger value="registros">Registros (día / semana / mes)</TabsTrigger>
            </TabsList>

            <TabsContent value="avance">
              {talleresSemana.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres planificados esta semana para mostrar avance.</div>
              ) : (
                <>
                  <div className="mb-3">
                    <ExpandCollapseAllButtons onExpandAll={colapsoAvance.expandAll} onCollapseAll={() => colapsoAvance.collapseAll(talleresSemanaPorContratista.map((g) => g.id))} />
                  </div>
                  {talleresSemanaPorContratista.map((g) => (
                  <CollapsibleGroup
                    key={g.id}
                    open={!colapsoAvance.isCollapsed(g.id)}
                    onToggle={() => colapsoAvance.toggle(g.id)}
                    header={
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <SubAvatar name={g.nombre} id={g.id} />{g.nombre}
                        <Badge variant="secondary">{g.items.length} taller(es)</Badge>
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      {g.items.map((t) => {
                        const incidenciasTaller = quejasDelTaller(t, quejas);
                        return (
                          <div key={t.id} className="rounded-xl border border-border p-3.5">
                            <div className="mb-2 flex items-center gap-2.5">
                              <SubAvatar name={subName(t.subcontratistaId)} id={t.subcontratistaId} />
                              <div>
                                <div className="text-[13.5px] font-medium">{subName(t.subcontratistaId)} — {t.esGeneral ? <Badge variant="secondary">General</Badge> : `${t.edificio} ${t.unidad}`}</div>
                                <div className="text-[11.5px] text-muted-foreground">{t.actividad}</div>
                              </div>
                            </div>
                            {incidenciasTaller.length > 0 && (
                              <div className="mb-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
                                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
                                  <AlertTriangle size={12} />Incidencias de este taller ({incidenciasTaller.length})
                                </div>
                                <div className="space-y-1">
                                  {incidenciasTaller.map((q) => (
                                    <div key={q.id} className="text-[11.5px] text-muted-foreground">
                                      <span className="font-medium text-foreground">{q.tipo}</span> — {fmtDate(q.fecha)}{q.descripcion ? `: ${q.descripcion}` : ''}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <CicloTallerPanel
                              ciclo={cicloDe(t.id)}
                              onChange={saveCiclo}
                              registroHoy={registroHoyDe(t.id)}
                              onRegistroDiario={(partial) => upsertRegistroDiario(t.id, partial)}
                              soloLectura={soloLectura}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleGroup>
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="registros">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant={periodo === 'dia' ? 'default' : 'outline'} onClick={() => setPeriodo('dia')}>Día</Button>
                    <Button size="sm" variant={periodo === 'semana' ? 'default' : 'outline'} onClick={() => setPeriodo('semana')}>Semana</Button>
                    <Button size="sm" variant={periodo === 'mes' ? 'default' : 'outline'} onClick={() => setPeriodo('mes')}>Mes</Button>
                  </div>
                  {periodo === 'dia' && <Input type="date" value={diaSeleccionado} onChange={(e) => setDiaSeleccionado(e.target.value)} className="max-w-[180px]" />}
                  {periodo === 'semana' && <WeekCalendarPicker semanaActual={semanaSeleccionada} onChange={setSemanaSeleccionada} />}
                  {periodo === 'mes' && <MonthPicker mesKey={mesSeleccionado} onChange={setMesSeleccionado} />}
                </div>
                <div className="flex flex-wrap gap-2">
                  <ColumnSelector seleccionadas={columnasExport} onChange={setColumnasExport} columnas={COLUMNAS_BITACORA} />
                  <ExportarButton
                    onExcel={() => exportBitacoraExcel(filtered, talleres, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, ciclos, periodoLabelCorto, quejas, columnasExport)}
                    onPDF={() => exportBitacoraPDF(filtered, talleres, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, ciclos, periodoLabelCorto, parrafoAnalisis, quejas)}
                  />
                </div>
              </div>

              <div className="mb-3.5 flex flex-wrap items-center gap-2">
                <Button size="sm" variant={vistaRegistros === 'contratista' ? 'default' : 'outline'} onClick={() => setVistaRegistros('contratista')}>Por contratista</Button>
                <Button size="sm" variant={vistaRegistros === 'personalizada' ? 'default' : 'outline'} onClick={() => setVistaRegistros('personalizada')}>Agrupación personalizada</Button>
                {vistaRegistros === 'contratista' && (
                  <ExpandCollapseAllButtons onExpandAll={colapsoContratista.expandAll} onCollapseAll={() => colapsoContratista.collapseAll(sortedPorContratista.map((g) => g.id))} />
                )}
                {vistaRegistros === 'personalizada' && (
                  <ExpandCollapseAllButtons onExpandAll={colapsoPersonalizada.expandAll} onCollapseAll={() => colapsoPersonalizada.collapseAll(todasLasKeysAgrupables(arbolPersonalizado))} />
                )}
                <UnidadSearchBox value={buscadorUnidad} onChange={setBuscadorUnidad} />
                {vistaRegistros === 'personalizada' && (
                  <AgrupacionConfigButton opciones={OPCIONES_AGRUPACION_BITACORA} seleccion={nivelesAgrupacion} onChange={setNivelesAgrupacion} />
                )}
              </div>

              {vistaRegistros === 'personalizada' && nivelesConLabel.length > 0 && (
                <div className="mb-3.5">
                  <NivelCollapseControls niveles={nivelesConLabel} onCollapseKeys={colapsoPersonalizada.collapseKeys} onExpandKeys={colapsoPersonalizada.expandKeys} />
                </div>
              )}

              <div className="mb-3.5 rounded-lg bg-muted/30 px-3.5 py-2.5 text-[12.5px] leading-relaxed">
                {parrafoAnalisis}
              </div>

              {vistaRegistros === 'contratista' && (
                sortedPorContratista.length ? sortedPorContratista.map((g) => (
                  <CollapsibleGroup
                    key={g.id}
                    open={!colapsoContratista.isCollapsed(g.id)}
                    onToggle={() => colapsoContratista.toggle(g.id)}
                    header={
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <SubAvatar name={g.nombre} id={g.id} />{g.nombre}
                        <Badge variant="secondary">{g.items.length} registro(s)</Badge>
                      </div>
                    }
                  >
                    <RegistrosTabla items={g.items} tallerLabel={tallerLabel} onEdit={setEditing} onRemove={remove} onViewPhotos={setViewPhotos} soloLectura={soloLectura} />
                  </CollapsibleGroup>
                )) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">No hay registros de bitácora en este periodo.</div>
                )
              )}

              {vistaRegistros === 'personalizada' && (
                <ArbolAgrupado
                  nodos={arbolPersonalizado}
                  isCollapsed={colapsoPersonalizada.isCollapsed}
                  onToggle={colapsoPersonalizada.toggle}
                  renderHoja={(items) => <RegistrosTabla items={items} tallerLabel={tallerLabel} onEdit={setEditing} onRemove={remove} onViewPhotos={setViewPhotos} soloLectura={soloLectura} />}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nuevo registro de bitácora</DialogTitle></DialogHeader>
          <BitacoraForm subs={subs} talleres={talleres} onSave={save} onCancel={() => setShowNew(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar registro</DialogTitle></DialogHeader>
          {editing && <BitacoraForm subs={subs} talleres={talleres} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <PhotoViewer photos={viewPhotos} onClose={() => setViewPhotos(null)} />
    </div>
  );
}
