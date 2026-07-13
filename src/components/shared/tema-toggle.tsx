import { Sun, Moon, Monitor } from 'lucide-react';
import type { Tema } from '@/lib/use-tema';

interface TemaToggleProps {
  tema: Tema;
  onChange: (t: Tema) => void;
  /** 'compacto' para el sidebar (solo íconos); 'completo' para Configuración (íconos + etiqueta) */
  variante?: 'compacto' | 'completo';
}

const OPCIONES: { valor: Tema; label: string; icon: typeof Sun }[] = [
  { valor: 'claro', label: 'Claro', icon: Sun },
  { valor: 'oscuro', label: 'Oscuro', icon: Moon },
  { valor: 'sistema', label: 'Sistema', icon: Monitor },
];

/** Selector de tema (claro / oscuro / según el sistema) como grupo de botones segmentado. */
export function TemaToggle({ tema, onChange, variante = 'completo' }: TemaToggleProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      {OPCIONES.map(({ valor, label, icon: Icon }) => {
        const activo = tema === valor;
        return (
          <button
            key={valor}
            onClick={() => onChange(valor)}
            title={label}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              activo ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            {variante === 'completo' && label}
          </button>
        );
      })}
    </div>
  );
}
