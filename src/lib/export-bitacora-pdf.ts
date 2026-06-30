import type { Subcontratista, RegistroBitacora, Taller, CicloTaller, Queja } from '@/types';
import { fmtDate, fmtHora, soloFecha, todayISO, abrirReporteParaImprimir } from './utils-app';
import { buildNarrativeBitacora, duracionCiclo, quejasDelTaller } from './stats-engine';

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

const ESTADO_CICLO_BADGE: Record<string, string> = {
  'NO INICIADO': 'badge-slate',
  'EN PROCESO': 'badge-amber',
  COMPLETADO: 'badge-green',
};

function photosHtml(fotos: string[] | undefined): string {
  if (!fotos || !fotos.length) return '';
  return `
    <div class="photo-block">
      <div class="photo-label">Fotos (${fotos.length})</div>
      <div class="photo-row">
        ${fotos.map((f) => `<img class="photo-thumb" src="${f}" />`).join('')}
      </div>
    </div>`;
}

function cicloCardHtml(ciclo: CicloTaller, taller: Taller | undefined, showSub: boolean, subName: (id: string) => string): string {
  if (!taller) return '';
  const dur = duracionCiclo(ciclo);

  const gruposPorFecha = new Map<string, { fecha: string; texto: string }[]>();
  [...ciclo.comentarios].sort((a, b) => b.fecha.localeCompare(a.fecha)).forEach((c) => {
    const dia = soloFecha(c.fecha);
    if (!gruposPorFecha.has(dia)) gruposPorFecha.set(dia, []);
    gruposPorFecha.get(dia)!.push(c);
  });

  const comentariosHtml = ciclo.comentarios.length
    ? `
      <div class="sub-section-title">Comentarios de avance (${ciclo.comentarios.length})</div>
      <div class="mini-list">
        ${[...gruposPorFecha.entries()]
          .map(([dia, items]) => `
          <div class="mini-item">
            <div class="mini-item-head"><strong>${esc(fmtDate(dia))}</strong></div>
            ${items.map((c) => `<div class="comment-line"><span class="comment-time">${esc(fmtHora(c.fecha))}</span> ${esc(c.texto)}</div>`).join('')}
          </div>`)
          .join('')}
      </div>`
    : '';

  return `
    <div class="reg-card">
      <div class="reg-card-head">
        <div class="reg-card-title">${showSub ? `${esc(subName(taller.subcontratistaId))} — ` : ''}${esc(taller.edificio)} ${esc(taller.unidad)} <span class="muted-sm">${esc(taller.actividad)}</span></div>
        <div class="reg-card-badges">${badge(ciclo.estado, ESTADO_CICLO_BADGE[ciclo.estado] || 'badge-slate')}</div>
      </div>
      ${ciclo.fechaInicio ? `<div class="reg-card-desc">Inicio: <strong>${esc(fmtDate(ciclo.fechaInicio))}</strong>${ciclo.estado === 'COMPLETADO' && ciclo.fechaCierre ? ` &nbsp;·&nbsp; Cierre: <strong>${esc(fmtDate(ciclo.fechaCierre))}</strong>` : ''}${dur !== null ? ` &nbsp;·&nbsp; ${ciclo.estado === 'COMPLETADO' ? 'Duración' : 'Lleva'}: <strong>${dur} día${dur === 1 ? '' : 's'}</strong>` : ''}</div>` : ''}
      ${comentariosHtml}
    </div>`;
}

function bitacoraCardHtml(b: RegistroBitacora, talleres: Taller[], quejas: Queja[], showSub: boolean, subName: (id: string) => string): string {
  const t = talleres.find((x) => x.id === b.tallerId);
  const llegoBadge = b.llego ? badge(b.llego === 'SI' ? 'Personal asignado' : 'Sin personal', b.llego === 'SI' ? 'badge-green' : 'badge-red') : '';
  const compBadge = b.completo === 'COMPLETADO' ? badge('Completado', 'badge-green')
    : b.completo === 'EN PROCESO' ? badge('En proceso', 'badge-amber')
    : b.completo === 'SIN INICIAR' ? badge('Sin iniciar', 'badge-slate')
    : '';
  const incidenciasTaller = t ? quejasDelTaller(t, quejas) : [];
  const incidenciasHtml = incidenciasTaller.length
    ? `<div class="reg-card-desc reg-card-incidencias">${badge(`${incidenciasTaller.length} incidencia(s)`, 'badge-red')} ${incidenciasTaller.map((q) => esc(q.tipo)).join(', ')}</div>`
    : '';
  return `
    <div class="reg-card">
      <div class="reg-card-head">
        <div class="reg-card-title">${esc(fmtDate(b.fecha))} — ${showSub && t ? `${esc(subName(t.subcontratistaId))} · ` : ''}${esc(t ? (t.esGeneral ? `${t.edificio} (GENERAL)` : `${t.edificio} ${t.unidad}`) : '—')}</div>
        <div class="reg-card-badges">${llegoBadge} ${compBadge}</div>
      </div>
      ${b.motivo ? `<div class="reg-card-desc">Motivo: ${esc(b.motivo)}${b.responsable ? ` (${esc(b.responsable)})` : ''}</div>` : ''}
      ${b.accion ? `<div class="reg-card-desc">Acción: ${esc(b.accion)}</div>` : ''}
      ${b.notas ? `<div class="reg-card-desc">${esc(b.notas)}</div>` : ''}
      ${incidenciasHtml}
      ${photosHtml(b.fotos)}
    </div>`;
}

