import { LayoutDashboard, Users, CalendarDays, ClipboardCheck, NotebookPen, AlertTriangle, BarChart3, Building2, CalendarClock, ListChecks } from 'lucide-react';
import type { TabId } from '@/types';
import { cn } from '@/lib/utils';

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
];

interface SidebarProps {
  tab: TabId;
  onChange: (t: TabId) => void;
}

export function Sidebar({ tab, onChange }: SidebarProps) {
  return (
    <aside className="no-print w-full flex-shrink-0 bg-sidebar-bg p-3 text-sidebar-fg md:w-[220px] md:p-5">
      <div className="hidden px-2.5 pb-5 pt-1 md:block">
        <p className="flex items-center gap-2 font-heading text-[15px] font-bold text-white">
          <Building2 size={18} />
          Control de obra
        </p>
        <p className="pl-[26px] text-[11.5px] text-sidebar-muted">Panorama Park · Garden</p>
      </div>
      <nav className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
        {TABS.map((t) => {
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
    </aside>
  );
}
