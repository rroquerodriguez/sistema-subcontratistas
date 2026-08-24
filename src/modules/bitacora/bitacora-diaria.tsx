import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PhotoViewer } from '@/components/shared/photo-viewer';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { WeekCalendarPicker } from '@/components/shared/week-calendar-picker';
import { MonthPicker } from '@/components/shared/month-picker';
import { ProjectFilter } from '@/components/shared/project-filter';
import { InspectorFilter } from '@/components/shared/inspector-filter';
import { CollapsibleGroup } from '@/components/shared/collapsible-group';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ExpandCollapseAllButtons } from '@/components/shared/expand-collapse-all-button';
import { ViewTabs } from '@/components/shared/view-tabs';
import { NivelCollapseControls } from '@/components/shared/nivel-collapse-controls';
import { useCollapseState } from '@/lib/use-collapse-state';
import { SortableTableHead } from '@/components/shared/sortable-table-head';
import { useSortableFilterableTable, type ColumnConfig } from '@/lib/use-sortable-table';
import { UnidadSearchBox, unidadMatchesSearch } from '@/components/shared/unidad-search-box';
import { AgrupacionConfigButton, type OpcionAgrupacion } from '@/components/shared/agrupacion-config-button';
import { ArbolAgrupado } from '@/components/shared/arbol-agrupado';
import { construirArbolAgrupado, todasLasKeysAgrupables, keysPorNivel, type DimensionAgrupacion } from '@/lib/agrupacion-multinivel';
import { ExportarButton } from '@/components/shared/exportar-button';
import { TallerAvanceRow } from '@/components/shared/taller-avance-row';
import { BitacoraForm } from './bitacora-form';

import { fmtDate, fmtDateTime, uid, todayISO, mesKeyActual, mesLabel, weekRangeLabel, mondayOf, fechaDeISODia, diaLabel } from '@/lib/utils-app';
import { DIAS_SEMANA } from '@/lib/seed-data';
import { buildParrafoAnalisisBitacora, quejasDelTaller } from '@/lib/stats-engine';
import { exportBitacoraExcel, COLUMNAS_BITACORA, COLUMNAS_BITACORA_DEFAULT } from '@/lib/export-bitacora-excel';
import { exportBitacoraPDF } from '@/lib/export-bitacora-pdf';
import { exportAvanceBitacoraExcel } from '@/lib/export-avance-bitacora-excel';
import { exportAvanceBitacoraPDF } from '@/lib/export-avance-bitacora-pdf';
import { ColumnSelector } from '@/components/shared/column-selector';
import { useUsuarioActual } from '@/lib/usuario-actual-context';
import { puedeEditar } from '@/lib/auth';
import type { Subcontratista, Taller, RegistroBitacora, CicloTaller, Queja, DiaSemana } from '@/types';
import { persistir } from '@/lib/persistir';

type PeriodoBitacora = 'dia' | 'semana' | 'mes';

interface BitacoraDiariaProps {
  subs: Subcontratista[];
  talleres: Taller[];
  bitacora: RegistroBitacora[];
  setBitacora: (b: RegistroBitacora[]) => void;
  ciclos: CicloTaller[];
  setCiclos: (c: CicloTaller[]) => void;
  quejas: Queja[];
  semanaActual: string;
  showToast: (msg: string) => void;
}

const OPCIONES_AGRUPACION_BITACORA: OpcionAgrupacion[] = [
  { key: 'contratista', label: 'Subcontratista' },
  { key: 'estadoTrabajo', label: 'Estado del trabajo' },
  { key: 'personalAsignado', label: 'Personal asignado' },
  { key: 'inspector', label: 'Inspector de calidad' },
];

const OPCIONES_AGRUPACION_AVANCE: OpcionAgrupacion[] = [
  { key: 'contratista', label: 'Subcontratista' },
  { key: 'estado', label: 'Estado del trabajo' },
  { key: 'inspector', label: 'Inspector de calidad' },
];

