import { useRef, useState } from 'react';
import { DatabaseBackup, Download, Upload, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { descargarRespaldo, restaurarRespaldo, respaldoDeSeguridad } from '@/lib/backup';

interface BackupPanelProps {
  onRestored: () => void;
  showToast: (msg: string) => void;
}

export function BackupPanel({ onRestored, showToast }: BackupPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [descargando, setDescargando] = useState(false);
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
  const [restaurando, setRestaurando] = useState(false);

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      await descargarRespaldo();
      showToast('Respaldo descargado');
    } finally {
      setDescargando(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setArchivoPendiente(file);
    e.target.value = '';
  };

  const confirmarRestauracion = async (modo: 'reemplazar' | 'fusionar') => {
    if (!archivoPendiente) return;
    setRestaurando(true);
    try {
      // Respaldo de seguridad automático ANTES de tocar nada: si no se puede generar completo
      // (alguna clave ilegible por mala conexión), se aborta la restauración — restaurar sin red
      // de seguridad y con datos ilegibles es la receta para perder información.
      const seguro = await respaldoDeSeguridad('antes_de_restaurar');
      if (!seguro) {
        showToast('Restauración cancelada: no se pudo generar el respaldo de seguridad previo. Verifica tu conexión e intenta de nuevo.');
        return;
      }
      const resultado = await restaurarRespaldo(archivoPendiente, modo);
      if (resultado.ok) {
        showToast('Datos restaurados correctamente. Se descargó un respaldo de seguridad del estado anterior por si necesitas volver atrás.');
        onRestored();
      } else {
        alert(resultado.mensaje);
      }
    } finally {
      setRestaurando(false);
      setArchivoPendiente(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2 text-title font-medium">
          <DatabaseBackup size={16} />
          Respaldo de datos
        </div>
        <div className="mb-3 text-caption text-muted-foreground">
          Esta app guarda los datos mientras la abras dentro de Claude. Si abres el archivo HTML directamente en tu navegador (fuera de Claude, por ejemplo desde tu carpeta de Descargas), los datos no se guardan de forma permanente y se pueden perder al cerrar la pestaña.
          Descarga un respaldo después de cada sesión de trabajo importante, y úsalo para restaurar tus datos si alguna vez los ves vacíos o desactualizados.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleDescargar} disabled={descargando}>
            <Download size={14} />{descargando ? 'Generando...' : 'Descargar respaldo completo'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={restaurando}>
            <Upload size={14} />Restaurar desde respaldo
          </Button>
          <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        </div>
      </CardContent>

      <Dialog open={!!archivoPendiente} onOpenChange={(o) => !o && setArchivoPendiente(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restaurar respaldo</DialogTitle></DialogHeader>
          <div className="space-y-3 text-body">
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-warning" />
              <div>
                <strong>Reemplazar</strong> borra los datos actuales de cada sección y los sustituye por los del respaldo.
                <br />
                <strong>Fusionar</strong> conserva lo que ya tienes y solo agrega lo que falte del respaldo, sin duplicar registros existentes.
              </div>
            </div>
            <div className="text-muted-foreground">Archivo: {archivoPendiente?.name}</div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setArchivoPendiente(null)}>Cancelar</Button>
            <Button variant="outline" onClick={() => confirmarRestauracion('fusionar')} disabled={restaurando}>Fusionar</Button>
            <Button onClick={() => confirmarRestauracion('reemplazar')} disabled={restaurando}>Reemplazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
