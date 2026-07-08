import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { ProjectFilter } from '@/components/shared/project-filter';
import { InspectorFilter } from '@/components/shared/inspector-filter';
import { ColumnSelector } from '@/components/shared/column-selector';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { ExpandCollapseAllButtons } from '@/components/shared/expand-collapse-all-button';
import { NivelCollapseControls } from '@/components/shared/nivel-collapse-controls';
import { useCollapseState } from '@/lib/use-collapse-state';
import { SortableTableHead } from '@/components/shared/sortable-table-head';
import { useSortableFilterableTable, type ColumnConfig } from '@/lib/use-sortable-table';
import { UnidadSearchBox, unidadMatchesSearch } from '@/components/shared/unidad-search-box';
import { AgrupacionConfigButton, type OpcionAgrupacion } from '@/components/shared/agrupacion-config-button';
import { ArbolAgrupado } from '@/components/shared/arbol-agrupado';
import { construirArbolAgrupado, todasLasKeysAgrupables, keysPorNivel, type DimensionAgrupacion } from '@/lib/agrupacion-multinivel';
import { ExportarButton } from '@/components/shared/exportar-button';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { puedeEditar } from '@/lib/auth';
import { EstadoLiberacionBadge, EntregaBadge, DiasPill } from '@/components/shared/status-badges';
import { GestionTallerModal } from './gestion-taller-modal';

import { weekRangeLabel, todayISO, diffDays } from '@/lib/utils-app';
import { exportLiberacionExcel, COLUMNAS_LIBERACION_DEFAULT, COLUMNAS_LIBERACION } from '@/lib/export-liberacion-excel';
import { exportLiberacionPDF } from '@/lib/export-liberacion-pdf';
import type { Subcontratista, Taller, Validacion, Entrega, ResultadoValidacion, UnidadProyecto } from '@/types';
import { persistir } from '@/lib/persistir';

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

const OPCIONES_AGRUPACION_LIBERACION: OpcionAgrupacion[] = [
  { key: 'contratista', label: 'Subcontratista' },
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'estadoLiberacion', label: 'Estado de liberación' },
  { key: 'estadoEntrega', label: 'Estado de entrega' },
  { key: 'inspector', label: 'Inspector de calidad' },
];

type VistaLib = 'contratista' | 'global' | 'personalizada';

interface FilaLib {
  v: Validacion;
  t: Taller;
  ent?: Entrega;
  dias: number | null;
}

interface LiberacionTablaProps {
  filas: FilaLib[];
  showSub: boolean;
  subName: (id: string) => string;
  onGestionar: (f: FilaLib) => void;
}

