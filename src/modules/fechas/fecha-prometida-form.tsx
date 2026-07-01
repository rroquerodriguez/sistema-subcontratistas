import { useState } from 'react';
import { Plus, X, CalendarClock, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PhotoUploader } from '@/components/shared/photo-uploader';
import { uid, todayISO, nowISODatetime, fmtDate, fmtHora, soloFecha } from '@/lib/utils-app';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { diasAtrasoFechaPrometida, diasAtrasoOriginal, fechaPrometidaOriginal, vecesReprogramada } from '@/lib/stats-engine';
import type { Subcontratista, FechaPrometida, Taller, UnidadFechaPrometida, UnidadProyecto } from '@/types';

interface FechaPrometidaFormProps {
  initial?: FechaPrometida;
  subs: Subcontratista[];
  talleres: Taller[];
  unidadesProyecto: UnidadProyecto[];
  preselectSub?: string;
  onSave: (fp: FechaPrometida) => void;
  onCancel: () => void;
  soloLectura?: boolean;
}

function unidadKey(u: UnidadFechaPrometida): string {
  return `${u.edificio} ${u.unidad}`.trim();
}

export function FechaPrometidaForm({ initial, subs, unidadesProyecto, preselectSub, onSave, onCancel, soloLectura }: FechaPrometidaFormProps) {
  const usuario = useUsuarioActual();
  const esEdicion = !!initial;
  const [f, setF] = useState<FechaPrometida>(
    initial || {
      id: '', subcontratistaId: preselectSub || '', descripcion: '', unidadesAfectadas: [], esGeneral: false,
      unidades: '', fechaPrometidaActual: todayISO(), fechaCumplida: '', historialFechas: [], comentarios: [], notas: '', fotos: [],
    }
  );
  const [edificioNuevo, setEdificioNuevo] = useState('');
  const [unidadNueva, setUnidadNueva] = useState('');
  const unidadesDeVivienda = unidadesProyecto.filter(
    (u) => !edificioNuevo || u.edificio.toLowerCase() === edificioNuevo.trim().toLowerCase()
  );
  const [showModificarFecha, setShowModificarFecha] = useState(false);
  const [nuevaFechaTmp, setNuevaFechaTmp] = useState('');
  const [motivoCambio, setMotivoCambio] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');

  const upd = <K extends keyof FechaPrometida>(k: K, v: FechaPrometida[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const agregarComentario = () => {
    const texto = nuevoComentario.trim();
    if (!texto) return;
    const nuevo = { fecha: nowISODatetime(), texto, autor: usuario.nombre, autorId: usuario.id };
    setF((prev) => ({ ...prev, comentarios: [...prev.comentarios, nuevo] }));
    setNuevoComentario('');
  };

  const comentariosPorFecha = () => {
    const grupos = new Map<string, { fecha: string; texto: string; autor?: string; autorId?: string }[]>();
    [...f.comentarios].sort((a, b) => b.fecha.localeCompare(a.fecha)).forEach((c) => {
      const dia = soloFecha(c.fecha);
      if (!grupos.has(dia)) grupos.set(dia, []);
      grupos.get(dia)!.push(c);
    });
    return [...grupos.entries()];
  };

  const sincronizarUnidadesTexto = (lista: UnidadFechaPrometida[]) => lista.map(unidadKey).join(', ');

  const agregarUnidad = () => {
    const unidad = unidadNueva.trim();
    if (!unidad) return;
    const matchProyecto = unidadesProyecto.find((u) => u.unidad.toLowerCase() === unidad.toLowerCase());
    const edificio = edificioNuevo.trim() || matchProyecto?.edificio || '';
    const nueva: UnidadFechaPrometida = { edificio, unidad };
    const yaExiste = f.unidadesAfectadas.some((u) => u.edificio === edificio && u.unidad === unidad);
    if (yaExiste) return;
    const next = [...f.unidadesAfectadas, nueva];
    upd('unidadesAfectadas', next);
    upd('unidades', sincronizarUnidadesTexto(next));
    setEdificioNuevo('');
    setUnidadNueva('');
  };

  const quitarUnidad = (idx: number) => {
    const next = f.unidadesAfectadas.filter((_, i) => i !== idx);
    upd('unidadesAfectadas', next);
    upd('unidades', sincronizarUnidadesTexto(next));
  };

  const toggleGeneral = (checked: boolean) => {
    setF((prev) => ({ ...prev, esGeneral: checked, unidadesAfectadas: checked ? [] : prev.unidadesAfectadas, unidades: checked ? 'GENERAL' : '' }));
  };

  const abrirModificarFecha = () => {
    setNuevaFechaTmp(f.fechaPrometidaActual);
    setMotivoCambio('');
    setShowModificarFecha(true);
  };

  const confirmarModificarFecha = () => {
    if (!nuevaFechaTmp) return;
    if (nuevaFechaTmp === f.fechaPrometidaActual) { setShowModificarFecha(false); return; }
    const cambio = { fecha: f.fechaPrometidaActual, registradoEn: nowISODatetime(), motivo: motivoCambio.trim() };
    setF((prev) => ({ ...prev, fechaPrometidaActual: nuevaFechaTmp, historialFechas: [...prev.historialFechas, cambio] }));
    setShowModificarFecha(false);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Subcontratista</Label>
          <Select value={f.subcontratistaId} onValueChange={(v) => upd('subcontratistaId', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descripción de lo prometido</Label>
          <Textarea rows={2} value={f.descripcion} onChange={(e) => upd('descripcion', e.target.value)} placeholder="Ej: Entrega de ventanas para edificio G6" />
        </div>
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Fecha prometida</Label>
        {esEdicion ? (
          <div className="flex items-center gap-2.5">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[13.5px] font-medium">
              {f.fechaPrometidaActual || 'Sin definir'}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={abrirModificarFecha}>
              <CalendarClock size={13} />Modificar fecha
            </Button>
          </div>
        ) : (
          <Input type="date" value={f.fechaPrometidaActual} onChange={(e) => upd('fechaPrometidaActual', e.target.value)} className="max-w-[220px]" />
        )}
      </div>

      <div className="my-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha de cumplimiento (si ya se cumplió)</Label>
          <Input type="date" value={f.fechaCumplida} onChange={(e) => upd('fechaCumplida', e.target.value)} />
        </div>
        {f.fechaCumplida && (
          <div className="flex items-end">
            <Button type="button" variant="outline" size="sm" onClick={() => upd('fechaCumplida', '')}>
              <X size={13} />Quitar fecha de cumplimiento
            </Button>
          </div>
        )}
      </div>

      {f.historialFechas.length > 0 && (
        <div className="my-3.5 rounded-md border border-border bg-muted/30 p-2.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span>
              Compromiso original: <strong>{fmtDate(fechaPrometidaOriginal(f))}</strong>
            </span>
            <span className="text-muted-foreground">·</span>
            <span>
              Atraso desde el original: <strong className="text-destructive">{diasAtrasoOriginal(f) ?? 0} día(s)</strong>
            </span>
            <span className="text-muted-foreground">·</span>
            <span>
              Atraso vs. promesa vigente: <strong>{diasAtrasoFechaPrometida(f) ?? 0} día(s)</strong>
            </span>
            <span className="text-muted-foreground">·</span>
            <span>Reprogramada {vecesReprogramada(f)}x</span>
          </div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Historial de cambios de fecha</div>
          <div className="space-y-1">
            {[...f.historialFechas].reverse().map((c, i) => (
              <div key={i} className="text-[12px]">
                Antes prometida para <strong>{c.fecha}</strong>{c.motivo ? ` — ${c.motivo}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {esEdicion && (
        <div className="my-3.5 space-y-1.5">
          <Label>Comentarios de seguimiento</Label>
          <div className="flex gap-1.5">
            <Input
              placeholder="Ej: Contratista confirma despacho para el lunes"
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarComentario(); } }}
            />
            <Button type="button" variant="outline" onClick={agregarComentario} disabled={soloLectura}><MessageSquarePlus size={14} />Agregar</Button>
          </div>
          {f.comentarios.length > 0 && (
            <div className="mt-2 max-h-[220px] space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-2.5">
              {comentariosPorFecha().map(([dia, items]) => (
                <div key={dia}>
                  <div className="mb-1 text-[11px] font-semibold text-foreground">{fmtDate(dia)}</div>
                  <div className="space-y-1">
                    {items.map((c, i) => (
                      <div key={i} className="rounded-md bg-card px-2.5 py-1.5 text-[12px]">
                        <span className="text-[10.5px] text-muted-foreground">{fmtHora(c.fecha)}{c.autor ? ` · ${c.autor}` : ''}</span> — {c.texto}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="my-3.5 space-y-1.5">
        <Label>Unidades afectadas</Label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <Checkbox id="esGeneralFp" checked={f.esGeneral} onCheckedChange={(c) => toggleGeneral(!!c)} />
          <label htmlFor="esGeneralFp" className="text-[13px]">Marcar como general (afecta todos los talleres de este contratista; el campo Edificio puede quedar como "General" si aplica a todo un edificio)</label>
        </div>

        {!f.esGeneral && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Edificio / Tipo (ej: G6, THB5, o General)"
                value={edificioNuevo}
                list="edificios-proyecto-fp"
                onChange={(e) => setEdificioNuevo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarUnidad(); } }}
              />
              <datalist id="edificios-proyecto-fp">
                {[...new Set(unidadesProyecto.map((u) => u.edificio).filter(Boolean))].map((v) => <option key={v} value={v} />)}
              </datalist>
              <Input
                placeholder="Unidad (ej: 101)"
                value={unidadNueva}
                list="unidades-proyecto-fp"
                onChange={(e) => setUnidadNueva(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarUnidad(); } }}
              />
              <datalist id="unidades-proyecto-fp">
                {unidadesDeVivienda.map((u) => <option key={u.id} value={u.unidad} />)}
              </datalist>
              <Button type="button" variant="outline" onClick={agregarUnidad}><Plus size={14} />Agregar</Button>
            </div>
            {f.unidadesAfectadas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {f.unidadesAfectadas.map((u, idx) => (
                  <span key={idx} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[12px]">
                    {unidadKey(u)}
                    <button onClick={() => quitarUnidad(idx)} aria-label="Quitar">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Fotos de evidencia del compromiso</Label>
        <PhotoUploader photos={f.fotos} onAdd={(b64) => upd('fotos', [...f.fotos, b64])} onRemove={(i) => upd('fotos', f.fotos.filter((_, idx) => idx !== i))} />
      </div>

      <div className="my-3.5 space-y-1.5">
        <Label>Notas</Label>
        <Textarea rows={2} value={f.notas} onChange={(e) => upd('notas', e.target.value)} />
      </div>

      {soloLectura && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          Tienes acceso de solo lectura a este módulo. Puedes ver la información, pero no guardar cambios.
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          disabled={soloLectura}
          onClick={() => {
            if (!f.subcontratistaId) { alert('Selecciona un subcontratista'); return; }
            if (!f.descripcion.trim()) { alert('Describe qué se prometió'); return; }
            if (!f.fechaPrometidaActual) { alert('Indica la fecha prometida'); return; }
            onSave({ ...f, id: f.id || uid('fp') });
          }}
        >
          Guardar
        </Button>
      </div>

      <Dialog open={showModificarFecha} onOpenChange={setShowModificarFecha}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modificar fecha prometida</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nueva fecha prometida</Label>
              <Input type="date" value={nuevaFechaTmp} onChange={(e) => setNuevaFechaTmp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo del cambio (opcional)</Label>
              <Textarea rows={2} value={motivoCambio} onChange={(e) => setMotivoCambio(e.target.value)} placeholder="Ej: El proveedor retrasó el envío" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModificarFecha(false)}>Cancelar</Button>
            <Button onClick={confirmarModificarFecha}>Confirmar cambio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
