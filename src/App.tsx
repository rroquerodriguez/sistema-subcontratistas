import { useEffect, useState, useCallback } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Sidebar } from '@/components/shared/sidebar';
import { LoginPage } from '@/modules/auth/login-page';
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
import { dbGet, dbSet, supabase, clavesNoConfiables, onEscrituraBloqueada } from '@/lib/storage';
import { cargarSesionActual, modulosVisibles, listarPerfiles, type SesionUsuario } from '@/lib/auth';
import { UsuarioActualContext } from '@/lib/usuario-actual-context';
import { SEED_SUBCONTRATISTAS } from '@/lib/seed-data';
import { mondayOf, todayISO } from '@/lib/utils-app';
import type { Subcontratista, Taller, Validacion, Entrega, RegistroBitacora, Queja, CicloTaller, FechaPrometida, TallerCatalogo, UnidadProyecto, ArchivoImportadoMeta, Perfil, TabId } from '@/types';

const ORDEN_MODULOS: TabId[] = ['dashboard', 'maestro', 'catalogo', 'planificacion', 'validacion', 'bitacora', 'quejas', 'fechas', 'evaluacion', 'settings'];

/** Nombres amigables de cada clave de datos, para los avisos de protección anti-borrado */
const NOMBRE_CLAVE: Record<string, string> = {
  subcontratistas: 'Subcontratistas',
  talleres: 'Talleres (Planificación)',
  validaciones: 'Liberaciones',
  entregas: 'Entregas',
  bitacora: 'Bitácora diaria',
  quejas: 'Incidencias',
  ciclos_taller: 'Seguimiento de ciclos',
  fechas_prometidas: 'Fechas prometidas',
  catalogo_talleres: 'Catálogo de talleres',
  unidades_proyecto: 'Unidades del proyecto',
  unidades_proyecto_meta: 'Información del Excel importado',
};
const nombreClave = (k: string) => NOMBRE_CLAVE[k] || k;

