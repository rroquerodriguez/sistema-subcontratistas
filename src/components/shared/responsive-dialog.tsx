import { useEffect, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

/** ¿Estamos en pantalla de móvil? (mismo breakpoint que Tailwind md: 768px) */
function useEsMovil(): boolean {
  const [esMovil, setEsMovil] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setEsMovil(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return esMovil;
}

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Clases extra para el contenedor en ESCRITORIO (ej. 'sm:max-w-4xl' para formularios anchos) */
  desktopClassName?: string;
}

/** Contenedor de formularios que se adapta al dispositivo: en escritorio es un diálogo centrado
 * (Dialog), y en móvil es un panel que sube desde abajo (Drawer / bottom sheet). El bottom sheet es
 * el patrón correcto en móvil porque convive bien con el teclado en pantalla y aprovecha toda la
 * altura disponible — un modal centrado con formulario largo es donde más se abandona una captura. */
export function ResponsiveDialog({ open, onOpenChange, title, children, desktopClassName }: ResponsiveDialogProps) {
  const esMovil = useEsMovil();

  if (esMovil) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${desktopClassName || 'max-w-2xl'}`}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
