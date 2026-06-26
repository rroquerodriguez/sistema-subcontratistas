import { initials, avatarColorFor } from '@/lib/utils-app';

export function SubAvatar({ name, id }: { name: string; id?: string }) {
  const c = avatarColorFor(id || name || '');
  return (
    <div
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-sm font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {initials(name)}
    </div>
  );
}
