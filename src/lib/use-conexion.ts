import { useEffect, useState } from 'react';

/** Sigue el estado de conexión del dispositivo. Es especialmente relevante en obra, donde la señal
 * es intermitente: combinado con la protección anti-borrado, permite avisar ANTES de que el usuario
 * intente guardar algo que no va a llegar a la base. */
export function useConexion(): boolean {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const online = () => setEnLinea(true);
    const offline = () => setEnLinea(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  return enLinea;
}
