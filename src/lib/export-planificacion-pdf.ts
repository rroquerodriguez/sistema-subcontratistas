import type { Subcontratista, Taller, Validacion, Entrega, FechaPrometida } from '@/types';
import { fmtDate, todayISO, diffDays, diaLabel, abrirReporteParaImprimir } from './utils-app';
import { COLUMNAS_PLANIFICACION_DEFAULT } from './export-planificacion-excel';
import { diasAtrasoFechaPrometida, estaAtrasada, estaCumplida } from './stats-engine';

const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function esc(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function badge(text: string, cls: string): string {
    return `<span class="badge ${cls}">${esc(text)}</span>`;
}

const PRIORIDAD_BADGE: Record<string, { label: string; cls: string }> = {
    '1': { label: 'Alta', cls: 'badge-red' },
    '2': { label: 'Media', cls: 'badge-amber' },
    '3': { label: 'Baja', cls: 'badge-slate' },
};
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

function sortByDiaPrioridad(a: Taller, b: Taller): number {
    return DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia) || Number(a.prioridad) - Number(b.prioridad);
}

const COLUMNA_LABEL: Record<string, string> = {
    proyecto: 'Proyecto', edificio: 'Edificio/Villa/Townhouse', unidad: 'Unidad', actividad: 'Actividad', prioridad: 'Prior.',
    dia: 'Día', tecnico: 'Técnico', inspector: 'Inspector', fechaPromesa: 'F. Promesa', estadoLiberacion: 'Liberación',
    fechaLiberacion: 'F. Liberación', estadoEntrega: 'Entrega', fechaEntrega: 'F. Entrega', dias: 'Días', observaciones: 'Observaciones',
};

function celdaHtml(key: string, t: Taller, v: Validacion | undefined, e: Entrega | undefined, dias: number | null): string {
    switch (key) {
      case 'proyecto': return `<td>${esc(t.proyecto)}</td>`;
      case 'edificio': return `<td>${esc(t.edificio)}</td>`;
      case 'unidad': return `<td>${t.esGeneral ? badge('GENERAL', 'badge-slate') : esc(t.unidad)}</td>`;
      case 'actividad': return `<td>${esc(t.actividad)}</td>`;
      case 'prioridad': { const p = PRIORIDAD_BADGE[t.prioridad] || PRIORIDAD_BADGE['2']; return `<td>${badge(p.label, p.cls)}</td>`; }
      case 'dia': return `<td>${esc(diaLabel(t.semana, t.dia))}</td>`;
      case 'tecnico': return `<td>${esc(t.tecnico)}</td>`;
      case 'inspector': return `<td>${esc(t.inspector)}</td>`;
      case 'fechaPromesa': return `<td>${t.fechaPromesa ? esc(fmtDate(t.fechaPromesa)) : '—'}</td>`;
      case 'estadoLiberacion': { const l = LIBERACION_BADGE[v?.resultado || 'PENDIENTE']; return `<td>${badge(l.label, l.cls)}</td>`; }
                    case 'fechaLiberacion': return `<td>${v?.fecha ? esc(fmtDate(v.fecha)) : '—'}</td>`;
      case 'estadoEntrega': { const en = ENTREGA_BADGE[e?.estado || 'NO ENTREGADO']; return `<td>${badge(en.label, en.cls)}</td>`; }
      case 'fechaEntrega': return `<td>${e?.fechaEntrega ? esc(fmtDate(e.fechaEntrega)) : '—'}</td>`;
      case 'dias': return `<td>${diasBadge(dias, e?.estado === 'ENTREGADO')}</td>`;
      case 'observaciones': return `<td>${esc(v?.observaciones || '')}</td>`;
      default: return '<td>—</td>';
    }
}

function rowsHtml(talleres: Taller[], validaciones: Validacion[], entregas: Entrega[], showSub: boolean, subName: (id: string) => string, columnas: string[]): string {
    return [...talleres].sort(sortByDiaPrioridad)
      .map((t) => {
              const v = validaciones.find((x) => x.tallerId === t.id);
              const e = entregas.find((x) => x.tallerId === t.id);
              let dias: number | null = null;
              if (v?.resultado === 'LISTO' && v.fecha) {
                        const hasta = e?.estado === 'ENTREGADO' && e.fechaEntrega ? e.fechaEntrega : todayISO();
                        dias = diffDays(v.fecha, hasta);
              }
              return `
                    <tr>
                            ${showSub ? `<td>${esc(subName(t.subcontratistaId))}</td>` : ''}
                                    ${columnas.map((key) => celdaHtml(key, t, v, e, dias)).join('')}
                                          </tr>`;
      })
      .join('');
}

