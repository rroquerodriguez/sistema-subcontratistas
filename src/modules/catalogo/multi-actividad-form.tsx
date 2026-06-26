import { useState } from 'react';
import { Plus, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uid } from '@/lib/utils-app';
import type { Subcontratista } from '@/types';

interface MultiActividadRow {
  rowId: string;
  subcontratistaId: string;
  actividad: string;
  notas: string;
}

function emptyRow(preselectSub?: string): MultiActividadRow {
  return { rowId: uid('actrow'), subcontratistaId: preselectSub || '', actividad: '', notas: '' };
}

interface MultiActividadFormProps {
  subs: Subcontratista[];
  preselectSub?: string;
  onSaveMany: (rows: MultiActividadRow[]) => void;
  onCancel: () => void;
}

export function MultiActividadForm({ subs, preselectSub, onSaveMany, onCancel }: MultiActividadFormProps) {
  const [rows, setRows] = useState<MultiActividadRow[]>(() => Array.from({ length: 5 }, () => emptyRow(preselectSub)));

  const updRow = <K extends keyof MultiActividadRow>(rowId: string, k: K, v: MultiActividadRow[K]) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [k]: v } : r)));
  const removeRow = (rowId: string) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  const addRows = (n: number) => setRows((prev) => [...prev, ...Array.from({ length: n }, () => emptyRow(preselectSub))]);
  const duplicateLast = () => setRows((prev) => (prev.length ? [...prev, { ...prev[prev.length - 1], rowId: uid('actrow') }] : [emptyRow(preselectSub)]));

  const handleSave = () => {
    const valid = rows.filter((r) => r.subcontratistaId && r.actividad.trim());
    if (!valid.length) {
      alert('Completa al menos una fila con subcontratista y nombre de actividad.');
      return;
    }
    onSaveMany(valid);
  };

  return (
    <div>
      <div className="mb-3 text-[12.5px] text-muted-foreground">
        Completa las filas que necesites. Cada fila con subcontratista y nombre de actividad se guardará como una entrada independiente del catálogo.
      </div>
      <div className="space-y-2.5">
        {rows.map((r, idx) => (
          <div key={r.rowId} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actividad #{idx + 1}</span>
              <Button size="icon" variant="outline" className="h-7 w-7 flex-shrink-0 text-destructive" onClick={() => removeRow(r.rowId)} aria-label="Quitar fila">
                <X size={13} />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Subcontratista</label>
                <Select value={r.subcontratistaId} onValueChange={(v) => updRow(r.rowId, 'subcontratistaId', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Nombre de la actividad</label>
                <Input className="h-9 text-xs" placeholder="Ej: Instalación de ventanas" value={r.actividad} onChange={(e) => updRow(r.rowId, 'actividad', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-muted-foreground">Notas (opcional)</label>
                <Input className="h-9 text-xs" placeholder="Notas" value={r.notas} onChange={(e) => updRow(r.rowId, 'notas', e.target.value)} />
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
        <Button onClick={handleSave}>Guardar actividades</Button>
      </div>
    </div>
  );
}

export type { MultiActividadRow };
