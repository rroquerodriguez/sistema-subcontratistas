import { useEffect, useState } from 'react';
import { Plus, Pencil, UserX, UserCheck, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { listarPerfiles, crearUsuario, actualizarPerfil, ETIQUETA_NIVEL } from '@/lib/auth';
import type { Perfil, Rol, NivelAcceso, PermisosModulos, TabId } from '@/types';

interface UsuariosPanelProps {
  miPerfilId: string;
  showToast: (msg: string) => void;
}

const MODULOS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Resumen' },
  { id: 'maestro', label: 'Subcontratistas' },
  { id: 'catalogo', label: 'Catálogo de talleres' },
  { id: 'planificacion', label: 'Planificación' },
  { id: 'validacion', label: 'Liberación y entrega' },
  { id: 'bitacora', label: 'Bitácora diaria' },
  { id: 'quejas', label: 'Incidencias' },
  { id: 'fechas', label: 'Fechas prometidas' },
  { id: 'evaluacion', label: 'Evaluación' },
  { id: 'settings', label: 'Configuración' },
];

const PERMISOS_VACIOS: PermisosModulos = Object.fromEntries(MODULOS.map((m) => [m.id, 'ninguno'])) as PermisosModulos;

function PermisosEditor({ permisos, onChange }: { permisos: PermisosModulos; onChange: (p: PermisosModulos) => void }) {
  return (
    <div className="space-y-1.5">
      {MODULOS.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-2.5 py-1.5">
          <span className="text-caption">{m.label}</span>
          <Select value={permisos[m.id] || 'ninguno'} onValueChange={(v) => onChange({ ...permisos, [m.id]: v as NivelAcceso })}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguno">{ETIQUETA_NIVEL.ninguno}</SelectItem>
              <SelectItem value="ver">{ETIQUETA_NIVEL.ver}</SelectItem>
              <SelectItem value="editar">{ETIQUETA_NIVEL.editar}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

export function UsuariosPanel({ miPerfilId, showToast }: UsuariosPanelProps) {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Perfil | null>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('normal');
  const [permisos, setPermisos] = useState<PermisosModulos>(PERMISOS_VACIOS);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargar = async () => {
    setCargando(true);
    setPerfiles(await listarPerfiles());
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const resetForm = () => {
    setNombre(''); setEmail(''); setPassword(''); setRol('normal'); setPermisos(PERMISOS_VACIOS); setErrorForm('');
  };

  const abrirNuevo = () => { resetForm(); setShowNew(true); };
  const abrirEditar = (p: Perfil) => {
    setEditing(p);
    setNombre(p.nombre);
    setRol(p.rol);
    setPermisos({ ...PERMISOS_VACIOS, ...p.permisos });
    setErrorForm('');
  };

  const guardarNuevo = async () => {
    setErrorForm('');
    if (!nombre.trim() || !email.trim() || !password) { setErrorForm('Completa nombre, correo y contraseña.'); return; }
    if (password.length < 6) { setErrorForm('La contraseña debe tener al menos 6 caracteres.'); return; }
    setGuardando(true);
    const resultado = await crearUsuario(email.trim(), password, nombre.trim(), rol, permisos);
    setGuardando(false);
    if (!resultado.ok) { setErrorForm(resultado.mensaje); return; }
    showToast('Usuario creado correctamente');
    setShowNew(false);
    resetForm();
    cargar();
  };

  const guardarEdicion = async () => {
    if (!editing) return;
    setErrorForm('');
    if (!nombre.trim()) { setErrorForm('El nombre no puede quedar vacío.'); return; }
    setGuardando(true);
    const ok = await actualizarPerfil({ ...editing, nombre: nombre.trim(), rol, permisos });
    setGuardando(false);
    if (!ok) { setErrorForm('No se pudo guardar. Intenta de nuevo.'); return; }
    showToast('Usuario actualizado');
    setEditing(null);
    cargar();
  };

  const toggleActivo = async (p: Perfil) => {
    if (p.id === miPerfilId) { showToast('No puedes desactivar tu propia cuenta.'); return; }
    const ok = await actualizarPerfil({ ...p, activo: !p.activo });
    if (ok) { showToast(p.activo ? 'Usuario desactivado' : 'Usuario reactivado'); cargar(); }
  };

  if (cargando) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Cargando usuarios...</div>;
  }

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-body text-muted-foreground">{perfiles.length} usuario(s) registrado(s)</div>
        <Button onClick={abrirNuevo}><Plus size={14} />Nuevo usuario</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {perfiles.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.nombre}{p.id === miPerfilId && <span className="ml-1.5 text-micro text-muted-foreground">(tú)</span>}</TableCell>
              <TableCell>{p.rol === 'admin' ? <Badge><Shield size={11} className="mr-1" />Administrador</Badge> : <Badge variant="secondary">Usuario normal</Badge>}</TableCell>
              <TableCell>{p.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Desactivado</Badge>}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button size="sm" variant="outline" className="mr-1.5" onClick={() => abrirEditar(p)}><Pencil size={13} />Editar</Button>
                <Button size="sm" variant="outline" className={p.activo ? 'text-destructive' : ''} onClick={() => toggleActivo(p)} disabled={p.id === miPerfilId}>
                  {p.activo ? <><UserX size={13} />Desactivar</> : <><UserCheck size={13} />Reactivar</>}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" /></div>
            <div className="space-y-1.5"><Label>Correo</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
            <div className="space-y-1.5"><Label>Contraseña inicial</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Usuario normal</SelectItem>
                  <SelectItem value="admin">Administrador (acceso total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rol === 'normal' && (
              <div className="space-y-1.5">
                <Label>Acceso por módulo</Label>
                <PermisosEditor permisos={permisos} onChange={setPermisos} />
              </div>
            )}
            {errorForm && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-caption text-destructive">{errorForm}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={guardarNuevo} disabled={guardando}>{guardando ? 'Creando...' : 'Crear usuario'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v as Rol)} disabled={editing?.id === miPerfilId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Usuario normal</SelectItem>
                  <SelectItem value="admin">Administrador (acceso total)</SelectItem>
                </SelectContent>
              </Select>
              {editing?.id === miPerfilId && <div className="text-micro text-muted-foreground">No puedes cambiar tu propio rol.</div>}
            </div>
            {rol === 'normal' && (
              <div className="space-y-1.5">
                <Label>Acceso por módulo</Label>
                <PermisosEditor permisos={permisos} onChange={setPermisos} />
              </div>
            )}
            {errorForm && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-caption text-destructive">{errorForm}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={guardarEdicion} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
