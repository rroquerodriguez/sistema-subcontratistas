import { useEffect, useState, useCallback } from 'react';

export type Tema = 'claro' | 'oscuro' | 'sistema';

const STORAGE_KEY = 'tema-preferencia';

function aplicarClase(tema: Tema) {
  const oscuroActivo =
    tema === 'oscuro' || (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', oscuroActivo);
}

/** Maneja la preferencia de tema (claro / oscuro / según el sistema). La preferencia se guarda en el
 * navegador (localStorage), no en la base de datos: es una elección personal del dispositivo, no un
 * dato del proyecto. La opción "sistema" sigue en vivo los cambios del tema del sistema operativo. */
export function useTema() {
  const [tema, setTemaState] = useState<Tema>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY) as Tema | null;
      return guardado || 'claro';
    } catch {
      return 'claro';
    }
  });

  useEffect(() => {
    aplicarClase(tema);
    if (tema !== 'sistema') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => aplicarClase('sistema');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [tema]);

  const setTema = useCallback((t: Tema) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* almacenamiento no disponible; se aplica igual solo para esta sesión */
    }
    setTemaState(t);
  }, []);

  return { tema, setTema };
}
