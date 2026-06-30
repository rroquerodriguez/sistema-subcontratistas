import * as XLSX from 'xlsx';
import type { Taller } from '@/types';

const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface GrupoSemanal {
  subId: string;
  nombre: string;
  total: number;
  proyectos: { proyecto: string; porDia: Record<string, Taller[]> }[];
}

/** Exporta la vista "semanal por días" tal como se ve en pantalla: una hoja por subcontratista,
 * con los días de la semana como columnas y cada celda mostrando las unidades/actividades de ese día. */
export function exportPlanificacionSemanalExcel(grupos: GrupoSemanal[], periodoLabel: string) {
  const wb = XLSX.utils.book_new();

  const resumenRows = grupos.map((g) => ({ Subcontratista: g.nombre, 'Total de talleres': g.total }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), 'Resumen');

  grupos.forEach((g) => {
    const filas: Record<string, string>[] = [];
    g.proyectos.forEach((p) => {
      filas.push({ Proyecto: `── ${p.proyecto} ──`, ...Object.fromEntries(DIAS_ORDER.map((d) => [d, ''])) });

      const maxFilas = Math.max(1, ...DIAS_ORDER.map((d) => p.porDia[d]?.length || 0));
      for (let i = 0; i < maxFilas; i++) {
        const fila: Record<string, string> = { Proyecto: '' };
        DIAS_ORDER.forEach((d) => {
          const t = p.porDia[d]?.[i];
          fila[d] = t ? `${t.esGeneral ? 'GENERAL' : `${t.edificio} ${t.unidad}`} — ${t.actividad || 'sin actividad'}` : '';
        });
        filas.push(fila);
      }
    });

    const ws = XLSX.utils.json_to_sheet(filas, { header: ['Proyecto', ...DIAS_ORDER] });
    const sheetName = (g.nombre || 'Sub').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Sub';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fname = `planificacion_vista_semanal_${periodoLabel.replace(/[\s/]+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fname);
}
