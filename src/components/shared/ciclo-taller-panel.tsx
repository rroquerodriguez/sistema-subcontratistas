import { useMemo, useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fmtDate, fmtHora, soloFecha, todayISO } from '@/lib/utils-app';
import { duracionCiclo } from '@/lib/stats-engine';
import type { CicloTaller, EstadoCicloTaller, RegistroBitacora } from '@/types';

interface CicloTallerPanelProps {
  ciclo: CicloTaller;
  onChange: (ciclo: CicloTaller) => void;
  /** Llamado cada vez que se registra algo que también debe quedar en el registro diario */
  onRegistroDiario?: (partial: Pick<RegistroBitacora, 'llego' | 'completo' | 'notas' | 'motivo'>) => void;
  /** Registro diario de hoy para este taller (si ya existe) */
  registroHoy?: RegistroBitacora;
}

const ESTADO_BADGE: Record<EstadoCicloTaller, 'secondary' | 'warning' | 'success'> = {
  'NO INICIADO': 'secondary',
  'EN PROCESO': 'warning',
  COMPLETADO: 'success',
};

function estadoARegistro(estado: EstadoCicloTaller): 'SIN INICIAR' | 'EN PROCESO' | 'COMPLETADO' {
  if (estado === 'NO INICIADO') return 'SIN INICIAR';
  return estado;
}

