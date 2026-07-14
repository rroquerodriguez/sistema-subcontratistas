import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { resumenDiasLaborables } from '@/lib/calendario-laboral';
import type { Subcontratista, TallerCatalogo, CalendarioLaboral } from '@/types';

interface EstandaresLoteFormProps {
  subs: Subcontratista[];
  catalogo: TallerCatalogo[];
  calendario: CalendarioLaboral;
  onGuardar: (cambios: Record<string, { duracion?: number; holgura?: number }>) => void;
  onCancel: () => void;
}

interface FilaEdit { duracion: string; holgura: string }

/** Editor por lote de estándares de tiempo: muestra todas las actividades del catálogo (filtrables
 * por subcontratista) en una tabla para asignar duración estándar y holgura de corrido, sin abrir
 * cada actividad una por una. Ideal para cargar los estándares iniciales de golpe. */
export function EstandaresLoteForm({ subs, catalogo, calendario, onGuardar, onCancel }: EstandaresLoteFormProps) {
  const [filtroSub, setFiltroSub] = useState('todos');
  const [ediciones, setEdiciones] = useState<Record<string, FilaEdit>>(() =>
    Object.fromEntries(catalogo.map((c) => [c.id, {
      duracion: c.duracionEstandarDias != null ? String(c.duracionEstandarDias) : '',
      holgura: c.holguraDias != null ? String(c.holguraDias) : '',
    }]))
  );

  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const visibles = useMemo(
    () => (filtroSub === 'todos' ? catalogo : catalogo.filter((c) => c.subcontratistaId === filtroSub))
      .slice().sort((a, b) => subName(a.subcontratistaId).localeCompare(subName(b.subcontratistaId)) || a.actividad.localeCompare(b.actividad)),
    [catalogo, filtroSub]
  );

  const set = (id: string, campo: keyof FilaEdit, valor: string) => {
    setEdiciones((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  };

  const guardar = () => {
    const cambios: Record<string, { duracion?: number; holgura?: number }> = {};
    for (const c of catalogo) {
      const e = ediciones[c.id];
      if (!e) continue;
      const dur = e.duracion.trim() === '' ? undefined : Math.max(0, Math.round(Number(e.duracion)));
      const holg = e.holgura.trim() === '' ? undefined : Math.max(0, Math.round(Number(e.holgura)));
      // Ignorar valores inválidos (NaN) o duración 0: se tratan como "sin definir"
      const durValida = dur !== undefined && !isNaN(dur) && dur > 0 ? dur : undefined;
      cambios[c.id] = { duracion: durValida, holgura: durValida !== undefined ? (holg ?? 0) : undefined };
    }
    onGuardar(cambios);
  };

  return (
    <div className="space-y-3">
      <p className="text-caption leading-relaxed text-muted-foreground">
        Asigna la duración estándar (en días laborables: {resumenDiasLaborables(calendario)}) que debería tomar cada
        actividad desde que se libera la unidad. Deja en blanco las que aún no quieras definir. La holgura es un colchón
        opcional sobre el estándar.
      </p>

      <Select value={filtroSub} onValueChange={setFiltroSub}>
        <SelectTrigger className="h-9 w-[240px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los subcontratistas</SelectItem>
          {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="max-h-[52vh] overflow-y-auto rounded-md border border-border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Subcontratista</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead className="w-[130px]">Duración (días)</TableHead>
              <TableHead className="w-[120px]">Holgura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap text-caption">
                  <span className="flex items-center gap-1.5"><SubAvatar name={subName(c.subcontratistaId)} id={c.subcontratistaId} />{subName(c.subcontratistaId)}</span>
                </TableCell>
                <TableCell className="text-body font-medium">{c.actividad}</TableCell>
                <TableCell>
                  <Input type="number" min={0} className="h-8" value={ediciones[c.id]?.duracion ?? ''} onChange={(e) => set(c.id, 'duracion', e.target.value)} placeholder="—" />
                </TableCell>
                <TableCell>
                  <Input type="number" min={0} className="h-8" value={ediciones[c.id]?.holgura ?? ''} onChange={(e) => set(c.id, 'holgura', e.target.value)} placeholder="0" disabled={(ediciones[c.id]?.duracion ?? '').trim() === ''} />
                </TableCell>
              </TableRow>
            ))}
            {visibles.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No hay actividades para mostrar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={guardar}>Guardar estándares</Button>
      </div>
    </div>
  );
}
