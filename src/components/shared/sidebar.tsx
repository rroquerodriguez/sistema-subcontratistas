import { LayoutDashboard, Users, CalendarDays, ClipboardCheck, NotebookPen, AlertTriangle, BarChart3, Building2, CalendarClock, ListChecks, Settings, LogOut } from 'lucide-react';
import type { TabId } from '@/types';
import { cn } from '@/lib/utils';
import { cerrarSesion } from '@/lib/auth';

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

interface SidebarProps {
  tab: TabId;
  onChange: (t: TabId) => void;
  tabsVisibles?: TabId[];
  usuarioNombre?: string;
}

export function Sidebar({ tab, onChange, tabsVisibles, usuarioNombre }: SidebarProps) {
  const tabsAMostrar = tabsVisibles ? TABS.filter((t) => tabsVisibles.includes(t.id)) : TABS;
  const primerNombre = usuarioNombre?.split(' ')[0] || '';

  return (
    <aside className="no-print flex w-full flex-shrink-0 flex-row items-center gap-2 bg-sidebar-bg p-3 text-sidebar-fg md:w-[220px] md:flex-col md:items-stretch md:gap-0 md:p-5">
      <div className="hidden px-2.5 pb-5 pt-1 md:block">
        <p className="flex items-center gap-2 font-heading text-[15px] font-bold text-white">
          <Building2 size={18} />
          Control de obra
        </p>
        <p className="pl-[26px] text-[11.5px] text-sidebar-muted">Panorama Park · Garden</p>
      </div>
      <nav className="flex flex-1 gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
        {tabsAMostrar.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex w-auto flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors md:w-full',
                active ? 'bg-sidebar-active text-white' : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
              )}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>
      {/* Cerrar sesión en MÓVIL: anclado a la derecha, siempre visible (fuera de la tira que se
          desliza), con el nombre del usuario conectado — clave en teléfonos compartidos en obra. */}
      {usuarioNombre && (
        <button
          onClick={() => cerrarSesion()}
          title={`Cerrar sesión (${usuarioNombre})`}
          className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-white/15 px-3 py-2.5 text-[12.5px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white md:hidden"
        >
          <LogOut size={15} />
          {primerNombre ? `Salir · ${primerNombre}` : 'Salir'}
        </button>
      )}
      {usuarioNombre && (
        <div className="mt-3 hidden border-t border-white/10 pt-3 md:block">
          <div className="mb-2 px-2.5 text-[12px] text-sidebar-muted">{usuarioNombre}</div>
          <button
            onClick={() => cerrarSesion()}
            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
