import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { SubcontratistaForm } from './subcontratista-form';

import { uid } from '@/lib/utils-app';
import { descargarPlantillaMaestro, parsePlantillaMaestro, exportMaestroExcel, type FilaMaestroResultado } from '@/lib/import-maestro';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { puedeEditar } from '@/lib/auth';
import type { Subcontratista, Taller, Queja } from '@/types';
import { persistir } from '@/lib/persistir';

interface MaestroSubcontratistasProps {
  subs: Subcontratista[];
  setSubs: (s: Subcontratista[]) => void;
  talleres: Taller[];
  quejas: Queja[];
  showToast: (msg: string) => void;
}

export function MaestroSubcontratistas({ subs, setSubs, talleres, quejas, showToast }: MaestroSubcontratistasProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'maestro');
  const [editing, setEditing] = useState<Subcontratista | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Subcontratista | null>(null);
  const [q, setQ] = useState('');
  const [subiendoPlantilla, setSubiendoPlantilla] = useState(false);
  const [previewPlantilla, setPreviewPlantilla] = useState<FilaMaestroResultado | null>(null);
  const plantillaInputRef = useRef<HTMLInputElement>(null);

  const save = async (sub: Subcontratista) => {
    const exists = subs.find((s) => s.id === sub.id);
    const next = exists ? subs.map((s) => (s.id === sub.id ? sub : s)) : [...subs, sub];
    setSubs(next);
    if (!(await persistir('subcontratistas', next))) return;
    setEditing(null);
    setShowNew(false);
    showToast(exists ? 'Subcontratista actualizado' : 'Subcontratista agregado');
  };

  const doDelete = async (id: string) => {
    const next = subs.filter((s) => s.id !== id);
    setSubs(next);
    if (!(await persistir('subcontratistas', next))) return;
    setConfirmDelete(null);
    showToast('Subcontratista eliminado');
  };

  const handlePlantillaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoPlantilla(true);
    try {
      const resultado = await parsePlantillaMaestro(file, subs);
      setPreviewPlantilla(resultado);
    } catch (err) {
      alert('No se pudo leer el archivo. Verifica que sea la plantilla del maestro en formato Excel (.xlsx).');
      console.error(err);
    } finally {
      setSubiendoPlantilla(false);
      e.target.value = '';
    }
  };

  const confirmarImportacionPlantilla = async () => {
    if (!previewPlantilla || !previewPlantilla.subcontratistas.length) { setPreviewPlantilla(null); return; }
    const nuevos: Subcontratista[] = previewPlantilla.subcontratistas.map((s) => ({ ...s, id: uid('sub') }));
    const next = [...subs, ...nuevos];
    setSubs(next);
    if (!(await persistir('subcontratistas', next))) return;
    showToast(`${nuevos.length} subcontratista(s) importado(s)`);
    setPreviewPlantilla(null);
  };

  const filtered = subs.filter((s) => (s.nombre + s.especialidad).toLowerCase().includes(q.toLowerCase()));
  const tallerCount = (id: string) => talleres.filter((t) => t.subcontratistaId === id).length;
  const quejaCount = (id: string) => quejas.filter((qq) => qq.subcontratistaId === id).length;

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-title font-medium">
              Maestro de subcontratistas <span className="font-normal text-muted-foreground">({subs.length})</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={descargarPlantillaMaestro}>
                <Download size={14} />Descargar plantilla
              </Button>
              <Button variant="outline" onClick={() => plantillaInputRef.current?.click()} disabled={subiendoPlantilla || soloLectura}>
                <Upload size={14} />{subiendoPlantilla ? 'Leyendo...' : 'Subir plantilla'}
              </Button>
              <input ref={plantillaInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handlePlantillaFile} />
              <Button variant="outline" onClick={() => exportMaestroExcel(subs)}>
                <FileSpreadsheet size={14} />Exportar
              </Button>
              <Button onClick={() => setShowNew(true)} disabled={soloLectura}>
                <Plus size={14} />
                Agregar subcontratista
              </Button>
            </div>
          </div>
          <Input
            placeholder="Buscar subcontratista..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-3.5 max-w-xs"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subcontratista</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Talleres</TableHead>
                <TableHead>Incidencias</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <SubAvatar name={s.nombre} id={s.id} />
                      <span className="font-medium">{s.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>{s.especialidad}</TableCell>
                  <TableCell className="text-xs">
                    {s.contacto || '—'}
                    {s.telefono ? ` · ${s.telefono}` : ''}
                  </TableCell>
                  <TableCell>{tallerCount(s.id)}</TableCell>
                  <TableCell>{quejaCount(s.id) > 0 ? <Badge variant="warning">{quejaCount(s.id)}</Badge> : '0'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button size="sm" variant="outline" className="mr-1.5" onClick={() => setEditing(s)} disabled={soloLectura}>
                      <Pencil size={13} />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDelete(s)} disabled={soloLectura}>
                      <Trash2 size={13} />
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No hay subcontratistas que coincidan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Agregar subcontratista</DialogTitle></DialogHeader>
          <SubcontratistaForm onSave={save} onCancel={() => setShowNew(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar subcontratista</DialogTitle></DialogHeader>
          {editing && <SubcontratistaForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar subcontratista</DialogTitle></DialogHeader>
          <p className="text-body leading-relaxed">
            ¿Seguro que deseas eliminar a <strong>{confirmDelete?.nombre}</strong>? Tiene {confirmDelete ? tallerCount(confirmDelete.id) : 0}{' '}
            taller(es) asociado(s) que permanecerán en el historial pero sin subcontratista vinculado. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && doDelete(confirmDelete.id)}>Eliminar definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewPlantilla} onOpenChange={(o) => !o && setPreviewPlantilla(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Confirmar importación de plantilla</DialogTitle></DialogHeader>
          {previewPlantilla && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 p-3 text-body">
                Se detectaron <strong>{previewPlantilla.totalFilas}</strong> fila(s) en el archivo, de las cuales <strong>{previewPlantilla.subcontratistas.length}</strong> se importarán al maestro.
                {previewPlantilla.duplicados > 0 && <> Se omitieron <strong>{previewPlantilla.duplicados}</strong> por ya existir (mismo nombre).</>}
              </div>
              {previewPlantilla.erroresFila.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-caption">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive"><AlertTriangle size={14} />Filas con errores (no se importarán)</div>
                  <ul className="max-h-[140px] list-disc space-y-0.5 overflow-y-auto pl-4">
                    {previewPlantilla.erroresFila.map((e, i) => <li key={i}>Fila {e.fila}: {e.motivo}</li>)}
                  </ul>
                </div>
              )}
              {previewPlantilla.subcontratistas.length > 0 && (
                <div className="max-h-[160px] overflow-y-auto rounded-md border border-border text-caption">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr><th className="px-2 py-1 text-left">Nombre</th><th className="px-2 py-1 text-left">Especialidad</th></tr>
                    </thead>
                    <tbody>
                      {previewPlantilla.subcontratistas.slice(0, 8).map((s, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1">{s.nombre}</td>
                          <td className="px-2 py-1">{s.especialidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewPlantilla.subcontratistas.length > 8 && <div className="px-2 py-1 text-muted-foreground">… y {previewPlantilla.subcontratistas.length - 8} más</div>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPlantilla(null)}>Cancelar</Button>
            <Button onClick={confirmarImportacionPlantilla} disabled={!previewPlantilla?.subcontratistas.length}>Confirmar importación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
