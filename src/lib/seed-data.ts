import { uid } from './utils-app';
import type { Subcontratista, Proyecto, DiaSemana } from '@/types';

export const SEED_SUBCONTRATISTAS: Subcontratista[] = [
  { id: uid('sub'), nombre: 'Aplic', especialidad: 'Pintura', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Miguel Abreu', especialidad: 'Electricidad', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Doorvitech', especialidad: 'Puertas', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Leonardo Morillo', especialidad: 'Pisos y revestimiento', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'NFT', especialidad: 'Ventanas, barandas y louvers', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Proglass', especialidad: 'Ventanas y barandas', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Uribe', especialidad: 'Topes de cocinas y escaleras', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Design Gallery', especialidad: 'Muebles de cocina', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Nicmares', especialidad: 'Sanitarias', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Shary', especialidad: 'Paisajismo', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Aldo', especialidad: 'Puertas de clóset', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Onel', especialidad: 'Plafón sheetrock y estuco', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Jowel', especialidad: 'Gas', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'Kerlin', especialidad: 'Louvers y andamios', contacto: '', telefono: '', correo: '', notas: '' },
  { id: uid('sub'), nombre: 'GFC', especialidad: 'Aires acondicionados', contacto: '', telefono: '', correo: '', notas: '' },
];

export const CHECKLIST_ITEMS: string[] = [
  'Acceso a la unidad libre (sin candado, sin restricción, llaves disponibles)',
  'Área del taller despejada (sin escombros, sin materiales de otros oficios)',
  'Trabajos previos requeridos ya están terminados',
  'Energía eléctrica disponible si la actividad la requiere',
  'Agua disponible si la actividad la requiere',
  'Superficie / base lista para recibir el trabajo',
  'No hay otro oficio trabajando en el mismo espacio que genere conflicto',
  'Medidas de seguridad necesarias están colocadas',
];

export const PROYECTOS: Proyecto[] = ['PANORAMA PARK', 'PANORAMA GARDEN'];

export const TIPOS_QUEJA: string[] = [
  'Personal insuficiente', 'Cambio de prioridades', 'Taller no listo', 'Reasignación sin criterio',
  'No trajo personal', 'No se presentó', 'Material faltante', 'Calidad del trabajo', 'Otro',
];

export const RESPONSABLES: string[] = [
  'Nuestro (taller no listo)', 'Subcontratista', 'Falta de material', 'Fuerza mayor', 'Por definir',
];

export const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