export function exportBitacoraPDF(
  registros: RegistroBitacora[],
  talleres: Taller[],
  subs: Subcontratista[],
  subFiltro: Subcontratista | null,
  ciclos: CicloTaller[] = [],
  periodoLabel: string = '',
  parrafoAnalisis: string = '',
  quejas: Queja[] = []
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const title = subFiltro ? `Reporte de bitácora — ${subFiltro.nombre}` : 'Reporte de bitácora — Todos los subcontratistas';
  const narrativa = buildNarrativeBitacora(subFiltro, registros);

  const talleresRelevantes = subFiltro ? talleres.filter((t) => t.subcontratistaId === subFiltro.id) : talleres;
  const ciclosRelevantes = ciclos.filter((c) => c.comentarios.length > 0 && talleresRelevantes.some((t) => t.id === c.tallerId));

  let avanceHtml = '';
  let bodyHtml: string;
  if (subFiltro) {
    avanceHtml = ciclosRelevantes.map((c) => cicloCardHtml(c, talleres.find((t) => t.id === c.tallerId), false, subName)).join('');
    bodyHtml = [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((b) => bitacoraCardHtml(b, talleres, quejas, false, subName)).join('');
  } else {
    const subIds = [...new Set(registros.map((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId).filter(Boolean))] as string[];
    bodyHtml = subIds
      .map((subId) => {
        const subRegistros = registros.filter((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId === subId);
        const subNarrativa = buildNarrativeBitacora(subs.find((s) => s.id === subId) || null, subRegistros);
        const subCiclos = ciclos.filter((c) => c.comentarios.length > 0 && talleres.find((t) => t.id === c.tallerId)?.subcontratistaId === subId);
        const subAvanceHtml = subCiclos.map((c) => cicloCardHtml(c, talleres.find((t) => t.id === c.tallerId), false, subName)).join('');
        return `
        <div class="group-block">
          <div class="group-title">${esc(subName(subId))} (${subRegistros.length} registro${subRegistros.length === 1 ? '' : 's'})</div>
          <div class="group-narrative">${narrativeHtml(subNarrativa)}</div>
          ${subAvanceHtml ? `<div class="sub-section-title">Avance de talleres con comentarios</div>${subAvanceHtml}` : ''}
          ${[...subRegistros].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((b) => bitacoraCardHtml(b, talleres, quejas, false, subName)).join('')}
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
  .parrafo-analisis { background: #fff; border: 1px solid #D3D3D3; border-radius: 8px; padding: 12px 16px; font-size: 12px; line-height: 1.6; margin-bottom: 16px; color: #36454F; }
  .narrative-list { margin: 0; padding-left: 18px; }
  .narrative-list li { margin-bottom: 4px; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }
  .badge-red { background: #FDE2E1; color: #B42318; }
  .badge-amber { background: #FEF0C7; color: #92400E; }
  .badge-green { background: #D1FAE5; color: #065F46; }
  .badge-slate { background: #E4E7EB; color: #36454F; }
  .group-block { margin-bottom: 26px; }
  .group-title { font-size: 14px; font-weight: 700; background: #36454F; color: #fff; padding: 7px 10px; border-radius: 6px; margin-bottom: 4px; }
  .group-narrative { background: #F1F2F3; font-size: 11.5px; padding: 8px 10px; line-height: 1.5; margin-bottom: 10px; border-radius: 6px; }
  .sub-section-title { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #708090; margin: 10px 0 4px; }
  .muted-sm { color: #708090; font-weight: 400; font-size: 10px; }
  .mini-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
  .mini-item { border: 1px solid #E5E5E5; border-radius: 5px; padding: 5px 8px; font-size: 10.5px; }
  .mini-item-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 2px; }
  .comment-line { color: #5A5A5A; margin-top: 2px; }
  .comment-time { color: #708090; font-size: 9.5px; margin-right: 4px; }
  .reg-card { border: 1px solid #D3D3D3; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; page-break-inside: avoid; }
  .reg-card-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .reg-card-title { font-size: 12px; font-weight: 700; }
  .reg-card-badges { white-space: nowrap; }
  .reg-card-desc { font-size: 10.5px; color: #5A5A5A; margin-top: 2px; }
  .reg-card-incidencias { display: flex; align-items: center; gap: 5px; }
  .photo-block { margin-top: 6px; }
  .photo-label { font-size: 9px; font-weight: 600; color: #708090; text-transform: uppercase; margin-bottom: 3px; }
  .photo-row { display: flex; gap: 5px; flex-wrap: wrap; }
  .photo-thumb { width: 70px; height: 70px; object-fit: cover; border-radius: 5px; border: 1px solid #D3D3D3; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="sub">${periodoLabel ? `Periodo: ${esc(periodoLabel)} · ` : ''}Generado el ${esc(fmtDate(todayISO()))} · ${registros.length} registro(s)</div>

  ${parrafoAnalisis ? `<div class="narrative-title">Análisis general del periodo</div><div class="parrafo-analisis">${esc(parrafoAnalisis)}</div>` : ''}

  <div class="narrative-title">Análisis</div>
  <div class="narrative">${narrativeHtml(narrativa)}</div>

  ${avanceHtml ? `<div class="sub-section-title">Avance de talleres con comentarios</div>${avanceHtml}` : ''}

  ${bodyHtml}
</body>
</html>`;

  abrirReporteParaImprimir(html);
}