/** Tabla de liberación con orden/filtro por columna */
function LiberacionTabla({ filas, showSub, subName, onGestionar }: LiberacionTablaProps) {
  const { nombrePorId } = useUsuarioActual();
  const columnas: ColumnConfig<FilaLib>[] = [
    ...(showSub ? [{ key: 'subcontratista', getValue: (f: FilaLib) => subName(f.t.subcontratistaId) }] : []),
    { key: 'unidad', getValue: (f) => (f.t.esGeneral ? 'GENERAL' : `${f.t.edificio} ${f.t.unidad}`) },
    { key: 'actividad', getValue: (f) => f.t.actividad },
    { key: 'estadoLiberacion', getValue: (f) => f.v.resultado },
    { key: 'estadoEntrega', getValue: (f) => f.ent?.estado || 'NO ENTREGADO' },
    { key: 'dias', getValue: (f) => f.dias ?? -1 },
    { key: 'gestionadoPor', getValue: (f) => nombrePorId(f.v.registradoPorId) },
  ];
  const { rows, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(filas, columnas);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showSub && <SortableTableHead label="Subcontratista" columnKey="subcontratista" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.subcontratista} onFilterChange={setFilter} />}
          <SortableTableHead label="Unidad" columnKey="unidad" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.unidad} onFilterChange={setFilter} />
          <SortableTableHead label="Actividad" columnKey="actividad" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.actividad} onFilterChange={setFilter} />
          <SortableTableHead label="Liberación" columnKey="estadoLiberacion" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.estadoLiberacion} onFilterChange={setFilter} />
          <SortableTableHead label="Entrega" columnKey="estadoEntrega" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.estadoEntrega} onFilterChange={setFilter} />
          <SortableTableHead label="Días" columnKey="dias" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Gestionado por" columnKey="gestionadoPor" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.gestionadoPor} onFilterChange={setFilter} />
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((f) => (
          <TableRow key={f.v.id}>
            {showSub && <TableCell className="font-medium">{subName(f.t.subcontratistaId)}</TableCell>}
            <TableCell>{f.t.esGeneral ? <Badge variant="secondary">General</Badge> : `${f.t.edificio} ${f.t.unidad}`}</TableCell>
            <TableCell>{f.t.actividad}</TableCell>
            <TableCell><EstadoLiberacionBadge estado={f.v.resultado} /></TableCell>
            <TableCell>{f.ent ? <EntregaBadge estado={f.ent.estado} /> : '—'}</TableCell>
            <TableCell><DiasPill dias={f.dias} entregado={f.ent?.estado === 'ENTREGADO'} /></TableCell>
            <TableCell className="text-[11.5px] text-muted-foreground">{nombrePorId(f.v.registradoPorId)}</TableCell>
            <TableCell>
              <Button size="sm" variant="secondary" onClick={() => onGestionar(f)}>Gestionar</Button>
            </TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow><TableCell colSpan={showSub ? 8 : 7} className="py-8 text-center text-sm text-muted-foreground">Sin talleres para mostrar.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export function ValidacionTaller({
  subs, talleres, validaciones, setValidaciones, entregas, setEntregas, semanaActual, showToast, unidadesProyecto,
  tallerAbrirId, onTallerAbierto,
}: ValidacionTallerProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'validacion');
  const [gestionando, setGestionando] = useState<{ v: Validacion; t: Taller; ent?: Entrega } | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<ResultadoValidacion | 'todos'>('todos');
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [buscadorUnidad, setBuscadorUnidad] = useState('');
  const [nivelesAgrupacion, setNivelesAgrupacion] = useState<string[]>([]);
  const [vista, setVista] = useState<VistaLib>('contratista');
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_LIBERACION_DEFAULT);
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const colapsoContratista = useCollapseState();
  const colapsoPersonalizada = useCollapseState();

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
    const registro = { ...v, registradoPorId: usuario.id, registradoEn: new Date().toISOString() };
    const next = validaciones.map((x) => (x.id === v.id ? registro : x));
    setValidaciones(next);
    if (!(await persistir('validaciones', next))) return;
    showToast('Liberación guardada');
    setGestionando(null);
  };

  const saveEntrega = async (e: Entrega) => {
    const exists = entregas.find((x) => x.id === e.id);
    const registro = { ...e, registradoPorId: usuario.id, registradoEn: new Date().toISOString() };
    const next = exists ? entregas.map((x) => (x.id === e.id ? registro : x)) : [...entregas, registro];
    setEntregas(next);
    if (!(await persistir('entregas', next))) return;
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
  if (filtroInspector !== 'todos') {
    const tallerIdsDelInspector = new Set(talleres.filter((t) => t.inspector === filtroInspector).map((t) => t.id));
    semanaValidaciones = semanaValidaciones.filter((v) => tallerIdsDelInspector.has(v.tallerId));
  }
  if (buscadorUnidad.trim()) {
    const tallerIdsMatch = new Set(talleres.filter((t) => unidadMatchesSearch(t.edificio, t.esGeneral ? 'general' : t.unidad, buscadorUnidad)).map((t) => t.id));
    semanaValidaciones = semanaValidaciones.filter((v) => tallerIdsMatch.has(v.tallerId));
  }
  const sorted = [...semanaValidaciones].sort((a, b) => (order[a.resultado] ?? 1) - (order[b.resultado] ?? 1));

  const talleresParaExportar = useMemo(() => {
    const idsValidos = new Set(sorted.map((v) => v.tallerId));
    return semanaTalleresFiltrados.filter((t) => idsValidos.has(t.id) && (filtroSub === 'todos' || t.subcontratistaId === filtroSub));
  }, [sorted, semanaTalleresFiltrados, filtroSub]);

  const filas: FilaLib[] = useMemo(() => sorted.map((v) => {
    const t = talleres.find((x) => x.id === v.tallerId)!;
    const ent = entregas.find((e) => e.tallerId === v.tallerId);
    let dias: number | null = null;
    if (v.resultado === 'LISTO' && v.fecha) {
      const hasta = ent?.estado === 'ENTREGADO' && ent.fechaEntrega ? ent.fechaEntrega : todayISO();
      dias = diffDays(v.fecha, hasta);
    }
    return { v, t, ent, dias };
  }).filter((f) => !!f.t), [sorted, talleres, entregas]);

  const gruposPorContratista = useMemo(() => {
    const map = new Map<string, FilaLib[]>();
    filas.forEach((f) => {
      if (!map.has(f.t.subcontratistaId)) map.set(f.t.subcontratistaId, []);
      map.get(f.t.subcontratistaId)!.push(f);
    });
    return [...map.entries()].map(([subId, items]) => ({ subId, items }));
  }, [filas]);

  const inspectoresDisponibles = useMemo(
    () => [...new Set(talleres.map((t) => t.inspector).filter(Boolean))].sort(),
    [talleres]
  );

  const dimensionesDisponibles: Record<string, DimensionAgrupacion<FilaLib>> = {
    contratista: { key: 'contratista', label: 'Subcontratista', getValue: (f) => subName(f.t.subcontratistaId) },
    proyecto: { key: 'proyecto', label: 'Proyecto', getValue: (f) => f.t.proyecto },
    estadoLiberacion: { key: 'estadoLiberacion', label: 'Estado de liberación', getValue: (f) => f.v.resultado },
    estadoEntrega: { key: 'estadoEntrega', label: 'Estado de entrega', getValue: (f) => f.ent?.estado || 'NO ENTREGADO' },
    inspector: { key: 'inspector', label: 'Inspector de calidad', getValue: (f) => f.t.inspector || 'Sin asignar' },
  };
  const arbolPersonalizado = useMemo(() => {
    const dims = nivelesAgrupacion.map((k) => dimensionesDisponibles[k]).filter(Boolean);
    return construirArbolAgrupado(filas, dims);
  }, [filas, nivelesAgrupacion]);
  const keysPorNivelPersonalizada = useMemo(() => keysPorNivel(arbolPersonalizado), [arbolPersonalizado]);
  const nivelesConLabel = nivelesAgrupacion.map((k, i) => ({ label: dimensionesDisponibles[k]?.label || k, keys: keysPorNivelPersonalizada[i] || [] }));

  const periodoLabelExport = `Semana del ${weekRangeLabel(semanaActual)}`;
  const subFiltroObj = filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null;

  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Liberación y entrega</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Semana del {weekRangeLabel(semanaActual)} — gestiona la liberación del área para trabajar y la entrega del trabajo por el subcontratista.</div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant={vista === 'contratista' ? 'default' : 'outline'} onClick={() => setVista('contratista')}>Por contratista</Button>
              <Button size="sm" variant={vista === 'global' ? 'default' : 'outline'} onClick={() => setVista('global')}>Vista global</Button>
              <Button size="sm" variant={vista === 'personalizada' ? 'default' : 'outline'} onClick={() => setVista('personalizada')}>Agrupación personalizada</Button>
              {vista === 'contratista' && (
                <ExpandCollapseAllButtons onExpandAll={colapsoContratista.expandAll} onCollapseAll={() => colapsoContratista.collapseAll(gruposPorContratista.map((g) => g.subId))} />
              )}
              {vista === 'personalizada' && (
                <ExpandCollapseAllButtons onExpandAll={colapsoPersonalizada.expandAll} onCollapseAll={() => colapsoPersonalizada.collapseAll(todasLasKeysAgrupables(arbolPersonalizado))} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <UnidadSearchBox value={buscadorUnidad} onChange={setBuscadorUnidad} />
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
              <Select value={filtroSub} onValueChange={setFiltroSub}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <InspectorFilter value={filtroInspector} onChange={setFiltroInspector} opciones={inspectoresDisponibles} />
              {vista === 'personalizada' && (
                <AgrupacionConfigButton opciones={OPCIONES_AGRUPACION_LIBERACION} seleccion={nivelesAgrupacion} onChange={setNivelesAgrupacion} />
              )}
              <ColumnSelector seleccionadas={columnasExport} onChange={setColumnasExport} columnas={COLUMNAS_LIBERACION} />
              <ExportarButton
                onExcel={() => exportLiberacionExcel(talleresParaExportar, validaciones, entregas, subs, periodoLabelExport, subFiltroObj, columnasExport)}
                onPDF={() => exportLiberacionPDF(talleresParaExportar, validaciones, entregas, subs, periodoLabelExport, subFiltroObj, columnasExport)}
              />
            </div>
          </div>

          <div className="mb-3.5 flex gap-1.5">
            {FILTROS.map((f) => (
              <Button key={f.value} size="sm" variant={filtroEstado === f.value ? 'default' : 'outline'} onClick={() => setFiltroEstado(f.value)}>
                {f.label}
              </Button>
            ))}
          </div>

          {vista === 'personalizada' && nivelesConLabel.length > 0 && (
            <div className="mb-3.5">
              <NivelCollapseControls niveles={nivelesConLabel} onCollapseKeys={colapsoPersonalizada.collapseKeys} onExpandKeys={colapsoPersonalizada.expandKeys} />
            </div>
          )}

          {vista === 'contratista' && (
            gruposPorContratista.length ? gruposPorContratista.map(({ subId, items }) => (
              <CollapsibleGroup
                key={subId}
                open={!colapsoContratista.isCollapsed(subId)}
                onToggle={() => colapsoContratista.toggle(subId)}
                header={
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SubAvatar name={subName(subId)} id={subId} />{subName(subId)}
                    <Badge variant="secondary">{items.length} taller(es)</Badge>
                  </div>
                }
              >
                <LiberacionTabla filas={items} showSub={false} subName={subName} onGestionar={(f) => setGestionando({ v: f.v, t: f.t, ent: f.ent })} />
              </CollapsibleGroup>
            )) : <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres para gestionar esta semana.</div>
          )}

          {vista === 'global' && (
            <LiberacionTabla filas={filas} showSub subName={subName} onGestionar={(f) => setGestionando({ v: f.v, t: f.t, ent: f.ent })} />
          )}

          {vista === 'personalizada' && (
            <ArbolAgrupado
              nodos={arbolPersonalizado}
              isCollapsed={colapsoPersonalizada.isCollapsed}
              onToggle={colapsoPersonalizada.toggle}
              renderHoja={(items) => <LiberacionTabla filas={items} showSub subName={subName} onGestionar={(f) => setGestionando({ v: f.v, t: f.t, ent: f.ent })} />}
            />
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
          soloLectura={soloLectura}
        />
      )}
    </div>
  );
}
