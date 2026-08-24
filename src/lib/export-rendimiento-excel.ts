import * as XLSX from 'xlsx';
import type { Subcontratista } from '@/types';
import type { RendimientoActividad } from './rendimiento-real';
import { todayISO } from './utils-app';

export function exportRendimientoExcel(resultados: RendimientoActividad[], subs: Subcontratista[]) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const wb = XLSX.utils.book_new();

  const rows = resultados.map((r) => ({
    Subcontratista: subName(r.subcontratistaId),
    Actividad: r.actividad,
    'Casos limpios': r.casosLimpios,
    'Casos afectados (excluidos)': r.casosAfectados,
    Confiable: r.confiable ? 'Sí' : 'No',
    'Duración real sugerida (días)': r.duracionSugeridaDias ?? '',
    'Estándar actual (días)': r.estandarActualDias ?? '',
    'Diferencia (días)': r.diferenciaVsEstandar ?? '',
    'Holgura sugerida (días)': r.holguraSugeridaDias ?? '',
    'Holgura actual (días)': r.holguraActualDias ?? '',
    'Espera promedio antes de iniciar (días)': r.esperaPromedioDias ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Rendimiento real');

  const detalleRows: Record<string, string | number>[] = [];
  resultados.forEach((r) => {
    r.casos.forEach((c) => {
      detalleRows.push({
        Subcontratista: subName(r.subcontratistaId),
        Actividad: r.actividad,
        Unidad: c.edificioUnidad,
        Liberación: c.fechaLiberacion,
        Inicio: c.fechaInicio,
        Cierre: c.fechaCierre,
        'Total (días)': c.duracionTotalDias,
        'Espera (días)': c.esperaDias,
        'Ejecución (días)': c.ejecucionDias,
        'Excluido por causa nuestra': c.afectadoPorCausaNuestra ? 'Sí' : 'No',
      });
    });
  });
  if (detalleRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalleRows), 'Detalle por taller');

  XLSX.writeFile(wb, `rendimiento_real_${todayISO()}.xlsx`);
}
