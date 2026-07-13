import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { PhotoViewer } from '@/components/shared/photo-viewer';
import { ProjectFilter } from '@/components/shared/project-filter';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
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
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { puedeEditar } from '@/lib/auth';
import { QuejaForm } from './queja-form';

import { fmtDate, fmtDateTime } from '@/lib/utils-app';
import { exportQuejasExcel, COLUMNAS_QUEJA, COLUMNAS_QUEJA_DEFAULT } from '@/lib/export-quejas-excel';
import { exportQuejasPDF } from '@/lib/export-quejas-pdf';
import { ColumnSelector } from '@/components/shared/column-selector';
import type { Subcontratista, Queja, Taller, Validacion, Entrega } from '@/types';
import { persistir } from '@/lib/persistir';

interface QuejasIncidenciasProps {
  subs: Subcontratista[];
  talleres: Taller[];
  validaciones: Validacion[];
  entregas: Entrega[];
  quejas: Queja[];
  setQuejas: (q: Queja[]) => void;
  showToast: (msg: string) => void;
}

const OPCIONES_AGRUPACION_INCIDENCIAS: OpcionAgrupacion[] = [
  { key: 'contratista', label: 'Subcontratista' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'causa', label: 'Causa' },
];

function IncidenciasTabla({ list, onEdit, onRemove, onViewPhotos, soloLectura }: { list: Queja[]; onEdit: (q: Queja) => void; onRemove: (id: string) => void; onViewPhotos: (fotos: string[]) => void; soloLectura?: boolean }) {
  const columnas: ColumnConfig<Queja>[] = [
    { key: 'fecha', getValue: (q) => q.fecha },
    { key: 'tipo', getValue: (q) => q.tipo },
    { key: 'descripcion', getValue: (q) => q.descripcion },
    { key: 'causa', getValue: (q) => q.causa },
    { key: 'unidades', getValue: (q) => (q.esGeneral ? 'General' : q.unidades) },
    { key: 'registradoPor', getValue: (q) => q.registradoPor || '' },
  ];
  const { rows, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(list, columnas);

  return (
    <Table>
      <TableHeader sticky>
        <TableRow>
          <SortableTableHead label="Fecha" columnKey="fecha" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Tipo" columnKey="tipo" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.tipo} onFilterChange={setFilter} />
          <SortableTableHead label="Descripción" columnKey="descripcion" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.descripcion} onFilterChange={setFilter} />
          <SortableTableHead label="Causa" columnKey="causa" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.causa} onFilterChange={setFilter} />
          <SortableTableHead label="Unidades" columnKey="unidades" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.unidades} onFilterChange={setFilter} />
          <SortableTableHead label="Registrado por" columnKey="registradoPor" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.registradoPor} onFilterChange={setFilter} />
          <TableHead>Fotos</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((q) => (
          <TableRow key={q.id}>
            <TableCell>{fmtDate(q.fecha)}</TableCell>
            <TableCell>{q.tipo}</TableCell>
            <TableCell className="max-w-[260px] text-xs">{q.descripcion || '—'}</TableCell>
            <TableCell><Badge variant="secondary">{q.causa || '—'}</Badge></TableCell>
            <TableCell>{q.esGeneral ? <Badge variant="secondary">General</Badge> : (q.unidades || '—')}</TableCell>
            <TableCell className="text-[11.5px] text-muted-foreground" title={q.registradoEn ? fmtDateTime(q.registradoEn) : ''}>{q.registradoPor || '—'}</TableCell>
            <TableCell>{q.fotos.length ? <Button size="sm" variant="outline" onClick={() => onViewPhotos(q.fotos)}>{q.fotos.length} foto(s)</Button> : '—'}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8" onClick={() => onEdit(q)} aria-label="Editar" disabled={soloLectura}><Pencil size={14} /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => onRemove(q.id)} aria-label="Eliminar" disabled={soloLectura}><Trash2 size={14} /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function QuejasIncidencias({ subs, talleres, validaciones, entregas, quejas, setQuejas, showToast }: QuejasIncidenciasProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'quejas');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Queja | null>(null);
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [buscadorUnidad, setBuscadorUnidad] = useState('');
  const [nivelesAgrupacion, setNivelesAgrupacion] = useState<string[]>([]);
  const [vista, setVista] = useState<'contratista' | 'personalizada'>('contratista');
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_QUEJA_DEFAULT);
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const colapsoContratista = useCollapseState();
  const colapsoPersonalizada = useCollapseState();

  const save = async (q: Queja) => {
    const existing = quejas.find((x) => x.id === q.id);
    const registro = existing ? q : { ...q, registradoPor: usuario.nombre, registradoPorId: usuario.id, registradoEn: new Date().toISOString() };
    const next = existing ? quejas.map((x) => (x.id === q.id ? registro : x)) : [...quejas, registro];
    setQuejas(next);
    if (!(await persistir('quejas', next))) return;
    setShowNew(false);
    setEditing(null);
    showToast('Incidencia guardada');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta incidencia?')) return;
    const next = quejas.filter((x) => x.id !== id);
    setQuejas(next);
    if (!(await persistir('quejas', next))) return;
    showToast('Incidencia eliminada');
  };

  let filtered = filtroSub === 'todos' ? quejas : quejas.filter((q) => q.subcontratistaId === filtroSub);
  if (filtroProyecto !== 'todos') {
    const tallerIdsDelProyecto = new Set(talleres.filter((t) => t.proyecto === filtroProyecto).map((t) => `${t.edificio} ${t.unidad}`.trim()));
    filtered = filtered.filter((q) => q.esGeneral || q.unidadesAfectadas.some((u) => tallerIdsDelProyecto.has(u)));
  }
  if (buscadorUnidad.trim()) {
    filtered = filtered.filter((q) => q.esGeneral || unidadMatchesSearch('', q.unidades, buscadorUnidad));
  }
  const sorted = [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const grouped = useMemo(() => {
    const map: Record<string, Queja[]> = {};
    sorted.forEach((q) => { (map[q.subcontratistaId] = map[q.subcontratistaId] || []).push(q); });
    return map;
  }, [sorted]);

  const dimensionesDisponibles: Record<string, DimensionAgrupacion<Queja>> = {
    contratista: { key: 'contratista', label: 'Subcontratista', getValue: (q) => subName(q.subcontratistaId) },
    tipo: { key: 'tipo', label: 'Tipo', getValue: (q) => q.tipo },
    causa: { key: 'causa', label: 'Causa', getValue: (q) => q.causa || 'Sin causa' },
  };
  const arbolPersonalizado = useMemo(() => {
    const dims = nivelesAgrupacion.map((k) => dimensionesDisponibles[k]).filter(Boolean);
    return construirArbolAgrupado(sorted, dims);
  }, [sorted, nivelesAgrupacion]);
  const keysPorNivelPersonalizada = useMemo(() => keysPorNivel(arbolPersonalizado), [arbolPersonalizado]);
  const nivelesConLabel = nivelesAgrupacion.map((k, i) => ({ label: dimensionesDisponibles[k]?.label || k, keys: keysPorNivelPersonalizada[i] || [] }));

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Registro de incidencias</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Historial de ocurrencias por subcontratista: qué pasó, cuándo, y a qué unidades afectó.</div>

          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-[15.5px] font-medium">Incidencias ({sorted.length})</span>
            <div className="flex gap-2">
              <ColumnSelector seleccionadas={columnasExport} onChange={setColumnasExport} columnas={COLUMNAS_QUEJA} />
              <ExportarButton
                onExcel={() => exportQuejasExcel(filtered, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, columnasExport)}
                onPDF={() => exportQuejasPDF(filtered, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null)}
              />
              <Button onClick={() => setShowNew(true)} disabled={soloLectura}><Plus size={14} />Nueva incidencia</Button>
            </div>
          </div>
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={vista === 'contratista' ? 'default' : 'outline'} onClick={() => setVista('contratista')}>Por contratista</Button>
            <Button size="sm" variant={vista === 'personalizada' ? 'default' : 'outline'} onClick={() => setVista('personalizada')}>Agrupación personalizada</Button>
            {vista === 'contratista' && (
              <ExpandCollapseAllButtons onExpandAll={colapsoContratista.expandAll} onCollapseAll={() => colapsoContratista.collapseAll(Object.keys(grouped))} />
            )}
            {vista === 'personalizada' && (
              <ExpandCollapseAllButtons onExpandAll={colapsoPersonalizada.expandAll} onCollapseAll={() => colapsoPersonalizada.collapseAll(todasLasKeysAgrupables(arbolPersonalizado))} />
            )}
            <UnidadSearchBox value={buscadorUnidad} onChange={setBuscadorUnidad} />
            <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
            <Select value={filtroSub} onValueChange={setFiltroSub}>
              <SelectTrigger className="max-w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {vista === 'personalizada' && (
              <AgrupacionConfigButton opciones={OPCIONES_AGRUPACION_INCIDENCIAS} seleccion={nivelesAgrupacion} onChange={setNivelesAgrupacion} />
            )}
          </div>

          {vista === 'personalizada' && nivelesConLabel.length > 0 && (
            <div className="mb-3.5">
              <NivelCollapseControls niveles={nivelesConLabel} onCollapseKeys={colapsoPersonalizada.collapseKeys} onExpandKeys={colapsoPersonalizada.expandKeys} />
            </div>
          )}

          {vista === 'contratista' && (
            <>
              {Object.keys(grouped).length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No hay incidencias registradas.</div>}
              {Object.entries(grouped).map(([subId, list]) => (
                <CollapsibleGroup
                  key={subId}
                  open={!colapsoContratista.isCollapsed(subId)}
                  onToggle={() => colapsoContratista.toggle(subId)}
                  header={
                    <div className="flex items-center gap-2">
                      <SubAvatar name={subName(subId)} id={subId} />
                      <span className="text-sm font-medium">{subName(subId)}</span>
                      <Badge variant="secondary">{list.length} incidencia(s)</Badge>
                    </div>
                  }
                >
                  <IncidenciasTabla list={list} onEdit={setEditing} onRemove={remove} onViewPhotos={setViewPhotos} soloLectura={soloLectura} />
                </CollapsibleGroup>
              ))}
            </>
          )}

          {vista === 'personalizada' && (
            <ArbolAgrupado
              nodos={arbolPersonalizado}
              isCollapsed={colapsoPersonalizada.isCollapsed}
              onToggle={colapsoPersonalizada.toggle}
              renderHoja={(items) => <IncidenciasTabla list={items} onEdit={setEditing} onRemove={remove} onViewPhotos={setViewPhotos} soloLectura={soloLectura} />}
            />
          )}
        </CardContent>
      </Card>

      <ResponsiveDialog open={showNew} onOpenChange={setShowNew} title="Nueva incidencia">
        <QuejaForm subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} preselectSub={filtroSub !== 'todos' ? filtroSub : undefined} onSave={save} onCancel={() => setShowNew(false)} />
      </ResponsiveDialog>

      <ResponsiveDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title="Editar incidencia">
        {editing && <QuejaForm subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </ResponsiveDialog>

      <PhotoViewer photos={viewPhotos} onClose={() => setViewPhotos(null)} title="Fotos / capturas" />
    </div>
  );
}
