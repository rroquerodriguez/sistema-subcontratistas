import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhotoUploader } from '@/components/shared/photo-uploader';
import { DiasPill } from '@/components/shared/status-badges';
import { uid, todayISO, diffDays } from '@/lib/utils-app';
import type { Entrega, Taller, Subcontratista, Validacion, Calidad } from '@/types';

interface EntregaEditFormProps {
  entrega?: Entrega;
  taller: Taller;
  sub: Subcontratista | undefined;
  validacion: Validacion | undefined;
  onSave: (e: Entrega) => void;
  onCancel: () => void;
}

export function EntregaEditForm({ entrega, taller, sub, validacion, onSave, onCancel }: EntregaEditFormProps) {
  const [f, setF] = useState<Entrega>(
    entrega || { id: uid('ent'), tallerId: taller.id, estado: 'NO ENTREGADO', fechaEntrega: '', recibidoPor: '', calidad: '', notas: '', fotos: [] }
  );
  const upd = <K extends keyof Entrega>(k: K, v: Entrega[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const diasActuales = validacion?.fecha ? diffDays(validacion.fecha, f.fechaEntrega || todayISO()) : null;

  const calidades: { value: Calidad; label: string }[] = [
    { value: 'BUENA', label: 'Buena' },
    { value: 'CON OBSERVACIONES', label: 'Con observaciones' },
    { value: 'DEFICIENTE', label: 'Deficiente' },
  ];

  return (
    <div>
      <div className="mb-4 rounded-xl bg-success/10 p-3 text-[12.5px]">
        <strong>{sub?.nombre}</strong> — {taller.edificio} {taller.unidad} — {taller.actividad}
        <br />
        Liberado el {validacion?.fecha ? validacion.fecha.split('-').reverse().join('/') : '—'}
      </div>

      <div className="mb-4 space-y-1.5">
        <Label>¿El subcontratista entregó el trabajo?</Label>
        <div className="flex gap-1.5">
          <Button type="button" className="flex-1" variant={f.estado === 'ENTREGADO' ? 'default' : 'outline'} onClick={() => upd('estado', 'ENTREGADO')}>Entregado</Button>
          <Button type="button" className="flex-1" variant={f.estado === 'NO ENTREGADO' ? 'secondary' : 'outline'} onClick={() => upd('estado', 'NO ENTREGADO')}>Sin entregar todavía</Button>
        </div>
      </div>

      {f.estado === 'ENTREGADO' && (
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fecha de entrega</Label>
            <Input type="date" value={f.fechaEntrega} onChange={(e) => upd('fechaEntrega', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Recibido por</Label>
            <Input value={f.recibidoPor} onChange={(e) => upd('recibidoPor', e.target.value)} placeholder="Ingeniero/Supervisor" />
          </div>
        </div>
      )}

      {diasActuales !== null && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Días transcurridos desde la liberación:</span>
          <DiasPill dias={diasActuales} entregado={f.estado === 'ENTREGADO'} />
        </div>
      )}

      <div className="mb-4 space-y-1.5">
        <Label>Calidad del trabajo entregado</Label>
        <div className="flex gap-1.5">
          {calidades.map((c) => (
            <Button key={c.value} type="button" variant={f.calidad === c.value ? (c.value === 'BUENA' ? 'default' : c.value === 'DEFICIENTE' ? 'destructive' : 'secondary') : 'outline'} onClick={() => upd('calidad', c.value)}>
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 space-y-1.5">
        <Label>Notas</Label>
        <Textarea rows={2} value={f.notas} onChange={(e) => upd('notas', e.target.value)} />
      </div>

      <div className="mb-4 space-y-1.5">
        <Label>Fotos de la entrega</Label>
        <PhotoUploader photos={f.fotos} onAdd={(b64) => upd('fotos', [...f.fotos, b64])} onRemove={(i) => upd('fotos', f.fotos.filter((_, idx) => idx !== i))} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => {
            if (f.estado === 'ENTREGADO' && !f.fechaEntrega) { alert('Indica la fecha de entrega'); return; }
            onSave(f);
          }}
        >
          Guardar entrega
        </Button>
      </div>
    </div>
  );
}
