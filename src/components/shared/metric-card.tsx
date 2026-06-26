interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorBg: string;
  colorFg: string;
}

export function MetricCard({ label, value, icon: Icon, colorBg, colorFg }: MetricCardProps) {
  return (
    <div className="rounded-[14px] bg-muted/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: colorBg, color: colorFg }}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-[27px] font-semibold leading-none tracking-tight">{value}</p>
    </div>
  );
}
