import { useEffect, useState, useCallback } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Sidebar } from '@/components/shared/sidebar';
import { Dashboard } from '@/modules/dashboard/dashboard';
import { MaestroSubcontratistas } from '@/modules/maestro/maestro-subcontratistas';
import { PlanificacionSemanal } from '@/modules/planificacion/planificacion-semanal';
import { ValidacionTaller } from '@/modules/validacion/validacion-taller';
import { BitacoraDiaria } from '@/modules/bitacora/bitacora-diaria';
import { QuejasIncidencias } from '@/modules/quejas/quejas-incidencias';
import { EvaluacionSemanal } from '@/modules/evaluacion/evaluacion-semanal';
import { FechasPrometidas } from '@/modules/fechas/fechas-prometidas';
import { CatalogoTalleres } from '@/modules/catalogo/catalogo-talleres';
import { SettingsPage } from '@/modules/settings/settings-page';
import { dbGet, dbSet } from '@/lib/storage';
import { SEED_SUBCONTRATISTAS } from '@/lib/seed-data';
import { mondayOf, todayISO } from '@/lib/utils-app';
import type { Subcontratista, Taller, Validacion, Entrega, RegistroBitacora, Queja, CicloTaller, FechaPrometida, TallerCatalogo, UnidadProyecto, ArchivoImportadoMeta, TabId } from '@/types';

function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<TabId>('dashboard');
  const [semanaActual, setSemanaActual] = useState(mondayOf(todayISO()));

  const [subs, setSubs] = useState<Subcontratista[]>([]);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [validaciones, setValidaciones] = useState<Validacion[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>([]);
  const [quejas, setQuejas] = useState<Queja[]>([]);
  const [ciclos, setCiclos] = useState<CicloTaller[]>([]);
  const [fechas, setFechas] = useState<FechaPrometida[]>([]);
  const [catalogo, setCatalogo] = useState<TallerCatalogo[]>([]);
  const [unidadesProyecto, setUnidadesProyecto] = useState<UnidadProyecto[]>([]);
  const [archivoMeta, setArchivoMeta] = useState<ArchivoImportadoMeta | null>(null);
  const [tallerAbrirId, setTallerAbrirId] = useState<string | null>(null);

  const goToTaller = useCallback((tallerId: string) => {
    setTallerAbrirId(tallerId);
    setTab('validacion');
  }, []);

  const cargarTodo = useCallback(async () => {
    const [s, t, v, e, b, q, c, f, cat, uni, meta] = await Promise.all([
      dbGet<Subcontratista[]>('subcontratistas', []),
      dbGet<Taller[]>('talleres', []),
      dbGet<Validacion[]>('validaciones', []),
      dbGet<Entrega[]>('entregas', []),
      dbGet<RegistroBitacora[]>('bitacora', []),
      dbGet<Queja[]>('quejas', []),
      dbGet<CicloTaller[]>('ciclos_taller', []),
      dbGet<FechaPrometida[]>('fechas_prometidas', []),
      dbGet<TallerCatalogo[]>('catalogo_talleres', []),
      dbGet<UnidadProyecto[]>('unidades_proyecto', []),
      dbGet<ArchivoImportadoMeta | null>('unidades_proyecto_meta', null),
    ]);
    let finalSubs = s;
    if (!s.length) {
      finalSubs = SEED_SUBCONTRATISTAS;
      await dbSet('subcontratistas', finalSubs);
    }
    setSubs(finalSubs);
    setTalleres(t);
    setValidaciones(v);
    setEntregas(e);
    setBitacora(b);
    setQuejas(q);
    setCiclos(c);
    setFechas(f);
    setCatalogo(cat);
    setUnidadesProyecto(uni);
    setArchivoMeta(meta);
    setLoaded(true);
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const showToast = (msg: string) => toast(msg);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Cargando datos...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar tab={tab} onChange={setTab} />
      <main className="flex-1 overflow-x-hidden p-4 md:p-6">
        <div className="mx-auto max-w-[1800px]">
          {tab === 'dashboard' && (
            <Dashboard
              subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} bitacora={bitacora}
              quejas={quejas} fechas={fechas} semanaActual={semanaActual} goTo={setTab}
            />
          )}
          {tab === 'settings' && (
            <SettingsPage
              unidadesProyecto={unidadesProyecto} setUnidadesProyecto={setUnidadesProyecto}
              archivoMeta={archivoMeta} setArchivoMeta={setArchivoMeta}
              onRestored={cargarTodo} showToast={showToast}
            />
          )}
          {tab === 'maestro' && (
            <MaestroSubcontratistas subs={subs} setSubs={setSubs} talleres={talleres} quejas={quejas} showToast={showToast} />
          )}
          {tab === 'catalogo' && (
            <CatalogoTalleres subs={subs} catalogo={catalogo} setCatalogo={setCatalogo} showToast={showToast} />
          )}
          {tab === 'planificacion' && (
            <PlanificacionSemanal
              subs={subs} talleres={talleres} setTalleres={setTalleres}
              validaciones={validaciones} setValidaciones={setValidaciones}
              entregas={entregas} setEntregas={setEntregas}
              semanaActual={semanaActual} setSemanaActual={setSemanaActual}
              showToast={showToast} goTo={setTab} goToTaller={goToTaller} fechas={fechas}
              catalogo={catalogo} setCatalogo={setCatalogo} unidadesProyecto={unidadesProyecto}
            />
          )}
          {tab === 'validacion' && (
            <ValidacionTaller
              subs={subs} talleres={talleres} validaciones={validaciones} setValidaciones={setValidaciones}
              entregas={entregas} setEntregas={setEntregas} semanaActual={semanaActual} showToast={showToast}
              unidadesProyecto={unidadesProyecto}
              tallerAbrirId={tallerAbrirId} onTallerAbierto={() => setTallerAbrirId(null)}
            />
          )}
          {tab === 'bitacora' && (
            <BitacoraDiaria
              subs={subs} talleres={talleres} bitacora={bitacora} setBitacora={setBitacora}
              ciclos={ciclos} setCiclos={setCiclos} quejas={quejas} semanaActual={semanaActual} showToast={showToast}
            />
          )}
          {tab === 'quejas' && (
            <QuejasIncidencias subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} quejas={quejas} setQuejas={setQuejas} showToast={showToast} />
          )}
          {tab === 'fechas' && (
            <FechasPrometidas subs={subs} talleres={talleres} fechas={fechas} setFechas={setFechas} showToast={showToast} unidadesProyecto={unidadesProyecto} />
          )}
          {tab === 'evaluacion' && (
            <EvaluacionSemanal
              subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas}
              bitacora={bitacora} quejas={quejas} ciclos={ciclos} semanaActual={semanaActual} setSemanaActual={setSemanaActual}
              fechas={fechas}
            />
          )}
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