function tableHead(showSub: boolean, columnas: string[]): string {
    return `<thead><tr>${showSub ? '<th>Subcontratista</th>' : ''}${columnas.map((key) => `<th>${esc(COLUMNA_LABEL[key] || key)}</th>`).join('')}</tr></thead>`;
}

function fechasPrometidasHtml(fechas: FechaPrometida[], showSub: boolean, subName: (id: string) => string): string {
    if (!fechas.length) return '';
    const rows = fechas
      .map((fp) => {
              const dias = diasAtrasoFechaPrometida(fp);
              const cumplida = estaCumplida(fp);
              const atrasada = estaAtrasada(fp);
              const estadoB = cumplida ? badge('Cumplida', 'badge-green') : atrasada ? badge(`Atrasada${dias ? ` ${dias}d` : ''}`, 'badge-red') : badge('Pendiente', 'badge-slate');
              return `
                    <tr>
                            ${showSub ? `<td>${esc(subName(fp.subcontratistaId))}</td>` : ''}
                                    <td>${esc(fp.descripcion)}</td>
                                            <td>${fp.esGeneral ? badge('GENERAL', 'badge-slate') : esc(fp.unidades)}</td>
                                                    <td>${esc(fmtDate(fp.fechaPrometidaActual))}</td>
                                                            <td>${estadoB}</td>
                                                                  </tr>`;
      })
      .join('');
    return `
        <div class="fechas-prometidas-block">
              <div class="fechas-prometidas-title">Fechas prometidas vigentes (${fechas.length})</div>
                    <table>
                            <thead><tr>${showSub ? '<th>Subcontratista</th>' : ''}<th>Descripción</th><th>Unidades</th><th>Fecha prometida</th><th>Estado</th></tr></thead>
                                    <tbody>${rows}</tbody>
                                          </table>
                                              </div>`;
}

export function exportPlanificacionPDF(
    talleres: Taller[],
    validaciones: Validacion[],
    entregas: Entrega[],
    subs: Subcontratista[],
    periodoLabel: string,
    subFiltro: Subcontratista | null,
    columnas: string[] = COLUMNAS_PLANIFICACION_DEFAULT,
    fechasPrometidas: FechaPrometida[] = []
  ) {
    const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
    const title = subFiltro ? `Planificación semanal — ${subFiltro.nombre}` : 'Planificación semanal — Todos los subcontratistas';

  const fechasRelevantes = subFiltro ? fechasPrometidas.filter((fp) => fp.subcontratistaId === subFiltro.id) : fechasPrometidas;
    const fechasHtml = fechasPrometidasHtml(fechasRelevantes, !subFiltro, subName);

  let bodyHtml: string;
    if (subFiltro) {
          bodyHtml = `<table>${tableHead(false, columnas)}<tbody>${rowsHtml(talleres, validaciones, entregas, false, subName, columnas)}</tbody></table>`;
    } else {
          const subIds = [...new Set(talleres.map((t) => t.subcontratistaId))];
          bodyHtml = subIds
            .map((subId) => {
                      const subTalleres = talleres.filter((t) => t.subcontratistaId === subId);
                      return `
                              <div class="group-block">
                                        <div class="group-title">${esc(subName(subId))} (${subTalleres.length} taller${subTalleres.length === 1 ? '' : 'es'})</div>
                                                  <table>${tableHead(false, columnas)}<tbody>${rowsHtml(subTalleres, validaciones, entregas, false, subName, columnas)}</tbody></table>
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
          .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }
            .badge-red { background: #FDE2E1; color: #B42318; }
              .badge-amber { background: #FEF0C7; color: #92400E; }
                .badge-green { background: #D1FAE5; color: #065F46; }
                  .badge-slate { background: #E4E7EB; color: #36454F; }
                    .group-block { margin-bottom: 22px; page-break-inside: avoid; }
                      .group-title { font-size: 14px; font-weight: 700; background: #36454F; color: #fff; padding: 7px 10px; border-radius: 6px 6px 0 0; }
                        .fechas-prometidas-block { margin-bottom: 24px; }
                          .fechas-prometidas-title { font-size: 13px; font-weight: 700; color: #36454F; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 2px solid #36454F; }
                            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
                              th, td { border-bottom: 1px solid #D3D3D3; padding: 6px 7px; text-align: left; }
                                th { background: #708090; color: #fff; font-weight: 600; }
                                  @media print { body { padding: 14px; } }
                                  </style>
                                  </head>
                                  <body>
                                    <h1>${esc(title)}</h1>
                                      <div class="sub">Periodo: ${esc(periodoLabel)} · Generado el ${esc(fmtDate(new Date().toISOString().slice(0, 10)))} · ${talleres.length} taller(es)</div>
                                        ${fechasHtml}
                                          ${bodyHtml}
                                          </body>
                                          </html>`;

  abrirReporteParaImprimir(html);
}
