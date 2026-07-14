import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROYECTOS, DIAS_SEMANA } from '@/lib/seed-data';
import { uid, fmtDate, fechaDeISODia } from '@/lib/utils-app';
import { prioridadPorFechaPromesa } from '@/lib/stats-engine';
import { sumarDiasLaborables } from '@/lib/calendario-laboral';
import type { Subcontratista, Taller, Proyecto, DiaSemana, Prioridad, TallerCatalogo, UnidadProyecto, CalendarioLaboral } from '@/types';

interface TallerFormProps {
  initial?: Taller;
  subs: Subcontratista[];
  catalogo: TallerCatalogo[];
  unidadesProyecto: UnidadProyecto[];
  calendario: CalendarioLaboral;
  onSave: (t: Taller) => void;
  onCancel: () => void;
}

export function TallerForm({ initial, subs, catalogo, unidadesProyecto, calendario, onSave, onCancel }: TallerFormProps) {
  const [f, setF] = useState<Taller>(
    initial || {
      id: '', semana: '', subcontratistaId: '', proyecto: 'PANORAMA PARK', edificio: '', unidad: '', esGeneral: false,
      actividad: '', prioridad: '2', dia: 'Lunes', tecnico: '', inspector: '', fechaPromesa: '', observaciones: '',
    }
  );
  const upd = <K extends keyof Taller>(k: K, v: Taller[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const actividadesSugeridas = catalogo.filter((c) => c.subcontratistaId === f.subcontratistaId).map((c) => c.actividad);

  // Estándar de la actividad elegida (si está en el catálogo del subcontratista y tiene duración)
  const estandarActividad = catalogo.find(
    (c) => c.subcontratistaId === f.subcontratistaId && c.actividad.trim().toLowerCase() === f.actividad.trim().toLowerCase() && c.duracionEstandarDias != null
  );
  // Fecha de conclusión esperada = fecha del taller (día planificado) + duración estándar + holgura,
  // contada en días laborables. Es una sugerencia orientativa, no se guarda.
  const fechaTaller = f.semana && f.dia ? fechaDeISODia(f.semana, f.dia) : '';
  const fechaEsperada = estandarActividad && fechaTaller
    ? sumarDiasLaborables(fechaTaller, (estandarActividad.duracionEstandarDias || 0) + (estandarActividad.holguraDias || 0), calendario)
    : '';

  const viviendasUnicas = [...new Set(unidadesProyecto.map((u) => u.edificio).filter(Boolean))];
  const inspectoresUnicos = [...new Set(unidadesProyecto.map((u) => u.inspector).filter(Boolean))];
  const unidadesDeVivienda = unidadesProyecto.filter(
    (u) => !f.edificio || u.edificio.toLowerCase() === f.edificio.trim().toLowerCase()
  );

  const autocompletarDesdeExcel = (vivienda: string, unidad: string) => {
    const match = unidadesProyecto.find(
      (u) => u.edificio.toLowerCase() === vivienda.trim().toLowerCase() && u.unidad.toLowerCase() === unidad.trim().toLowerCase()
    );
    if (!match) return;
    const v = (match.proyecto || '').trim().toUpperCase();
    const proyectoNormalizado: Proyecto | null = !v ? null
      : (PROYECTOS.find((p) => p.toUpperCase() === v) as Proyecto | undefined)
      || (v.includes('PARK') ? 'PANORAMA PARK' : v.includes('GARDEN') ? 'PANORAMA GARDEN' : null);
    setF((prev) => ({
      ...prev,
      proyecto: proyectoNormalizado || prev.proyecto,
      tecnico: match.tecnico || prev.tecnico,
      inspector: match.inspector || prev.inspector,
      fechaPromesa: match.fechaPromesa || prev.fechaPromesa,
      prioridad: match.fechaPromesa ? prioridadPorFechaPromesa(match.fechaPromesa) : prev.prioridad,
    }));
  };

  /** Al marcar General: limpia unidad/técnico/fecha promesa, ya que no aplican a una unidad específica */
  const toggleGeneral = () => {
    setF((prev) => ({
      ...prev,
      esGeneral: !prev.esGeneral,
      unidad: !prev.esGeneral ? '' : prev.unidad,
      tecnico: !prev.esGeneral ? '' : prev.tecnico,
      fechaPromesa: !prev.esGeneral ? '' : prev.fechaPromesa,
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Subcontratista</Label>
        <Select value={f.subcontratistaId} onValueChange={(v) => upd('subcontratistaId', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Proyecto</Label>
        <Select value={f.proyecto} onValueChange={(v) => upd('proyecto', v as Proyecto)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PROYECTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Edificio / Villa / Townhouse</Label>
          <Button type="button" size="sm" variant={f.esGeneral ? 'default' : 'outline'} className="h-6 px-2 text-micro" onClick={toggleGeneral}>
            <Building2 size={11} />General
          </Button>
        </div>
        <Input
          value={f.edificio}
          onChange={(e) => { upd('edificio', e.target.value); if (f.unidad) autocompletarDesdeExcel(e.target.value, f.unidad); }}
          placeholder="Ej: G6, THB5, TIPO A"
          list="viviendas-taller-form"
        />
        <datalist id="viviendas-taller-form">
          {viviendasUnicas.map((v) => <option key={v} value={v} />)}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <Label>Unidad</Label>
        {f.esGeneral ? (
          <Input value="" placeholder="No aplica (general)" disabled />
        ) : (
          <>
            <Input
              value={f.unidad}
              onChange={(e) => { upd('unidad', e.target.value); if (f.edificio) autocompletarDesdeExcel(f.edificio, e.target.value); }}
              placeholder="Ej: 101"
              list="unidades-taller-form"
            />
            <datalist id="unidades-taller-form">
              {unidadesDeVivienda.map((u) => <option key={u.id} value={u.unidad} />)}
            </datalist>
          </>
        )}
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Actividad / Taller</Label>
        <Input value={f.actividad} onChange={(e) => upd('actividad', e.target.value)} placeholder="Ej: Instalación de ventanas" list="actividades-taller-form" />
        <datalist id="actividades-taller-form">
          {actividadesSugeridas.map((a) => <option key={a} value={a} />)}
        </datalist>
        {estandarActividad && (
          <div className="mt-1 text-micro text-muted-foreground">
            Estándar: {estandarActividad.duracionEstandarDias} día(s) laborable(s){!!estandarActividad.holguraDias && ` +${estandarActividad.holguraDias} holgura`}.
            {fechaEsperada && <> Conclusión esperada: <strong>{fmtDate(fechaEsperada)}</strong> (desde el día planificado).</>}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Prioridad</Label>
        <Select value={f.prioridad} onValueChange={(v) => upd('prioridad', v as Prioridad)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 - Alta</SelectItem>
            <SelectItem value="2">2 - Media</SelectItem>
            <SelectItem value="3">3 - Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Día programado</Label>
        <Select value={f.dia} onValueChange={(v) => upd('dia', v as DiaSemana)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{DIAS_SEMANA.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Técnico asignado</Label>
        <Input value={f.tecnico} placeholder={f.esGeneral ? 'No aplica (general)' : undefined} disabled={f.esGeneral} onChange={(e) => upd('tecnico', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Inspector de calidad</Label>
        <Input value={f.inspector} placeholder={inspectoresUnicos.length ? 'Elegir o escribir...' : undefined} list="inspectores-taller-form" onChange={(e) => upd('inspector', e.target.value)} />
        <datalist id="inspectores-taller-form">
          {inspectoresUnicos.map((i) => <option key={i} value={i} />)}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <Label>Fecha promesa</Label>
        <Input type="date" value={f.fechaPromesa} disabled={f.esGeneral} placeholder={f.esGeneral ? 'No aplica (general)' : undefined} onChange={(e) => upd('fechaPromesa', e.target.value)} />
        {f.fechaPromesa && !f.esGeneral && <div className="text-micro text-muted-foreground">{fmtDate(f.fechaPromesa)}</div>}
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Observaciones</Label>
        <Textarea rows={2} value={f.observaciones} onChange={(e) => upd('observaciones', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!f.subcontratistaId) { alert('Selecciona un subcontratista'); return; }
            if (!f.esGeneral && !f.unidad.trim()) { alert('La unidad es obligatoria (o marca "General" si aplica a todo el edificio)'); return; }
            if (f.esGeneral && !f.edificio.trim()) { alert('Indica el edificio al que aplica esta actividad general'); return; }
            onSave({ ...f, id: f.id || uid('tal') });
          }}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
