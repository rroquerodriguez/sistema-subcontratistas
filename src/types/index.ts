export interface Subcontratista {
  id: string;
  nombre: string;
  especialidad: string;
  contacto: string;
  telefono: string;
  correo: string;
  notas: string;
}

export type Proyecto = 'PANORAMA PARK' | 'PANORAMA GARDEN';
export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
export type Prioridad = '1' | '2' | '3';

/** Unidad del proyecto importada del reporte de unidades (Excel general del proyecto) */
export interface UnidadProyecto {
  id: string;
  proyecto: string;
  edificio: string; // "Vivienda (N°)" en el Excel, ej: TIPO A, THB5
  unidad: string;
  estado: string;
  tecnico: string;
  inspector: string;
  fechaPromesa: string; // YYYY-MM-DD, vacío si no tiene
  importadoEn: string; // ISO datetime de la última importación que tocó esta fila
}

export interface Taller {
  id: string;
  semana: string; // monday ISO date
  subcontratistaId: string;
  proyecto: Proyecto;
  edificio: string;
  unidad: string;
  esGeneral: boolean; // true si aplica a todo el edificio/villa, no a una unidad específica (ej: pintura de fachada)
  actividad: string;
  prioridad: Prioridad;
  dia: DiaSemana;
  tecnico: string;
  inspector: string;
  fechaPromesa: string; // YYYY-MM-DD, vacío si no aplica, sacada del reporte de unidades
  observaciones: string;
  creadoPor?: string; // nombre de quién planificó este taller
  creadoPorId?: string;
  creadoEn?: string; // ISO datetime
}

export type ChecklistValue = 'SI' | 'NO' | 'N/A' | 'PENDIENTE';
export type ResultadoValidacion = 'LISTO' | 'NO LISTO' | 'PENDIENTE';

export interface Validacion {
  id: string;
  tallerId: string;
  fecha: string;
  validadoPor: string;
  cargo: string;
  checklist: ChecklistValue[];
  resultado: ResultadoValidacion;
  observaciones: string;
  fotos: string[];
  registradoPorId?: string; // id del usuario del sistema que guardó este registro (distinto de validadoPor, que es texto libre)
  registradoEn?: string; // ISO datetime
}

export type EstadoEntrega = 'ENTREGADO' | 'NO ENTREGADO';
export type Calidad = 'BUENA' | 'CON OBSERVACIONES' | 'DEFICIENTE' | '';

export interface Entrega {
  id: string;
  tallerId: string;
  estado: EstadoEntrega;
  fechaEntrega: string;
  recibidoPor: string;
  calidad: Calidad;
  notas: string;
  fotos: string[];
  registradoPorId?: string;
  registradoEn?: string;
}

export interface RegistroBitacora {
  id: string;
  fecha: string;
  tallerId: string;
  llego: 'SI' | 'NO' | ''; // se muestra en pantalla como "Personal asignado"
  completo: 'SIN INICIAR' | 'EN PROCESO' | 'COMPLETADO' | '';
  motivo: string;
  responsable: string;
  accion: string;
  notas: string;
  fotos: string[];
  registradoPor?: string;
  registradoPorId?: string;
  registradoEn?: string;
}

export type EstadoCicloTaller = 'NO INICIADO' | 'EN PROCESO' | 'COMPLETADO';

export interface ComentarioCiclo {
  fecha: string; // ISO datetime
  texto: string;
  autor?: string; // nombre del autor, para mostrar en pantalla
  autorId?: string; // id del perfil que lo escribió
}

export interface CicloTaller {
  id: string;
  tallerId: string;
  estado: EstadoCicloTaller;
  fechaInicio: string; // YYYY-MM-DD, cuando pasó a EN PROCESO
  fechaCierre: string; // YYYY-MM-DD, cuando pasó a COMPLETADO
  comentarios: ComentarioCiclo[];
}

