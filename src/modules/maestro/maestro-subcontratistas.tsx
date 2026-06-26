import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { SubcontratistaForm } from './subcontratista-form';
import { dbSet } from '@/lib/storage';
import type { Subcontratista, Taller, Queja } from '@/types';

interface MaestroSubcontratistasProps {
  subs: Subcontratista[];
  setSubs: (s: Subcontratista[]) => void;
  talleres: Taller[];
  quejas: Queja[];
  showToast: (msg: string) => void;
}

export function MaestroSubcontratistas({ subs, setSubs, talleres, quejas, showToast }: MaestroSubcontratistasProps) {
  const [editing, setEditing] = useState<Subcontratista | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Subcontratista | null>(null);
  const [q, setQ] = useState('');

  const save = async (sub: Subcontratista) => {
    const exists = subs.find((s) => s.id === sub.id);
    const next = exists ? subs.map((s) => (s.id === sub.id ? sub : s)) : [...subs, sub];
    setSubs(next);
    await dbSet('subcontratistas', next);
    setEditing(null);
    setShowNew(false);
    showToast(exists ? 'Subcontratista actualizado' : 'Subcontratista agregado');
  };

  const doDelete = async (id: string) => {
    const next = subs.filter((s) => s.id !== id);
    setSubs(next);
    await dbSet('subcontratistas', next);
    setConfirmDelete(null);
    showToast('Subcontratista eliminado');
  };

  const filtered = subs.filter((s) => (s.nombre + s.especialidad).toLowerCase().includes(q.toLowerCase()));
  const tallerCount = (id: string) => talleres.filter((t) => t.subcontratistaId === id).length;
  const quejaCount = (id: string) => quejas.filter((qq) => qq.subcontratistaId === id).length;

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <span className="text-[15.5px] font-medium">
              Maestro de subcontratistas <span className="font-normal text-muted-foreground">({subs.length})</span>
            </span>
            <Button onClick={() => setShowNew(true)}>
              <Plus size={14} />
              Agregar subcontratista
            </Button>
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
                    <Button size="sm" variant="outline" className="mr-1.5" onClick={() => setEditing(s)}>
                      <Pencil size={13} />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDelete(s)}>
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
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar subcontratista</DialogTitle></DialogHeader>
          <SubcontratistaForm onSave={save} onCancel={() => setShowNew(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar subcontratista</DialogTitle></DialogHeader>
          {editing && <SubcontratistaForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar subcontratista</DialogTitle></DialogHeader>
          <p className="text-[13.5px] leading-relaxed">
            ¿Seguro que deseas eliminar a <strong>{confirmDelete?.nombre}</strong>? Tiene {confirmDelete ? tallerCount(confirmDelete.id) : 0}{' '}
            taller(es) asociado(s) que permanecerán en el historial pero sin subcontratista vinculado. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && doDelete(confirmDelete.id)}>Eliminar definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
