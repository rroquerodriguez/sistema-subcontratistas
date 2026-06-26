import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PhotoViewerProps {
  photos: string[] | null;
  onClose: () => void;
  title?: string;
}

export function PhotoViewer({ photos, onClose, title = 'Fotos' }: PhotoViewerProps) {
  const [ampliada, setAmpliada] = useState<string | null>(null);

  return (
    <>
      <Dialog open={!!photos} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {photos?.map((p, i) => (
              <img
                key={i}
                src={p}
                className="h-40 w-40 cursor-pointer rounded-lg object-cover"
                onClick={() => setAmpliada(p)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ampliada} onOpenChange={(o) => !o && setAmpliada(null)}>
        <DialogContent className="max-w-3xl">
          {ampliada && <img src={ampliada} className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
