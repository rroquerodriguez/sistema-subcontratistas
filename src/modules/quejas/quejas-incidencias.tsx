import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { PhotoViewer } from '@/components/shared/photo-viewer';
import { ProjectFilter } from '@/components/shared/project-filter';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { SortableTableHead } from '@/components/shared/sortable-table-head';
import { useSortableFilterableTable, type ColumnConfig } from '@/lib/use-sortable-table';
import { QuejaForm } from './queja-form';
import { dbSet } from '@/lib/storage';
import { fmtDate } from '@/lib/utils-app';
import { exportQuejasExcel, COLUMNAS_QUEJA, COLUMNAS_QUEJA_DEFAULT } from '@/lib/export-quejas-excel';
import { exportQuejasPDF } from '@/lib/export-quejas-pdf';
import { ColumnSelector } from '@/components/shared/column-selector';
import type { Subcontratista, Queja, Taller, Validacion, Entrega } from '@/types';

interface QuejasIncidenciasProps {
  subs: Subcontratista[];
  talleres: Taller[];
  validaciones: Validacion[];
  entregas: Entrega[];
  quejas: Queja[];
  setQuejas: (q: Queja[]) => void;
  showToast: (msg: string) => void;
}

function IncidenciasTabla({ list, onEdit, onRemove, onViewPhotos }: { list: Queja[]; onEdit: (q: Queja) => void; onRemove: (id: string) => void; onViewPhotos: (fotos: string[]) => void }) {
  const columnas: ColumnConfig<Queja>[] = [
    { key: 'fecha', getValue: (q) => q.fecha },
    { key: 'tipo', getValue: (q) => q.tipo },
    { key: 'descripcion', getValue: (q) => q.descripcion },
    { key: 'causa', getValue: (q) => q.causa },
    { key: 'unidades', getValue: (q) => (q.esGeneral ? 'General' : q.unidades) },
  ];
  const { rows, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(list, columnas);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead label="Fecha" columnKey="fecha" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Tipo" columnKey="tipo" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.tipo} onFilterChange={setFilter} />
          <SortableTableHead label="Descripción" columnKey="descripcion" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.descripcion} onFilterChange={setFilter} />
          <SortableTableHead label="Causa" columnKey="causa" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.causa} onFilterChange={setFilter} />
          <SortableTableHead label="Unidades" columnKey="unidades" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.unidades} onFilterChange={setFilter} />
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
            <TableCell>{q.fotos.length ? <Button size="sm" variant="outline" onClick={() => onViewPhotos(q.fotos)}>{q.fotos.length} foto(s)</Button> : '—'}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8" onClick={() => onEdit(q)} aria-label="Editar"><Pencil size={14} /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => onRemove(q.id)} aria-label="Eliminar"><Trash2 size={14} /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function QuejasIncidencias({ subs, talleres, validaciones, entregas, quejas, setQuejas, showToast }: QuejasIncidenciasProps) {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Queja | null>(null);
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_QUEJA_DEFAULT);
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';

  const save = async (q: Queja) => {
    const existing = quejas.find((x) => x.id === q.id);
    const next = existing ? quejas.map((x) => (x.id === q.id ? q : x)) : [...quejas, q];
    setQuejas(next);
    await dbSet('quejas', next);
    setShowNew(false);
    setEditing(null);
    showToast('Incidencia guardada');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta incidencia?')) return;
    const next = quejas.filter((x) => x.id !== id);
    setQuejas(next);
    await dbSet('quejas', next);
    showToast('Incidencia eliminada');
  };

  let filtered = filtroSub === 'todos' ? quejas : quejas.filter((q) => q.subcontratistaId === filtroSub);
  if (filtroProyecto !== 'todos') {
    const tallerIdsDelProyecto = new Set(talleres.filter((t) => t.proyecto === filtroProyecto).map((t) => `${t.edificio} ${t.unidad}`.trim()));
    filtered = filtered.filter((q) => q.esGeneral || q.unidadesAfectadas.some((u) => tallerIdsDelProyecto.has(u)));
  }
  const sorted = [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const grouped = useMemo(() => {
    const map: Record<string, Queja[]> = {};
    sorted.forEach((q) => { (map[q.subcontratistaId] = map[q.subcontratistaId] || []).push(q); });
    return map;
  }, [sorted]);

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
              <Button
                variant="outline"
                onClick={() => exportQuejasExcel(filtered, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, columnasExport)}
              >
                <FileSpreadsheet size={14} />Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => exportQuejasPDF(filtered, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null)}
              >
                <FileText size={14} />PDF
              </Button>
              <Button onClick={() => setShowNew(true)}><Plus size={14} />Nueva incidencia</Button>
            </div>
          </div>
          <div className="mb-3.5 flex flex-wrap gap-2">
            <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
            <Select value={filtroSub} onValueChange={setFiltroSub}>
              <SelectTrigger className="max-w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {Object.keys(grouped).length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No hay incidencias registradas.</div>}

          {Object.entries(grouped).map(([subId, list]) => (
            <CollapsibleGroup
              key={subId}
              header={
                <div className="flex items-center gap-2">
                  <SubAvatar name={subName(subId)} id={subId} />
                  <span className="text-sm font-medium">{subName(subId)}</span>
                  <Badge variant="secondary">{list.length} incidencia(s)</Badge>
                </div>
              }
            >
              <IncidenciasTabla list={list} onEdit={setEditing} onRemove={remove} onViewPhotos={setViewPhotos} />
            </CollapsibleGroup>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nueva incidencia</DialogTitle></DialogHeader>
          <QuejaForm subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} preselectSub={filtroSub !== 'todos' ? filtroSub : undefined} onSave={save} onCancel={() => setShowNew(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar incidencia</DialogTitle></DialogHeader>
          {editing && <QuejaForm subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <PhotoViewer photos={viewPhotos} onClose={() => setViewPhotos(null)} title="Fotos / capturas" />
    </div>
  );
}
