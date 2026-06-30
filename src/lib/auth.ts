import { supabase } from './storage';
import type { Perfil, Rol, PermisosModulos, NivelAcceso, TabId } from '@/types';

export interface SesionUsuario {
  userId: string;
  email: string;
  perfil: Perfil;
}

/** Intenta iniciar sesión con correo y contraseña. Devuelve un mensaje de error en español
 * si falla, o null si fue exitoso (en cuyo caso el listener onAuthStateChange se encarga del resto). */
export async function iniciarSesion(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (error.message.includes('Email not confirmed')) return 'Esta cuenta todavía no ha sido confirmada.';
    return 'No se pudo iniciar sesión. Intenta de nuevo.';
  }
  return null;
}

export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut();
}

/** Carga la sesión actual (si existe) junto con su perfil completo desde la tabla "perfiles".
 * Devuelve null si no hay sesión activa, o si el usuario no tiene perfil / está inactivo. */
export async function cargarSesionActual(): Promise<SesionUsuario | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return null;

  const { data: perfilData, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !perfilData) return null;
  const perfil = perfilData as Perfil;
  if (!perfil.activo) return null;

  return { userId: session.user.id, email: session.user.email || '', perfil };
}

/** Determina si un usuario tiene al menos nivel "ver" en un módulo dado.
 * Los administradores siempre tienen acceso completo a todo. */
export function tieneAcceso(perfil: Perfil, modulo: TabId): boolean {
  if (perfil.rol === 'admin') return true;
  const nivel = perfil.permisos[modulo];
  return nivel === 'ver' || nivel === 'editar';
}

/** Determina si un usuario puede editar (crear/modificar/eliminar) en un módulo dado. */
export function puedeEditar(perfil: Perfil, modulo: TabId): boolean {
  if (perfil.rol === 'admin') return true;
  return perfil.permisos[modulo] === 'editar';
}

/** Lista de módulos a los que el usuario tiene al menos acceso de lectura, en el orden del sidebar */
export function modulosVisibles(perfil: Perfil, ordenModulos: TabId[]): TabId[] {
  if (perfil.rol === 'admin') return ordenModulos;
  return ordenModulos.filter((m) => tieneAcceso(perfil, m));
}

export async function listarPerfiles(): Promise<Perfil[]> {
  const { data, error } = await supabase.from('perfiles').select('*').order('nombre');
  if (error) {
    console.error('listarPerfiles failed', error);
    return [];
  }
  return (data || []) as Perfil[];
}

/** Crea un usuario nuevo: primero la cuenta de autenticación, luego su perfil con permisos. */
export async function crearUsuario(
  email: string,
  password: string,
  nombre: string,
  rol: Rol,
  permisos: PermisosModulos
): Promise<{ ok: boolean; mensaje: string }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    if (error?.message.includes('already registered')) return { ok: false, mensaje: 'Ya existe una cuenta con ese correo.' };
    return { ok: false, mensaje: error?.message || 'No se pudo crear la cuenta.' };
  }

  const { error: perfilError } = await supabase.from('perfiles').insert({
    id: data.user.id,
    nombre,
    rol,
    permisos,
    activo: true,
  });

  if (perfilError) {
    return { ok: false, mensaje: 'La cuenta se creó pero no se pudo guardar el perfil. Contacta soporte.' };
  }

  return { ok: true, mensaje: 'Usuario creado correctamente.' };
}

export async function actualizarPerfil(perfil: Perfil): Promise<boolean> {
  const { error } = await supabase
    .from('perfiles')
    .update({ nombre: perfil.nombre, rol: perfil.rol, permisos: perfil.permisos, activo: perfil.activo, updated_at: new Date().toISOString() })
    .eq('id', perfil.id);
  if (error) {
    console.error('actualizarPerfil failed', error);
    return false;
  }
  return true;
}

/** Desactiva un usuario (no lo borra, para no perder el rastro de autoría de lo que haya creado) */
export async function desactivarPerfil(id: string): Promise<boolean> {
  const { error } = await supabase.from('perfiles').update({ activo: false }).eq('id', id);
  return !error;
}

export const ETIQUETA_NIVEL: Record<NivelAcceso, string> = {
  ninguno: 'Sin acceso',
  ver: 'Solo ver',
  editar: 'Ver y editar',
};
