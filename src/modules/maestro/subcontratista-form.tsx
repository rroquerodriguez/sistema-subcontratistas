import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { uid } from '@/lib/utils-app';
import type { Subcontratista } from '@/types';

interface SubcontratistaFormProps {
  initial?: Subcontratista;
  onSave: (s: Subcontratista) => void;
  onCancel: () => void;
}

export function SubcontratistaForm({ initial, onSave, onCancel }: SubcontratistaFormProps) {
  const [f, setF] = useState<Subcontratista>(
    initial || { id: '', nombre: '', especialidad: '', contacto: '', telefono: '', correo: '', notas: '' }
  );
  const upd = <K extends keyof Subcontratista>(k: K, v: Subcontratista[K]) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Nombre del subcontratista</Label>
        <Input value={f.nombre} onChange={(e) => upd('nombre', e.target.value)} placeholder="Ej: NFT" />
      </div>
      <div className="space-y-1.5">
        <Label>Especialidad</Label>
        <Input value={f.especialidad} onChange={(e) => upd('especialidad', e.target.value)} placeholder="Ej: Ventanas y barandas" />
      </div>
      <div className="space-y-1.5">
        <Label>Contacto principal</Label>
        <Input value={f.contacto} onChange={(e) => upd('contacto', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Teléfono</Label>
        <Input value={f.telefono} onChange={(e) => upd('telefono', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Correo</Label>
        <Input value={f.correo} onChange={(e) => upd('correo', e.target.value)} />
      </div>
      <div />
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Notas / capacidad de personal</Label>
        <Textarea rows={2} value={f.notas} onChange={(e) => upd('notas', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!f.nombre.trim()) { alert('El nombre es obligatorio'); return; }
            onSave({ ...f, id: f.id || uid('sub') });
          }}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
