import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ValidacionEditForm } from './validacion-edit-form';
import { EntregaEditForm } from './entrega-edit-form';
import type { Taller, Validacion, Entrega, Subcontratista, UnidadProyecto } from '@/types';

interface GestionTallerModalProps {
  taller: Taller;
  validacion: Validacion;
  entrega?: Entrega;
  sub: Subcontratista | undefined;
  unidadesProyecto: UnidadProyecto[];
  onSaveValidacion: (v: Validacion) => void;
  onSaveEntrega: (e: Entrega) => void;
  onClose: () => void;
  soloLectura?: boolean;
}

export function GestionTallerModal({ taller, validacion, entrega, sub, unidadesProyecto, onSaveValidacion, onSaveEntrega, onClose, soloLectura }: GestionTallerModalProps) {
  const [tab, setTab] = useState<'liberacion' | 'entrega'>('liberacion');
  const liberado = validacion.resultado === 'LISTO';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Gestionar taller</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'liberacion' | 'entrega')}>
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="liberacion">1. Liberación del taller</TabsTrigger>
            <TabsTrigger value="entrega" disabled={!liberado}>2. Entrega del trabajo</TabsTrigger>
          </TabsList>
          <TabsContent value="liberacion">
            <ValidacionEditForm validacion={validacion} taller={taller} sub={sub} unidadesProyecto={unidadesProyecto} onSave={onSaveValidacion} onCancel={onClose} soloLectura={soloLectura} />
          </TabsContent>
          <TabsContent value="entrega">
            {liberado ? (
              <EntregaEditForm entrega={entrega} taller={taller} sub={sub} validacion={validacion} onSave={onSaveEntrega} onCancel={onClose} soloLectura={soloLectura} />
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">Primero debes liberar el taller antes de registrar la entrega.</div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
