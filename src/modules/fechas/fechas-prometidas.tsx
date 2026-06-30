import { useState } from 'react';
import { Plus, Pencil, Trash2, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { PhotoViewer } from '@/components/shared/photo-viewer';
import { SortableTableHead } from '@/components/shared/sortable-table-head';
import { useSortableFilterableTable, type ColumnConfig } from '@/lib/use-sortable-table';
import { FechaPrometidaForm } from './fecha-prometida-form';
import { dbSet } from '@/lib/storage';
import { fmtDate, todayISO } from '@/lib/utils-app';
import { diasAtrasoFechaPrometida, estaAtrasada, estaCumplida } from '@/lib/stats-engine';
import { exportFechasExcel, COLUMNAS_FECHA, COLUMNAS_FECHA_DEFAULT } from '@/lib/export-fechas-excel';
import { exportFechasPDF } from '@/lib/export-fechas-pdf';
import { ColumnSelector } from '@/components/shared/column-selector';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { puedeEditar } from '@/lib/auth';
import type { Subcontratista, FechaPrometida, Taller, UnidadProyecto } from '@/types';

interface FechasPrometidasProps {
  subs: Subcontratista[];
  talleres: Taller[];
  fechas: FechaPrometida[];
  setFechas: (f: FechaPrometida[]) => void;
  showToast: (msg: string) => void;
  unidadesProyecto: UnidadProyecto[];
}

type FiltroEstado = 'todos' | 'pendientes' | 'atrasadas' | 'cumplidas';

export function FechasPrometidas({ subs, talleres, fechas, setFechas, showToast, unidadesProyecto }: FechasPrometidasProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'fechas');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<FechaPrometida | null>(null);
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_FECHA_DEFAULT);
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';

  const save = async (fp: FechaPrometida) => {
    const exists = fechas.find((x) => x.id === fp.id);
    const next = exists ? fechas.map((x) => (x.id === fp.id ? fp : x)) : [...fechas, fp];
    setFechas(next);
    await dbSet('fechas_prometidas', next);
    setShowNew(false);
    setEditing(null);
    showToast('Fecha prometida guardada');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const next = fechas.filter((x) => x.id !== id);
    setFechas(next);
    await dbSet('fechas_prometidas', next);
    showToast('Registro eliminado');
  };

  const marcarCumplida = async (fp: FechaPrometida) => {
    await save({ ...fp, fechaCumplida: todayISO() });
  };

  let filtered = filtroSub === 'todos' ? fechas : fechas.filter((f) => f.subcontratistaId === filtroSub);
  if (filtroEstado === 'pendientes') filtered = filtered.filter((f) => !estaCumplida(f));
  if (filtroEstado === 'atrasadas') filtered = filtered.filter((f) => estaAtrasada(f) && !estaCumplida(f));
  if (filtroEstado === 'cumplidas') filtered = filtered.filter((f) => estaCumplida(f));

  const sortedBase = [...filtered].sort((a, b) => a.fechaPrometidaActual.localeCompare(b.fechaPrometidaActual));

  const columnasTabla: ColumnConfig<FechaPrometida>[] = [
    { key: 'subcontratista', getValue: (fp) => subName(fp.subcontratistaId) },
    { key: 'descripcion', getValue: (fp) => fp.descripcion },
    { key: 'unidades', getValue: (fp) => (fp.esGeneral ? 'General' : fp.unidades) },
    { key: 'fechaPrometida', getValue: (fp) => fp.fechaPrometidaActual },
    { key: 'estado', getValue: (fp) => (estaCumplida(fp) ? 'Cumplida' : estaAtrasada(fp) ? 'Atrasada' : 'Pendiente') },
    { key: 'diasAtraso', getValue: (fp) => diasAtrasoFechaPrometida(fp) ?? 0 },
  ];
  const { rows: sorted, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(sortedBase, columnasTabla);

  const totalAtrasadas = fechas.filter((f) => estaAtrasada(f) && !estaCumplida(f)).length;

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Fechas prometidas por contratistas</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Registra los compromisos de fecha que dan los subcontratistas (materiales, entregas) y da seguimiento a su cumplimiento.</div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroSub} onValueChange={setFiltroSub}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-1.5">
                {([
                  { value: 'todos', label: 'Todas' },
                  { value: 'pendientes', label: 'Pendientes' },
                  { value: 'atrasadas', label: `Atrasadas${totalAtrasadas ? ` (${totalAtrasadas})` : ''}` },
                  { value: 'cumplidas', label: 'Cumplidas' },
                ] as { value: FiltroEstado; label: string }[]).map((opt) => (
                  <Button key={opt.value} size="sm" variant={filtroEstado === opt.value ? 'default' : 'outline'} onClick={() => setFiltroEstado(opt.value)}>
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <ColumnSelector seleccionadas={columnasExport} onChange={setColumnasExport} columnas={COLUMNAS_FECHA} />
              <Button variant="outline" onClick={() => exportFechasExcel(filtered, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, columnasExport)}>
                <FileSpreadsheet size={14} />Excel
              </Button>
              <Button variant="outline" onClick={() => exportFechasPDF(filtered, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null)}>
                <FileText size={14} />PDF
              </Button>
              <Button onClick={() => setShowNew(true)} disabled={soloLectura}><Plus size={14} />Nueva fecha</Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Subcontratista" columnKey="subcontratista" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.subcontratista} onFilterChange={setFilter} />
                <SortableTableHead label="Descripción" columnKey="descripcion" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.descripcion} onFilterChange={setFilter} />
                <SortableTableHead label="Unidades" columnKey="unidades" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.unidades} onFilterChange={setFilter} />
                <SortableTableHead label="Fecha prometida" columnKey="fechaPrometida" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
                <SortableTableHead label="Estado" columnKey="estado" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.estado} onFilterChange={setFilter} />
                <SortableTableHead label="Días atraso" columnKey="diasAtraso" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
                <TableHead>Fotos</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((fp) => {
                const dias = diasAtrasoFechaPrometida(fp);
                const cumplida = estaCumplida(fp);
                const atrasada = estaAtrasada(fp);
                return (
                  <TableRow key={fp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <SubAvatar name={subName(fp.subcontratistaId)} id={fp.subcontratistaId} />
                        <span className="font-medium">{subName(fp.subcontratistaId)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px] text-xs">{fp.descripcion}</TableCell>
                    <TableCell>{fp.esGeneral ? <Badge variant="secondary">General</Badge> : (fp.unidades || '—')}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate(fp.fechaPrometidaActual)}
                      {fp.historialFechas.length > 0 && <Badge variant="secondary" className="ml-1.5">cambió {fp.historialFechas.length}x</Badge>}
                    </TableCell>
                    <TableCell>
                      {cumplida ? (
                        <Badge variant="success">Cumplida {fmtDate(fp.fechaCumplida)}</Badge>
                      ) : atrasada ? (
                        <Badge variant="destructive">Atrasada</Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell>{dias !== null && dias > 0 ? <Badge variant={cumplida ? 'secondary' : 'destructive'}>{dias} día{dias === 1 ? '' : 's'}</Badge> : '—'}</TableCell>
                    <TableCell>{fp.fotos?.length ? <Button size="sm" variant="outline" onClick={() => setViewPhotos(fp.fotos)}>{fp.fotos.length} foto(s)</Button> : '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {!cumplida && (
                        <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8 text-success" onClick={() => marcarCumplida(fp)} aria-label="Marcar cumplida">
                          <CheckCircle2 size={14} />
                        </Button>
                      )}
                      <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8" onClick={() => setEditing(fp)} aria-label="Editar" disabled={soloLectura}><Pencil size={14} /></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => remove(fp.id)} aria-label="Eliminar" disabled={soloLectura}><Trash2 size={14} /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!sorted.length && (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No hay fechas prometidas registradas.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nueva fecha prometida</DialogTitle></DialogHeader>
          <FechaPrometidaForm subs={subs} talleres={talleres} unidadesProyecto={unidadesProyecto} preselectSub={filtroSub !== 'todos' ? filtroSub : undefined} onSave={save} onCancel={() => setShowNew(false)} soloLectura={soloLectura} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar fecha prometida</DialogTitle></DialogHeader>
          {editing && <FechaPrometidaForm subs={subs} talleres={talleres} unidadesProyecto={unidadesProyecto} initial={editing} onSave={save} onCancel={() => setEditing(null)} soloLectura={soloLectura} />}
        </DialogContent>
      </Dialog>

      <PhotoViewer photos={viewPhotos} onClose={() => setViewPhotos(null)} title="Fotos de evidencia" />
    </div>
  );
}
