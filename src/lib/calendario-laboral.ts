import type { CalendarioLaboral, DiaSemanaCompleto } from '@/types';
import { dateToISOLocal } from './utils-app';

/* ------------------------------------------------------------------------------------------------
 * MOTOR DE DÍAS LABORABLES
 *
 * Traduce el calendario laboral de la obra (qué días de la semana se trabaja + feriados) en cálculos
 * concretos de fechas: cuántos días laborables hay entre dos fechas, y qué fecha resulta de sumar N
 * días laborables a una fecha dada. Es la base de los estándares de duración por actividad (7b) y de
 * las métricas de responsabilidad (7c).
 *
 * Convención de conteo: los cálculos son en DÍAS COMPLETOS (Nivel A). El horario del calendario es
 * dato documental de la obra y no interviene en el conteo.
 * ---------------------------------------------------------------------------------------------- */

// getDay() de JS: 0=Domingo, 1=Lunes ... 6=Sábado. Mapa a nuestros nombres.
const NOMBRE_DIA_JS: DiaSemanaCompleto[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Convierte 'YYYY-MM-DD' a Date local (mediodía, para evitar cualquier corrimiento por zona horaria) */
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** ¿Esta fecha (YYYY-MM-DD) es un día laborable según el calendario? (día de semana marcado y no feriado) */
export function esDiaLaborable(iso: string, cal: CalendarioLaboral): boolean {
  if (cal.feriados.includes(iso)) return false;
  const nombre = NOMBRE_DIA_JS[parseLocal(iso).getDay()];
  return cal.diasLaborables.includes(nombre);
}

/** Cuenta los días LABORABLES en el rango (desde, hasta]. Es decir, cuántos días de trabajo
 * transcurrieron DESPUÉS de 'desde' hasta llegar a 'hasta' inclusive. Ejemplos con L-S laborable:
 *   desde=viernes, hasta=lunes  -> 1 (sábado cuenta, domingo no, lunes cuenta = 2)... ver nota abajo.
 * Nota: contamos avanzando día a día desde el siguiente a 'desde' hasta 'hasta', sumando 1 por cada
 * día laborable. Si hasta <= desde, devuelve 0 (o negativo si se pide con signo). */
export function diasLaborablesEntre(desde: string, hasta: string, cal: CalendarioLaboral): number {
  const dDesde = parseLocal(desde);
  const dHasta = parseLocal(hasta);
  if (dHasta <= dDesde) return 0;
  let count = 0;
  const cursor = new Date(dDesde);
  while (cursor < dHasta) {
    cursor.setDate(cursor.getDate() + 1);
    if (esDiaLaborable(dateToISOLocal(cursor), cal)) count++;
  }
  return count;
}

/** Suma N días laborables a una fecha y devuelve la fecha resultante (YYYY-MM-DD). Salta los días no
 * laborables. Ejemplo con L-S: sumar 3 días laborables a un viernes -> martes siguiente (sáb=1, lun=2,
 * mar=3; el domingo se salta). Si n=0 devuelve la misma fecha. */
export function sumarDiasLaborables(desde: string, n: number, cal: CalendarioLaboral): string {
  if (n <= 0) return desde;
  const cursor = parseLocal(desde);
  let restantes = n;
  // Salvaguarda contra un calendario sin ningún día laborable (evita bucle infinito)
  let guardia = 0;
  const MAX = 3650;
  while (restantes > 0 && guardia < MAX) {
    cursor.setDate(cursor.getDate() + 1);
    guardia++;
    if (esDiaLaborable(dateToISOLocal(cursor), cal)) restantes--;
  }
  return dateToISOLocal(cursor);
}

/** Etiqueta legible de los días laborables configurados, ej: "Lun a Sáb" o "Lun, Mié, Vie" */
export function resumenDiasLaborables(cal: CalendarioLaboral): string {
  const orden: DiaSemanaCompleto[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const abrev: Record<DiaSemanaCompleto, string> = {
    Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mié', Jueves: 'Jue', Viernes: 'Vie', Sábado: 'Sáb', Domingo: 'Dom',
  };
  const activos = orden.filter((d) => cal.diasLaborables.includes(d));
  if (activos.length === 0) return 'Ningún día';
  // ¿Es un rango contiguo? (ej. Lun a Sáb)
  const indices = activos.map((d) => orden.indexOf(d));
  const contiguo = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  if (contiguo && activos.length > 2) return `${abrev[activos[0]]} a ${abrev[activos[activos.length - 1]]}`;
  return activos.map((d) => abrev[d]).join(', ');
}
