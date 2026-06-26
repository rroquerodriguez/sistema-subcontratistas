import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUploader } from '@/components/shared/photo-uploader';
import { RESPONSABLES } from '@/lib/seed-data';
import { uid, todayISO } from '@/lib/utils-app';
import type { Subcontratista, Taller, RegistroBitacora } from '@/types';

interface BitacoraFormProps {
  initial?: RegistroBitacora;
  subs: Subcontratista[];
  talleres: Taller[];
  onSave: (b: RegistroBitacora) => void;
  onCancel: () => void;
}

export function BitacoraForm({ initial, subs, talleres, onSave, onCancel }: BitacoraFormProps) {
  const [f, setF] = useState<RegistroBitacora>(
    initial || { id: '', fecha: todayISO(), tallerId: '', llego: '', completo: '', motivo: '', responsable: '', accion: '', notas: '', fotos: [] }
  );
  const upd = <K extends keyof RegistroBitacora>(k: K, v: RegistroBitacora[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';

  return (
    <div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={f.fecha} onChange={(e) => upd('fecha', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Taller / unidad</Label>
          <Select value={f.tallerId} onValueChange={(v) => upd('tallerId', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {talleres.map((t) => <SelectItem key={t.id} value={t.id}>{subName(t.subcontratistaId)} — {t.edificio} {t.unidad}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>¿Personal asignado por el subcontratista?</Label>
          <div className="flex gap-1.5">
            <Button type="button" variant={f.llego === 'SI' ? 'default' : 'outline'} onClick={() => upd('llego', 'SI')}>SI</Button>
            <Button type="button" variant={f.llego === 'NO' ? 'destructive' : 'outline'} onClick={() => upd('llego', 'NO')}>NO</Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Estado del trabajo</Label>
          <div className="flex gap-1.5">
            <Button type="button" variant={f.completo === 'SIN INICIAR' ? 'secondary' : 'outline'} onClick={() => upd('completo', 'SIN INICIAR')}>Sin iniciar</Button>
            <Button type="button" variant={f.completo === 'EN PROCESO' ? 'default' : 'outline'} onClick={() => upd('completo', 'EN PROCESO')}>En proceso</Button>
            <Button type="button" variant={f.completo === 'COMPLETADO' ? 'default' : 'outline'} className={f.completo === 'COMPLETADO' ? 'bg-success hover:bg-success/90' : ''} onClick={() => upd('completo', 'COMPLETADO')}>Completado</Button>
          </div>
        </div>
      </div>

      {(f.completo === 'SIN INICIAR' || f.llego === 'NO') && (
        <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Input value={f.motivo} onChange={(e) => upd('motivo', e.target.value)} placeholder="Ej: No trajo personal suficiente" />
          </div>
          <div className="space-y-1.5">
            <Label>Responsable de la causa</Label>
            <Select value={f.responsable} onValueChange={(v) => upd('responsable', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{RESPONSABLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="my-3.5 space-y-1.5">
        <Label>Acción correctiva / siguiente paso</Label>
        <Textarea rows={2} value={f.accion} onChange={(e) => upd('accion', e.target.value)} />
      </div>
      <div className="my-3.5 space-y-1.5">
        <Label>Notas adicionales</Label>
        <Textarea rows={2} value={f.notas} onChange={(e) => upd('notas', e.target.value)} />
      </div>
      <div className="my-3.5 space-y-1.5">
        <Label>Fotos (evidencia, capturas, etc.)</Label>
        <PhotoUploader photos={f.fotos} onAdd={(b64) => upd('fotos', [...f.fotos, b64])} onRemove={(i) => upd('fotos', f.fotos.filter((_, idx) => idx !== i))} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!f.tallerId) { alert('Selecciona un taller'); return; }
            if (!f.llego) { alert('Indica si el subcontratista asignó personal'); return; }
            onSave({ ...f, id: f.id || uid('bit') });
          }}
        >
          Guardar registro
        </Button>
      </div>
    </div>
  );
}
