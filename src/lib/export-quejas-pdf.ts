import type { Subcontratista, Queja } from '@/types';
import { fmtDate } from './utils-app';
import { buildNarrativeIncidencias, resumenAtrasoPorCausa } from './stats-engine';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function narrativeHtml(lines: string[]): string {
  if (!lines.length) return '';
  return `<ul class="narrative-list">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

const CAUSA_COLOR: Record<string, string> = {
  NUESTRA: 'badge-red',
  'DEL SUBCONTRATISTA': 'badge-amber',
  COMPARTIDA: 'badge-slate',
  'POR DEFINIR': 'badge-slate',
};

function badge(text: string, cls: string): string {
  if (!text) return '—';
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

function photosRowHtml(fotos: string[] | undefined, colspan: number): string {
  if (!fotos || !fotos.length) return '';
  return `
    <tr class="photo-tr">
      <td colspan="${colspan}">
        <div class="photo-label">Fotos (${fotos.length})</div>
        <div class="photo-row">${fotos.map((f) => `<img class="photo-thumb" src="${f}" />`).join('')}</div>
      </td>
    </tr>`;
}

function quejasRowsHtml(quejas: Queja[], showSub: boolean, subName: (id: string) => string): string {
  const colspan = showSub ? 7 : 6;
  return quejas
    .map((q) => `
      <tr>
        ${showSub ? `<td>${esc(subName(q.subcontratistaId))}</td>` : ''}
        <td>${esc(fmtDate(q.fecha))}</td>
        <td>${esc(q.tipo)}</td>
        <td class="desc">${esc(q.descripcion)}</td>
        <td>${badge(q.causa, CAUSA_COLOR[q.causa] || 'badge-slate')}</td>
        <td>${q.esGeneral ? badge('General', 'badge-slate') : esc(q.unidades)}</td>
        <td>${q.impactoDias ? `<strong>${esc(q.impactoDias)}</strong>` : '—'}</td>
      </tr>
      ${photosRowHtml(q.fotos, colspan)}`)
    .join('');
}

function tableHead(showSub: boolean): string {
  return `<thead><tr>${showSub ? '<th>Subcontratista</th>' : ''}<th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Causa</th><th>Unidades</th><th>Días atraso</th></tr></thead>`;
}

function atrasoSectionHtml(quejas: Queja[]): string {
  const resumen = resumenAtrasoPorCausa(quejas);
  if (!resumen.length || resumen.every((r) => r.diasTotales === 0)) return '';
  const cards = resumen
    .map((r) => `
      <div class="atraso-card">
        <div class="atraso-causa">${esc(r.causa)}</div>
        <div class="atraso-dias">${r.diasTotales} día${r.diasTotales === 1 ? '' : 's'}</div>
        <div class="atraso-cantidad">${r.cantidadIncidencias} incidencia${r.cantidadIncidencias === 1 ? '' : 's'}</div>
      </div>`)
    .join('');
  return `
    <div class="narrative-title">Atraso en días por causa</div>
    <div class="atraso-grid">${cards}</div>`;
}

export function exportQuejasPDF(quejas: Queja[], subs: Subcontratista[], subFiltro: Subcontratista | null) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const title = subFiltro ? `Reporte de incidencias — ${subFiltro.nombre}` : 'Reporte de incidencias — Todos los subcontratistas';
  const narrativa = buildNarrativeIncidencias(subFiltro, quejas);

  let bodyHtml: string;
  if (subFiltro) {
    bodyHtml = `<table>${tableHead(false)}<tbody>${quejasRowsHtml(quejas, false, subName)}</tbody></table>`;
  } else {
    const subIds = [...new Set(quejas.map((q) => q.subcontratistaId))];
    bodyHtml = subIds
      .map((subId) => {
        const subQuejas = quejas.filter((q) => q.subcontratistaId === subId);
        const subNarrativa = buildNarrativeIncidencias(subs.find((s) => s.id === subId) || null, subQuejas);
        return `
        <div class="group-block">
          <div class="group-title">${esc(subName(subId))} (${subQuejas.length} incidencia${subQuejas.length === 1 ? '' : 's'})</div>
          <div class="group-narrative">${narrativeHtml(subNarrativa)}</div>
          <table>${tableHead(false)}<tbody>${quejasRowsHtml(subQuejas, false, subName)}</tbody></table>
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
  .narrative-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
  .narrative { background: #F1F2F3; border-left: 4px solid #36454F; border-radius: 8px; padding: 14px 16px; font-size: 12.5px; line-height: 1.6; margin-bottom: 20px; }
  .narrative-list { margin: 0; padding-left: 18px; }
  .narrative-list li { margin-bottom: 4px; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }
  .badge-red { background: #FDE2E1; color: #B42318; }
  .badge-amber { background: #FEF0C7; color: #92400E; }
  .badge-green { background: #D1FAE5; color: #065F46; }
  .badge-slate { background: #E4E7EB; color: #36454F; }
  .atraso-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .atraso-card { background: #F1F2F3; border-radius: 8px; padding: 10px 14px; min-width: 130px; }
  .atraso-causa { font-size: 10.5px; color: #708090; text-transform: uppercase; }
  .atraso-dias { font-size: 18px; font-weight: 700; color: #36454F; }
  .atraso-cantidad { font-size: 10.5px; color: #708090; }
  .group-block { margin-bottom: 22px; page-break-inside: avoid; }
  .group-title { font-size: 14px; font-weight: 700; background: #36454F; color: #fff; padding: 7px 10px; border-radius: 6px 6px 0 0; }
  .group-narrative { background: #F1F2F3; font-size: 11.5px; padding: 8px 10px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border-bottom: 1px solid #D3D3D3; padding: 6px 7px; text-align: left; vertical-align: top; }
  th { background: #708090; color: #fff; font-weight: 600; }
  td.desc { max-width: 220px; }
  .photo-tr td { border-bottom: 1px solid #D3D3D3; padding: 4px 7px 8px; }
  .photo-label { font-size: 9px; font-weight: 600; color: #708090; text-transform: uppercase; margin-bottom: 3px; }
  .photo-row { display: flex; gap: 5px; flex-wrap: wrap; }
  .photo-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 5px; border: 1px solid #D3D3D3; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="sub">Generado el ${esc(fmtDate(new Date().toISOString().slice(0, 10)))} · ${quejas.length} incidencia(s)</div>

  <div class="narrative-title">Análisis</div>
  <div class="narrative">${narrativeHtml(narrativa)}</div>

  ${atrasoSectionHtml(quejas)}

  ${bodyHtml}
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 400);
  }
}
