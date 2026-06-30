import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImportUnidadesPanel } from '@/components/shared/import-unidades-panel';
import { BackupPanel } from '@/components/shared/backup-panel';
import { dbSet } from '@/lib/storage';
import type { UnidadProyecto, ArchivoImportadoMeta } from '@/types';

interface SettingsPageProps {
  unidadesProyecto: UnidadProyecto[];
  setUnidadesProyecto: (u: UnidadProyecto[]) => void;
  archivoMeta: ArchivoImportadoMeta | null;
  setArchivoMeta: (m: ArchivoImportadoMeta | null) => void;
  onRestored: () => void;
  showToast: (msg: string) => void;
}

export function SettingsPage({ unidadesProyecto, setUnidadesProyecto, archivoMeta, setArchivoMeta, onRestored, showToast }: SettingsPageProps) {
  const guardarUnidades = async (u: UnidadProyecto[]) => {
    await dbSet('unidades_proyecto', u);
  };

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Configuración</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Datos generales del sistema, información del proyecto, y respaldo de información.</div>

          <Tabs defaultValue="general">
            <TabsList className="mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="datos">Datos del proyecto</TabsTrigger>
              <TabsTrigger value="respaldo">Respaldo</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="mb-1 text-[13.5px] font-medium">Sistema de Subcontratistas</div>
                  <div className="text-[12.5px] text-muted-foreground">
                    Gestión de unidad de entrega — Panorama Park y Panorama Garden. Esta sección reúne la configuración general del sistema:
                    datos del proyecto, el archivo de unidades importado, y el respaldo de toda la información.
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="datos">
              <ImportUnidadesPanel
                unidades={unidadesProyecto}
                setUnidades={setUnidadesProyecto}
                onSaved={guardarUnidades}
                archivoMeta={archivoMeta}
                setArchivoMeta={setArchivoMeta}
              />
            </TabsContent>

            <TabsContent value="respaldo">
              <BackupPanel onRestored={onRestored} showToast={showToast} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
