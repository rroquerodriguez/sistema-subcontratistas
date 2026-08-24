import type { Subcontratista } from '@/types';
import { fmtDate, todayISO, abrirReporteParaImprimir, avatarColorFor } from './utils-app';
import { MINIMO_CASOS_CONFIABLE, type RendimientoActividad } from './rendimiento-real';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function exportRendimientoPDF(resultados: RendimientoActividad[], subs: Subcontratista[]) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const subIds = [...new Set(resultados.map((r) => r.subcontratistaId))];

  const gruposHtml = subIds
    .map((subId) => {
      const items = resultados.filter((r) => r.subcontratistaId === subId);
      const { bg } = avatarColorFor(subId);
      const filas = items
        .map((r) => {
          const sugerida = r.confiable ? `${r.duracionSugeridaDias} día${r.duracionSugeridaDias === 1 ? '' : 's'}` : `<span class="badge-slate">Datos insuficientes</span>`;
          const diff = r.diferenciaVsEstandar === null ? '—'
            : Math.abs(r.diferenciaVsEstandar) < 0.5 ? '<span class="badge-slate">Igual</span>'
            : r.diferenciaVsEstandar > 0 ? `<span class="badge-red">+${r.diferenciaVsEstandar}d más lento</span>`
            : `<span class="badge-green">${Math.abs(r.diferenciaVsEstandar)}d más rápido</span>`;
          return `
          <tr>
            <td>${esc(r.actividad)}</td>
            <td style="text-align:center;">${r.casosLimpios} / ${r.casosAfectados}</td>
            <td>${sugerida}</td>
            <td>${r.estandarActualDias != null ? `${r.estandarActualDias}d` : '—'}</td>
            <td>${diff}</td>
            <td>${r.holguraSugeridaDias != null ? `${r.holguraSugeridaDias}d` : '—'}</td>
            <td>${r.esperaPromedioDias != null ? `${r.esperaPromedioDias}d` : '—'}</td>
          </tr>`;
        })
        .join('');
      return `
      <div class="group-block">
        <div class="group-title" style="background:${bg};">${esc(subName(subId))}</div>
        <table>
          <thead><tr><th>Actividad</th><th>Casos (limpios/afectados)</th><th>Duración sugerida</th><th>Estándar actual</th><th>Diferencia</th><th>Holgura sugerida</th><th>Espera prom.</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Rendimiento real</title>
<style>
  body { font-family: 'DejaVu Sans', Arial, sans-serif; color: #36454F; padding: 32px; }
  h1 { font-size: 19px; margin-bottom: 2px; }
  .sub { color: #708090; font-size: 12.5px; margin-bottom: 20px; }
  .group-block { margin-bottom: 20px; page-break-inside: avoid; }
  .group-title { font-size: 13px; font-weight: 700; color: #fff; padding: 7px 12px; border-radius: 5px 5px 0 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #708090; color: #fff; font-weight: 600; padding: 6px 7px; text-align: left; font-size: 9.5px; }
  td { padding: 5px 7px; border-bottom: 1px solid #E5E3DE; }
  tr:nth-child(even) td { background: #FAFAF8; }
  .badge-slate { background: #E4E7EB; color: #36454F; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700; }
  .badge-red { background: #FDE2E1; color: #B42318; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700; }
  .badge-green { background: #D1FAE5; color: #065F46; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700; }
  .note { font-size: 10.5px; color: #708090; margin-top: 20px; padding-top: 12px; border-top: 1px solid #E5E3DE; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <h1>Rendimiento real de actividades</h1>
  <div class="sub">Generado el ${esc(fmtDate(todayISO()))} · Duración medida desde liberación hasta cierre del ciclo</div>

  ${gruposHtml || '<p>No hay datos suficientes todavía.</p>'}

  <div class="note">
    Los casos con una incidencia de causa "nuestra" durante el ciclo se excluyen del cálculo de duración estándar,
    pero se usan para sugerir la holgura. Se requieren al menos ${MINIMO_CASOS_CONFIABLE} casos limpios para considerar el dato confiable.
  </div>
</body>
</html>`;

  abrirReporteParaImprimir(html);
}
