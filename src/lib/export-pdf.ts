import type { Subcontratista, Stats, Queja } from '@/types';
import type { TallerDetailExt } from './stats-engine';
import { historialIncidenciasContratista, diasAtrasoFechaPrometida, estaCumplida, estaAtrasada } from './stats-engine';
import { fmtDate, abrirReporteParaImprimir } from './utils-app';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function narrativeHtml(lines: string[]): string {
  if (!lines.length) return '';
  return `<ul class="narrative-list">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

function badge(text: string, cls: string): string {
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

const LIBERACION_BADGE: Record<string, { label: string; cls: string }> = {
  LISTO: { label: 'Liberado para trabajar', cls: 'badge-green' },
  'NO LISTO': { label: 'No liberado', cls: 'badge-red' },
  PENDIENTE: { label: 'Por validar', cls: 'badge-slate' },
};

const ENTREGA_BADGE: Record<string, { label: string; cls: string }> = {
  ENTREGADO: { label: 'Entregado', cls: 'badge-green' },
  'NO ENTREGADO': { label: 'Sin entregar', cls: 'badge-slate' },
};

function diasBadge(dias: number | null, entregado: boolean): string {
  if (dias === null) return '<span class="badge badge-slate">—</span>';
  let cls = 'badge-green';
  if (!entregado && dias > 5) cls = 'badge-red';
  else if (!entregado && dias > 2) cls = 'badge-amber';
  return `<span class="badge ${cls}">${dias} día${dias === 1 ? '' : 's'}</span>`;
}

function photosHtml(fotos: string[] | undefined, label: string): string {
  if (!fotos || !fotos.length) return '';
  return `
    <div class="photo-block">
      <div class="photo-label">${esc(label)} (${fotos.length})</div>
      <div class="photo-row">
        ${fotos.map((f) => `<img class="photo-thumb" src="${f}" />`).join('')}
      </div>
    </div>`;
}

function historialIncidenciasHtml(quejas: Queja[]): string {
  if (!quejas.length) return '';
  return `
    <div class="sub-section-title">Historial de incidencias del contratista (${quejas.length})</div>
    <div class="mini-list">
      ${quejas
        .map((q) => `
        <div class="mini-item">
          <div class="mini-item-head"><strong>${esc(q.tipo)}</strong><span>${esc(fmtDate(q.fecha))} ${q.causa ? badge(q.causa, 'badge-slate') : ''} ${q.esGeneral ? badge('General', 'badge-slate') : q.unidades ? `<span class="muted-sm">${esc(q.unidades)}</span>` : ''}</span></div>
          ${q.descripcion ? `<div class="mini-item-desc">${esc(q.descripcion)}</div>` : ''}
          ${photosHtml(q.fotos, 'Fotos')}
        </div>`)
        .join('')}
    </div>`;
}

function tallerCardHtml(d: TallerDetailExt, showSub: boolean, subName: (id: string) => string): string {
  const { taller, validacion, entrega, dias, comentario, quejasAsociadas, bitacora, ciclo, fechasAsociadas } = d;
  const lib = LIBERACION_BADGE[validacion?.resultado || 'PENDIENTE'];
  const ent = ENTREGA_BADGE[entrega?.estado || 'NO ENTREGADO'];

  const incidenciasHtml = quejasAsociadas.length
    ? `
      <div class="sub-section-title">Incidencias de este taller (${quejasAsociadas.length})</div>
      <div class="mini-list">
        ${quejasAsociadas
          .map((q) => `
          <div class="mini-item">
            <div class="mini-item-head"><strong>${esc(q.tipo)}</strong><span>${esc(fmtDate(q.fecha))} ${q.esGeneral ? badge('General', 'badge-slate') : ''} ${q.causa ? badge(q.causa, 'badge-slate') : ''}</span></div>
            ${q.descripcion ? `<div class="mini-item-desc">${esc(q.descripcion)}</div>` : ''}
            ${photosHtml(q.fotos, 'Fotos')}
          </div>`)
          .join('')}
      </div>`
    : '';

  const bitacoraHtml = bitacora.length
    ? `
      <div class="sub-section-title">Bitácora de este taller (${bitacora.length})</div>
      <div class="mini-list">
        ${[...bitacora]
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .map((b) => {
            const llegoB = b.llego ? badge(b.llego === 'SI' ? 'Personal asignado' : 'Sin personal', b.llego === 'SI' ? 'badge-green' : 'badge-red') : '';
            const compB = b.completo === 'COMPLETADO' ? badge('Completado', 'badge-green')
              : b.completo === 'EN PROCESO' ? badge('En proceso', 'badge-amber')
              : b.completo === 'SIN INICIAR' ? badge('Sin iniciar', 'badge-slate')
              : '';
            return `
          <div class="mini-item">
            <div class="mini-item-head"><strong>${esc(fmtDate(b.fecha))}</strong><span>${llegoB} ${compB}</span></div>
            ${b.motivo ? `<div class="mini-item-desc">Motivo: ${esc(b.motivo)}${b.responsable ? ` (${esc(b.responsable)})` : ''}</div>` : ''}
            ${b.accion ? `<div class="mini-item-desc">Acción: ${esc(b.accion)}</div>` : ''}
            ${b.notas ? `<div class="mini-item-desc">${esc(b.notas)}</div>` : ''}
            ${photosHtml(b.fotos, 'Fotos')}
          </div>`;
          })
          .join('')}
      </div>`
    : '';

  const comentariosCicloHtml = (ciclo?.comentarios?.length)
    ? `
      <div class="sub-section-title">Comentarios de avance del taller (${ciclo.comentarios.length})</div>
      <div class="mini-list">
        ${(() => {
          const grupos = new Map<string, { fecha: string; texto: string }[]>();
          [...ciclo.comentarios].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((c) => {
            const dia = c.fecha.slice(0, 10);
            if (!grupos.has(dia)) grupos.set(dia, []);
            grupos.get(dia)!.push(c);
          });
          return [...grupos.entries()]
            .map(([dia, items]) => `
            <div class="mini-item">
              <div class="mini-item-head"><strong>${esc(fmtDate(dia))}</strong></div>
              ${items.map((c) => `<div class="mini-item-desc">${esc(c.texto)}</div>`).join('')}
            </div>`)
            .join('');
        })()}
      </div>`
    : '';

  const fechasPrometidasHtml = fechasAsociadas?.length
    ? `
      <div class="sub-section-title">Fechas prometidas de este taller (${fechasAsociadas.length})</div>
      <div class="mini-list">
        ${fechasAsociadas
          .map((fp) => {
            const dias2 = diasAtrasoFechaPrometida(fp);
            const cumplida = estaCumplida(fp);
            const atrasada = estaAtrasada(fp);
            const estadoB = cumplida ? badge('Cumplida', 'badge-green') : atrasada ? badge(`Atrasada${dias2 ? ` ${dias2}d` : ''}`, 'badge-red') : badge('Pendiente', 'badge-slate');
            return `
          <div class="mini-item">
            <div class="mini-item-head"><strong>${esc(fp.descripcion)}</strong><span>Prometida: ${esc(fmtDate(fp.fechaPrometidaActual))} ${estadoB}</span></div>
            ${photosHtml(fp.fotos, 'Fotos')}
          </div>`;
          })
          .join('')}
      </div>`
    : '';

  return `
    <div class="taller-card">
      <div class="taller-card-head">
        <div class="taller-card-title">${showSub ? `${esc(subName(taller.subcontratistaId))} — ` : ''}${esc(taller.edificio)} ${esc(taller.unidad)} <span class="muted">${esc(taller.actividad)}</span></div>
        <div class="taller-card-badges">${badge(lib.label, lib.cls)} ${badge(ent.label, ent.cls)} ${diasBadge(dias, entrega?.estado === 'ENTREGADO')}</div>
      </div>
      <div class="taller-card-meta">
        Fecha de liberación: <strong>${validacion?.fecha ? esc(fmtDate(validacion.fecha)) : '—'}</strong>
        ${entrega?.estado === 'ENTREGADO' ? ` &nbsp;·&nbsp; Fecha de entrega: <strong>${esc(fmtDate(entrega.fechaEntrega))}</strong>` : ''}
      </div>
      <div class="taller-card-comment">${narrativeHtml(comentario)}</div>
      ${photosHtml(validacion?.fotos, 'Fotos de liberación')}
      ${photosHtml(entrega?.fotos, 'Fotos de entrega')}
      ${incidenciasHtml}
      ${bitacoraHtml}
      ${comentariosCicloHtml}
      ${fechasPrometidasHtml}
    </div>`;
}

export function exportEvaluacionPDF(
  detailList: TallerDetailExt[],
  subs: Subcontratista[],
  periodoLabel: string,
  stats: Stats,
  narrativa: string[],
  subFiltro: Subcontratista | null,
  todasLasQuejas: Queja[] = [],
  parrafoAnalisis: string = ''
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const title = subFiltro ? `Evaluación — ${subFiltro.nombre}` : 'Evaluación — Todos los subcontratistas';

  let bodyHtml: string;

  if (subFiltro) {
    const histHtml = historialIncidenciasHtml(historialIncidenciasContratista(subFiltro.id, todasLasQuejas));
    bodyHtml = histHtml + detailList.map((d) => tallerCardHtml(d, false, subName)).join('');
  } else {
    const grupos = new Map<string, TallerDetailExt[]>();
    detailList.forEach((d) => {
      const key = d.taller.subcontratistaId;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(d);
    });
    bodyHtml = [...grupos.entries()]
      .map(([subId, list]) => `
        <div class="group-block">
          <div class="group-title">${esc(subName(subId))} (${list.length} taller${list.length === 1 ? '' : 'es'})</div>
          ${historialIncidenciasHtml(historialIncidenciasContratista(subId, todasLasQuejas))}
          ${list.map((d) => tallerCardHtml(d, false, subName)).join('')}
        </div>`)
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
  .stat.warning { border-left-color: #D97706; }
  .stat.danger { border-left-color: #E02424; }
  .stat .label { font-size: 10.5px; color: #708090; }
  .stat .value { font-size: 19px; font-weight: 700; }
  .narrative-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #36454F; margin-bottom: 6px; }
  .narrative { background: #F1F2F3; border-left: 4px solid #36454F; border-radius: 8px; padding: 14px 16px; font-size: 12.5px; line-height: 1.6; margin-bottom: 20px; }
  .parrafo-analisis { background: #fff; border: 1px solid #D3D3D3; border-radius: 8px; padding: 12px 16px; font-size: 12px; line-height: 1.6; margin-bottom: 16px; color: #36454F; }
  .narrative-list { margin: 0; padding-left: 18px; }
  .narrative-list li { margin-bottom: 4px; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }
  .badge-red { background: #FDE2E1; color: #B42318; }
  .badge-amber { background: #FEF0C7; color: #92400E; }
  .badge-green { background: #D1FAE5; color: #065F46; }
  .badge-slate { background: #E4E7EB; color: #36454F; }
  .muted-sm { color: #708090; font-size: 9.5px; }
  .group-block { margin-bottom: 26px; }
  .group-title { font-size: 14px; font-weight: 700; background: #36454F; color: #fff; padding: 7px 10px; border-radius: 6px; margin-bottom: 10px; }
  .taller-card { border: 1px solid #D3D3D3; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
  .taller-card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 4px; }
  .taller-card-title { font-size: 12.5px; font-weight: 700; }
  .taller-card-title .muted { font-weight: 400; color: #708090; }
  .taller-card-badges { white-space: nowrap; display: flex; gap: 4px; }
  .taller-card-meta { font-size: 10.5px; color: #708090; margin-bottom: 6px; }
  .taller-card-comment { background: #F1F2F3; border-radius: 6px; padding: 7px 9px; font-size: 11px; line-height: 1.5; margin-bottom: 6px; }
  .taller-card-comment .narrative-list { padding-left: 16px; }
  .sub-section-title { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #708090; margin: 10px 0 4px; }
  .mini-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
  .mini-item { border: 1px solid #E5E5E5; border-radius: 5px; padding: 5px 8px; font-size: 10.5px; }
  .mini-item-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .mini-item-head span { display: flex; gap: 4px; align-items: center; }
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
  <div class="sub">Periodo: ${esc(periodoLabel)} · Generado el ${esc(fmtDate(new Date().toISOString().slice(0, 10)))}</div>

  ${parrafoAnalisis ? `<div class="narrative-title">Análisis general del periodo</div><div class="parrafo-analisis">${esc(parrafoAnalisis)}</div>` : ''}

  <div class="stats">
    <div class="stat"><div class="label">TALLERES</div><div class="value">${stats.totalTalleres}</div></div>
    <div class="stat success"><div class="label">% LIBERADO PARA TRABAJAR</div><div class="value">${stats.pctLiberado}%</div></div>
    <div class="stat warning"><div class="label">% ENTREGADO</div><div class="value">${stats.pctEntregado}%</div></div>
    <div class="stat"><div class="label">PROM. DÍAS</div><div class="value">${stats.promedioDias ?? '—'}</div></div>
    <div class="stat danger"><div class="label">INCIDENCIAS</div><div class="value">${stats.quejasCount}</div></div>
  </div>

  <div class="narrative-title">Evaluación</div>
  <div class="narrative">${narrativeHtml(narrativa)}</div>

  ${bodyHtml}
</body>
</html>`;

  abrirReporteParaImprimir(html);
}
