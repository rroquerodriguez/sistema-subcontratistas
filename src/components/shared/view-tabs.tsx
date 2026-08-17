import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

interface ViewTab<T extends string> {
  value: T;
  label: string;
  icon?: ElementType;
}

interface ViewTabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  tabs: ViewTab<T>[];
}

/** Selector de vista tipo "segmented control": las opciones viven dentro de un solo contenedor
 * con borde, en vez de botones sueltos — deja claro de un vistazo que es una sola decisión
 * excluyente (qué vista estoy mirando), no una lista de acciones independientes. */
export function ViewTabs<T extends string>({ value, onChange, tabs }: ViewTabsProps<T>) {
  return (
    <div className="mb-3 inline-flex flex-wrap gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {Icon && <Icon size={13} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
