import type { Subcontratista, Taller, Validacion, Entrega } from '@/types';
import { fmtDate, todayISO, diffDays, diaLabel, abrirReporteParaImprimir } from './utils-app';
import { COLUMNAS_LIBERACION_DEFAULT } from './export-liberacion-excel';

const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function esc(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

function sortByDia(a: Taller, b: Taller): number {
    return DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia);
}

const COLUMNA_LABEL: Record<string, string> = {
    proyecto: 'Proyecto', edificio: 'Edificio/Villa/Townhouse', unidad: 'Unidad', actividad: 'Actividad', dia: 'Día',
    estadoLiberacion: 'Liberación', fechaLiberacion: 'F. Liberación', validadoPor: 'Validado por',
    observacionesLiberacion: 'Observaciones', estadoEntrega: 'Entrega', fechaEntrega: 'F. Entrega', calidad: 'Calidad', dias: 'Días',
};

function celdaHtml(key: string, t: Taller, v: Validacion | undefined, e: Entrega | undefined, dias: number | null): string {
    switch (key) {
      case 'proyecto': return `<td>${esc(t.proyecto)}</td>`;
      case 'edificio': return `<td>${esc(t.edificio)}</td>`;
      case 'unidad': return `<td>${t.esGeneral ? badge('GENERAL', 'badge-slate') : esc(t.unidad)}</td>`;
      case 'actividad': return `<td>${esc(t.actividad)}</td>`;
      case 'dia': return `<td>${esc(diaLabel(t.semana, t.dia))}</td>`;
      case 'estadoLiberacion': { const l = LIBERACION_BADGE[v?.resultado || 'PENDIENTE']; return `<td>${badge(l.label, l.cls)}</td>`; }
      case 'fechaLiberacion': return `<td>${v?.fecha ? esc(fmtDate(v.fecha)) : '—'}</td>`;
      case 'validadoPor': return `<td>${esc(v?.validadoPor || '')}</td>`;
      case 'observacionesLiberacion': return `<td>${esc(v?.observaciones || '')}</td>`;
      case 'estadoEntrega': { const en = ENTREGA_BADGE[e?.estado || 'NO ENTREGADO']; return `<td>${badge(en.label, en.cls)}</td>`; }
      case 'fechaEntrega': return `<td>${e?.fechaEntrega ? esc(fmtDate(e.fechaEntrega)) : '—'}</td>`;
      case 'calidad': return `<td>${esc(e?.calidad || '')}</td>`;
      case 'dias': return `<td>${diasBadge(dias, e?.estado === 'ENTREGADO')}</td>`;
      default: return '<td>—</td>';
    }
}

function rowsHtml(talleres: Taller[], validaciones: Validacion[], entregas: Entrega[], showSub: boolean, subName: (id: string) => string, columnas: string[]): string {
    return [...talleres].sort(sortByDia)
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

export function exportLiberacionPDF(
    talleres: Taller[],
    validaciones: Validacion[],
    entregas: Entrega[],
    subs: Subcontratista[],
    periodoLabel: string,
    subFiltro: Subcontratista | null,
    columnas: string[] = COLUMNAS_LIBERACION_DEFAULT
  ) {
    const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
    const title = subFiltro ? `Liberación y entrega — ${subFiltro.nombre}` : 'Liberación y entrega — Todos los subcontratistas';

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
                        table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
                          th, td { border-bottom: 1px solid #D3D3D3; padding: 6px 7px; text-align: left; }
                            th { background: #708090; color: #fff; font-weight: 600; }
                              @media print { body { padding: 14px; } }
                              </style>
                              </head>
                              <body>
                                <h1>${esc(title)}</h1>
                                  <div class="sub">Periodo: ${esc(periodoLabel)} · Generado el ${esc(fmtDate(new Date().toISOString().slice(0, 10)))} · ${talleres.length} taller(es)</div>
                                    ${bodyHtml}
                                    </body>
                                    </html>`;

  abrirReporteParaImprimir(html);
}
