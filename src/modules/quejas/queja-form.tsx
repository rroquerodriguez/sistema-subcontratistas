import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUploader } from '@/components/shared/photo-uploader';
import { ProjectFilter } from '@/components/shared/project-filter';
import { TIPOS_QUEJA } from '@/lib/seed-data';
import { uid, todayISO } from '@/lib/utils-app';
import { isTallerCompleto } from '@/lib/stats-engine';
import type { Subcontratista, Queja, Causa, Taller, Validacion, Entrega } from '@/types';

interface QuejaFormProps {
  initial?: Queja;
  subs: Subcontratista[];
  talleres: Taller[];
  validaciones: Validacion[];
  entregas: Entrega[];
  preselectSub?: string;
  onSave: (q: Queja) => void;
  onCancel: () => void;
}

export function QuejaForm({ initial, subs, talleres, validaciones, entregas, preselectSub, onSave, onCancel }: QuejaFormProps) {
  const [f, setF] = useState<Queja>(
    initial || {
      id: '', fecha: todayISO(), subcontratistaId: preselectSub || '', tipo: '', descripcion: '', causa: '',
      unidadesAfectadas: [], esGeneral: false, unidades: '', impactoDias: '', accion: '', fotos: [],
    }
  );
  const [filtroProyectoUnidad, setFiltroProyectoUnidad] = useState('todos');
  const upd = <K extends keyof Queja>(k: K, v: Queja[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const causas: { value: Causa; label: string }[] = [
    { value: 'NUESTRA', label: 'Nuestra' },
    { value: 'DEL SUBCONTRATISTA', label: 'Del subcontratista' },
    { value: 'COMPARTIDA', label: 'Compartida' },
    { value: 'POR DEFINIR', label: 'Por definir' },
  ];

  // Unidades disponibles del contratista seleccionado: solo talleres aún no completados (sin entrega registrada),
  // y opcionalmente filtrados por proyecto para encontrar la unidad más rápido
  const unidadesDisponibles = useMemo(() => {
    if (!f.subcontratistaId) return [];
    const vistos = new Set<string>();
    const list: { key: string; label: string }[] = [];
    talleres
      .filter((t) => t.subcontratistaId === f.subcontratistaId)
      .filter((t) => filtroProyectoUnidad === 'todos' || t.proyecto === filtroProyectoUnidad)
      .filter((t) => !isTallerCompleto(t.id, validaciones, entregas))
      .forEach((t) => {
        const key = `${t.edificio} ${t.unidad}`.trim();
        if (!vistos.has(key)) {
          vistos.add(key);
          list.push({ key, label: `${key}${t.actividad ? ` — ${t.actividad}` : ''}` });
        }
      });
    return list;
  }, [f.subcontratistaId, talleres, validaciones, entregas, filtroProyectoUnidad]);

  const toggleUnidad = (key: string) => {
    setF((prev) => {
      const exists = prev.unidadesAfectadas.includes(key);
      const next = exists ? prev.unidadesAfectadas.filter((u) => u !== key) : [...prev.unidadesAfectadas, key];
      return { ...prev, unidadesAfectadas: next, unidades: next.join(', ') };
    });
  };

  const toggleGeneral = (checked: boolean) => {
    setF((prev) => ({ ...prev, esGeneral: checked, unidadesAfectadas: checked ? [] : prev.unidadesAfectadas, unidades: checked ? 'GENERAL' : '' }));
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={f.fecha} onChange={(e) => upd('fecha', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Subcontratista</Label>
          <Select value={f.subcontratistaId} onValueChange={(v) => { upd('subcontratistaId', v); upd('unidadesAfectadas', []); upd('unidades', ''); }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de incidencia</Label>
          <Select value={f.tipo} onValueChange={(v) => upd('tipo', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>{TIPOS_QUEJA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>¿Causa nuestra o de ellos?</Label>
          <Select value={f.causa} onValueChange={(v) => upd('causa', v as Causa)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>{causas.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Descripción</Label>
        <Textarea rows={3} value={f.descripcion} onChange={(e) => upd('descripcion', e.target.value)} placeholder="Detalle de lo ocurrido" />
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Unidades afectadas</Label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <Checkbox id="esGeneral" checked={f.esGeneral} onCheckedChange={(c) => toggleGeneral(!!c)} />
          <label htmlFor="esGeneral" className="text-[13px]">Marcar como general (afecta todos los talleres de este contratista, no unidades específicas)</label>
        </div>

        {!f.esGeneral && (
          <div className="mt-2">
            {!f.subcontratistaId ? (
              <div className="rounded-md border border-border px-3 py-2 text-[12.5px] text-muted-foreground">Selecciona primero un subcontratista.</div>
            ) : (
              <>
                <div className="mb-2">
                  <ProjectFilter value={filtroProyectoUnidad} onChange={setFiltroProyectoUnidad} className="h-8 w-[180px] text-xs" />
                </div>
                {unidadesDisponibles.length === 0 ? (
                  <div className="rounded-md border border-border px-3 py-2 text-[12.5px] text-muted-foreground">Este subcontratista no tiene talleres pendientes de completar{filtroProyectoUnidad !== 'todos' ? ' en este proyecto' : ''}.</div>
                ) : (
                  <div className="grid max-h-[160px] grid-cols-1 gap-1.5 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
                    {unidadesDisponibles.map((u) => (
                      <div key={u.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`u-${u.key}`}
                          checked={f.unidadesAfectadas.includes(u.key)}
                          onCheckedChange={() => toggleUnidad(u.key)}
                        />
                        <label htmlFor={`u-${u.key}`} className="text-[12.5px]">{u.label}</label>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Impacto (días perdidos est.)</Label>
        <Input type="number" className="max-w-[160px]" value={f.impactoDias} onChange={(e) => upd('impactoDias', e.target.value)} />
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Acción tomada</Label>
        <Textarea rows={2} value={f.accion} onChange={(e) => upd('accion', e.target.value)} />
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Fotos / capturas de mensajes</Label>
        <PhotoUploader photos={f.fotos} onAdd={(b64) => upd('fotos', [...f.fotos, b64])} onRemove={(i) => upd('fotos', f.fotos.filter((_, idx) => idx !== i))} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!f.subcontratistaId) { alert('Selecciona un subcontratista'); return; }
            if (!f.tipo) { alert('Selecciona el tipo de incidencia'); return; }
            onSave({ ...f, id: f.id || uid('que') });
          }}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
