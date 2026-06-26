import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { SortableTableHead } from '@/components/shared/sortable-table-head';
import { useSortableFilterableTable, type ColumnConfig } from '@/lib/use-sortable-table';
import { MultiActividadForm, type MultiActividadRow } from './multi-actividad-form';
import { dbSet } from '@/lib/storage';
import { uid } from '@/lib/utils-app';
import { descargarPlantillaCatalogo, parsePlantillaCatalogo, exportCatalogoExcel, type FilaCatalogoResultado } from '@/lib/import-catalogo';
import type { Subcontratista, TallerCatalogo } from '@/types';

interface CatalogoTalleresProps {
  subs: Subcontratista[];
  catalogo: TallerCatalogo[];
  setCatalogo: (c: TallerCatalogo[]) => void;
  showToast: (msg: string) => void;
}

function CatalogoTabla({ items, onEdit, onRemove }: { items: TallerCatalogo[]; onEdit: (c: TallerCatalogo) => void; onRemove: (id: string) => void }) {
  const columnas: ColumnConfig<TallerCatalogo>[] = [
    { key: 'actividad', getValue: (c) => c.actividad },
    { key: 'notas', getValue: (c) => c.notas },
  ];
  const { rows, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(items, columnas);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead label="Actividad" columnKey="actividad" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.actividad} onFilterChange={setFilter} />
          <SortableTableHead label="Notas" columnKey="notas" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.notas} onFilterChange={setFilter} />
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.actividad}</TableCell>
            <TableCell className="text-muted-foreground">{c.notas || '—'}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8" onClick={() => onEdit(c)} aria-label="Editar"><Pencil size={14} /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => onRemove(c.id)} aria-label="Eliminar"><Trash2 size={14} /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CatalogoTalleres({ subs, catalogo, setCatalogo, showToast }: CatalogoTalleresProps) {
  const [filtroSub, setFiltroSub] = useState('todos');
  const [showMulti, setShowMulti] = useState(false);
  const [editing, setEditing] = useState<TallerCatalogo | null>(null);
  const [subSel, setSubSel] = useState('');
  const [actividad, setActividad] = useState('');
  const [notas, setNotas] = useState('');
  const [subiendoPlantilla, setSubiendoPlantilla] = useState(false);
  const [previewPlantilla, setPreviewPlantilla] = useState<FilaCatalogoResultado | null>(null);
  const plantillaInputRef = useRef<HTMLInputElement>(null);

  const openEdit = (t: TallerCatalogo) => {
    setEditing(t);
    setSubSel(t.subcontratistaId);
    setActividad(t.actividad);
    setNotas(t.notas);
  };

  const saveMany = async (rows: MultiActividadRow[]) => {
    const nuevas: TallerCatalogo[] = rows.map((r) => ({ id: uid('cat'), subcontratistaId: r.subcontratistaId, actividad: r.actividad.trim(), notas: r.notas }));
    const next = [...catalogo, ...nuevas];
    setCatalogo(next);
    await dbSet('catalogo_talleres', next);
    setShowMulti(false);
    showToast(`${nuevas.length} actividad(es) agregada(s) al catálogo`);
  };

  const handlePlantillaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoPlantilla(true);
    try {
      const resultado = await parsePlantillaCatalogo(file, subs, catalogo);
      setPreviewPlantilla(resultado);
    } catch (err) {
      alert('No se pudo leer el archivo. Verifica que sea la plantilla del catálogo en formato Excel (.xlsx).');
      console.error(err);
    } finally {
      setSubiendoPlantilla(false);
      e.target.value = '';
    }
  };

  const confirmarImportacionPlantilla = async () => {
    if (!previewPlantilla || !previewPlantilla.actividades.length) { setPreviewPlantilla(null); return; }
    const nuevas: TallerCatalogo[] = previewPlantilla.actividades.map((a) => ({ ...a, id: uid('cat') }));
    const next = [...catalogo, ...nuevas];
    setCatalogo(next);
    await dbSet('catalogo_talleres', next);
    showToast(`${nuevas.length} actividad(es) importada(s) al catálogo`);
    setPreviewPlantilla(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!subSel) { alert('Selecciona un subcontratista'); return; }
    if (!actividad.trim()) { alert('Escribe el nombre de la actividad'); return; }
    const item: TallerCatalogo = { ...editing, subcontratistaId: subSel, actividad: actividad.trim(), notas };
    const next = catalogo.map((x) => (x.id === item.id ? item : x));
    setCatalogo(next);
    await dbSet('catalogo_talleres', next);
    setEditing(null);
    showToast('Actividad actualizada');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad del catálogo? No afecta talleres ya planificados.')) return;
    const next = catalogo.filter((x) => x.id !== id);
    setCatalogo(next);
    await dbSet('catalogo_talleres', next);
    showToast('Actividad eliminada del catálogo');
  };

  const filtered = filtroSub === 'todos' ? catalogo : catalogo.filter((c) => c.subcontratistaId === filtroSub);
  const grouped = subs
    .map((s) => ({ sub: s, items: filtered.filter((c) => c.subcontratistaId === s.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Catálogo de talleres</div>
          <div className="mb-4 text-[12px] text-muted-foreground">
            Define las actividades típicas de cada subcontratista. Estas aparecerán como opciones sugeridas al planificar talleres, además de poder escribir una actividad nueva en el momento (que se agrega automáticamente aquí).
          </div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <Select value={filtroSub} onValueChange={setFiltroSub}>
              <SelectTrigger className="h-9 w-[220px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowMulti(true)}><Plus size={14} />Agregar actividades</Button>
              <Button variant="outline" onClick={() => descargarPlantillaCatalogo(subs)}>
                <Download size={14} />Descargar plantilla
              </Button>
              <Button variant="outline" onClick={() => plantillaInputRef.current?.click()} disabled={subiendoPlantilla}>
                <Upload size={14} />{subiendoPlantilla ? 'Leyendo...' : 'Subir plantilla'}
              </Button>
              <input ref={plantillaInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handlePlantillaFile} />
              <Button
                variant="outline"
                onClick={() => exportCatalogoExcel(filtered, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null)}
              >
                <FileSpreadsheet size={14} />Exportar
              </Button>
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay actividades en el catálogo. Agrega las primeras con el botón de arriba, o simplemente escribe una actividad nueva al planificar talleres — se guardará aquí automáticamente.
            </div>
          ) : (
            grouped.map(({ sub, items }) => (
              <CollapsibleGroup
                key={sub.id}
                header={
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SubAvatar name={sub.nombre} id={sub.id} />{sub.nombre}
                    <Badge variant="secondary">{items.length} actividad(es)</Badge>
                  </div>
                }
              >
                <CatalogoTabla items={items} onEdit={openEdit} onRemove={remove} />
              </CollapsibleGroup>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={showMulti} onOpenChange={setShowMulti}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Agregar actividades al catálogo</DialogTitle></DialogHeader>
          <MultiActividadForm subs={subs} preselectSub={filtroSub !== 'todos' ? filtroSub : undefined} onSaveMany={saveMany} onCancel={() => setShowMulti(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar actividad</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Subcontratista</Label>
              <Select value={subSel} onValueChange={setSubSel}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre de la actividad</Label>
              <Input value={actividad} onChange={(e) => setActividad(e.target.value)} placeholder="Ej: Instalación de ventanas" />
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewPlantilla} onOpenChange={(o) => !o && setPreviewPlantilla(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Confirmar importación de plantilla</DialogTitle></DialogHeader>
          {previewPlantilla && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 p-3 text-[13px]">
                Se detectaron <strong>{previewPlantilla.totalFilas}</strong> fila(s) en el archivo, de las cuales <strong>{previewPlantilla.actividades.length}</strong> se importarán al catálogo.
                {previewPlantilla.duplicadas > 0 && <> Se omitieron <strong>{previewPlantilla.duplicadas}</strong> por ya existir.</>}
              </div>
              {previewPlantilla.erroresFila.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[12.5px]">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive"><AlertTriangle size={14} />Filas con errores (no se importarán)</div>
                  <ul className="max-h-[140px] list-disc space-y-0.5 overflow-y-auto pl-4">
                    {previewPlantilla.erroresFila.map((e, i) => <li key={i}>Fila {e.fila}: {e.motivo}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPlantilla(null)}>Cancelar</Button>
            <Button onClick={confirmarImportacionPlantilla} disabled={!previewPlantilla?.actividades.length}>Confirmar importación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

