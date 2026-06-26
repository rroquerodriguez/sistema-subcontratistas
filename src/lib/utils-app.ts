export function uid(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDateShort(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

const DIAS_SEMANA_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Devuelve la fecha ISO del día de la semana dado el lunes de esa semana */
export function fechaDeISODia(semanaLunes: string, dia: string): string {
  const idx = DIAS_SEMANA_ORDER.indexOf(dia);
  if (idx < 0 || !semanaLunes) return semanaLunes;
  const d = new Date(semanaLunes + 'T00:00:00');
  d.setDate(d.getDate() + idx);
  return d.toISOString().slice(0, 10);
}

/** Etiqueta completa: "Lunes 23/06/26" */
export function diaLabel(semanaLunes: string, dia: string): string {
  const iso = fechaDeISODia(semanaLunes, dia);
  return `${dia} ${fmtDateShort(iso)}`;
}

/** Convierte un ISO date (YYYY-MM-DD) a un objeto Date de JS en mediodía local, para que xlsx lo
 * exporte como fecha real de Excel (ordenable, reconocible), evitando desfases de zona horaria. */
export function excelDateValue(iso: string): Date | null {
  if (!iso) return null;
  return new Date(iso + 'T12:00:00');
}

export function diffDays(dateA: string, dateB: string): number | null {
  if (!dateA || !dateB) return null;
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function weekRangeLabel(weekStart: string): string {
  if (!weekStart) return '';
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 5);
  return `${fmtDate(weekStart)} - ${fmtDate(end.toISOString().slice(0, 10))}`;
}

export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

const AVATAR_MAP = [
  { bg: '#E8EAEC', fg: '#36454F' },
  { bg: '#DEE2E6', fg: '#36454F' },
  { bg: '#D3D3D3', fg: '#36454F' },
  { bg: '#C8CDD2', fg: '#FFFFFF' },
  { bg: '#708090', fg: '#FFFFFF' },
  { bg: '#5A6672', fg: '#FFFFFF' },
];

export function avatarColorFor(id: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return AVATAR_MAP[h % AVATAR_MAP.length];
}

export async function compressImage(file: File, maxW = 1000, quality = 0.7): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW) {
          height = Math.round(height * (maxW / width));
          width = maxW;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function nowISODatetime(): string {
  return new Date().toISOString();
}

export function fmtDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtHora(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

/** Fecha ISO (solo día, YYYY-MM-DD) a partir de un timestamp ISO datetime completo */
export function soloFecha(isoDatetime: string): string {
  if (!isoDatetime) return '';
  return isoDatetime.slice(0, 10);
}

/** Duración legible entre dos timestamps ISO datetime */
export function durHumana(fromISO: string, toISO: string): string {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  if (ms < 0) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} día${days === 1 ? '' : 's'}`;
}

const MESES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Clave de mes a partir de una fecha ISO: "2026-06" */
export function mesKeyOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** Clave de mes actual */
export function mesKeyActual(): string {
  return mesKeyOf(todayISO());
}

/** Etiqueta legible de una clave de mes: "Junio 2026" */
export function mesLabel(mesKey: string): string {
  const [y, m] = mesKey.split('-').map(Number);
  return `${MESES_LARGO[m - 1]} ${y}`;
}

/** Primer y último día ISO de un mes dado su mesKey */
export function rangoDelMes(mesKey: string): { inicio: string; fin: string } {
  const [y, m] = mesKey.split('-').map(Number);
  const inicio = new Date(y, m - 1, 1).toISOString().slice(0, 10);
  const fin = new Date(y, m, 0).toISOString().slice(0, 10);
  return { inicio, fin };
}

/** Devuelve los lunes (claves de semana) de todas las semanas que tocan el mes dado */
export function semanasDelMes(mesKey: string): string[] {
  const { inicio, fin } = rangoDelMes(mesKey);
  let cursor = mondayOf(inicio);
  const weeks: string[] = [];
  while (cursor <= fin) {
    weeks.push(cursor);
    const d = new Date(cursor + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    cursor = d.toISOString().slice(0, 10);
  }
  return weeks;
}

/** Mes siguiente/anterior a partir de un mesKey */
export function addMeses(mesKey: string, delta: number): string {
  const [y, m] = mesKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

