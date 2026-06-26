import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { compressImage } from '@/lib/utils-app';

interface PhotoUploaderProps {
  photos: string[];
  onAdd: (b64: string) => void;
  onRemove: (index: number) => void;
}

export function PhotoUploader({ photos, onAdd, onRemove }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    for (const f of files) {
      const b64 = await compressImage(f);
      if (b64) onAdd(b64);
    }
    setBusy(false);
    e.target.value = '';
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            <img
              src={p}
              className="h-[60px] w-[60px] cursor-pointer rounded-[10px] border border-border object-cover"
              onClick={() => setAmpliada(p)}
            />
            <button
              onClick={() => onRemove(i)}
              aria-label="Eliminar foto"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-none bg-primary text-[11px] text-primary-foreground"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Camera size={14} />
        {busy ? 'Procesando...' : 'Agregar fotos'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFiles}
      />

      <Dialog open={!!ampliada} onOpenChange={(o) => !o && setAmpliada(null)}>
        <DialogContent className="max-w-3xl">
          {ampliada && <img src={ampliada} className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
