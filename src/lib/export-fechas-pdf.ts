import type { Subcontratista, FechaPrometida } from '@/types';
import { fmtDate, fmtDateTime, todayISO, abrirReporteParaImprimir } from './utils-app';
import { diasAtrasoFechaPrometida, estaAtrasada, estaCumplida } from './stats-engine';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function badge(text: string, cls: string): string {
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

function photosHtml(fotos: string[] | undefined): string {
  if (!fotos || !fotos.length) return '';
  return `
    <div class="photo-block">
      <div class="photo-label">Fotos de evidencia (${fotos.length})</div>
      <div class="photo-row">
        ${fotos.map((f) => `<img class="photo-thumb" src="${f}" />`).join('')}
      </div>
    </div>`;
}

function fechaCardHtml(fp: FechaPrometida, showSub: boolean, subName: (id: string) => string): string {
  const dias = diasAtrasoFechaPrometida(fp);
  const cumplida = estaCumplida(fp);
  const atrasada = estaAtrasada(fp);
  const estadoBadge = cumplida ? badge('Cumplida', 'badge-green') : atrasada ? badge('Atrasada', 'badge-red') : badge('Pendiente', 'badge-slate');

  const historialHtml = fp.historialFechas.length
    ? `
      <div class="sub-section-title">Historial de cambios de fecha (${fp.historialFechas.length})</div>
      <div class="mini-list">
        ${fp.historialFechas
          .map((c) => `
          <div class="mini-item">
            <div class="mini-item-head"><strong>Antes prometida: ${esc(fmtDate(c.fecha))}</strong><span>${esc(fmtDateTime(c.registradoEn))}</span></div>
            ${c.motivo ? `<div class="mini-item-desc">${esc(c.motivo)}</div>` : ''}
          </div>`)
          .join('')}
      </div>`
    : '';

  const comentariosHtml = fp.comentarios?.length
    ? `
      <div class="sub-section-title">Comentarios de seguimiento (${fp.comentarios.length})</div>
      <div class="mini-list">
        ${[...fp.comentarios].sort((a, b) => b.fecha.localeCompare(a.fecha))
          .map((c) => `
          <div class="mini-item">
            <div class="mini-item-head"><span>${esc(fmtDateTime(c.fecha))}</span></div>
            <div class="mini-item-desc">${esc(c.texto)}</div>
          </div>`)
          .join('')}
      </div>`
    : '';

  return `
    <div class="taller-card">
      <div class="taller-card-head">
        <div class="taller-card-title">${showSub ? `${esc(subName(fp.subcontratistaId))} — ` : ''}${esc(fp.descripcion)}</div>
        <div class="taller-card-badges">${estadoBadge}${dias !== null && dias > 0 ? ` ${badge(`${dias} día${dias === 1 ? '' : 's'} atraso`, cumplida ? 'badge-slate' : 'badge-red')}` : ''}</div>
      </div>
      <div class="taller-card-meta">
        Fecha prometida: <strong>${esc(fmtDate(fp.fechaPrometidaActual))}</strong>
        ${fp.fechaCumplida ? ` &nbsp;·&nbsp; Cumplida: <strong>${esc(fmtDate(fp.fechaCumplida))}</strong>` : ''}
        &nbsp;·&nbsp; Unidades: <strong>${fp.esGeneral ? 'GENERAL' : esc(fp.unidades) || '—'}</strong>
      </div>
      ${fp.notas ? `<div class="taller-card-comment">${esc(fp.notas)}</div>` : ''}
      ${photosHtml(fp.fotos)}
      ${comentariosHtml}
      ${historialHtml}
    </div>`;
}

export function exportFechasPDF(fechas: FechaPrometida[], subs: Subcontratista[], subFiltro: Subcontratista | null) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const title = subFiltro ? `Fechas prometidas — ${subFiltro.nombre}` : 'Fechas prometidas — Todos los subcontratistas';

  const totalAtrasadas = fechas.filter((f) => estaAtrasada(f) && !estaCumplida(f)).length;
  const totalCumplidas = fechas.filter((f) => estaCumplida(f)).length;
  const totalPendientes = fechas.length - totalAtrasadas - totalCumplidas;

  let bodyHtml: string;
  if (subFiltro) {
    bodyHtml = [...fechas].sort((a, b) => a.fechaPrometidaActual.localeCompare(b.fechaPrometidaActual)).map((f) => fechaCardHtml(f, false, subName)).join('');
  } else {
    const subIds = [...new Set(fechas.map((f) => f.subcontratistaId))];
    bodyHtml = subIds
      .map((subId) => {
        const subFechas = fechas.filter((f) => f.subcontratistaId === subId).sort((a, b) => a.fechaPrometidaActual.localeCompare(b.fechaPrometidaActual));
        return `
        <div class="group-block">
          <div class="group-title">${esc(subName(subId))} (${subFechas.length} registro${subFechas.length === 1 ? '' : 's'})</div>
          ${subFechas.map((f) => fechaCardHtml(f, false, subName)).join('')}
        </div>`;
      })
      .join('');
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  body { font-family: 'DejaVu Sans', Arial, sans-serif; color: #36454F; padding: 32px; }
  h1 { font-size: 19px; margin-bottom: 2px; }
  .sub { color: #708090; font-size: 12.5px; margin-bottom: 18px; }
  .stats { display: flex; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
  .stat { background: #F1F2F3; border-radius: 10px; padding: 10px 16px; min-width: 110px; border-left: 4px solid #36454F; }
  .stat.success { border-left-color: #0E9F6E; }
  .stat.danger { border-left-color: #E02424; }
  .stat .label { font-size: 10.5px; color: #708090; }
  .stat .value { font-size: 19px; font-weight: 700; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }
  .badge-red { background: #FDE2E1; color: #B42318; }
  .badge-amber { background: #FEF0C7; color: #92400E; }
  .badge-green { background: #D1FAE5; color: #065F46; }
  .badge-slate { background: #E4E7EB; color: #36454F; }
  .group-block { margin-bottom: 26px; }
  .group-title { font-size: 14px; font-weight: 700; background: #36454F; color: #fff; padding: 7px 10px; border-radius: 6px; margin-bottom: 10px; }
  .taller-card { border: 1px solid #D3D3D3; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
  .taller-card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 4px; }
  .taller-card-title { font-size: 12.5px; font-weight: 700; }
  .taller-card-badges { white-space: nowrap; display: flex; gap: 4px; }
  .taller-card-meta { font-size: 10.5px; color: #708090; margin-bottom: 6px; }
  .taller-card-comment { background: #F1F2F3; border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.5; margin-bottom: 6px; }
  .sub-section-title { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #708090; margin: 6px 0 3px; }
  .mini-list { display: flex; flex-direction: column; gap: 4px; }
  .mini-item { border: 1px solid #E5E5E5; border-radius: 5px; padding: 5px 8px; font-size: 10.5px; }
  .mini-item-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .mini-item-head span { color: #708090; font-size: 10px; }
  .mini-item-desc { color: #5A5A5A; margin-top: 2px; }
  .photo-block { margin-top: 6px; }
  .photo-label { font-size: 9px; font-weight: 600; color: #708090; text-transform: uppercase; margin-bottom: 3px; }
  .photo-row { display: flex; gap: 5px; flex-wrap: wrap; }
  .photo-thumb { width: 70px; height: 70px; object-fit: cover; border-radius: 5px; border: 1px solid #D3D3D3; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="sub">Generado el ${esc(fmtDate(todayISO()))} · ${fechas.length} registro(s)</div>

  <div class="stats">
    <div class="stat"><div class="label">TOTAL</div><div class="value">${fechas.length}</div></div>
    <div class="stat"><div class="label">PENDIENTES</div><div class="value">${totalPendientes}</div></div>
    <div class="stat danger"><div class="label">ATRASADAS</div><div class="value">${totalAtrasadas}</div></div>
    <div class="stat success"><div class="label">CUMPLIDAS</div><div class="value">${totalCumplidas}</div></div>
  </div>

  ${bodyHtml}
</body>
</html>`;

  abrirReporteParaImprimir(html);
}
