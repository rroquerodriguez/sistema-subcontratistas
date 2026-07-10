import { Building2, HardHat, UserCheck } from 'lucide-react';
import type { ResumenResponsabilidad } from '@/lib/responsabilidad';

function Pct({ valor }: { valor: number | null }) {
  if (valor == null) return <span className="text-muted-foreground">—</span>;
  const color = valor >= 90 ? 'text-emerald-600' : valor >= 70 ? 'text-amber-600' : 'text-destructive';
  return <span className={color}>{valor}%</span>;
}

/** Muestra el análisis de responsabilidad de cumplimiento: separa lo que es responsabilidad nuestra
 * (liberar la unidad a tiempo) de lo que es del contratista (ejecutar dentro del estándar), más el
 * cumplimiento de entrega final ante el cliente con su desglose de culpa. */
export function ResponsabilidadPanel({ resumen }: { resumen: ResumenResponsabilidad }) {
  if (resumen.analizados === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-[12.5px] text-muted-foreground">
        No hay entregas con fecha promesa en este periodo para analizar el cumplimiento por responsabilidad.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Liberación — nuestro */}
        <div className="rounded-lg border border-border p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium">
            <Building2 size={14} className="text-sky-600" />Liberación (nuestra)
          </div>
          <div className="text-[22px] font-semibold leading-none"><Pct valor={resumen.pctLiberacionATiempo} /></div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">a tiempo vs. fecha promesa</div>
          {resumen.atrasoLiberacionPromedio != null && resumen.atrasoLiberacionPromedio > 0 && (
            <div className="mt-1.5 text-[11.5px] text-destructive">Atraso promedio al liberar: {resumen.atrasoLiberacionPromedio.toFixed(1)} días</div>
          )}
        </div>

        {/* Ejecución — contratista */}
        <div className="rounded-lg border border-border p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium">
            <HardHat size={14} className="text-amber-600" />Ejecución (contratista)
          </div>
          <div className="text-[22px] font-semibold leading-none"><Pct valor={resumen.pctEjecucionATiempo} /></div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">dentro del estándar de tiempo</div>
          {resumen.excesoEjecucionPromedio != null && resumen.excesoEjecucionPromedio > 0 && (
            <div className="mt-1.5 text-[11.5px] text-destructive">Exceso promedio: {resumen.excesoEjecucionPromedio.toFixed(1)} días laborables</div>
          )}
          {resumen.ejecucionSinEstandar > 0 && (
            <div className="mt-1 text-[11px] text-muted-foreground">{resumen.ejecucionSinEstandar} entrega(s) sin estándar definido (no evaluadas)</div>
          )}
        </div>

        {/* Entrega final — cliente */}
        <div className="rounded-lg border border-border p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium">
            <UserCheck size={14} className="text-emerald-600" />Entrega final (cliente)
          </div>
          <div className="text-[22px] font-semibold leading-none"><Pct valor={resumen.pctEntregaATiempo} /></div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">entregado en/antes de la promesa</div>
          {resumen.atrasoEntregaPromedio != null && resumen.atrasoEntregaPromedio > 0 && (
            <div className="mt-1.5 text-[11.5px] text-destructive">Atraso promedio: {resumen.atrasoEntregaPromedio.toFixed(1)} días</div>
          )}
        </div>
      </div>

      {/* Desglose de culpa del atraso acumulado */}
      {(resumen.diasAtrasoNuestro > 0 || resumen.diasAtrasoContratista > 0) && (
        <div className="rounded-lg border border-border bg-muted/20 p-3.5">
          <div className="mb-2 text-[12.5px] font-medium">¿De quién fue el atraso? (días acumulados sobre la promesa)</div>
          {(() => {
            const total = resumen.diasAtrasoNuestro + resumen.diasAtrasoContratista;
            const pctN = total ? Math.round((resumen.diasAtrasoNuestro / total) * 100) : 0;
            const pctC = 100 - pctN;
            return (
              <>
                <div className="flex h-6 overflow-hidden rounded-md">
                  <div className="flex items-center justify-center bg-sky-500 text-[11px] font-medium text-white" style={{ width: `${pctN}%` }}>
                    {pctN >= 12 && `${pctN}%`}
                  </div>
                  <div className="flex items-center justify-center bg-amber-500 text-[11px] font-medium text-white" style={{ width: `${pctC}%` }}>
                    {pctC >= 12 && `${pctC}%`}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" />Nuestro (liberación tardía): <strong>{resumen.diasAtrasoNuestro} días</strong></span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />Contratista (ejecución): <strong>{resumen.diasAtrasoContratista} días</strong></span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
