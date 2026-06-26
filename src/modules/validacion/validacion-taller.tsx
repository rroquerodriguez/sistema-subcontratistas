import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { ProjectFilter } from '@/components/shared/project-filter';
import { ColumnSelector } from '@/components/shared/column-selector';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { EstadoLiberacionBadge, EntregaBadge, DiasPill } from '@/components/shared/status-badges';
import { GestionTallerModal } from './gestion-taller-modal';
import { dbSet } from '@/lib/storage';
import { weekRangeLabel, todayISO, diffDays } from '@/lib/utils-app';
import { exportLiberacionExcel, COLUMNAS_LIBERACION_DEFAULT, COLUMNAS_LIBERACION } from '@/lib/export-liberacion-excel';
import { exportLiberacionPDF } from '@/lib/export-liberacion-pdf';
import type { Subcontratista, Taller, Validacion, Entrega, ResultadoValidacion, UnidadProyecto } from '@/types';

interface ValidacionTallerProps {
  subs: Subcontratista[];
  talleres: Taller[];
  validaciones: Validacion[];
  setValidaciones: (v: Validacion[]) => void;
  entregas: Entrega[];
  setEntregas: (e: Entrega[]) => void;
  semanaActual: string;
  showToast: (msg: string) => void;
  unidadesProyecto: UnidadProyecto[];
  tallerAbrirId?: string | null;
  onTallerAbierto?: () => void;
}

const FILTROS: { value: ResultadoValidacion | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'LISTO', label: 'Liberadas' },
  { value: 'NO LISTO', label: 'No liberadas' },
];

type VistaLib = 'contratista' | 'global';