export function CicloTallerPanel({ ciclo, onChange, onRegistroDiario, registroHoy }: CicloTallerPanelProps) {
  const [comentario, setComentario] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const duracion = duracionCiclo(ciclo);

  // Asistencia del día de hoy
  const llegHoy = registroHoy?.llego || '';

  const setLlego = (v: 'SI' | 'NO') => {
    // Si asignó personal y el trabajo no estaba iniciado, el taller pasa a "en proceso" de inmediato
    const debeIniciar = v === 'SI' && ciclo.estado === 'NO INICIADO';
    const nuevoEstadoCiclo: EstadoCicloTaller = debeIniciar ? 'EN PROCESO' : ciclo.estado;
    if (debeIniciar) {
      onChange({ ...ciclo, estado: 'EN PROCESO', fechaInicio: ciclo.fechaInicio || todayISO() });
    }
    onRegistroDiario?.({ llego: v, completo: estadoARegistro(nuevoEstadoCiclo), notas: registroHoy?.notas || '', motivo: registroHoy?.motivo || '' });
  };

  const iniciar = () => {
    onChange({ ...ciclo, estado: 'EN PROCESO', fechaInicio: ciclo.fechaInicio || todayISO() });
    onRegistroDiario?.({ llego: llegHoy as 'SI' | 'NO' | '', completo: 'EN PROCESO', notas: registroHoy?.notas || '', motivo: registroHoy?.motivo || '' });
  };
  const completar = () => {
    if (!confirm('¿Marcar este taller como completado? Se registrará la fecha de cierre.')) return;
    onChange({ ...ciclo, estado: 'COMPLETADO', fechaCierre: todayISO() });
    onRegistroDiario?.({ llego: 'SI', completo: 'COMPLETADO', notas: registroHoy?.notas || '', motivo: '' });
  };
  const reabrir = () => {
    onChange({ ...ciclo, estado: 'EN PROCESO', fechaCierre: '' });
    onRegistroDiario?.({ llego: llegHoy as 'SI' | 'NO' | '', completo: 'EN PROCESO', notas: registroHoy?.notas || '', motivo: registroHoy?.motivo || '' });
  };
  const resetear = () => {
    if (!confirm('¿Volver este taller a "No iniciado"? Se borrarán las fechas de inicio.')) return;
    onChange({ ...ciclo, estado: 'NO INICIADO', fechaInicio: '', fechaCierre: '' });
    onRegistroDiario?.({ llego: llegHoy as 'SI' | 'NO' | '', completo: 'SIN INICIAR', notas: registroHoy?.notas || '', motivo: registroHoy?.motivo || '' });
  };

  const agregarComentario = () => {
    if (!comentario.trim()) return;
    onChange({
      ...ciclo,
      comentarios: [...ciclo.comentarios, { fecha: new Date().toISOString(), texto: comentario.trim() }],
    });
    setComentario('');
  };

  const startEdit = (idx: number, texto: string) => { setEditingIdx(idx); setEditingText(texto); };
  const saveEdit = (idx: number) => {
    if (!editingText.trim()) return;
    const next = ciclo.comentarios.map((c, i) => i === idx ? { ...c, texto: editingText.trim() } : c);
    onChange({ ...ciclo, comentarios: next });
    setEditingIdx(null);
  };
  const deleteComentario = (idx: number) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    onChange({ ...ciclo, comentarios: ciclo.comentarios.filter((_, i) => i !== idx) });
  };

  const gruposPorFecha = useMemo(() => {
    const withIdx = ciclo.comentarios.map((c, idx) => ({ ...c, idx }));
    const map = new Map<string, typeof withIdx>();
    withIdx.forEach((c) => {
      const dia = soloFecha(c.fecha);
      if (!map.has(dia)) map.set(dia, []);
      map.get(dia)!.push(c);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dia, items]) => ({ dia, items: items.sort((a, b) => b.fecha.localeCompare(a.fecha)) }));
  }, [ciclo.comentarios]);

  return (
    <div className="rounded-lg border border-border p-3.5">
      {/* Asistencia del día */}
      <div className="mb-3 rounded-md bg-muted/40 p-2.5">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Registro de hoy ({fmtDate(todayISO())})</div>
        <div>
          <div className="mb-1 text-[11px] text-muted-foreground">¿Personal asignado por el subcontratista?</div>
          <div className="flex gap-1">
            <Button size="sm" type="button" variant={llegHoy === 'SI' ? 'default' : 'outline'} className="h-7 px-2 text-xs" onClick={() => setLlego('SI')}>SI</Button>
            <Button size="sm" type="button" variant={llegHoy === 'NO' ? 'destructive' : 'outline'} className="h-7 px-2 text-xs" onClick={() => setLlego('NO')}>NO</Button>
          </div>
        </div>
      </div>

      {/* Estado del ciclo */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estado del trabajo</span>
          <Badge variant={ESTADO_BADGE[ciclo.estado]}>{ciclo.estado}</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ciclo.estado === 'NO INICIADO' && <Button size="sm" onClick={iniciar}>Iniciar</Button>}
          {ciclo.estado === 'EN PROCESO' && <>
            <Button size="sm" onClick={completar}>Completar</Button>
            <Button size="sm" variant="outline" onClick={resetear}>Revertir a No iniciado</Button>
          </>}
          {ciclo.estado === 'COMPLETADO' && <>
            <Button size="sm" variant="outline" onClick={reabrir}>Reabrir</Button>
            <Button size="sm" variant="outline" onClick={resetear}>Resetear</Button>
          </>}
        </div>
      </div>

      {ciclo.fechaInicio && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-muted-foreground">
          <span>Inicio: <strong className="text-foreground">{fmtDate(ciclo.fechaInicio)}</strong></span>
          {ciclo.estado === 'COMPLETADO' && ciclo.fechaCierre && <span>Cierre: <strong className="text-foreground">{fmtDate(ciclo.fechaCierre)}</strong></span>}
          {duracion !== null && <span>{ciclo.estado === 'COMPLETADO' ? 'Duración' : 'Lleva'}: <strong className="text-foreground">{duracion} día{duracion === 1 ? '' : 's'}</strong></span>}
        </div>
      )}

      {/* Comentarios de avance */}
      {ciclo.estado !== 'NO INICIADO' && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Comentarios de avance</div>
          <div className="mb-1.5 flex gap-2">
            <Textarea
              rows={2} placeholder="Agregar comentario de avance..."
              value={comentario} onChange={(e) => setComentario(e.target.value)} className="text-[12.5px]"
            />
            <Button size="sm" className="h-auto" onClick={agregarComentario} disabled={!comentario.trim()}>Agregar</Button>
          </div>
          {gruposPorFecha.length > 0 && (
            <div className="space-y-3">
              {gruposPorFecha.map(({ dia, items }) => (
                <div key={dia}>
                  <div className="mb-1 text-[11px] font-semibold text-foreground">{fmtDate(dia)}{dia === todayISO() ? ' (hoy)' : ''}</div>
                  <div className="space-y-1.5">
                    {items.map(({ fecha, texto, idx }) => (
                      <div key={idx} className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[12px]">
                        <div className="mb-0.5 flex items-center justify-between gap-1">
                          <span className="text-[10.5px] text-muted-foreground">{fmtHora(fecha)}</span>
                          <div className="flex gap-1">
                            {editingIdx !== idx && (
                              <>
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => startEdit(idx, texto)} aria-label="Editar"><Pencil size={11} /></Button>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => deleteComentario(idx)} aria-label="Eliminar"><Trash2 size={11} /></Button>
                              </>
                            )}
                          </div>
                        </div>
                        {editingIdx === idx ? (
                          <div className="flex gap-1">
                            <Input className="h-7 text-[12px]" value={editingText} onChange={(e) => setEditingText(e.target.value)} autoFocus />
                            <Button size="icon" variant="default" className="h-7 w-7" onClick={() => saveEdit(idx)}><Check size={12} /></Button>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setEditingIdx(null)}><X size={12} /></Button>
                          </div>
                        ) : (
                          <div>{texto}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
