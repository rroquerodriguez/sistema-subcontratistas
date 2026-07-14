import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { iniciarSesion } from '@/lib/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setCargando(true);
    const mensajeError = await iniciarSesion(email.trim(), password);
    setCargando(false);
    if (mensajeError) setError(mensajeError);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 size={24} />
            </div>
            <div className="text-title font-semibold">Control de obra</div>
            <div className="text-caption text-muted-foreground">Panorama Park · Garden</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Correo</Label>
              <Input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Contraseña</Label>
              <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-caption text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando ? <><Loader2 size={14} className="animate-spin" />Entrando...</> : 'Entrar'}
            </Button>
          </form>

          <div className="mt-5 text-center text-caption text-muted-foreground">
            ¿No tienes cuenta? Pídele al administrador del sistema que te cree una.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
