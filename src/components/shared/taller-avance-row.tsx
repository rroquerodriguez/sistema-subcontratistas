import { useState } from 'react';
import { Pencil, Trash2, Check, X, MessageCircle, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fmtDate, fmtHora, soloFecha } from '@/lib/utils-app';
import { duracionCiclo } from '@/lib/stats-engine';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import type { CicloTaller, EstadoCicloTaller, RegistroBitacora, Taller, Queja } from '@/types';

interface TallerAvanceRowProps {
  taller: Taller;
  ciclo: CicloTaller;
  registro: RegistroBitacora | undefined;
  fechaContexto: string;
  incidencias: Queja[];
  abierto: boolean;
  onToggleAbierto: () => void;
  onChangeCiclo: (ciclo: CicloTaller) => void;
  onUpsertRegistro: (partial: Pick<RegistroBitacora, 'llego' | 'completo' | 'notas' | 'motivo'>) => void;
  soloLectura?: boolean;
}

const ESTADOS: EstadoCicloTaller[] = ['NO INICIADO', 'EN PROCESO', 'COMPLETADO'];
const ESTADO_LABEL: Record<EstadoCicloTaller, string> = { 'NO INICIADO': 'Sin iniciar', 'EN PROCESO': 'En proceso', COMPLETADO: 'Completado' };

function estadoARegistro(estado: EstadoCicloTaller): 'SIN INICIAR' | 'EN PROCESO' | 'COMPLETADO' {
  return estado === 'NO INICIADO' ? 'SIN INICIAR' : estado;
}

/** Fila compacta de un taller dentro de "Avance de talleres": Personal y Estado se marcan
 * directamente en la fila (sin abrir nada), y el detalle (comentarios, fechas) se expande
 * solo al pedirlo — pensado para poder llenar muchos talleres rápido, sin scroll excesivo. */