/** Día de la semana (Lunes-Sábado) correspondiente a una fecha ISO, o null si cae domingo
 * (día no laboral en este proyecto). Usa el día real de JS (0=Domingo..6=Sábado). */
function diaSemanaDeFecha(fechaISO: string): DiaSemana | null {
  const d = new Date(fechaISO + 'T00:00:00');
  const jsDay = d.getDay();
  if (jsDay === 0) return null;
  return DIAS_SEMANA[jsDay - 1];
}

function RegistrosTabla({
  items, tallerLabel, onEdit, onRemove, onViewPhotos, soloLectura,
}: {
  items: RegistroBitacora[];
  tallerLabel: (id: string) => string;
  onEdit: (b: RegistroBitacora) => void;
  onRemove: (id: string) => void;
  onViewPhotos: (fotos: string[]) => void;
  soloLectura?: boolean;
}) {
  const columnas: ColumnConfig<RegistroBitacora>[] = [
    { key: 'fecha', getValue: (b) => b.fecha },
    { key: 'taller', getValue: (b) => tallerLabel(b.tallerId) },
    { key: 'llego', getValue: (b) => b.llego },
    { key: 'completo', getValue: (b) => b.completo },
    { key: 'motivo', getValue: (b) => b.motivo },
    { key: 'responsable', getValue: (b) => b.responsable },
    { key: 'registradoPor', getValue: (b) => b.registradoPor || '' },
  ];
  const { rows, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(items, columnas);

  return (
    <Table>
      <TableHeader sticky>
        <TableRow>
          <SortableTableHead label="Fecha" columnKey="fecha" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Taller" columnKey="taller" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.taller} onFilterChange={setFilter} />
          <SortableTableHead label="Personal asignado" columnKey="llego" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Estado del trabajo" columnKey="completo" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Motivo" columnKey="motivo" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.motivo} onFilterChange={setFilter} />
          <SortableTableHead label="Responsable" columnKey="responsable" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.responsable} onFilterChange={setFilter} />
          <SortableTableHead label="Registrado por" columnKey="registradoPor" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.registradoPor} onFilterChange={setFilter} />
          <TableHead>Fotos</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={b.id}>
            <TableCell>{fmtDate(b.fecha)}</TableCell>
            <TableCell>{tallerLabel(b.tallerId)}</TableCell>
            <TableCell>{b.llego === 'SI' ? <Badge variant="success">SI</Badge> : <Badge variant="destructive">NO</Badge>}</TableCell>
            <TableCell>
              {b.completo === 'COMPLETADO' ? <Badge variant="success">Completado</Badge>
                : b.completo === 'EN PROCESO' ? <Badge variant="warning">En proceso</Badge>
                : b.completo === 'SIN INICIAR' ? <Badge variant="secondary">Sin iniciar</Badge>
                : '—'}
            </TableCell>
            <TableCell>{b.motivo || '—'}</TableCell>
            <TableCell>{b.responsable || '—'}</TableCell>
            <TableCell className="text-caption text-muted-foreground" title={b.registradoEn ? fmtDateTime(b.registradoEn) : ''}>
              {b.registradoPor || '—'}
            </TableCell>
            <TableCell>{b.fotos.length ? <Button size="sm" variant="outline" onClick={() => onViewPhotos(b.fotos)}>{b.fotos.length} foto(s)</Button> : '—'}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8" onClick={() => onEdit(b)} aria-label="Editar" disabled={soloLectura}><Pencil size={14} /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => onRemove(b.id)} aria-label="Eliminar" disabled={soloLectura}><Trash2 size={14} /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function BitacoraDiaria({ subs, talleres, bitacora, setBitacora, ciclos, setCiclos, quejas, semanaActual, showToast }: BitacoraDiariaProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'bitacora');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<RegistroBitacora | null>(null);
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [filtroDia, setFiltroDia] = useState('todos');
  const [buscadorUnidad, setBuscadorUnidad] = useState('');
  const [nivelesAgrupacion, setNivelesAgrupacion] = useState<string[]>([]);
  const [vistaRegistros, setVistaRegistros] = useState<'contratista' | 'personalizada'>('contratista');
  const [periodo, setPeriodo] = useState<PeriodoBitacora>('dia');
  const [diaSeleccionado, setDiaSeleccionado] = useState(todayISO());
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(semanaActual);
  const [mesSeleccionado, setMesSeleccionado] = useState(mesKeyActual());
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_BITACORA_DEFAULT);
  const colapsoAvance = useCollapseState();
  const colapsoContratista = useCollapseState();
  const colapsoPersonalizada = useCollapseState();

  // ---- Estado específico de "Avance de talleres" (independiente de los filtros de Registros) ----
  const [diaAvance, setDiaAvance] = useState<DiaSemana>(() => diaSemanaDeFecha(todayISO()) || 'Lunes');
  const [tallerDetalleAbierto, setTallerDetalleAbierto] = useState<Record<string, boolean>>({});
  const [avanceBuscadorUnidad, setAvanceBuscadorUnidad] = useState('');
  const [avanceFiltroProyecto, setAvanceFiltroProyecto] = useState('todos');
  const [avanceFiltroSub, setAvanceFiltroSub] = useState('todos');
  const [avanceFiltroInspector, setAvanceFiltroInspector] = useState('todos');
  const [avanceVista, setAvanceVista] = useState<'contratista' | 'personalizada'>('contratista');
  const [avanceNivelesAgrupacion, setAvanceNivelesAgrupacion] = useState<string[]>([]);

  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const tallerLabel = (id: string) => { const t = talleres.find((x) => x.id === id); return t ? `${subName(t.subcontratistaId)} — ${t.edificio} ${t.unidad}` : '—'; };

  const cicloDe = (tallerId: string): CicloTaller =>
    ciclos.find((c) => c.tallerId === tallerId) || { id: uid('cic'), tallerId, estado: 'NO INICIADO', fechaInicio: '', fechaCierre: '', comentarios: [] };

  const registroDeFecha = (tallerId: string, fecha: string): RegistroBitacora | undefined =>
    bitacora.find((b) => b.tallerId === tallerId && b.fecha === fecha);

  const saveCiclo = async (c: CicloTaller) => {
    const exists = ciclos.find((x) => x.id === c.id);
    const next = exists ? ciclos.map((x) => (x.id === c.id ? c : x)) : [...ciclos, c];
    setCiclos(next);
    if (!(await persistir('ciclos_taller', next))) return;
  };

  /** Crea o actualiza el registro diario de una fecha específica para un taller, desde la fila de avance */
  const upsertRegistroParaFecha = async (tallerId: string, fecha: string, partial: Pick<RegistroBitacora, 'llego' | 'completo' | 'notas' | 'motivo'>) => {
    const existing = bitacora.find((b) => b.tallerId === tallerId && b.fecha === fecha);
    let next: RegistroBitacora[];
    if (existing) {
      next = bitacora.map((b) =>
        b.tallerId === tallerId && b.fecha === fecha
          ? { ...b, llego: partial.llego || b.llego, completo: partial.completo || b.completo, notas: partial.notas || b.notas, motivo: partial.motivo || b.motivo }
          : b
      );
    } else {
      const nuevo: RegistroBitacora = {
        id: uid('bit'), fecha, tallerId,
        llego: partial.llego, completo: partial.completo,
        motivo: partial.motivo, responsable: '', accion: '', notas: partial.notas, fotos: [],
      };
      next = [...bitacora, nuevo];
    }
    setBitacora(next);
    if (!(await persistir('bitacora', next))) return;
  };

  const save = async (b: RegistroBitacora) => {
    const exists = bitacora.find((x) => x.id === b.id);
    const registro = exists ? b : { ...b, registradoPor: usuario.nombre, registradoPorId: usuario.id, registradoEn: new Date().toISOString() };
    const next = exists ? bitacora.map((x) => (x.id === b.id ? registro : x)) : [...bitacora, registro];
    setBitacora(next);
    if (!(await persistir('bitacora', next))) return;
    setShowNew(false);
    setEditing(null);
    showToast('Registro de bitácora guardado');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const next = bitacora.filter((x) => x.id !== id);
    setBitacora(next);
    if (!(await persistir('bitacora', next))) return;
    showToast('Registro eliminado');
  };


  // Filtra registros según el periodo elegido (día exacto, semana completa, o mes completo)
  let filtered = bitacora;
  if (periodo === 'dia') filtered = filtered.filter((b) => b.fecha === diaSeleccionado);
  else if (periodo === 'semana') filtered = filtered.filter((b) => mondayOf(b.fecha) === semanaSeleccionada);
  else filtered = filtered.filter((b) => b.fecha.slice(0, 7) === mesSeleccionado);
  filtered = filtroSub === 'todos' ? filtered : filtered.filter((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId === filtroSub);
  filtered = filtroProyecto === 'todos' ? filtered : filtered.filter((b) => talleres.find((t) => t.id === b.tallerId)?.proyecto === filtroProyecto);
  filtered = filtroInspector === 'todos' ? filtered : filtered.filter((b) => talleres.find((t) => t.id === b.tallerId)?.inspector === filtroInspector);
  filtered = filtroDia === 'todos' ? filtered : filtered.filter((b) => talleres.find((t) => t.id === b.tallerId)?.dia === filtroDia);
  if (buscadorUnidad.trim()) {
    filtered = filtered.filter((b) => {
      const t = talleres.find((x) => x.id === b.tallerId);
      return t && unidadMatchesSearch(t.edificio, t.esGeneral ? 'general' : t.unidad, buscadorUnidad);
    });
  }
  const sorted = [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const periodoLabel = periodo === 'dia' ? `el día ${fmtDate(diaSeleccionado)}`
    : periodo === 'semana' ? `la semana del ${weekRangeLabel(semanaSeleccionada)}`
    : `el mes de ${mesLabel(mesSeleccionado)}`;
  const periodoLabelCorto = periodo === 'dia' ? fmtDate(diaSeleccionado)
    : periodo === 'semana' ? `Semana del ${weekRangeLabel(semanaSeleccionada)}`
    : mesLabel(mesSeleccionado);

  const parrafoAnalisis = useMemo(
    () => buildParrafoAnalisisBitacora(filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, filtered, periodoLabel),
    [filtered, filtroSub, subs, periodoLabel]
  );

  const inspectoresDisponibles = useMemo(
    () => [...new Set(talleres.map((t) => t.inspector).filter(Boolean))].sort(),
    [talleres]
  );

  const sortedPorContratista = useMemo(() => {
    const ids = [...new Set(sorted.map((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId).filter(Boolean))] as string[];
    return ids.map((id) => ({ id, nombre: subName(id), items: sorted.filter((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId === id) }));
  }, [sorted, talleres, subs]);

  const dimensionesDisponibles: Record<string, DimensionAgrupacion<RegistroBitacora>> = {
    contratista: { key: 'contratista', label: 'Subcontratista', getValue: (b) => { const t = talleres.find((x) => x.id === b.tallerId); return t ? subName(t.subcontratistaId) : '—'; } },
    estadoTrabajo: { key: 'estadoTrabajo', label: 'Estado del trabajo', getValue: (b) => b.completo || 'SIN REGISTRO' },
    personalAsignado: { key: 'personalAsignado', label: 'Personal asignado', getValue: (b) => (b.llego === 'SI' ? 'Asignado' : 'Sin personal') },
    inspector: { key: 'inspector', label: 'Inspector de calidad', getValue: (b) => { const t = talleres.find((x) => x.id === b.tallerId); return t?.inspector || 'Sin asignar'; } },
  };
  const arbolPersonalizado = useMemo(() => {
    const dims = nivelesAgrupacion.map((k) => dimensionesDisponibles[k]).filter(Boolean);
    return construirArbolAgrupado(sorted, dims);
  }, [sorted, nivelesAgrupacion]);
  const keysPorNivelPersonalizada = useMemo(() => keysPorNivel(arbolPersonalizado), [arbolPersonalizado]);
  const nivelesConLabel = nivelesAgrupacion.map((k, i) => ({ label: dimensionesDisponibles[k]?.label || k, keys: keysPorNivelPersonalizada[i] || [] }));

  // ---- Datos de "Avance de talleres": SOLO los talleres del día elegido en la barra de días ----
  const fechaActivaAvance = fechaDeISODia(semanaActual, diaAvance);

  let talleresAvanceDelDia = talleres.filter((t) =>
    t.semana === semanaActual && t.dia === diaAvance
    && (avanceFiltroSub === 'todos' || t.subcontratistaId === avanceFiltroSub)
    && (avanceFiltroProyecto === 'todos' || t.proyecto === avanceFiltroProyecto)
    && (avanceFiltroInspector === 'todos' || t.inspector === avanceFiltroInspector)
  );
  if (avanceBuscadorUnidad.trim()) {
    talleresAvanceDelDia = talleresAvanceDelDia.filter((t) => unidadMatchesSearch(t.edificio, t.esGeneral ? 'general' : t.unidad, avanceBuscadorUnidad));
  }

  const talleresAvancePorContratista = useMemo(() => {
    const ids = [...new Set(talleresAvanceDelDia.map((t) => t.subcontratistaId))];
    return ids.map((id) => ({ id, nombre: subName(id), items: talleresAvanceDelDia.filter((t) => t.subcontratistaId === id) }));
  }, [talleresAvanceDelDia, subs]);

  const resumenAvance = useMemo(() => {
    let conPersonal = 0, completados = 0, enProceso = 0, sinIniciar = 0;
    talleresAvanceDelDia.forEach((t) => {
      const ciclo = cicloDe(t.id);
      const reg = registroDeFecha(t.id, fechaActivaAvance);
      if (reg?.llego === 'SI') conPersonal++;
      if (ciclo.estado === 'COMPLETADO') completados++;
      else if (ciclo.estado === 'EN PROCESO') enProceso++;
      else sinIniciar++;
    });
    return { conPersonal, completados, enProceso, sinIniciar };
  }, [talleresAvanceDelDia, ciclos, bitacora, fechaActivaAvance]);

  const dimensionesAvance: Record<string, DimensionAgrupacion<Taller>> = {
    contratista: { key: 'contratista', label: 'Subcontratista', getValue: (t) => subName(t.subcontratistaId) },
    estado: { key: 'estado', label: 'Estado del trabajo', getValue: (t) => cicloDe(t.id).estado },
    inspector: { key: 'inspector', label: 'Inspector de calidad', getValue: (t) => t.inspector || 'Sin asignar' },
  };
  const arbolAvance = useMemo(() => {
    const dims = avanceNivelesAgrupacion.map((k) => dimensionesAvance[k]).filter(Boolean);
    return construirArbolAgrupado(talleresAvanceDelDia, dims);
  }, [talleresAvanceDelDia, avanceNivelesAgrupacion, ciclos]);
  const keysPorNivelAvance = useMemo(() => keysPorNivel(arbolAvance), [arbolAvance]);
  const nivelesConLabelAvance = avanceNivelesAgrupacion.map((k, i) => ({ label: dimensionesAvance[k]?.label || k, keys: keysPorNivelAvance[i] || [] }));


  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-title font-semibold">Bitácora de obra</div>
          <div className="mb-4 text-caption text-muted-foreground">Da seguimiento diario a la asistencia y registra el avance de ejecución de cada taller.</div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
              <Select value={filtroSub} onValueChange={setFiltroSub}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <InspectorFilter value={filtroInspector} onChange={setFiltroInspector} opciones={inspectoresDisponibles} />
              <Select value={filtroDia} onValueChange={setFiltroDia}>
                <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los días</SelectItem>
                  {DIAS_SEMANA.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowNew(true)} disabled={soloLectura}><Plus size={14} />Nuevo registro</Button>
          </div>

          <Tabs defaultValue="avance">
            <TabsList className="mb-4">
              <TabsTrigger value="avance">Avance de talleres</TabsTrigger>
              <TabsTrigger value="registros">Registros (día / semana / mes)</TabsTrigger>
            </TabsList>

            <TabsContent value="avance">
              {/* Barra de días: Lunes a Sábado de la semana activa, con su fecha real */}
              <div className="sticky top-0 z-10 -mx-5 mb-3.5 flex flex-wrap items-center justify-between gap-2 bg-sidebar-bg px-5 py-2.5 text-white">
                <div className="flex flex-wrap items-center gap-1">
                  {DIAS_SEMANA.map((d) => {
                    const fecha = fechaDeISODia(semanaActual, d);
                    const esHoy = fecha === todayISO();
                    const activo = d === diaAvance;
                    return (
                      <button
                        key={d} type="button" onClick={() => setDiaAvance(d)}
                        className={`rounded-md px-2.5 py-1.5 text-left text-caption transition-colors ${activo ? 'bg-sidebar-active font-semibold text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                      >
                        <div>{d}{esHoy ? ' · hoy' : ''}</div>
                        <div className="text-micro opacity-80">{fmtDate(fecha)}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-caption text-white/70">Semana del {weekRangeLabel(semanaActual)}</div>
              </div>

              <ViewTabs
                value={avanceVista}
                onChange={setAvanceVista}
                tabs={[
                  { value: 'contratista', label: 'Por contratista' },
                  { value: 'personalizada', label: 'Agrupación personalizada' },
                ]}
              />

              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
                <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
                  <UnidadSearchBox value={avanceBuscadorUnidad} onChange={setAvanceBuscadorUnidad} />
                  <ProjectFilter value={avanceFiltroProyecto} onChange={setAvanceFiltroProyecto} />
                  <Select value={avanceFiltroSub} onValueChange={setAvanceFiltroSub}>
                    <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                      {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <InspectorFilter value={avanceFiltroInspector} onChange={setAvanceFiltroInspector} opciones={inspectoresDisponibles} />
                  {avanceVista === 'personalizada' && (
                    <AgrupacionConfigButton opciones={OPCIONES_AGRUPACION_AVANCE} seleccion={avanceNivelesAgrupacion} onChange={setAvanceNivelesAgrupacion} />
                  )}
                  {avanceVista === 'contratista' && (
                    <ExpandCollapseAllButtons onExpandAll={colapsoAvance.expandAll} onCollapseAll={() => colapsoAvance.collapseAll(talleresAvancePorContratista.map((g) => g.id))} />
                  )}
                  {avanceVista === 'personalizada' && (
                    <ExpandCollapseAllButtons onExpandAll={colapsoPersonalizada.expandAll} onCollapseAll={() => colapsoPersonalizada.collapseAll(todasLasKeysAgrupables(arbolAvance))} />
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <ExportarButton
                    onExcel={() => exportAvanceBitacoraExcel(talleresAvanceDelDia, subs, ciclos, bitacora, fechaActivaAvance, diaLabel(semanaActual, diaAvance))}
                    onPDF={() => exportAvanceBitacoraPDF(talleresAvanceDelDia, subs, ciclos, bitacora, fechaActivaAvance, diaLabel(semanaActual, diaAvance), resumenAvance)}
                  />
                </div>
              </div>

              {avanceVista === 'personalizada' && nivelesConLabelAvance.length > 0 && (
                <div className="mb-3.5">
                  <NivelCollapseControls niveles={nivelesConLabelAvance} onCollapseKeys={colapsoPersonalizada.collapseKeys} onExpandKeys={colapsoPersonalizada.expandKeys} />
                </div>
              )}

              <div className="mb-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
                  <div className="text-title font-bold text-success">{resumenAvance.conPersonal}</div>
                  <div className="text-micro text-muted-foreground">Con personal hoy</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
                  <div className="text-title font-bold text-success">{resumenAvance.completados}</div>
                  <div className="text-micro text-muted-foreground">Completados</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
                  <div className="text-title font-bold text-warning">{resumenAvance.enProceso}</div>
                  <div className="text-micro text-muted-foreground">En proceso</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
                  <div className="text-title font-bold text-muted-foreground">{resumenAvance.sinIniciar}</div>
                  <div className="text-micro text-muted-foreground">Sin iniciar</div>
                </div>
              </div>

              {talleresAvanceDelDia.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres planificados para el {diaAvance.toLowerCase()} {fmtDate(fechaActivaAvance)}.</div>
              ) : avanceVista === 'contratista' ? (
                talleresAvancePorContratista.map((g) => (
                  <CollapsibleGroup
                    key={g.id}
                    open={!colapsoAvance.isCollapsed(g.id)}
                    onToggle={() => colapsoAvance.toggle(g.id)}
                    header={
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <SubAvatar name={g.nombre} id={g.id} />{g.nombre}
                        <Badge variant="secondary">{g.items.length} taller(es)</Badge>
                      </div>
                    }
                  >
                    <div className="space-y-2">
                      {g.items.map((t) => (
                        <TallerAvanceRow
                          key={t.id}
                          taller={t}
                          ciclo={cicloDe(t.id)}
                          registro={registroDeFecha(t.id, fechaActivaAvance)}
                          fechaContexto={fechaActivaAvance}
                          incidencias={quejasDelTaller(t, quejas)}
                          abierto={!!tallerDetalleAbierto[t.id]}
                          onToggleAbierto={() => setTallerDetalleAbierto((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                          onChangeCiclo={saveCiclo}
                          onUpsertRegistro={(partial) => upsertRegistroParaFecha(t.id, fechaActivaAvance, partial)}
                          soloLectura={soloLectura}
                        />
                      ))}
                    </div>
                  </CollapsibleGroup>
                ))
              ) : (
                <ArbolAgrupado
                  nodos={arbolAvance}
                  isCollapsed={colapsoPersonalizada.isCollapsed}
                  onToggle={colapsoPersonalizada.toggle}
                  renderHoja={(items) => (
                    <div className="space-y-2">
                      {items.map((t) => (
                        <TallerAvanceRow
                          key={t.id}
                          taller={t}
                          ciclo={cicloDe(t.id)}
                          registro={registroDeFecha(t.id, fechaActivaAvance)}
                          fechaContexto={fechaActivaAvance}
                          incidencias={quejasDelTaller(t, quejas)}
                          abierto={!!tallerDetalleAbierto[t.id]}
                          onToggleAbierto={() => setTallerDetalleAbierto((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                          onChangeCiclo={saveCiclo}
                          onUpsertRegistro={(partial) => upsertRegistroParaFecha(t.id, fechaActivaAvance, partial)}
                          soloLectura={soloLectura}
                        />
                      ))}
                    </div>
                  )}
                />
              )}
            </TabsContent>

            <TabsContent value="registros">
              <ViewTabs
                value={vistaRegistros}
                onChange={setVistaRegistros}
                tabs={[
                  { value: 'contratista', label: 'Por contratista' },
                  { value: 'personalizada', label: 'Agrupación personalizada' },
                ]}
              />

              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
                <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant={periodo === 'dia' ? 'default' : 'outline'} onClick={() => setPeriodo('dia')}>Día</Button>
                    <Button size="sm" variant={periodo === 'semana' ? 'default' : 'outline'} onClick={() => setPeriodo('semana')}>Semana</Button>
                    <Button size="sm" variant={periodo === 'mes' ? 'default' : 'outline'} onClick={() => setPeriodo('mes')}>Mes</Button>
                  </div>
                  {periodo === 'dia' && <Input type="date" value={diaSeleccionado} onChange={(e) => setDiaSeleccionado(e.target.value)} className="max-w-[180px]" />}
                  {periodo === 'semana' && <WeekCalendarPicker semanaActual={semanaSeleccionada} onChange={setSemanaSeleccionada} />}
                  {periodo === 'mes' && <MonthPicker mesKey={mesSeleccionado} onChange={setMesSeleccionado} />}
                  <UnidadSearchBox value={buscadorUnidad} onChange={setBuscadorUnidad} />
                  {vistaRegistros === 'personalizada' && (
                    <AgrupacionConfigButton opciones={OPCIONES_AGRUPACION_BITACORA} seleccion={nivelesAgrupacion} onChange={setNivelesAgrupacion} />
                  )}
                  {vistaRegistros === 'contratista' && (
                    <ExpandCollapseAllButtons onExpandAll={colapsoContratista.expandAll} onCollapseAll={() => colapsoContratista.collapseAll(sortedPorContratista.map((g) => g.id))} />
                  )}
                  {vistaRegistros === 'personalizada' && (
                    <ExpandCollapseAllButtons onExpandAll={colapsoPersonalizada.expandAll} onCollapseAll={() => colapsoPersonalizada.collapseAll(todasLasKeysAgrupables(arbolPersonalizado))} />
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <ColumnSelector seleccionadas={columnasExport} onChange={setColumnasExport} columnas={COLUMNAS_BITACORA} />
                  <ExportarButton
                    onExcel={() => exportBitacoraExcel(filtered, talleres, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, ciclos, periodoLabelCorto, quejas, columnasExport)}
                    onPDF={() => exportBitacoraPDF(filtered, talleres, subs, filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null, ciclos, periodoLabelCorto, parrafoAnalisis, quejas)}
                  />
                </div>
              </div>

              {vistaRegistros === 'personalizada' && nivelesConLabel.length > 0 && (
                <div className="mb-3.5">
                  <NivelCollapseControls niveles={nivelesConLabel} onCollapseKeys={colapsoPersonalizada.collapseKeys} onExpandKeys={colapsoPersonalizada.expandKeys} />
                </div>
              )}

              <div className="mb-3.5 rounded-lg bg-muted/30 px-3.5 py-2.5 text-caption leading-relaxed">
                {parrafoAnalisis}
              </div>

              {vistaRegistros === 'contratista' && (
                sortedPorContratista.length ? sortedPorContratista.map((g) => (
                  <CollapsibleGroup
                    key={g.id}
                    open={!colapsoContratista.isCollapsed(g.id)}
                    onToggle={() => colapsoContratista.toggle(g.id)}
                    header={
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <SubAvatar name={g.nombre} id={g.id} />{g.nombre}
                        <Badge variant="secondary">{g.items.length} registro(s)</Badge>
                      </div>
                    }
                  >
                    <RegistrosTabla items={g.items} tallerLabel={tallerLabel} onEdit={setEditing} onRemove={remove} onViewPhotos={setViewPhotos} soloLectura={soloLectura} />
                  </CollapsibleGroup>
                )) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">No hay registros de bitácora en este periodo.</div>
                )
              )}

              {vistaRegistros === 'personalizada' && (
                <ArbolAgrupado
                  nodos={arbolPersonalizado}
                  isCollapsed={colapsoPersonalizada.isCollapsed}
                  onToggle={colapsoPersonalizada.toggle}
                  renderHoja={(items) => <RegistrosTabla items={items} tallerLabel={tallerLabel} onEdit={setEditing} onRemove={remove} onViewPhotos={setViewPhotos} soloLectura={soloLectura} />}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ResponsiveDialog open={showNew} onOpenChange={setShowNew} title="Nuevo registro de bitácora">
        <BitacoraForm subs={subs} talleres={talleres} onSave={save} onCancel={() => setShowNew(false)} />
      </ResponsiveDialog>

      <ResponsiveDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title="Editar registro">
        {editing && <BitacoraForm subs={subs} talleres={talleres} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </ResponsiveDialog>

      <PhotoViewer photos={viewPhotos} onClose={() => setViewPhotos(null)} />
    </div>
  );
}
