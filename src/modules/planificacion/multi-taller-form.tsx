import { useState } from 'react';
import { Plus, Copy, X, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROYECTOS, DIAS_SEMANA } from '@/lib/seed-data';
import { uid, fmtDate } from '@/lib/utils-app';
import { prioridadPorFechaPromesa, tallerDuplicado } from '@/lib/stats-engine';
import type { Subcontratista, Taller, Proyecto, DiaSemana, Prioridad, TallerCatalogo, UnidadProyecto } from '@/types';

interface MultiRow {
  rowId: string;
  subcontratistaId: string;
  proyecto: Proyecto;
  edificio: string;
  unidad: string;
  esGeneral: boolean;
  actividad: string;
  prioridad: Prioridad;
  dia: DiaSemana;
  tecnico: string;
  inspector: string;
  fechaPromesa: string;
  marcarLiberado: boolean;
}

function emptyRow(): MultiRow {
  return {
    rowId: uid('row'), subcontratistaId: '', proyecto: 'PANORAMA PARK', edificio: '', unidad: '', esGeneral: false, actividad: '',
    prioridad: '2', dia: 'Lunes', tecnico: '', inspector: '', fechaPromesa: '', marcarLiberado: false,
  };
}

interface MultiTallerFormProps {
  subs: Subcontratista[];
  catalogo: TallerCatalogo[];
  unidadesProyecto: UnidadProyecto[];
  talleresExistentes: Taller[];
  onSaveMany: (rows: MultiRow[]) => void;
  onCancel: () => void;
}

