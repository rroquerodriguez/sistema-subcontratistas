import { useState } from 'react';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MODULOS_BORRABLES, resetearModulos, respaldoDeSeguridad } from '@/lib/backup';

interface ResetDatosPanelProps {
  onReset: () => void; // recargar datos en memoria tras borrar
  showToast: (msg: string) => void;
}

/** Panel para borrar (resetear) los datos del sistema de forma selectiva por módulo. Está pensado
 * para vaciar la información de prueba antes de arrancar en real, o para limpiar un módulo puntual.
 * Exige doble confirmación (marcar módulos + escribir la palabra BORRAR) porque la acción es
 * destructiva e irreversible; siempre recomienda descargar un respaldo antes. */
export function ResetDatosPanel({ onReset, showToast }: ResetDatosPanelProps) {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState('');
  const [borrando, setBorrando] = useState(false);

  const toggle = (key: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const todosSeleccionados = seleccion.size === MODULOS_BORRABLES.length;
  const toggleTodos = () => {
    setSeleccion(todosSeleccionados ? new Set() : new Set(MODULOS_BORRABLES.map((m) => m.key)));
  };

  const abrirConfirmacion = () => {
    if (seleccion.size === 0) return;
    setTextoConfirmacion('');
    setConfirmando(true);
  };

  const ejecutarBorrado = async () => {
    if (textoConfirmacion.trim().toUpperCase() !== 'BORRAR') return;
    setBorrando(true);
    try {
      // Respaldo de seguridad automático ANTES de borrar: se descarga a la computadora del usuario.
      // Si no se puede generar completo (alguna clave ilegible), se aborta el borrado — sin red de
      // seguridad no se destruye nada.
      const seguro = await respaldoDeSeguridad('antes_de_borrar');
      if (!seguro) {
        showToast('Borrado cancelado: no se pudo generar el respaldo de seguridad previo. Verifica tu conexión e intenta de nuevo.');
        setConfirmando(false);
        return;
      }
      await resetearModulos([...seleccion]);
      const nombres = MODULOS_BORRABLES.filter((m) => seleccion.has(m.key)).map((m) => m.label);
      showToast(`Datos borrados: ${nombres.length} módulo(s). Se descargó un respaldo de seguridad del estado anterior.`);
      setSeleccion(new Set());
      setConfirmando(false);
      onReset();
    } finally {
      setBorrando(false);
    }
  };

  const modulosSeleccionados = MODULOS_BORRABLES.filter((m) => seleccion.has(m.key));

  return (
    <Card className="border-destructive/30">
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2 text-[15.5px] font-medium text-destructive">
          <ShieldAlert size={16} />
          Borrar / resetear datos
        </div>
        <div className="mb-3.5 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[12.5px]">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-destructive" />
          <div>
            Esta sección borra información de forma <strong>permanente</strong>. Úsala para limpiar datos de prueba
            antes de empezar en real, o para vaciar un módulo puntual. Como red de seguridad, <strong>antes de borrar se descargará
            automáticamente un respaldo completo</strong> a tu computadora — guárdalo: es la única forma de recuperar los datos si borras algo por error.
          </div>
        </div>

        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[13px] font-medium">Elige qué módulos borrar</div>
          <Button size="sm" variant="ghost" className="h-7 text-[12px]" onClick={toggleTodos}>
            {todosSeleccionados ? 'Desmarcar todos' : 'Seleccionar todo'}
          </Button>
        </div>

        <div className="space-y-1.5">
          {MODULOS_BORRABLES.map((m) => (
            <label
              key={m.key}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border p-2.5 hover:bg-muted/40"
            >
              <Checkbox checked={seleccion.has(m.key)} onCheckedChange={() => toggle(m.key)} className="mt-0.5" />
              <div>
                <div className="text-[13px] font-medium">{m.label}</div>
                <div className="text-[11.5px] text-muted-foreground">{m.descripcion}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-3.5 flex justify-end">
          <Button variant="destructive" size="sm" disabled={seleccion.size === 0} onClick={abrirConfirmacion}>
            <Trash2 size={14} />Borrar {seleccion.size > 0 ? `${seleccion.size} módulo(s)` : 'seleccionados'}
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmando} onOpenChange={(o) => !o && setConfirmando(false)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Confirmar borrado de datos</DialogTitle></DialogHeader>
          <div className="space-y-3 text-[13px]">
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-destructive" />
              <div>Estás a punto de borrar permanentemente los siguientes módulos. Esta acción <strong>no se puede deshacer</strong>.</div>
            </div>
            <ul className="list-disc space-y-0.5 pl-5">
              {modulosSeleccionados.map((m) => <li key={m.key}>{m.label}</li>)}
            </ul>
            <div>
              <div className="mb-1.5 text-[12.5px] text-muted-foreground">Para confirmar, escribe <strong>BORRAR</strong> en el campo:</div>
              <Input
                value={textoConfirmacion}
                onChange={(e) => setTextoConfirmacion(e.target.value)}
                placeholder="BORRAR"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={textoConfirmacion.trim().toUpperCase() !== 'BORRAR' || borrando}
              onClick={ejecutarBorrado}
            >
              <Trash2 size={14} />{borrando ? 'Borrando...' : 'Borrar definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
