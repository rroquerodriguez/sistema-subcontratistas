import { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, ClipboardCheck, NotebookPen, AlertTriangle, BarChart3, Building2, CalendarClock, ListChecks, Settings, LogOut, MoreHorizontal } from 'lucide-react';
import type { TabId } from '@/types';
import { cn } from '@/lib/utils';
import { cerrarSesion } from '@/lib/auth';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'maestro', label: 'Subcontratistas', icon: Users },
  { id: 'catalogo', label: 'Catálogo de talleres', icon: ListChecks },
  { id: 'planificacion', label: 'Planificación', icon: CalendarDays },
  { id: 'validacion', label: 'Liberación y entrega', icon: ClipboardCheck },
  { id: 'bitacora', label: 'Bitácora diaria', icon: NotebookPen },
  { id: 'quejas', label: 'Incidencias', icon: AlertTriangle },
  { id: 'fechas', label: 'Fechas prometidas', icon: CalendarClock },
  { id: 'evaluacion', label: 'Evaluación', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

/** Módulos de uso diario en campo, que van en la barra inferior de móvil (zona natural del pulgar).
 * El resto queda accesible en el panel "Más". Etiquetas cortas para que quepan en pantalla chica. */
const TABS_MOVIL_PRINCIPALES: { id: TabId; labelCorto: string }[] = [
  { id: 'dashboard', labelCorto: 'Resumen' },
  { id: 'planificacion', labelCorto: 'Plan' },
  { id: 'validacion', labelCorto: 'Liberar' },
  { id: 'bitacora', labelCorto: 'Bitácora' },
];

interface SidebarProps {
  tab: TabId;
  onChange: (t: TabId) => void;
  tabsVisibles?: TabId[];
  usuarioNombre?: string;
}

export function Sidebar({ tab, onChange, tabsVisibles, usuarioNombre }: SidebarProps) {
  const tabsAMostrar = tabsVisibles ? TABS.filter((t) => tabsVisibles.includes(t.id)) : TABS;
  const [sheetAbierto, setSheetAbierto] = useState(false);

  // En móvil: los principales visibles en la barra inferior (solo los permitidos para este usuario)
  const principalesMovil = TABS_MOVIL_PRINCIPALES
    .filter((p) => tabsAMostrar.some((t) => t.id === p.id))
    .map((p) => ({ ...TABS.find((t) => t.id === p.id)!, labelCorto: p.labelCorto }));
  const idsPrincipales = principalesMovil.map((p) => p.id);
  const restoMovil = tabsAMostrar.filter((t) => !idsPrincipales.includes(t.id));
  const activoEnResto = restoMovil.some((t) => t.id === tab);

  const irA = (id: TabId) => {
    onChange(id);
    setSheetAbierto(false);
  };

  return (
    <>
      {/* ESCRITORIO: sidebar lateral clásico (sin cambios) */}
      <aside className="no-print hidden w-[220px] flex-shrink-0 flex-col bg-sidebar-bg p-5 text-sidebar-fg md:flex">
        <div className="px-2.5 pb-5 pt-1">
          <p className="flex items-center gap-2 font-heading text-title font-bold text-white">
            <Building2 size={18} />
            Control de obra
          </p>
          <p className="pl-[26px] text-caption text-sidebar-muted">Panorama Park · Garden</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5">
          {tabsAMostrar.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={cn(
                  'btn-press flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-body font-medium',
                  active ? 'bg-sidebar-active text-white' : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
                )}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </nav>
        {usuarioNombre && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-2 px-2.5 text-caption text-sidebar-muted">{usuarioNombre}</div>
            <button
              onClick={() => cerrarSesion()}
              className="btn-press flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-body font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* MÓVIL: encabezado compacto con identidad y cierre de sesión */}
      <header className="no-print flex items-center justify-between bg-sidebar-bg px-4 py-2.5 text-sidebar-fg md:hidden">
        <p className="flex items-center gap-2 font-heading text-base font-bold text-white">
          <Building2 size={16} />
          Control de obra
        </p>
        {usuarioNombre && (
          <button
            onClick={() => cerrarSesion()}
            title={`Cerrar sesión (${usuarioNombre})`}
            className="btn-press flex items-center gap-1.5 rounded-[10px] border border-white/15 px-2.5 py-1.5 text-caption font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut size={14} />
            {usuarioNombre.split(' ')[0]}
          </button>
        )}
      </header>

      {/* MÓVIL: barra de navegación INFERIOR (zona natural del pulgar), siempre visible */}
      <nav className="nav-material no-print fixed bottom-0 left-0 right-0 z-40 flex pb-[env(safe-area-inset-bottom)] text-sidebar-fg md:hidden">
        {principalesMovil.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'btn-press relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-micro font-medium',
                active ? 'text-white' : 'text-sidebar-muted'
              )}
            >
              <Icon size={19} />
              {t.labelCorto}
              <span
                className={cn(
                  'absolute top-0 h-0.5 w-10 origin-center rounded-b bg-white transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
                  active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                )}
              />
            </button>
          );
        })}
        {restoMovil.length > 0 && (
          <Drawer open={sheetAbierto} onOpenChange={setSheetAbierto}>
            <DrawerTrigger asChild>
              <button
                className={cn(
                  'btn-press relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-micro font-medium',
                  activoEnResto ? 'text-white' : 'text-sidebar-muted'
                )}
              >
                <MoreHorizontal size={19} />
                Más
                <span
                  className={cn(
                    'absolute top-0 h-0.5 w-10 origin-center rounded-b bg-white transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
                    activoEnResto ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                  )}
                />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>Más módulos</DrawerTitle>
              </DrawerHeader>
              <div className="grid grid-cols-2 gap-2 px-4 pb-6">
                {restoMovil.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => irA(t.id)}
                      className={cn(
                        'btn-press flex min-h-[52px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-body font-medium',
                        active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'
                      )}
                    >
                      <Icon size={17} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </nav>
    </>
  );
}