function App() {
  const [loaded, setLoaded] = useState(false);
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
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
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [tallerAbrirId, setTallerAbrirId] = useState<string | null>(null);
  const [clavesFallidas, setClavesFallidas] = useState<string[]>([]);
  const [recargando, setRecargando] = useState(false);

  const goToTaller = useCallback((tallerId: string) => {
    setTallerAbrirId(tallerId);
    setTab('validacion');
  }, []);

  const cargarTodo = useCallback(async () => {
    const [s, t, v, e, b, q, c, f, cat, uni, meta, perfs] = await Promise.all([
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
      listarPerfiles(),
    ]);
    const fallidas = clavesNoConfiables();
    let finalSubs = s;
    // El seed inicial solo aplica si la lectura fue EXITOSA y de verdad no hay subcontratistas;
    // si la lectura falló, la lista vacía es un fallback y escribir el seed pisaría los datos reales.
    if (!s.length && !fallidas.includes('subcontratistas')) {
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
    setPerfiles(perfs);
    setClavesFallidas(fallidas);
    setLoaded(true);
  }, []);

  const reintentarCarga = useCallback(async () => {
    setRecargando(true);
    try {
      await cargarTodo();
      if (clavesNoConfiables().length === 0) {
        toast.success('Datos recargados correctamente. Ya puedes guardar con normalidad.');
      } else {
        toast.error('Algunos datos siguen sin poder cargarse. Verifica tu conexión e intenta de nuevo.');
      }
    } finally {
      setRecargando(false);
    }
  }, [cargarTodo]);

  // Aviso inmediato cada vez que la protección anti-borrado bloquea un guardado
  useEffect(() => {
    return onEscrituraBloqueada((key) => {
      toast.error(`No se guardó: los datos de "${nombreClave(key)}" no cargaron bien al abrir la app. Usa "Reintentar carga" en el aviso superior antes de guardar.`, { duration: 8000 });
    });
  }, []);

  useEffect(() => {
    let activo = true;

    const verificar = async () => {
      const s = await cargarSesionActual();
      if (activo) {
        setSesion(s);
        setVerificandoSesion(false);
      }
    };
    verificar();

    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      const s = await cargarSesionActual();
      if (activo) setSesion(s);
    });

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sesion) cargarTodo();
  }, [sesion, cargarTodo]);

  const showToast = (msg: string) => toast(msg);

  if (verificandoSesion) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Verificando sesión...
      </div>
    );
  }

  if (!sesion) {
    return <LoginPage />;
  }

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Cargando datos...
      </div>
    );
  }

  const perfil = sesion.perfil;
  const tabsVisibles = modulosVisibles(perfil, ORDEN_MODULOS);
  // Si el usuario quedó parado en una pestaña a la que ya no tiene acceso (cambio de permisos), lo regresamos al primer módulo visible
  const tabActiva = tabsVisibles.includes(tab) ? tab : (tabsVisibles[0] || 'dashboard');

  return (
    <UsuarioActualContext.Provider value={{
      id: sesion.userId, nombre: perfil.nombre, perfil, perfiles,
      nombrePorId: (id) => perfiles.find((p) => p.id === id)?.nombre || '—',
    }}>
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar tab={tabActiva} onChange={setTab} tabsVisibles={tabsVisibles} usuarioNombre={perfil.nombre} />
      <main className="flex-1 overflow-x-hidden p-4 md:p-6">
        <div className="mx-auto max-w-[1800px]">
          {clavesFallidas.length > 0 && (
            <div className="no-print mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-[13px] leading-relaxed">
                  <strong>Protección de datos activa:</strong> no se pudieron cargar {clavesFallidas.map(nombreClave).join(', ')}.
                  {' '}Para evitar sobrescribir información real con datos incompletos, <strong>el guardado en esos módulos está bloqueado</strong> hasta que la carga se complete. Verifica tu conexión a internet.
                </div>
                <button
                  onClick={reintentarCarga}
                  disabled={recargando}
                  className="rounded-md bg-destructive px-3.5 py-1.5 text-[12.5px] font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {recargando ? 'Recargando…' : 'Reintentar carga'}
                </button>
              </div>
            </div>
          )}
          {tabActiva === 'dashboard' && (
            <Dashboard
              subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} bitacora={bitacora}
              quejas={quejas} fechas={fechas} semanaActual={semanaActual} goTo={setTab}
            />
          )}
          {tabActiva === 'settings' && (
            <SettingsPage
              unidadesProyecto={unidadesProyecto} setUnidadesProyecto={setUnidadesProyecto}
              archivoMeta={archivoMeta} setArchivoMeta={setArchivoMeta}
              onRestored={cargarTodo} showToast={showToast} miPerfil={perfil}
            />
          )}
          {tabActiva === 'maestro' && (
            <MaestroSubcontratistas subs={subs} setSubs={setSubs} talleres={talleres} quejas={quejas} showToast={showToast} />
          )}
          {tabActiva === 'catalogo' && (
            <CatalogoTalleres subs={subs} catalogo={catalogo} setCatalogo={setCatalogo} showToast={showToast} />
          )}
          {tabActiva === 'planificacion' && (
            <PlanificacionSemanal
              subs={subs} talleres={talleres} setTalleres={setTalleres}
              validaciones={validaciones} setValidaciones={setValidaciones}
              entregas={entregas} setEntregas={setEntregas}
              semanaActual={semanaActual} setSemanaActual={setSemanaActual}
              showToast={showToast} goTo={setTab} goToTaller={goToTaller} fechas={fechas}
              catalogo={catalogo} setCatalogo={setCatalogo} unidadesProyecto={unidadesProyecto}
            />
          )}
          {tabActiva === 'validacion' && (
            <ValidacionTaller
              subs={subs} talleres={talleres} validaciones={validaciones} setValidaciones={setValidaciones}
              entregas={entregas} setEntregas={setEntregas} semanaActual={semanaActual} showToast={showToast}
              unidadesProyecto={unidadesProyecto}
              tallerAbrirId={tallerAbrirId} onTallerAbierto={() => setTallerAbrirId(null)}
            />
          )}
          {tabActiva === 'bitacora' && (
            <BitacoraDiaria
              subs={subs} talleres={talleres} bitacora={bitacora} setBitacora={setBitacora}
              ciclos={ciclos} setCiclos={setCiclos} quejas={quejas} semanaActual={semanaActual} showToast={showToast}
            />
          )}
          {tabActiva === 'quejas' && (
            <QuejasIncidencias subs={subs} talleres={talleres} validaciones={validaciones} entregas={entregas} quejas={quejas} setQuejas={setQuejas} showToast={showToast} />
          )}
          {tabActiva === 'fechas' && (
            <FechasPrometidas subs={subs} talleres={talleres} fechas={fechas} setFechas={setFechas} showToast={showToast} unidadesProyecto={unidadesProyecto} />
          )}
          {tabActiva === 'evaluacion' && (
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
    </UsuarioActualContext.Provider>
  );
}

export default App;
