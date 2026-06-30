import type { Taller } from '@/types';
import { fmtDate, abrirReporteParaImprimir, todayISO } from './utils-app';

const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface GrupoSemanal {
  subId: string;
  nombre: string;
  total: number;
  proyectos: { proyecto: string; porDia: Record<string, Taller[]> }[];
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function celdaDia(t: Taller | undefined): string {
  if (!t) return '';
  const unidad = t.esGeneral ? 'GENERAL' : `${t.edificio} ${t.unidad}`;
  return `<div class="dia-item"><strong>${esc(unidad)}</strong><br/>${esc(t.actividad || 'Sin actividad')}</div>`;
}

/** Exporta a PDF la vista "semanal por días" tal como se ve en pantalla: columnas = días de la
 * semana, agrupado por subcontratista y dentro de cada uno por proyecto. */
export function exportPlanificacionSemanalPDF(grupos: GrupoSemanal[], periodoLabel: string) {
  const bodyHtml = grupos
    .map((g) => {
      const proyectosHtml = g.proyectos
        .map((p) => {
          const maxFilas = Math.max(1, ...DIAS_ORDER.map((d) => p.porDia[d]?.length || 0));
          const filasHtml = Array.from({ length: maxFilas })
            .map((_, i) => `<tr>${DIAS_ORDER.map((d) => `<td>${celdaDia(p.porDia[d]?.[i])}</td>`).join('')}</tr>`)
            .join('');
          return `
          <div class="proyecto-block">
            <div class="proyecto-title">${esc(p.proyecto)}</div>
            <table>
              <thead><tr>${DIAS_ORDER.map((d) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
              <tbody>${filasHtml}</tbody>
            </table>
          </div>`;
        })
        .join('');
      return `
      <div class="group-block">
        <div class="group-title">${esc(g.nombre)} (${g.total} taller${g.total === 1 ? '' : 'es'})</div>
        ${proyectosHtml}
      </div>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Planificación — Vista semanal por días</title>
<style>
  body { font-family: 'DejaVu Sans', Arial, sans-serif; color: #36454F; padding: 32px; }
  h1 { font-size: 19px; margin-bottom: 2px; }
  .sub { color: #708090; font-size: 12.5px; margin-bottom: 18px; }
  .group-block { margin-bottom: 26px; page-break-inside: avoid; }
  .group-title { font-size: 14px; font-weight: 700; background: #36454F; color: #fff; padding: 7px 10px; border-radius: 6px; margin-bottom: 10px; }
  .proyecto-block { margin-bottom: 14px; }
  .proyecto-title { font-size: 11.5px; font-weight: 600; color: #708090; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed; }
  th, td { border: 1px solid #D3D3D3; padding: 6px 5px; text-align: left; vertical-align: top; word-wrap: break-word; }
  th { background: #708090; color: #fff; font-weight: 600; font-size: 10px; }
  .dia-item { margin-bottom: 4px; line-height: 1.3; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <h1>Planificación — Vista semanal por días</h1>
  <div class="sub">Periodo: ${esc(periodoLabel)} · Generado el ${esc(fmtDate(todayISO()))}</div>
  ${bodyHtml || '<p>No hay talleres planificados para mostrar.</p>'}
</body>
</html>`;

  abrirReporteParaImprimir(html);
}
