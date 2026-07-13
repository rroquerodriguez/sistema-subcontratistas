import type { ReactNode } from 'react';

interface TarjetaMovilProps {
  /** Punto de color de estado (semáforo), opcional */
  semaforo?: 'verde' | 'ambar' | 'rojo' | 'gris';
  /** Línea principal: lo que identifica el registro (ej. "G6 201") */
  titulo: ReactNode;
  /** Línea secundaria bajo el título (ej. la actividad) */
  subtitulo?: ReactNode;
  /** Insignias de estado a la derecha */
  badges?: ReactNode;
  /** Pares dato/valor que se muestran en dos columnas */
  campos?: { label: string; valor: ReactNode }[];
  /** Botones de acción al pie */
  acciones?: ReactNode;
}

const COLOR_SEMAFORO: Record<NonNullable<TarjetaMovilProps['semaforo']>, string> = {
  verde: 'bg-emerald-500',
  ambar: 'bg-amber-500',
  rojo: 'bg-destructive',
  gris: 'bg-muted-foreground/30',
};

/** Tarjeta para mostrar un registro en MÓVIL, en lugar de una fila de tabla ancha. Desplazar una
 * tabla de 15 columnas lateralmente en un teléfono es hostil; la tarjeta muestra los datos clave
 * apilados y legibles de un vistazo. Se usa junto con TablaOTarjetas. */
export function TarjetaMovil({ semaforo, titulo, subtitulo, badges, campos, acciones }: TarjetaMovilProps) {
  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {semaforo && <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${COLOR_SEMAFORO[semaforo]}`} />}
            <span className="truncate text-[14px] font-semibold">{titulo}</span>
          </div>
          {subtitulo && <div className="mt-0.5 truncate pl-4 text-[12.5px] text-muted-foreground">{subtitulo}</div>}
        </div>
        {badges && <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">{badges}</div>}
      </div>

      {campos && campos.length > 0 && (
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-2.5">
          {campos.map((c, i) => (
            <div key={i} className="min-w-0">
              <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="truncate text-[12.5px]">{c.valor || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {acciones && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2.5">{acciones}</div>}
    </div>
  );
}

/** Renderiza tabla en escritorio y lista de tarjetas en móvil, sin duplicar la lógica de datos:
 * cada pantalla decide cómo se ve cada registro en cada formato. */
export function TablaOTarjetas({ tabla, tarjetas }: { tabla: ReactNode; tarjetas: ReactNode }) {
  return (
    <>
      <div className="hidden md:block">{tabla}</div>
      <div className="space-y-2 md:hidden">{tarjetas}</div>
    </>
  );
}
