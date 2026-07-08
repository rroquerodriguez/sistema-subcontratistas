import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { parseReporteUnidades, combinarUnidades, type ImportResultado } from '@/lib/import-unidades';
import { fmtDate, fmtDateTime, nowISODatetime } from '@/lib/utils-app';

import type { UnidadProyecto, ArchivoImportadoMeta } from '@/types';
import { persistir } from '@/lib/persistir';

interface ImportUnidadesPanelProps {
  unidades: UnidadProyecto[];
  setUnidades: (u: UnidadProyecto[]) => void;
  onSaved: (u: UnidadProyecto[]) => Promise<void>;
  archivoMeta: ArchivoImportadoMeta | null;
  setArchivoMeta: (m: ArchivoImportadoMeta | null) => void;
}

export function ImportUnidadesPanel({ unidades, setUnidades, onSaved, archivoMeta, setArchivoMeta }: ImportUnidadesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);
  const [preview, setPreview] = useState<ImportResultado | null>(null);
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCargando(true);
    try {
      const resultado = await parseReporteUnidades(file);
      setPreview(resultado);
      setArchivoPendiente(file);
    } catch (err) {
      alert('No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx).');
      console.error(err);
    } finally {
      setCargando(false);
      e.target.value = '';
    }
  };

  const confirmarImportacion = async () => {
    if (!preview) return;
    const combinadas = combinarUnidades(unidades, preview.unidades);
    setUnidades(combinadas);
    await onSaved(combinadas);

    const meta: ArchivoImportadoMeta = {
      nombreArchivo: archivoPendiente?.name || 'archivo.xlsx',
      subidoEn: nowISODatetime(),
      totalFilas: preview.totalFilas,
      totalImportadas: preview.unidades.length,
    };
    setArchivoMeta(meta);
    if (!(await persistir('unidades_proyecto_meta', meta))) return;

    setPreview(null);
    setArchivoPendiente(null);
  };

  const conFechaPromesa = unidades.filter((u) => u.fechaPromesa).length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2 text-[15.5px] font-medium">
          <FileSpreadsheet size={16} />
          Reporte de unidades del proyecto
        </div>
        <div className="mb-3 text-[12px] text-muted-foreground">
          Sube el Excel de reporte de unidades para que la plataforma tome automáticamente el listado de unidades, técnico asignado, inspector de calidad y fecha promesa. Estos datos alimentan los selectores de unidad en Planificación, Fechas Prometidas y Evaluación, y la fecha promesa sugiere la prioridad (editable).
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{unidades.length} unidad(es) cargada(s)</Badge>
          {unidades.length > 0 && <Badge variant="secondary">{conFechaPromesa} con fecha promesa</Badge>}
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={cargando}>
            <Upload size={14} />{cargando ? 'Leyendo...' : unidades.length ? 'Actualizar con nuevo archivo' : 'Subir reporte de unidades'}
          </Button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>

        {archivoMeta && (
          <div className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
            <Clock size={12} />
            Último archivo subido: <strong className="text-foreground">{archivoMeta.nombreArchivo}</strong> — {fmtDateTime(archivoMeta.subidoEn)} ({archivoMeta.totalImportadas} de {archivoMeta.totalFilas} fila(s) importadas)
          </div>
        )}
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Confirmar importación</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 p-3 text-[13px]">
                Se detectaron <strong>{preview.totalFilas}</strong> fila(s) en el archivo, de las cuales <strong>{preview.unidades.length}</strong> tienen unidad válida y serán importadas.
              </div>
              {preview.advertencias.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[12.5px]">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-warning"><AlertTriangle size={14} />Advertencias</div>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {preview.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              <div className="text-[11.5px] text-muted-foreground">
                Columnas detectadas: {preview.columnasDetectadas.join(', ')}
              </div>
              {preview.unidades.length > 0 && (
                <div className="max-h-[180px] overflow-y-auto rounded-md border border-border text-[11.5px]">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr><th className="px-2 py-1 text-left">Edificio</th><th className="px-2 py-1 text-left">Unidad</th><th className="px-2 py-1 text-left">Técnico</th><th className="px-2 py-1 text-left">F. Promesa</th></tr>
                    </thead>
                    <tbody>
                      {preview.unidades.slice(0, 8).map((u) => (
                        <tr key={u.id} className="border-t border-border">
                          <td className="px-2 py-1">{u.edificio}</td>
                          <td className="px-2 py-1">{u.unidad}</td>
                          <td className="px-2 py-1">{u.tecnico || '—'}</td>
                          <td className="px-2 py-1">{u.fechaPromesa ? fmtDate(u.fechaPromesa) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.unidades.length > 8 && <div className="px-2 py-1 text-muted-foreground">… y {preview.unidades.length - 8} más</div>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button>
            <Button onClick={confirmarImportacion}><CheckCircle2 size={14} />Confirmar importación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
