import type { Subcontratista, Taller, CicloTaller, RegistroBitacora } from '@/types';
import { fmtDate, todayISO, abrirReporteParaImprimir, avatarColorFor } from './utils-app';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function badge(text: string, cls: string): string {
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  'NO INICIADO': { label: 'Sin iniciar', cls: 'badge-slate' },
  'EN PROCESO': { label: 'En proceso', cls: 'badge-amber' },
  COMPLETADO: { label: 'Completado', cls: 'badge-green' },
};

interface ResumenAvance {
  conPersonal: number;
  completados: number;
  enProceso: number;
  sinIniciar: number;
}

/** Reporte PDF del avance de talleres de un día específico: resumen KPI arriba, y una tabla
 * por subcontratista mostrando personal, estado, y el último comentario de avance (no el
 * historial completo, para mantener el reporte manejable). */
export function exportAvanceBitacoraPDF(
  talleres: Taller[],
  subs: Subcontratista[],
  ciclos: CicloTaller[],
  bitacora: RegistroBitacora[],
  fechaActiva: string,
  diaLabel: string,
  resumen: ResumenAvance
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const cicloDe = (tallerId: string): CicloTaller =>
    ciclos.find((c) => c.tallerId === tallerId) || { id: '', tallerId, estado: 'NO INICIADO', fechaInicio: '', fechaCierre: '', comentarios: [] };
  const registroDe = (tallerId: string) => bitacora.find((b) => b.tallerId === tallerId && b.fecha === fechaActiva);

  const subIds = [...new Set(talleres.map((t) => t.subcontratistaId))];

  const gruposHtml = subIds
    .map((subId) => {
      const talleresDelSub = talleres.filter((t) => t.subcontratistaId === subId);
      const { bg } = avatarColorFor(subId);
      const filasHtml = talleresDelSub
        .map((t) => {
          const ciclo = cicloDe(t.id);
          const registro = registroDe(t.id);
          const unidad = t.esGeneral ? 'GENERAL' : `${t.edificio} ${t.unidad}`;
          const personalHtml = registro?.llego === 'SI' ? '<span class="pill-si">SI</span>' : registro?.llego === 'NO' ? '<span class="pill-no">NO</span>' : '—';
          const estadoInfo = ESTADO_BADGE[ciclo.estado] || ESTADO_BADGE['NO INICIADO'];
          const comentariosOrdenados = [...ciclo.comentarios].sort((a, b) => b.fecha.localeCompare(a.fecha));
          const ultimo = comentariosOrdenados[0];
          return `
          <tr>
            <td>${esc(unidad)}</td>
            <td>${esc(t.actividad)}</td>
            <td style="text-align:center;">${personalHtml}</td>
            <td>${badge(estadoInfo.label, estadoInfo.cls)}</td>
            <td>${ultimo ? esc(ultimo.texto) : '—'}</td>
            <td>${ultimo?.autor ? esc(ultimo.autor) : '—'}</td>
          </tr>`;
        })
        .join('');
      return `
      <div class="group-block">
        <div class="group-title" style="background:${bg};">${esc(subName(subId))} — ${talleresDelSub.length} taller${talleresDelSub.length === 1 ? '' : 'es'}</div>
        <table>
          <thead><tr><th>Taller</th><th>Actividad</th><th style="width:8%;">Personal</th><th style="width:13%;">Estado</th><th>Último comentario</th><th style="width:14%;">Registrado por</th></tr></thead>
          <tbody>${filasHtml}</tbody>
        </table>
      </div>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Bitácora — Avance de talleres</title>
<style>
  body { font-family: 'DejaVu Sans', Arial, sans-serif; color: #36454F; padding: 32px; }
  h1 { font-size: 19px; margin-bottom: 2px; }
  .sub { color: #708090; font-size: 12.5px; margin-bottom: 20px; }
  .kpi-row { display: flex; gap: 10px; margin-bottom: 22px; }
  .kpi-box { flex: 1; border: 1px solid #D3D3D3; border-radius: 6px; padding: 10px 14px; }
  .kpi-box .n { font-size: 20px; font-weight: 700; }
  .kpi-box .l { font-size: 10.5px; color: #708090; text-transform: uppercase; letter-spacing: 0.3px; }
  .kpi-green .n { color: #065F46; } .kpi-amber .n { color: #92400E; } .kpi-slate .n { color: #36454F; }
  .group-block { margin-bottom: 20px; page-break-inside: avoid; }
  .group-title { font-size: 13px; font-weight: 700; color: #fff; padding: 7px 12px; border-radius: 5px 5px 0 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #708090; color: #fff; font-weight: 600; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 6px 8px; border-bottom: 1px solid #E5E3DE; vertical-align: top; }
  tr:nth-child(even) td { background: #FAFAF8; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 700; }
  .badge-slate { background: #E4E7EB; color: #36454F; }
  .badge-amber { background: #FEF0C7; color: #92400E; }
  .badge-green { background: #D1FAE5; color: #065F46; }
  .pill-si { color: #065F46; font-weight: 700; }
  .pill-no { color: #B42318; font-weight: 700; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px; padding-top: 14px; border-top: 1px solid #E5E3DE; font-size: 10.5px; color: #8A8782; }
  .sig-line { width: 200px; border-top: 1px solid #B7B4AD; padding-top: 4px; text-align: center; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <h1>Bitácora Diaria de Obra — Avance de talleres</h1>
  <div class="sub">${esc(diaLabel)} · Generado el ${esc(fmtDate(todayISO()))}</div>

  <div class="kpi-row">
    <div class="kpi-box kpi-green"><div class="n">${resumen.conPersonal}</div><div class="l">Con personal hoy</div></div>
    <div class="kpi-box kpi-green"><div class="n">${resumen.completados}</div><div class="l">Completados</div></div>
    <div class="kpi-box kpi-amber"><div class="n">${resumen.enProceso}</div><div class="l">En proceso</div></div>
    <div class="kpi-box kpi-slate"><div class="n">${resumen.sinIniciar}</div><div class="l">Sin iniciar</div></div>
  </div>

  ${gruposHtml || '<p>No hay talleres planificados para este día.</p>'}

  <div class="footer">
    <div>Sistema de Control de Subcontratistas</div>
    <div class="sig-line">Firma del supervisor</div>
  </div>
</body>
</html>`;

  abrirReporteParaImprimir(html);
}