export function ValidacionTaller({
  subs, talleres, validaciones, setValidaciones, entregas, setEntregas, semanaActual, showToast, unidadesProyecto,
  tallerAbrirId, onTallerAbierto,
}: ValidacionTallerProps) {
  const [gestionando, setGestionando] = useState<{ v: Validacion; t: Taller; ent?: Entrega } | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<ResultadoValidacion | 'todos'>('todos');
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [vista, setVista] = useState<VistaLib>('contratista');
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_LIBERACION_DEFAULT);
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';

  // Si se navegó aquí pidiendo abrir un taller específico (desde Planificación), abre su modal automáticamente
  useEffect(() => {
    if (!tallerAbrirId) return;
    const t = talleres.find((x) => x.id === tallerAbrirId);
    const v = validaciones.find((x) => x.tallerId === tallerAbrirId);
    if (t && v) {
      const ent = entregas.find((e) => e.tallerId === t.id);
      setGestionando({ v, t, ent });
    }
    onTallerAbierto?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tallerAbrirId]);

  const saveValidacion = async (v: Validacion) => {
    const next = validaciones.map((x) => (x.id === v.id ? v : x));
    setValidaciones(next);
    await dbSet('validaciones', next);
    showToast('Liberación guardada');
    setGestionando(null);
  };

  const saveEntrega = async (e: Entrega) => {
    const exists = entregas.find((x) => x.id === e.id);
    const next = exists ? entregas.map((x) => (x.id === e.id ? e : x)) : [...entregas, e];
    setEntregas(next);
    await dbSet('entregas', next);
    showToast('Entrega registrada');
    setGestionando(null);
  };

  const order: Record<string, number> = { PENDIENTE: 0, 'NO LISTO': 1, LISTO: 2 };

  const semanaTalleresFiltrados = talleres.filter((t) => t.semana === semanaActual && (filtroProyecto === 'todos' || t.proyecto === filtroProyecto));
  const semanaTallerIds = new Set(semanaTalleresFiltrados.map((t) => t.id));
  let semanaValidaciones = validaciones.filter((v) => semanaTallerIds.has(v.tallerId));
  if (filtroEstado !== 'todos') semanaValidaciones = semanaValidaciones.filter((v) => v.resultado === filtroEstado);
  if (filtroSub !== 'todos') {
    const tallerIdsDelSub = new Set(talleres.filter((t) => t.subcontratistaId === filtroSub).map((t) => t.id));
    semanaValidaciones = semanaValidaciones.filter((v) => tallerIdsDelSub.has(v.tallerId));
  }
  const sorted = [...semanaValidaciones].sort((a, b) => (order[a.resultado] ?? 1) - (order[b.resultado] ?? 1));

  const talleresParaExportar = useMemo(() => {
    const idsValidos = new Set(sorted.map((v) => v.tallerId));
    return semanaTalleresFiltrados.filter((t) => idsValidos.has(t.id) && (filtroSub === 'todos' || t.subcontratistaId === filtroSub));
  }, [sorted, semanaTalleresFiltrados, filtroSub]);

  const gruposPorContratista = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    sorted.forEach((v) => {
      const t = talleres.find((x) => x.id === v.tallerId);
      if (!t) return;
      if (!map.has(t.subcontratistaId)) map.set(t.subcontratistaId, []);
      map.get(t.subcontratistaId)!.push(v);
    });
    return [...map.entries()].map(([subId, items]) => ({ subId, items }));
  }, [sorted, talleres]);

  const renderFila = (v: Validacion) => {
    const t = talleres.find((x) => x.id === v.tallerId);
    if (!t) return null;
    const ent = entregas.find((e) => e.tallerId === t.id);
    let dias: number | null = null;
    if (v.resultado === 'LISTO' && v.fecha) {
      const hasta = ent?.estado === 'ENTREGADO' && ent.fechaEntrega ? ent.fechaEntrega : todayISO();
      dias = diffDays(v.fecha, hasta);
    }
    return (
      <TableRow key={v.id}>
        {vista === 'global' && <TableCell className="font-medium">{subName(t.subcontratistaId)}</TableCell>}
        <TableCell>{t.esGeneral ? <Badge variant="secondary">General</Badge> : `${t.edificio} ${t.unidad}`}</TableCell>
        <TableCell>{t.actividad}</TableCell>
        <TableCell><EstadoLiberacionBadge estado={v.resultado} /></TableCell>
        <TableCell>{ent ? <EntregaBadge estado={ent.estado} /> : '—'}</TableCell>
        <TableCell><DiasPill dias={dias} entregado={ent?.estado === 'ENTREGADO'} /></TableCell>
        <TableCell>
          <Button size="sm" variant="secondary" onClick={() => setGestionando({ v, t, ent })}>Gestionar</Button>
        </TableCell>
      </TableRow>
    );
  };

  const periodoLabelExport = `Semana del ${weekRangeLabel(semanaActual)}`;
  const subFiltroObj = filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null;

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Liberación y entrega</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Semana del {weekRangeLabel(semanaActual)} — gestiona la liberación del área para trabajar y la entrega del trabajo por el subcontratista.</div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex gap-1.5">
              <Button size="sm" variant={vista === 'contratista' ? 'default' : 'outline'} onClick={() => setVista('contratista')}>Por contratista</Button>
              <Button size="sm" variant={vista === 'global' ? 'default' : 'outline'} onClick={() => setVista('global')}>Vista global</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
              <Select value={filtroSub} onValueChange={setFiltroSub}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <ColumnSelector seleccionadas={columnasExport} onChange={setColumnasExport} columnas={COLUMNAS_LIBERACION} />
              <Button variant="outline" onClick={() => exportLiberacionExcel(talleresParaExportar, validaciones, entregas, subs, periodoLabelExport, subFiltroObj, columnasExport)}>
                <FileSpreadsheet size={14} />Excel
              </Button>
              <Button variant="outline" onClick={() => exportLiberacionPDF(talleresParaExportar, validaciones, entregas, subs, periodoLabelExport, subFiltroObj, columnasExport)}>
                <FileText size={14} />PDF
              </Button>
            </div>
          </div>

          <div className="mb-3.5 flex gap-1.5">
            {FILTROS.map((f) => (
              <Button key={f.value} size="sm" variant={filtroEstado === f.value ? 'default' : 'outline'} onClick={() => setFiltroEstado(f.value)}>
                {f.label}
              </Button>
            ))}
          </div>

          {vista === 'contratista' && (
            gruposPorContratista.length ? gruposPorContratista.map(({ subId, items }) => (
              <CollapsibleGroup
                key={subId}
                header={
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SubAvatar name={subName(subId)} id={subId} />{subName(subId)}
                    <Badge variant="secondary">{items.length} taller(es)</Badge>
                  </div>
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidad</TableHead><TableHead>Actividad</TableHead>
                      <TableHead>Liberación</TableHead><TableHead>Entrega</TableHead><TableHead>Días</TableHead><TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>{items.map(renderFila)}</TableBody>
                </Table>
              </CollapsibleGroup>
            )) : <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres para gestionar esta semana.</div>
          )}

          {vista === 'global' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcontratista</TableHead><TableHead>Unidad</TableHead><TableHead>Actividad</TableHead>
                  <TableHead>Liberación</TableHead><TableHead>Entrega</TableHead><TableHead>Días</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(renderFila)}
                {!sorted.length && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No hay talleres para gestionar esta semana.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {gestionando && (
        <GestionTallerModal
          taller={gestionando.t}
          validacion={gestionando.v}
          entrega={gestionando.ent}
          sub={subs.find((s) => s.id === gestionando.t.subcontratistaId)}
          unidadesProyecto={unidadesProyecto}
          onSaveValidacion={saveValidacion}
          onSaveEntrega={saveEntrega}
          onClose={() => setGestionando(null)}
        />
      )}
    </div>
  );
}
