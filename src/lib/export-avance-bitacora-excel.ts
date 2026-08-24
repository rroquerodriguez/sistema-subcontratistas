import * as XLSX from 'xlsx';
import type { Subcontratista, Taller, CicloTaller, RegistroBitacora } from '@/types';
import { excelDateValue, todayISO } from './utils-app';

const ESTADO_LABEL: Record<string, string> = {
  'NO INICIADO': 'Sin iniciar',
  'EN PROCESO': 'En proceso',
  COMPLETADO: 'Completado',
};

interface ResumenAvanceExcel {
  conPersonal: number;
  completados: number;
  enProceso: number;
  sinIniciar: number;
}

/** Exporta a Excel el avance de talleres de un día específico: una fila por taller (no por
 * comentario), con el último comentario y cuántos tiene en total — más una hoja de resumen. */
export function exportAvanceBitacoraExcel(
  talleres: Taller[],
  subs: Subcontratista[],
  ciclos: CicloTaller[],
  bitacora: RegistroBitacora[],
  fechaActiva: string,
  diaLabel: string,
  resumen?: ResumenAvanceExcel
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const cicloDe = (tallerId: string): CicloTaller =>
    ciclos.find((c) => c.tallerId === tallerId) || { id: '', tallerId, estado: 'NO INICIADO', fechaInicio: '', fechaCierre: '', comentarios: [] };
  const registroDe = (tallerId: string) => bitacora.find((b) => b.tallerId === tallerId && b.fecha === fechaActiva);

  const wb = XLSX.utils.book_new();

  const rows = talleres.map((t) => {
    const ciclo = cicloDe(t.id);
    const registro = registroDe(t.id);
    const comentariosOrdenados = [...ciclo.comentarios].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ultimo = comentariosOrdenados[0];
    return {
      Fecha: excelDateValue(fechaActiva),
      Subcontratista: subName(t.subcontratistaId),
      Taller: t.esGeneral ? `${t.edificio} (GENERAL)` : `${t.edificio} ${t.unidad}`,
      Actividad: t.actividad,
      Personal: registro?.llego || '',
      Estado: ESTADO_LABEL[ciclo.estado] || ciclo.estado,
      'Último comentario': ultimo?.texto || '',
      'Comentarios (#)': ciclo.comentarios.length,
      'Registrado por': ultimo?.autor || '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `Avance ${diaLabel}`.slice(0, 31));

  if (resumen) {
    const resumenRows = [
      { Indicador: 'Con personal hoy', Cantidad: resumen.conPersonal },
      { Indicador: 'Completados', Cantidad: resumen.completados },
      { Indicador: 'En proceso', Cantidad: resumen.enProceso },
      { Indicador: 'Sin iniciar', Cantidad: resumen.sinIniciar },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), 'Resumen');
  }

  const fname = `bitacora_avance_${diaLabel.replace(/[\s/]+/g, '_')}_${todayISO()}.xlsx`;
  XLSX.writeFile(wb, fname);
}