export type Causa = 'NUESTRA' | 'DEL SUBCONTRATISTA' | 'COMPARTIDA' | 'POR DEFINIR' | '';

export interface Queja {
  id: string;
  fecha: string;
  subcontratistaId: string;
  tipo: string;
  descripcion: string;
  causa: Causa;
  unidadesAfectadas: string[]; // lista de "EDIFICIO UNIDAD" seleccionadas
  esGeneral: boolean; // si afecta todos los talleres del contratista, no unidades específicas
  unidades: string; // texto legible derivado (compatibilidad con reportes y matching existente)
  impactoDias: string;
  accion: string;
  fotos: string[];
  registradoPor?: string;
  registradoPorId?: string;
  registradoEn?: string;
}

export interface TallerDetail {
  taller: Taller;
  validacion: Validacion | undefined;
  entrega: Entrega | undefined;
  bitacora: RegistroBitacora[];
  dias: number | null;
}

export interface Stats {
  totalTalleres: number;
  liberados: number;
  noLiberados: number;
  pendientesVal: number;
  entregados: number;
  sinEntregar: number;
  promedioDias: number | null;
  llegaron: number;
  noLlegaron: number;
  causaNuestra: number;
  causaSub: number;
  quejasForSub: Queja[];
  quejasCount: number;
  pctLiberado: number;
  pctEntregado: number;
  /** % de cumplimiento real: talleres ENTREGADOS sobre el TOTAL planificado del periodo
   * (no sobre los liberados). Esta es la métrica de cumplimiento de contratista en el resumen. */
  pctCumplimiento: number;
}

export interface CambioFechaPrometida {
  fecha: string; // YYYY-MM-DD, la fecha prometida en ese momento
  registradoEn: string; // ISO datetime de cuándo se hizo este cambio
  motivo: string;
}

export interface UnidadFechaPrometida {
  edificio: string;
  unidad: string;
}

export interface ComentarioFechaPrometida {
  fecha: string; // ISO datetime
  texto: string;
  autor?: string; // nombre del autor, para mostrar en pantalla
  autorId?: string; // id del perfil que lo escribió
}

export interface FechaPrometida {
  id: string;
  subcontratistaId: string;
  descripcion: string; // ej: "Entrega de ventanas para G6"
  unidadesAfectadas: UnidadFechaPrometida[];
  esGeneral: boolean;
  unidades: string; // texto legible derivado, para reportes y matching
  fechaPrometidaActual: string; // YYYY-MM-DD
  fechaCumplida: string; // YYYY-MM-DD, vacío si aún no se cumple
  historialFechas: CambioFechaPrometida[]; // cada cambio de fecha prometida queda aquí
  comentarios: ComentarioFechaPrometida[]; // seguimiento libre, con fecha/hora, independiente del historial de cambios de fecha
  notas: string;
  fotos: string[];
}

export interface ArchivoImportadoMeta {
  nombreArchivo: string;
  subidoEn: string; // ISO datetime
  totalFilas: number;
  totalImportadas: number;
}

export interface TallerCatalogo {
  id: string;
  subcontratistaId: string;
  actividad: string;
  notas: string;
}

export type TabId = 'dashboard' | 'maestro' | 'planificacion' | 'validacion' | 'bitacora' | 'quejas' | 'evaluacion' | 'fechas' | 'catalogo' | 'settings';

export type Rol = 'admin' | 'normal';
export type NivelAcceso = 'ninguno' | 'ver' | 'editar';

/** Permisos por módulo: una entrada por cada TabId, indicando el nivel de acceso de ese usuario */
export type PermisosModulos = Partial<Record<TabId, NivelAcceso>>;

export interface Perfil {
  id: string; // mismo id que auth.users
  nombre: string;
  rol: Rol;
  permisos: PermisosModulos;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Información mínima de autoría para mostrar "quién hizo qué y cuándo" en cualquier registro */
export interface Autoria {
  autorId: string;
  autorNombre: string;
  fechaHora: string; // ISO datetime
}