export function TallerAvanceRow({
  taller, ciclo, registro, fechaContexto, incidencias, abierto, onToggleAbierto,
  onChangeCiclo, onUpsertRegistro, soloLectura,
}: TallerAvanceRowProps) {
  const usuario = useUsuarioActual();
  const [comentarioRapido, setComentarioRapido] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const duracion = duracionCiclo(ciclo);
  const llego = registro?.llego || '';

  const setLlego = (v: 'SI' | 'NO') => {
    if (soloLectura) return;
    const debeIniciar = v === 'SI' && ciclo.estado === 'NO INICIADO';
    const nuevoEstadoCiclo: EstadoCicloTaller = debeIniciar ? 'EN PROCESO' : ciclo.estado;
    if (debeIniciar) onChangeCiclo({ ...ciclo, estado: 'EN PROCESO', fechaInicio: ciclo.fechaInicio || fechaContexto });
    onUpsertRegistro({ llego: v, completo: estadoARegistro(nuevoEstadoCiclo), notas: registro?.notas || '', motivo: registro?.motivo || '' });
  };

  const setEstado = (nuevo: EstadoCicloTaller) => {
    if (soloLectura || nuevo === ciclo.estado) return;
    if (nuevo === 'NO INICIADO' && !confirm('¿Volver este taller a "Sin iniciar"? Se borrarán las fechas de inicio y cierre.')) return;
    if (nuevo === 'COMPLETADO' && !confirm('¿Marcar este taller como completado? Se registrará la fecha de cierre.')) return;
    let next: CicloTaller;
    if (nuevo === 'NO INICIADO') next = { ...ciclo, estado: 'NO INICIADO', fechaInicio: '', fechaCierre: '' };
    else if (nuevo === 'EN PROCESO') next = { ...ciclo, estado: 'EN PROCESO', fechaInicio: ciclo.fechaInicio || fechaContexto, fechaCierre: '' };
    else next = { ...ciclo, estado: 'COMPLETADO', fechaInicio: ciclo.fechaInicio || fechaContexto, fechaCierre: fechaContexto };
    onChangeCiclo(next);
    onUpsertRegistro({ llego: (llego as 'SI' | 'NO' | ''), completo: estadoARegistro(nuevo), notas: registro?.notas || '', motivo: registro?.motivo || '' });
  };

  const agregarComentario = (texto: string) => {
    if (!texto.trim() || soloLectura) return;
    onChangeCiclo({
      ...ciclo,
      comentarios: [...ciclo.comentarios, { fecha: new Date().toISOString(), texto: texto.trim(), autor: usuario.nombre, autorId: usuario.id }],
    });
  };
  const enviarComentarioRapido = () => { agregarComentario(comentarioRapido); setComentarioRapido(''); };

  const startEdit = (idx: number, texto: string) => { setEditingIdx(idx); setEditingText(texto); };
  const saveEdit = (idx: number) => {
    if (!editingText.trim()) return;
    onChangeCiclo({ ...ciclo, comentarios: ciclo.comentarios.map((c, i) => (i === idx ? { ...c, texto: editingText.trim() } : c)) });
    setEditingIdx(null);
  };
  const deleteComentario = (idx: number) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    onChangeCiclo({ ...ciclo, comentarios: ciclo.comentarios.filter((_, i) => i !== idx) });
  };

  const comentariosOrdenados = ciclo.comentarios
    .map((c, idx) => ({ ...c, idx }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-2.5 px-3 py-2">
        <div className="flex min-w-[170px] flex-shrink-0 items-center gap-1 truncate text-caption font-medium">
          {taller.esGeneral ? <Badge variant="secondary">General</Badge> : `${taller.edificio} ${taller.unidad}`}
          <span className="text-muted-foreground">· {taller.actividad}</span>
          {incidencias.length > 0 && <AlertTriangle size={12} className="flex-shrink-0 text-destructive" />}
        </div>

        <button
          type="button" disabled={soloLectura}
          className={cn(
            'relative h-[26px] w-[66px] flex-shrink-0 rounded-full border-0 p-[2px] transition-colors duration-200',
            llego === 'SI' ? 'bg-success/15' : llego === 'NO' ? 'bg-destructive/10' : 'bg-muted'
          )}
          onClick={() => setLlego(llego === 'SI' ? 'NO' : 'SI')}
          aria-label="Alternar personal asignado"
        >
          <span
            className={cn(
              'absolute top-[2px] h-[22px] w-[31px] rounded-full bg-white shadow transition-transform duration-200',
              llego === 'SI' ? 'translate-x-[31px]' : 'translate-x-0'
            )}
          />
          <span className="relative z-10 flex h-full">
            <span className={cn('flex-1 text-center text-[10px] font-bold leading-[22px]', llego === 'NO' ? 'text-destructive' : 'text-muted-foreground/40')}>NO</span>
            <span className={cn('flex-1 text-center text-[10px] font-bold leading-[22px]', llego === 'SI' ? 'text-success' : 'text-muted-foreground/40')}>SI</span>
          </span>
        </button>

        <div className="relative inline-flex h-[26px] w-[168px] flex-shrink-0 rounded-md bg-muted p-[2px]">
          <span
            className={cn(
              'absolute bottom-[2px] top-[2px] rounded shadow transition-transform duration-200',
              ciclo.estado === 'NO INICIADO' ? 'bg-white' : ciclo.estado === 'EN PROCESO' ? 'bg-warning/25' : 'bg-success/25'
            )}
            style={{ width: 'calc(33.33% - 1.33px)', transform: `translateX(${ESTADOS.indexOf(ciclo.estado) * 100}%)` }}
          />
          {ESTADOS.map((e) => (
            <button
              key={e} type="button" disabled={soloLectura}
              className={cn('relative z-10 flex-1 text-[9.5px] font-semibold transition-colors', ciclo.estado === e ? 'text-foreground' : 'text-muted-foreground')}
              onClick={() => setEstado(e)}
            >
              {ESTADO_LABEL[e]}
            </button>
          ))}
        </div>

        {!soloLectura && (
          <div className="flex min-w-[140px] flex-1 items-center gap-1.5">
            <Input
              value={comentarioRapido} onChange={(e) => setComentarioRapido(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enviarComentarioRapido(); } }}
              placeholder="Escribir y enviar..." className="h-[26px] text-caption"
            />
            <Button size="icon" variant="ghost" className="h-[26px] w-[26px] flex-shrink-0" onClick={enviarComentarioRapido} disabled={!comentarioRapido.trim()} aria-label="Enviar comentario">
              <Send size={13} />
            </Button>
          </div>
        )}

        <Button
          size="sm" variant={abierto ? 'default' : 'outline'} className="h-[26px] flex-shrink-0 gap-1 px-2.5 text-[11px]"
          onClick={onToggleAbierto}
        >
          <MessageCircle size={12} />{ciclo.comentarios.length || ''}
        </Button>
      </div>

      {abierto && (
        <div className="border-t border-border bg-muted/20 px-3 py-2.5">
          {incidencias.length > 0 && (
            <div className="mb-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
              <div className="mb-1 flex items-center gap-1.5 text-micro font-semibold text-destructive">
                <AlertTriangle size={12} />Incidencias de este taller ({incidencias.length})
              </div>
              <div className="space-y-1">
                {incidencias.map((q) => (
                  <div key={q.id} className="text-caption text-muted-foreground">
                    <span className="font-medium text-foreground">{q.tipo}</span> — {fmtDate(q.fecha)}{q.descripcion ? `: ${q.descripcion}` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ciclo.fechaInicio && (
            <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-0.5 text-caption text-muted-foreground">
              <span>Inicio: <strong className="text-foreground">{fmtDate(ciclo.fechaInicio)}</strong></span>
              {ciclo.estado === 'COMPLETADO' && ciclo.fechaCierre && <span>Cierre: <strong className="text-foreground">{fmtDate(ciclo.fechaCierre)}</strong></span>}
              {duracion !== null && <span>{ciclo.estado === 'COMPLETADO' ? 'Duración' : 'Lleva'}: <strong className="text-foreground">{duracion} día{duracion === 1 ? '' : 's'}</strong></span>}
            </div>
          )}

          {comentariosOrdenados.length > 0 ? (
            <div className="space-y-1.5">
              {comentariosOrdenados.map(({ fecha, texto, idx, autor }) => (
                <div key={idx} className="rounded-md bg-white px-2.5 py-1.5 text-caption">
                  <div className="mb-0.5 flex items-center justify-between gap-1">
                    <span className="text-micro text-muted-foreground">{fmtDate(soloFecha(fecha))} · {fmtHora(fecha)}{autor ? ` · ${autor}` : ''}</span>
                    {!soloLectura && editingIdx !== idx && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => startEdit(idx, texto)} aria-label="Editar"><Pencil size={11} /></Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => deleteComentario(idx)} aria-label="Eliminar"><Trash2 size={11} /></Button>
                      </div>
                    )}
                  </div>
                  {editingIdx === idx ? (
                    <div className="flex gap-1">
                      <Input className="h-7 text-caption" value={editingText} onChange={(e) => setEditingText(e.target.value)} autoFocus />
                      <Button size="icon" variant="default" className="h-7 w-7" onClick={() => saveEdit(idx)}><Check size={12} /></Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setEditingIdx(null)}><X size={12} /></Button>
                    </div>
                  ) : (
                    <div>{texto}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-caption text-muted-foreground">Sin comentarios todavía.</div>
          )}
        </div>
      )}
    </div>
  );
}