export function MultiTallerForm({ subs, catalogo, unidadesProyecto, talleresExistentes, onSaveMany, onCancel }: MultiTallerFormProps) {
  const [rows, setRows] = useState<MultiRow[]>(() => Array.from({ length: 5 }, emptyRow));

  const updRow = <K extends keyof MultiRow>(rowId: string, k: K, v: MultiRow[K]) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [k]: v } : r)));
  const removeRow = (rowId: string) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  const addRows = (n: number) => setRows((prev) => [...prev, ...Array.from({ length: n }, emptyRow)]);
  const duplicateLast = () => setRows((prev) => (prev.length ? [...prev, { ...prev[prev.length - 1], rowId: uid('row') }] : [emptyRow()]));

  const actividadesDe = (subId: string) => catalogo.filter((c) => c.subcontratistaId === subId).map((c) => c.actividad);

  const viviendasUnicas = [...new Set(unidadesProyecto.map((u) => u.edificio).filter(Boolean))];
  const inspectoresUnicos = [...new Set(unidadesProyecto.map((u) => u.inspector).filter(Boolean))];

  const unidadesDeVivienda = (vivienda: string) =>
    unidadesProyecto.filter((u) => !vivienda || u.edificio.toLowerCase() === vivienda.trim().toLowerCase());

  const autocompletarDesdeExcel = (rowId: string, vivienda: string, unidad: string) => {
    const match = unidadesProyecto.find(
      (u) => u.edificio.toLowerCase() === vivienda.trim().toLowerCase() && u.unidad.toLowerCase() === unidad.trim().toLowerCase()
    );
    if (!match) return;
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? {
      ...r,
      tecnico: match.tecnico || r.tecnico,
      inspector: match.inspector || r.inspector,
      fechaPromesa: match.fechaPromesa || r.fechaPromesa,
      prioridad: match.fechaPromesa ? prioridadPorFechaPromesa(match.fechaPromesa) : r.prioridad,
    } : r)));
  };

  const handleViviendaChange = (rowId: string, valor: string) => {
    updRow(rowId, 'edificio', valor);
    const row = rows.find((r) => r.rowId === rowId);
    if (row?.unidad) autocompletarDesdeExcel(rowId, valor, row.unidad);
  };

  const handleUnidadChange = (rowId: string, valor: string) => {
    updRow(rowId, 'unidad', valor);
    const row = rows.find((r) => r.rowId === rowId);
    if (row?.edificio) autocompletarDesdeExcel(rowId, row.edificio, valor);
  };

  /** Al marcar General: limpia unidad/técnico/fecha promesa, ya que no aplican a una unidad específica */
  const toggleGeneral = (rowId: string) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? {
      ...r,
      esGeneral: !r.esGeneral,
      unidad: !r.esGeneral ? '' : r.unidad,
      tecnico: !r.esGeneral ? '' : r.tecnico,
      fechaPromesa: !r.esGeneral ? '' : r.fechaPromesa,
    } : r)));
  };

  const handleSave = () => {
    const valid = rows.filter((r) => r.subcontratistaId && (r.esGeneral ? r.edificio.trim() : r.unidad.trim()));
    if (!valid.length) {
      alert('Completa al menos un taller con subcontratista y unidad (o, si es general, con edificio).');
      return;
    }
    const duplicados = valid.filter((r) => !r.esGeneral && tallerDuplicado(talleresExistentes, r.subcontratistaId, r.edificio, r.unidad));
    if (duplicados.length) {
      const nombresSub = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
      const lista = duplicados.map((r) => `• ${nombresSub(r.subcontratistaId)} — ${r.edificio} ${r.unidad}`).join('\n');
      const continuar = confirm(
        `Ya existe un taller con la misma unidad para este contratista:\n\n${lista}\n\n¿Deseas continuar y crearlo de todas formas?\n\nPresiona "Cancelar" para revisar esas filas (se resaltarán en rojo).`
      );
      if (!continuar) return;
    }
    onSaveMany(valid);
  };

  const esDuplicado = (r: MultiRow) => !r.esGeneral && r.subcontratistaId && r.unidad.trim() && !!tallerDuplicado(talleresExistentes, r.subcontratistaId, r.edificio, r.unidad);

  return (
    <div>
      <div className="mb-3 text-[12.5px] text-muted-foreground">
        Completa las filas que necesites. Cada fila con subcontratista y unidad se guardará como un taller independiente, con su validación de liberación pendiente.
        {unidadesProyecto.length > 0 && ' La Vivienda y la Unidad vienen del reporte de unidades importado en el Dashboard; al elegir ambas se autocompleta técnico, inspector de calidad, fecha promesa y prioridad sugerida (todo editable).'}
        {' Marca "General" cuando la actividad aplique a todo el edificio y no a una unidad específica (ej: pintura de fachada exterior).'}
      </div>
      <div className="space-y-2.5">
        {rows.map((r, idx) => (
          <div key={r.rowId} className={`rounded-lg border p-3 ${esDuplicado(r) ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Taller #{idx + 1}</span>
              <Button size="icon" variant="outline" className="h-7 w-7 flex-shrink-0 text-destructive" onClick={() => removeRow(r.rowId)} aria-label="Quitar fila">
                <X size={13} />
              </Button>
            </div>
            {esDuplicado(r) && (
              <div className="mb-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                <AlertTriangle size={12} />Ya existe un taller con esta unidad para este contratista.
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Subcontratista</label>
                <Select value={r.subcontratistaId} onValueChange={(v) => updRow(r.rowId, 'subcontratistaId', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Proyecto</label>
                <Select value={r.proyecto} onValueChange={(v) => updRow(r.rowId, 'proyecto', v as Proyecto)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROYECTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-medium text-muted-foreground">Edificio / Villa / Townhouse</label>
                  <Button
                    type="button" size="sm" variant={r.esGeneral ? 'default' : 'outline'}
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => toggleGeneral(r.rowId)}
                  >
                    <Building2 size={10} />General
                  </Button>
                </div>
                <Input
                  className="h-9 text-xs" placeholder="Ej: G6, THB5..." value={r.edificio}
                  list={`viviendas-${r.rowId}`}
                  onChange={(e) => handleViviendaChange(r.rowId, e.target.value)}
                />
                <datalist id={`viviendas-${r.rowId}`}>
                  {viviendasUnicas.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Unidad</label>
                {r.esGeneral ? (
                  <Input className="h-9 text-xs" placeholder="No aplica (general)" value="" disabled />
                ) : (
                  <>
                    <Input
                      className="h-9 text-xs" placeholder="Unidad" value={r.unidad}
                      list={`unidades-${r.rowId}`}
                      onChange={(e) => handleUnidadChange(r.rowId, e.target.value)}
                    />
                    <datalist id={`unidades-${r.rowId}`}>
                      {unidadesDeVivienda(r.edificio).map((u) => <option key={u.id} value={u.unidad} />)}
                    </datalist>
                  </>
                )}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10.5px] font-medium text-muted-foreground">Actividad</label>
                <Input
                  className="h-9 text-xs" placeholder="Actividad" value={r.actividad}
                  list={`actividades-${r.rowId}`}
                  onChange={(e) => updRow(r.rowId, 'actividad', e.target.value)}
                />
                <datalist id={`actividades-${r.rowId}`}>
                  {actividadesDe(r.subcontratistaId).map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Prioridad</label>
                <Select value={r.prioridad} onValueChange={(v) => updRow(r.rowId, 'prioridad', v as Prioridad)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Alta</SelectItem>
                    <SelectItem value="2">2 Media</SelectItem>
                    <SelectItem value="3">3 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Día</label>
                <Select value={r.dia} onValueChange={(v) => updRow(r.rowId, 'dia', v as DiaSemana)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{DIAS_SEMANA.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Técnico asignado</label>
                <Input
                  className="h-9 text-xs" placeholder={r.esGeneral ? 'No aplica (general)' : 'Técnico'} value={r.tecnico}
                  disabled={r.esGeneral}
                  onChange={(e) => updRow(r.rowId, 'tecnico', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Inspector de calidad</label>
                <Input
                  className="h-9 text-xs" placeholder={inspectoresUnicos.length ? 'Elegir o escribir...' : 'Inspector'} value={r.inspector}
                  list={`inspectores-${r.rowId}`}
                  onChange={(e) => updRow(r.rowId, 'inspector', e.target.value)}
                />
                <datalist id={`inspectores-${r.rowId}`}>
                  {inspectoresUnicos.map((i) => <option key={i} value={i} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Fecha promesa</label>
                <Input
                  className="h-9 text-xs" type="date" value={r.fechaPromesa}
                  disabled={r.esGeneral}
                  placeholder={r.esGeneral ? 'No aplica (general)' : undefined}
                  onChange={(e) => updRow(r.rowId, 'fechaPromesa', e.target.value)}
                />
                {r.fechaPromesa && !r.esGeneral && <div className="text-[10px] text-muted-foreground">{fmtDate(r.fechaPromesa)}</div>}
              </div>
              <div className="flex items-end">
                <Button
                  type="button" size="sm" variant={r.marcarLiberado ? 'default' : 'outline'}
                  className={r.marcarLiberado ? 'h-9 w-full bg-success hover:bg-success/90' : 'h-9 w-full'}
                  onClick={() => updRow(r.rowId, 'marcarLiberado', !r.marcarLiberado)}
                >
                  <CheckCircle2 size={13} />{r.marcarLiberado ? 'Se marcará liberado' : 'Marcar liberado'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => addRows(1)}><Plus size={13} />1 fila más</Button>
        <Button size="sm" variant="outline" onClick={() => addRows(5)}><Plus size={13} />5 filas más</Button>
        <Button size="sm" variant="outline" onClick={duplicateLast}><Copy size={13} />Duplicar última</Button>
      </div>
      <div className="my-4 border-t border-border" />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>Guardar talleres</Button>
      </div>
    </div>
  );
}

export type { MultiRow };
