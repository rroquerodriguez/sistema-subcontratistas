import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhotoUploader } from '@/components/shared/photo-uploader';
import { CHECKLIST_ITEMS } from '@/lib/seed-data';
import type { Validacion, Taller, Subcontratista, ChecklistValue, ResultadoValidacion, UnidadProyecto } from '@/types';

interface ValidacionEditFormProps {
  validacion: Validacion;
  taller: Taller;
  sub: Subcontratista | undefined;
  unidadesProyecto: UnidadProyecto[];
  onSave: (v: Validacion) => void;
  onCancel: () => void;
  soloLectura?: boolean;
}

export function ValidacionEditForm({ validacion, taller, sub, unidadesProyecto, onSave, onCancel, soloLectura }: ValidacionEditFormProps) {
  // Si el taller ya trae inspector asignado (del Excel) y todavía no se ha registrado quién valida, se usa como default
  const inspectorPorDefecto = taller.inspector || unidadesProyecto.find(
    (u) => u.edificio.toLowerCase() === taller.edificio.toLowerCase() && u.unidad.toLowerCase() === taller.unidad.toLowerCase()
  )?.inspector || '';
  const [f, setF] = useState<Validacion>({ ...validacion, validadoPor: validacion.validadoPor || inspectorPorDefecto });
  const inspectoresUnicos = [...new Set(unidadesProyecto.map((u) => u.inspector).filter(Boolean))];
  const upd = <K extends keyof Validacion>(k: K, v: Validacion[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const setCheck = (i: number, v: ChecklistValue) => setF((prev) => {
    const c = [...prev.checklist];
    c[i] = v;
    return { ...prev, checklist: c };
  });

  const resultados: { value: ResultadoValidacion; label: string }[] = [
    { value: 'LISTO', label: 'Liberado — puede trabajar' },
    { value: 'NO LISTO', label: 'No liberado' },
    { value: 'PENDIENTE', label: 'Pendiente' },
  ];

  return (
    <div>
      <div className="mb-4 rounded-xl bg-muted/60 p-3">
        <strong>{sub?.nombre}</strong> — {taller.edificio} {taller.unidad} — {taller.actividad} · Día programado: {taller.dia}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha de validación</Label>
          <Input type="date" value={f.fecha} onChange={(e) => upd('fecha', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Validado por (inspector de calidad)</Label>
          <Input value={f.validadoPor} onChange={(e) => upd('validadoPor', e.target.value)} placeholder="Inspector de calidad" list="inspectores-validacion" />
          <datalist id="inspectores-validacion">
            {inspectoresUnicos.map((i) => <option key={i} value={i} />)}
          </datalist>
        </div>
      </div>

      <div className="mb-2 text-sm font-medium">¿El taller está liberado para que el subcontratista trabaje?</div>
      <div className="mb-4 rounded-xl bg-muted/40 px-4 py-1">
        {CHECKLIST_ITEMS.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
            <span className="text-[13px]">{item}</span>
            <div className="flex gap-1">
              {(['SI', 'NO', 'N/A'] as ChecklistValue[]).map((opt) => (
                <Button key={opt} type="button" size="sm" variant={f.checklist[i] === opt ? (opt === 'SI' ? 'default' : opt === 'NO' ? 'destructive' : 'secondary') : 'outline'} onClick={() => setCheck(i, opt)}>
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 space-y-1.5">
        <Label>Resultado de la liberación</Label>
        <div className="flex gap-1.5">
          {resultados.map((r) => (
            <Button key={r.value} type="button" className="flex-1" variant={f.resultado === r.value ? (r.value === 'LISTO' ? 'default' : r.value === 'NO LISTO' ? 'destructive' : 'secondary') : 'outline'} onClick={() => upd('resultado', r.value)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 space-y-1.5">
        <Label>Observaciones</Label>
        <Textarea rows={2} value={f.observaciones} onChange={(e) => upd('observaciones', e.target.value)} placeholder="Obstáculo encontrado y fecha estimada de solución, si aplica" />
      </div>

      <div className="mb-4 space-y-1.5">
        <Label>Fotos de evidencia</Label>
        <PhotoUploader photos={f.fotos} onAdd={(b64) => upd('fotos', [...f.fotos, b64])} onRemove={(i) => upd('fotos', f.fotos.filter((_, idx) => idx !== i))} />
      </div>

      {soloLectura && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          Tienes acceso de solo lectura a este módulo. Puedes ver la información, pero no guardar cambios.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(f)} disabled={soloLectura}>Guardar liberación</Button>
      </div>
    </div>
  );
}
