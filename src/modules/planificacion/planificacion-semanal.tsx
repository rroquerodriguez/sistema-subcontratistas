import { useMemo, useRef, useState, type ReactNode } from 'react';
import { LayoutGrid, Pencil, Trash2, AlertTriangle, ArrowRightCircle, Download, Upload, CalendarDays, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { SubAvatar } from '@/components/shared/sub-avatar';
import { WeekCalendarPicker } from '@/components/shared/week-calendar-picker';
import { MonthPicker } from '@/components/shared/month-picker';
import { ProjectFilter } from '@/components/shared/project-filter';
import { InspectorFilter } from '@/components/shared/inspector-filter';
import { EstadoLiberacionBadge, EntregaBadge, PrioridadBadge, DiasPill } from '@/components/shared/status-badges';
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
import { Badge } from '@/components/ui/badge';
import { MultiTallerForm, type MultiRow } from './multi-taller-form';
import { TallerForm } from './taller-form';
import { dbSet } from '@/lib/storage';
import { descargarPlantillaPlanificacion, parsePlantillaPlanificacion } from '@/lib/import-planificacion';
import { talleresAtrasados } from '@/lib/stats-engine';
import { exportPlanificacionExcel, COLUMNAS_PLANIFICACION_DEFAULT } from '@/lib/export-planificacion-excel';
import { exportPlanificacionSemanalExcel } from '@/lib/export-planificacion-semanal-excel';
import { exportPlanificacionSemanalPDF } from '@/lib/export-planificacion-semanal-pdf';
import { exportPlanificacionPDF } from '@/lib/export-planificacion-pdf';
import { ColumnSelector } from '@/components/shared/column-selector';
import { CHECKLIST_ITEMS } from '@/lib/seed-data';
import { uid, todayISO, nowISODatetime, weekRangeLabel, diffDays, diaLabel, mesKeyActual, mesLabel, semanasDelMes, fmtDate, fmtDateTime, fechaDeISODia } from '@/lib/utils-app';
import { fechasPrometidasAtrasadas, fechasPrometidasProximas } from '@/lib/stats-engine';
import type { Subcontratista, Taller, Validacion, Entrega, FechaPrometida, TallerCatalogo, UnidadProyecto, TabId, DiaSemana } from '@/types';

const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const OPCIONES_AGRUPACION_PLANIFICACION: OpcionAgrupacion[] = [
  { key: 'contratista', label: 'Subcontratista' },
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'dia', label: 'Día' },
  { key: 'prioridad', label: 'Prioridad' },
  { key: 'estadoLiberacion', label: 'Estado de liberación' },
  { key: 'inspector', label: 'Inspector de calidad' },
];

interface TallaresTablaProps {
  items: Taller[];
  showSub: boolean;
  subName: (id: string) => string;
  validacionDe: (id: string) => Validacion | undefined;
  renderCells: (t: Taller) => ReactNode;
  seleccion?: Set<string>;
  onToggleUno?: (id: string) => void;
  onToggleVisibles?: (ids: string[], seleccionarTodos: boolean) => void;
}

/** Tabla de talleres con orden/filtro por columna (clic en encabezado + búsqueda por columna),
 * y orden por día como criterio secundario siempre disponible al limpiar el orden manual. */
function TallaresTabla({ items, showSub, subName, validacionDe, renderCells, seleccion, onToggleUno, onToggleVisibles }: TallaresTablaProps) {
  const columnas: ColumnConfig<Taller>[] = [
    ...(showSub ? [{ key: 'subcontratista', getValue: (t: Taller) => subName(t.subcontratistaId) }] : []),
    { key: 'proyecto', getValue: (t) => t.proyecto },
    { key: 'edificio', getValue: (t) => t.edificio },
    { key: 'unidad', getValue: (t) => (t.esGeneral ? 'GENERAL' : t.unidad) },
    { key: 'actividad', getValue: (t) => t.actividad },
    { key: 'prioridad', getValue: (t) => Number(t.prioridad) },
    { key: 'dia', getValue: (t) => DIAS_ORDER.indexOf(t.dia) },
    { key: 'tecnico', getValue: (t) => t.tecnico },
    { key: 'inspector', getValue: (t) => t.inspector },
    { key: 'fechaPromesa', getValue: (t) => t.fechaPromesa },
    { key: 'estadoLiberacion', getValue: (t) => validacionDe(t.id)?.resultado || 'PENDIENTE' },
  ];
  const sortByDia = (a: Taller, b: Taller) => DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia) || Number(a.prioridad) - Number(b.prioridad);
  const base = useMemo(() => [...items].sort(sortByDia), [items]);
  const { rows, sortKey, sortDir, toggleSort, filters, setFilter } = useSortableFilterableTable(base, columnas);
  const seleccionActiva = !!seleccion && !!onToggleUno && !!onToggleVisibles;
  const idsVisibles = rows.map((t) => t.id);
  const todosVisiblesSeleccionados = seleccionActiva && idsVisibles.length > 0 && idsVisibles.every((id) => seleccion!.has(id));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {seleccionActiva && (
            <TableHead className="w-9">
              <Checkbox
                checked={todosVisiblesSeleccionados}
                onCheckedChange={(v) => onToggleVisibles!(idsVisibles, !!v)}
                aria-label="Seleccionar todos los visibles"
              />
            </TableHead>
          )}
          {showSub && <SortableTableHead label="Subcontratista" columnKey="subcontratista" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.subcontratista} onFilterChange={setFilter} />}
          <SortableTableHead label="Proyecto" columnKey="proyecto" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.proyecto} onFilterChange={setFilter} />
          <SortableTableHead label="Edificio/Villa/Townhouse" columnKey="edificio" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.edificio} onFilterChange={setFilter} />
          <SortableTableHead label="Unidad" columnKey="unidad" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.unidad} onFilterChange={setFilter} />
          <SortableTableHead label="Actividad" columnKey="actividad" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.actividad} onFilterChange={setFilter} />
          <SortableTableHead label="Prioridad" columnKey="prioridad" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Día" columnKey="dia" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <TableHead>Arrastre</TableHead>
          <SortableTableHead label="Técnico" columnKey="tecnico" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.tecnico} onFilterChange={setFilter} />
          <SortableTableHead label="Inspector" columnKey="inspector" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.inspector} onFilterChange={setFilter} />
          <SortableTableHead label="F. Promesa" columnKey="fechaPromesa" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterable={false} />
          <SortableTableHead label="Liberación" columnKey="estadoLiberacion" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} filterValue={filters.estadoLiberacion} onFilterChange={setFilter} />
          <TableHead>Entrega</TableHead><TableHead>Días</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id} data-state={seleccionActiva && seleccion!.has(t.id) ? 'selected' : undefined}>
            {seleccionActiva && (
              <TableCell className="w-9">
                <Checkbox checked={seleccion!.has(t.id)} onCheckedChange={() => onToggleUno!(t.id)} aria-label="Seleccionar taller" />
              </TableCell>
            )}
            {showSub && <TableCell className="font-medium">{subName(t.subcontratistaId)}</TableCell>}
            {renderCells(t)}
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow><TableCell colSpan={(showSub ? 15 : 14) + (seleccionActiva ? 1 : 0)} className="py-8 text-center text-sm text-muted-foreground">Sin talleres para mostrar.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}

interface PlanificacionSemanalProps {
  subs: Subcontratista[];
  talleres: Taller[];
  setTalleres: (t: Taller[]) => void;
  validaciones: Validacion[];
  setValidaciones: (v: Validacion[]) => void;
  entregas: Entrega[];
  setEntregas: (e: Entrega[]) => void;
  semanaActual: string;
  setSemanaActual: (s: string) => void;
  showToast: (msg: string) => void;
  goTo: (t: TabId) => void;
  goToTaller: (tallerId: string) => void;
  fechas: FechaPrometida[];
  catalogo: TallerCatalogo[];
  setCatalogo: (c: TallerCatalogo[]) => void;
  unidadesProyecto: UnidadProyecto[];
}

export function PlanificacionSemanal({
  subs, talleres, setTalleres, validaciones, setValidaciones, entregas, setEntregas,
  semanaActual, setSemanaActual, showToast, goTo, goToTaller, fechas, catalogo, setCatalogo, unidadesProyecto,
}: PlanificacionSemanalProps) {
  const usuario = useUsuarioActual();
  const soloLectura = !puedeEditar(usuario.perfil, 'planificacion');
  const [showMulti, setShowMulti] = useState(false);
  const [editing, setEditing] = useState<Taller | null>(null);
  const [vista, setVista] = useState<'contratista' | 'global' | 'semanal' | 'personalizada'>('contratista');
  const [filtroSub, setFiltroSub] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [filtroDia, setFiltroDia] = useState('todos');
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [buscadorUnidad, setBuscadorUnidad] = useState('');
  const [nivelesAgrupacion, setNivelesAgrupacion] = useState<string[]>([]);
  const [vistaExportar, setVistaExportar] = useState<'tabla' | 'semanal'>('tabla');
  const [periodo, setPeriodo] = useState<'semanal' | 'mensual'>('semanal');
  const [mesActual, setMesActual] = useState(mesKeyActual());
  const [subiendoPlantilla, setSubiendoPlantilla] = useState(false);
  const [columnasExport, setColumnasExport] = useState<string[]>(COLUMNAS_PLANIFICACION_DEFAULT);
  const [previewPlantilla, setPreviewPlantilla] = useState<{ talleres: Omit<Taller, 'id' | 'semana'>[]; totalFilas: number; erroresFila: { fila: number; motivo: string }[] } | null>(null);
  const [arrastreModal, setArrastreModal] = useState<{ talleres: Taller[]; dias: Record<string, DiaSemana> } | null>(null);
  const [diaMasivoArrastre, setDiaMasivoArrastre] = useState<DiaSemana | ''>('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [confirmarBorradoMasivo, setConfirmarBorradoMasivo] = useState(false);
  const [correccionModal, setCorreccionModal] = useState<{ talleres: Taller[]; semanaDestino: string } | null>(null);
  const plantillaInputRef = useRef<HTMLInputElement>(null);
  const colapsoContratista = useCollapseState();
  const colapsoSemanal = useCollapseState();
  const colapsoPersonalizada = useCollapseState();

  const semanasDelMesActual = useMemo(() => semanasDelMes(mesActual), [mesActual]);
  const semanaTalleres = useMemo(
    () => talleres.filter((t) =>
      (periodo === 'mensual' ? semanasDelMesActual.includes(t.semana) : t.semana === semanaActual) &&
      (filtroProyecto === 'todos' || t.proyecto === filtroProyecto)
    ),
    [talleres, periodo, semanasDelMesActual, semanaActual, filtroProyecto]
  );
  const periodoLabel = periodo === 'mensual' ? `el mes de ${mesLabel(mesActual)}` : `la semana del ${weekRangeLabel(semanaActual)}`;
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const validacionDe = (tallerId: string) => validaciones.find((v) => v.tallerId === tallerId);
  const entregaDe = (tallerId: string) => entregas.find((e) => e.tallerId === tallerId);

  const createValidacionPendiente = (tallerId: string): Validacion => ({
    id: uid('val'), tallerId, fecha: todayISO(), validadoPor: '', cargo: '',
    checklist: CHECKLIST_ITEMS.map(() => 'PENDIENTE'), resultado: 'PENDIENTE', observaciones: '', fotos: [],
  });

  const createValidacionLiberada = (tallerId: string, inspector: string): Validacion => ({
    id: uid('val'), tallerId, fecha: todayISO(), validadoPor: inspector, cargo: 'Inspector de calidad',
    checklist: CHECKLIST_ITEMS.map(() => 'SI'), resultado: 'LISTO',
    observaciones: 'Taller liberado y validado por supervisor.', fotos: [],
  });

  /** Si la actividad escrita no existe en el catálogo del contratista, la agrega automáticamente */
  const sincronizarCatalogo = async (entradas: { subcontratistaId: string; actividad: string }[]) => {
    let next = catalogo;
    let changed = false;
    entradas.forEach(({ subcontratistaId, actividad }) => {
      const act = actividad.trim();
      if (!subcontratistaId || !act) return;
      const yaExiste = next.some((c) => c.subcontratistaId === subcontratistaId && c.actividad.toLowerCase() === act.toLowerCase());
      if (!yaExiste) {
        next = [...next, { id: uid('cat'), subcontratistaId, actividad: act, notas: '' }];
        changed = true;
      }
    });
    if (changed) {
      setCatalogo(next);
      await dbSet('catalogo_talleres', next);
    }
  };

  const saveMany = async (rows: MultiRow[]) => {
    const newTalleres: Taller[] = rows.map((r) => ({
      id: uid('tal'), semana: semanaActual, subcontratistaId: r.subcontratistaId, proyecto: r.proyecto,
      edificio: r.edificio, unidad: r.unidad, esGeneral: r.esGeneral, actividad: r.actividad, prioridad: r.prioridad, dia: r.dia,
      tecnico: r.tecnico, inspector: r.inspector, fechaPromesa: r.fechaPromesa, observaciones: '',
      creadoPor: usuario.nombre, creadoPorId: usuario.id, creadoEn: new Date().toISOString(),
    }));
    const newValidaciones = newTalleres.map((t, i) =>
      rows[i].marcarLiberado ? createValidacionLiberada(t.id, t.inspector) : createValidacionPendiente(t.id)
    );
    const nextTalleres = [...talleres, ...newTalleres];
    const nextValidaciones = [...validaciones, ...newValidaciones];
    setTalleres(nextTalleres);
    setValidaciones(nextValidaciones);
    await dbSet('talleres', nextTalleres);
    await dbSet('validaciones', nextValidaciones);
    await sincronizarCatalogo(newTalleres.map((t) => ({ subcontratistaId: t.subcontratistaId, actividad: t.actividad })));
    setShowMulti(false);
    const liberadosCount = rows.filter((r) => r.marcarLiberado).length;
    showToast(`${newTalleres.length} taller(es) agregado(s)${liberadosCount ? `, ${liberadosCount} ya liberado(s)` : ''}`);
  };

  const handlePlantillaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoPlantilla(true);
    try {
      const resultado = await parsePlantillaPlanificacion(file, subs);
      setPreviewPlantilla(resultado);
    } catch (err) {
      alert('No se pudo leer el archivo. Verifica que sea la plantilla de planificación en formato Excel (.xlsx).');
      console.error(err);
    } finally {
      setSubiendoPlantilla(false);
      e.target.value = '';
    }
  };

  const confirmarImportacionPlantilla = async () => {
    if (!previewPlantilla || !previewPlantilla.talleres.length) { setPreviewPlantilla(null); return; }
    const newTalleres: Taller[] = previewPlantilla.talleres.map((t) => ({ ...t, id: uid('tal'), semana: semanaActual }));
    const newValidaciones = newTalleres.map((t) => createValidacionPendiente(t.id));
    const nextTalleres = [...talleres, ...newTalleres];
    const nextValidaciones = [...validaciones, ...newValidaciones];
    setTalleres(nextTalleres);
    setValidaciones(nextValidaciones);
    await dbSet('talleres', nextTalleres);
    await dbSet('validaciones', nextValidaciones);
    await sincronizarCatalogo(newTalleres.map((t) => ({ subcontratistaId: t.subcontratistaId, actividad: t.actividad })));
    showToast(`${newTalleres.length} taller(es) importados desde la plantilla — validación pendiente creada para cada uno`);
    setPreviewPlantilla(null);
  };

  const saveOne = async (t: Taller) => {
    const item = { ...t, semana: semanaActual };
    const exists = talleres.find((x) => x.id === item.id);
    let nextTalleres: Taller[];
    let nextValidaciones = validaciones;
    if (exists) {
      nextTalleres = talleres.map((x) => (x.id === item.id ? item : x));
    } else {
      nextTalleres = [...talleres, item];
      nextValidaciones = [...validaciones, createValidacionPendiente(item.id)];
    }
    setTalleres(nextTalleres);
    setValidaciones(nextValidaciones);
    await dbSet('talleres', nextTalleres);
    if (nextValidaciones !== validaciones) await dbSet('validaciones', nextValidaciones);
    await sincronizarCatalogo([{ subcontratistaId: item.subcontratistaId, actividad: item.actividad }]);
    setEditing(null);
    showToast(exists ? 'Taller actualizado' : 'Taller agregado');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este taller, su validación y entrega asociadas?')) return;
    const nextTalleres = talleres.filter((x) => x.id !== id);
    const nextValidaciones = validaciones.filter((v) => v.tallerId !== id);
    const nextEntregas = entregas.filter((e) => e.tallerId !== id);
    setTalleres(nextTalleres);
    setValidaciones(nextValidaciones);
    setEntregas(nextEntregas);
    await dbSet('talleres', nextTalleres);
    await dbSet('validaciones', nextValidaciones);
    await dbSet('entregas', nextEntregas);
    showToast('Taller eliminado');
  };

  const toggleSeleccionUno = (id: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Marca o desmarca de golpe todos los talleres visibles en una tabla (respetando filtros/búsqueda).
   * Si seleccionarTodos es true, agrega esos ids a la selección; si es false, los quita. No toca los
   * ids que estén seleccionados pero no visibles en ese momento. */
  const toggleSeleccionVisibles = (ids: string[], seleccionarTodos: boolean) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (seleccionarTodos) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const limpiarSeleccion = () => setSeleccion(new Set());

  const borrarSeleccionados = async () => {
    const ids = seleccion;
    if (ids.size === 0) return;
    const nextTalleres = talleres.filter((x) => !ids.has(x.id));
    const nextValidaciones = validaciones.filter((v) => !ids.has(v.tallerId));
    const nextEntregas = entregas.filter((e) => !ids.has(e.tallerId));
    setTalleres(nextTalleres);
    setValidaciones(nextValidaciones);
    setEntregas(nextEntregas);
    await dbSet('talleres', nextTalleres);
    await dbSet('validaciones', nextValidaciones);
    await dbSet('entregas', nextEntregas);
    showToast(`${ids.size} taller(es) eliminado(s)`);
    setSeleccion(new Set());
    setConfirmarBorradoMasivo(false);
  };

  const atrasados = useMemo(
    () => talleresAtrasados(talleres, validaciones, entregas, semanaActual).filter((t) => t.semana !== semanaActual),
    [talleres, validaciones, entregas, semanaActual]
  );

  const abrirMoverUno = (taller: Taller) => {
    setDiaMasivoArrastre('');
    setArrastreModal({ talleres: [taller], dias: { [taller.id]: taller.dia } });
  };

  const abrirMoverTodos = () => {
    if (!atrasados.length) return;
    setDiaMasivoArrastre('');
    setArrastreModal({ talleres: atrasados, dias: Object.fromEntries(atrasados.map((t) => [t.id, t.dia])) });
  };

  const cambiarDiaArrastre = (tallerId: string, dia: DiaSemana) => {
    setArrastreModal((prev) => (prev ? { ...prev, dias: { ...prev.dias, [tallerId]: dia } } : prev));
  };

  const aplicarDiaATodos = (dia: DiaSemana) => {
    setDiaMasivoArrastre(dia);
    setArrastreModal((prev) => (prev ? { ...prev, dias: Object.fromEntries(prev.talleres.map((t) => [t.id, dia])) } : prev));
  };

  /** Mueve los talleres seleccionados a la semana vigente, respetando el día elegido para cada uno
   * (no asume que el nuevo día es el mismo que tenía antes). Además deja registro permanente de la
   * semana y día ORIGINALES (la primera vez que se planificó, antes de cualquier arrastre) y de
   * cuántas veces se ha arrastrado, para poder detectar talleres que se vienen postergando semana
   * tras semana en vez de resolverse.
   *
   * Si esCorreccion es true, el movimiento se trata como un ajuste de ubicación (el taller estaba en
   * la semana equivocada por error), NO como un arrastre por atraso: no incrementa el contador de
   * arrastres ni marca semana/día original. */
  const confirmarArrastre = async (esCorreccion = false) => {
    if (!arrastreModal) return;
    const ahora = nowISODatetime();
    const idsMovidos = new Set(arrastreModal.talleres.map((t) => t.id));
    const nextTalleres = talleres.map((t) => {
      if (!idsMovidos.has(t.id)) return t;
      const diaElegido = arrastreModal.dias[t.id] || t.dia;
      if (esCorreccion) {
        return { ...t, semana: semanaActual, dia: diaElegido };
      }
      return {
        ...t,
        semanaOriginal: t.semanaOriginal || t.semana,
        diaOriginal: t.diaOriginal || t.dia,
        vecesArrastrado: (t.vecesArrastrado || 0) + 1,
        ultimoArrastreEn: ahora,
        semana: semanaActual,
        dia: diaElegido,
      };
    });
    setTalleres(nextTalleres);
    await dbSet('talleres', nextTalleres);
    showToast(esCorreccion
      ? `${arrastreModal.talleres.length} taller(es) reubicado(s) (sin contar como arrastre)`
      : `${arrastreModal.talleres.length} taller(es) movido(s) a la semana actual`);
    setArrastreModal(null);
  };

  const abrirCorreccion = () => {
    if (seleccion.size === 0) return;
    const seleccionados = talleres.filter((t) => seleccion.has(t.id));
    setCorreccionModal({ talleres: seleccionados, semanaDestino: semanaActual });
  };

  /** Reubica los talleres seleccionados a la semana elegida por el usuario, tratándolo como una
   * CORRECCIÓN: conserva el mismo día de la semana y NO toca los datos de arrastre (contador, semana
   * original, etc.). Sirve para cuando un taller quedó en la semana equivocada por error de captura. */
  const confirmarCorreccion = async () => {
    if (!correccionModal) return;
    const idsMovidos = new Set(correccionModal.talleres.map((t) => t.id));
    const nextTalleres = talleres.map((t) =>
      idsMovidos.has(t.id) ? { ...t, semana: correccionModal.semanaDestino } : t
    );
    setTalleres(nextTalleres);
    await dbSet('talleres', nextTalleres);
    showToast(`${correccionModal.talleres.length} taller(es) reubicado(s) a la semana del ${weekRangeLabel(correccionModal.semanaDestino)}`);
    setCorreccionModal(null);
    setSeleccion(new Set());
  };

  const sortByDiaPrioridad = (a: Taller, b: Taller) =>
    DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia) || Number(a.prioridad) - Number(b.prioridad);

  let globalFiltered = filtroSub === 'todos' ? semanaTalleres : semanaTalleres.filter((t) => t.subcontratistaId === filtroSub);
  if (filtroDia !== 'todos') globalFiltered = globalFiltered.filter((t) => t.dia === filtroDia);
  if (filtroInspector !== 'todos') globalFiltered = globalFiltered.filter((t) => t.inspector === filtroInspector);
  if (buscadorUnidad.trim()) globalFiltered = globalFiltered.filter((t) => unidadMatchesSearch(t.edificio, t.esGeneral ? 'general' : t.unidad, buscadorUnidad));

  const inspectoresDisponibles = useMemo(
    () => [...new Set(talleres.map((t) => t.inspector).filter(Boolean))].sort(),
    [talleres]
  );

  const dimensionesDisponibles: Record<string, DimensionAgrupacion<Taller>> = {
    contratista: { key: 'contratista', label: 'Subcontratista', getValue: (t) => subName(t.subcontratistaId) },
    proyecto: { key: 'proyecto', label: 'Proyecto', getValue: (t) => t.proyecto },
    dia: { key: 'dia', label: 'Día', getValue: (t) => t.dia },
    prioridad: { key: 'prioridad', label: 'Prioridad', getValue: (t) => `Prioridad ${t.prioridad}` },
    estadoLiberacion: { key: 'estadoLiberacion', label: 'Estado de liberación', getValue: (t) => validacionDe(t.id)?.resultado || 'PENDIENTE' },
    inspector: { key: 'inspector', label: 'Inspector de calidad', getValue: (t) => t.inspector || 'Sin asignar' },
  };
  const arbolPersonalizado = useMemo(() => {
    const dims = nivelesAgrupacion.map((k) => dimensionesDisponibles[k]).filter(Boolean);
    const ordenado = [...globalFiltered].sort(sortByDiaPrioridad);
    return construirArbolAgrupado(ordenado, dims);
  }, [globalFiltered, nivelesAgrupacion]);

  const keysPorNivelPersonalizada = useMemo(() => keysPorNivel(arbolPersonalizado), [arbolPersonalizado]);
  const nivelesConLabel = nivelesAgrupacion.map((k, i) => ({ label: dimensionesDisponibles[k]?.label || k, keys: keysPorNivelPersonalizada[i] || [] }));

  const contratistasConTalleres = useMemo(() => {
    const ids = [...new Set(globalFiltered.map((t) => t.subcontratistaId))];
    return ids.map((id) => ({ id, nombre: subName(id), items: globalFiltered.filter((t) => t.subcontratistaId === id) }));
  }, [globalFiltered, subs]);

  /** Para la vista semanal: SIEMPRE usa la semana completa (sin filtro de día), agrupada por contratista → proyecto → día */
  const vistaSemanalGrupos = useMemo(() => {
    let base = filtroSub === 'todos' ? semanaTalleres : semanaTalleres.filter((t) => t.subcontratistaId === filtroSub);
    base = filtroProyecto === 'todos' ? base : base.filter((t) => t.proyecto === filtroProyecto);
    base = filtroInspector === 'todos' ? base : base.filter((t) => t.inspector === filtroInspector);
    const subIds = [...new Set(base.map((t) => t.subcontratistaId))];
    return subIds.map((subId) => {
      const itemsSub = base.filter((t) => t.subcontratistaId === subId);
      const proyectos = [...new Set(itemsSub.map((t) => t.proyecto))];
      return {
        subId,
        nombre: subName(subId),
        total: itemsSub.length,
        proyectos: proyectos.map((proyecto) => {
          const itemsProyecto = itemsSub.filter((t) => t.proyecto === proyecto);
          const porDia: Record<string, Taller[]> = {};
          DIAS_ORDER.forEach((d) => { porDia[d] = itemsProyecto.filter((t) => t.dia === d).sort((a, b) => Number(a.prioridad) - Number(b.prioridad)); });
          return { proyecto, porDia };
        }),
      };
    });
  }, [semanaTalleres, filtroSub, filtroProyecto, filtroInspector, subs]);

  const fechasAtrasadasRelevantes = useMemo(() => fechasPrometidasAtrasadas(fechas), [fechas]);
  const fechasProximasRelevantes = useMemo(() => fechasPrometidasProximas(fechas, 3), [fechas]);

  const analisisPeriodo = useMemo(() => {
    const base = filtroSub === 'todos' ? semanaTalleres : semanaTalleres.filter((t) => t.subcontratistaId === filtroSub);
    if (!base.length) return `No hay talleres planificados para ${periodoLabel} todavía.`;
    const liberadosCount = base.filter((t) => validacionDe(t.id)?.resultado === 'LISTO').length;
    const entregadosCount = base.filter((t) => entregaDe(t.id)?.estado === 'ENTREGADO').length;
    const pendientesCount = base.filter((t) => !validacionDe(t.id) || validacionDe(t.id)?.resultado === 'PENDIENTE').length;
    const porContratista = new Set(base.map((t) => t.subcontratistaId)).size;
    const pctLib = Math.round((liberadosCount / base.length) * 100);
    return `Para ${periodoLabel} hay ${base.length} taller(es) planificado(s) entre ${porContratista} subcontratista(s). De estos, ${liberadosCount} (${pctLib}%) ya están liberados y ${entregadosCount} ya fueron entregados. ${pendientesCount > 0 ? `Quedan ${pendientesCount} taller(es) pendientes de validar — conviene priorizarlos para no acumular atraso.` : 'No hay talleres pendientes de validar en este periodo, lo cual es una buena señal de avance.'}`;
  }, [semanaTalleres, filtroSub, periodoLabel, validaciones, entregas]);
  const renderCells = (t: Taller) => {
    const val = validacionDe(t.id);
    const ent = entregaDe(t.id);
    const estado = val?.resultado || 'PENDIENTE';
    let dias: number | null = null;
    if (val?.resultado === 'LISTO' && val.fecha) {
      const hasta = ent?.estado === 'ENTREGADO' && ent.fechaEntrega ? ent.fechaEntrega : todayISO();
      dias = diffDays(val.fecha, hasta);
    }
    return (
      <>
        <TableCell>{t.proyecto}</TableCell>
        <TableCell>{t.edificio}{t.esGeneral && <Badge variant="secondary" className="ml-1.5">General</Badge>}</TableCell>
        <TableCell className="font-medium">{t.esGeneral ? '—' : t.unidad}</TableCell>
        <TableCell title={t.creadoPor ? `Planificado por ${t.creadoPor}${t.creadoEn ? ` · ${fmtDateTime(t.creadoEn)}` : ''}` : ''}>{t.actividad}</TableCell>
        <TableCell><PrioridadBadge prioridad={t.prioridad} /></TableCell>
        <TableCell className="whitespace-nowrap">{diaLabel(t.semana, t.dia)}</TableCell>
        <TableCell className="whitespace-nowrap">
          {t.vecesArrastrado ? (
            <Badge
              variant="destructive"
              title={`Planificado originalmente para ${t.diaOriginal || t.dia}, semana del ${weekRangeLabel(t.semanaOriginal || t.semana)}`}
            >
              <History size={11} className="mr-1" />{t.vecesArrastrado}x
            </Badge>
          ) : '—'}
        </TableCell>
        <TableCell className="whitespace-nowrap">{t.esGeneral ? <span className="text-muted-foreground">No aplica</span> : (t.tecnico || <span className="text-muted-foreground">Sin asignar</span>)}</TableCell>
        <TableCell className="whitespace-nowrap">{t.inspector || <span className="text-muted-foreground">Sin asignar</span>}</TableCell>
        <TableCell className="whitespace-nowrap">{t.esGeneral ? <span className="text-muted-foreground">No aplica</span> : (t.fechaPromesa ? fmtDate(t.fechaPromesa) : '—')}</TableCell>
        <TableCell><EstadoLiberacionBadge estado={estado} /></TableCell>
        <TableCell>{ent ? <EntregaBadge estado={ent.estado} /> : '—'}</TableCell>
        <TableCell><DiasPill dias={dias} entregado={ent?.estado === 'ENTREGADO'} /></TableCell>
        <TableCell className="whitespace-nowrap">
          <Button size="sm" variant="secondary" className="mr-1.5" onClick={() => goToTaller(t.id)}>
            {estado === 'PENDIENTE' ? 'Validar' : 'Gestionar'}
          </Button>
          <Button size="icon" variant="outline" className="mr-1.5 h-8 w-8" onClick={() => setEditing(t)} aria-label="Editar" disabled={soloLectura}><Pencil size={14} /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)} aria-label="Eliminar" disabled={soloLectura}><Trash2 size={14} /></Button>
        </TableCell>
      </>
    );
  };

  return (
    <div>
      {atrasados.length > 0 && (
        <Card className="mb-4 border-warning/40 bg-warning/10">
          <CardContent className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-warning-foreground">
                <AlertTriangle size={16} className="text-warning" />
                {atrasados.length} taller(es) atrasado(s) de semanas anteriores
              </div>
              <Button size="sm" variant="outline" onClick={abrirMoverTodos}>
                <ArrowRightCircle size={13} />Mover todos a esta semana
              </Button>
            </div>
            <div className="space-y-1.5">
              {atrasados.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md bg-white/60 px-3 py-1.5 text-[12.5px]">
                  <span>
                    <span className="font-medium">{subName(t.subcontratistaId)}</span> — {t.edificio} {t.unidad} ({t.actividad || 'sin actividad'}) · semana del {weekRangeLabel(t.semana)}
                    {!!t.vecesArrastrado && <Badge variant="destructive" className="ml-1.5"><History size={10} className="mr-1" />{t.vecesArrastrado}x arrastrado</Badge>}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => abrirMoverUno(t)}>
                    <ArrowRightCircle size={12} />Mover a esta semana
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {(fechasAtrasadasRelevantes.length > 0 || fechasProximasRelevantes.length > 0) && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-[13.5px] font-medium text-destructive">
              <AlertTriangle size={16} />
              Fechas prometidas por contratistas
            </div>
            <div className="space-y-1.5">
              {fechasAtrasadasRelevantes.map((fp) => (
                <div key={fp.id} className="flex items-center justify-between rounded-md bg-white/60 px-3 py-1.5 text-[12.5px]">
                  <span><span className="font-medium">{subName(fp.subcontratistaId)}</span> — {fp.descripcion} <Badge variant="destructive">atrasada</Badge></span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => goTo('fechas')}>Ver</Button>
                </div>
              ))}
              {fechasProximasRelevantes.map((fp) => (
                <div key={fp.id} className="flex items-center justify-between rounded-md bg-white/60 px-3 py-1.5 text-[12.5px]">
                  <span><span className="font-medium">{subName(fp.subcontratistaId)}</span> — {fp.descripcion} <Badge variant="warning">prometida {fmtDate(fp.fechaPrometidaActual)}</Badge></span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => goTo('fechas')}>Ver</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 text-[17px] font-semibold">Planificación</div>
          <div className="mb-4 text-[12px] text-muted-foreground">Programa y da seguimiento a los talleres asignados a cada subcontratista, por semana o por mes.</div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex gap-1.5">
                <Button size="sm" variant={periodo === 'semanal' ? 'default' : 'outline'} onClick={() => setPeriodo('semanal')}>Semanal</Button>
                <Button size="sm" variant={periodo === 'mensual' ? 'default' : 'outline'} onClick={() => setPeriodo('mensual')}>Mensual</Button>
              </div>
              {periodo === 'semanal' ? (
                <WeekCalendarPicker semanaActual={semanaActual} onChange={setSemanaActual} />
              ) : (
                <MonthPicker mesKey={mesActual} onChange={setMesActual} />
              )}
              <span className="text-[11px] text-muted-foreground">{semanaTalleres.length} taller(es) planificados</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowMulti(true)} disabled={soloLectura}><LayoutGrid size={14} />Agregar talleres</Button>
              <Button variant="outline" onClick={() => descargarPlantillaPlanificacion(subs)}>
                <Download size={14} />Descargar plantilla
              </Button>
              <Button variant="outline" onClick={() => plantillaInputRef.current?.click()} disabled={subiendoPlantilla || soloLectura}>
                <Upload size={14} />{subiendoPlantilla ? 'Leyendo...' : 'Subir plantilla'}
              </Button>
              <input ref={plantillaInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handlePlantillaFile} />
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-muted/40 px-3.5 py-2.5 text-[12.5px] leading-relaxed">
            {analisisPeriodo}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant={vista === 'contratista' ? 'default' : 'outline'} onClick={() => setVista('contratista')}>Por contratista</Button>
              <Button size="sm" variant={vista === 'global' ? 'default' : 'outline'} onClick={() => setVista('global')}>Vista global de obra</Button>
              <Button size="sm" variant={vista === 'semanal' ? 'default' : 'outline'} onClick={() => setVista('semanal')}><CalendarDays size={13} />Vista semanal por días</Button>
              <Button size="sm" variant={vista === 'personalizada' ? 'default' : 'outline'} onClick={() => setVista('personalizada')}>Agrupación personalizada</Button>
              {vista === 'contratista' && (
                <ExpandCollapseAllButtons onExpandAll={colapsoContratista.expandAll} onCollapseAll={() => colapsoContratista.collapseAll(contratistasConTalleres.map((c) => c.id))} />
              )}
              {vista === 'semanal' && (
                <ExpandCollapseAllButtons onExpandAll={colapsoSemanal.expandAll} onCollapseAll={() => colapsoSemanal.collapseAll(vistaSemanalGrupos.map((g) => g.subId))} />
              )}
              {vista === 'personalizada' && (
                <ExpandCollapseAllButtons onExpandAll={colapsoPersonalizada.expandAll} onCollapseAll={() => colapsoPersonalizada.collapseAll(todasLasKeysAgrupables(arbolPersonalizado))} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <UnidadSearchBox value={buscadorUnidad} onChange={setBuscadorUnidad} />
              <ProjectFilter value={filtroProyecto} onChange={setFiltroProyecto} />
              <Select value={filtroDia} onValueChange={setFiltroDia}>
                <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los días</SelectItem>
                  {DIAS_ORDER.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroSub} onValueChange={setFiltroSub}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los subcontratistas</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <InspectorFilter value={filtroInspector} onChange={setFiltroInspector} opciones={inspectoresDisponibles} />
              {vista === 'personalizada' && (
                <AgrupacionConfigButton opciones={OPCIONES_AGRUPACION_PLANIFICACION} seleccion={nivelesAgrupacion} onChange={setNivelesAgrupacion} />
              )}
              <ColumnSelector seleccionadas={columnasExport} onChange={setColumnasExport} />
              <Select value={vistaExportar} onValueChange={(v) => setVistaExportar(v as 'tabla' | 'semanal')}>
                <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tabla">Exportar: Tabla estándar</SelectItem>
                  <SelectItem value="semanal">Exportar: Vista semanal por días</SelectItem>
                </SelectContent>
              </Select>
              <ExportarButton
                onExcel={() => {
                  if (vistaExportar === 'semanal') {
                    exportPlanificacionSemanalExcel(vistaSemanalGrupos, periodo === 'mensual' ? mesLabel(mesActual) : `Semana del ${weekRangeLabel(semanaActual)}`);
                  } else {
                    exportPlanificacionExcel(
                      globalFiltered,
                      validaciones, entregas, subs,
                      periodo === 'mensual' ? mesLabel(mesActual) : `Semana del ${weekRangeLabel(semanaActual)}`,
                      filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null,
                      columnasExport, fechas
                    );
                  }
                }}
                onPDF={() => {
                  if (vistaExportar === 'semanal') {
                    exportPlanificacionSemanalPDF(vistaSemanalGrupos, periodo === 'mensual' ? mesLabel(mesActual) : `Semana del ${weekRangeLabel(semanaActual)}`);
                  } else {
                    exportPlanificacionPDF(
                      globalFiltered,
                      validaciones, entregas, subs,
                      periodo === 'mensual' ? mesLabel(mesActual) : `Semana del ${weekRangeLabel(semanaActual)}`,
                      filtroSub === 'todos' ? null : subs.find((s) => s.id === filtroSub) || null,
                      columnasExport, fechas
                    );
                  }
                }}
              />
            </div>
          </div>

          {vista === 'personalizada' && nivelesConLabel.length > 0 && (
            <div className="mb-3.5">
              <NivelCollapseControls
                niveles={nivelesConLabel}
                onCollapseKeys={colapsoPersonalizada.collapseKeys}
                onExpandKeys={colapsoPersonalizada.expandKeys}
              />
            </div>
          )}

          {!soloLectura && vista !== 'semanal' && seleccion.size > 0 && (
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5">
              <span className="text-[13px] font-medium">{seleccion.size} taller(es) seleccionado(s)</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={limpiarSeleccion}>Limpiar selección</Button>
                <Button size="sm" variant="outline" onClick={abrirCorreccion}>
                  <CalendarDays size={13} />Mover a otra semana
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmarBorradoMasivo(true)}>
                  <Trash2 size={13} />Eliminar seleccionados
                </Button>
              </div>
            </div>
          )}
          {!soloLectura && vista === 'semanal' && seleccion.size > 0 && (
            <div className="mb-3.5 rounded-lg border border-border bg-muted/30 px-3.5 py-2 text-[12px] text-muted-foreground">
              Tienes {seleccion.size} taller(es) seleccionado(s) desde otra vista. La selección múltiple con casillas está disponible en las vistas "Por contratista", "Vista global de obra" y "Agrupación personalizada".
            </div>
          )}

          {vista === 'contratista' && (
            contratistasConTalleres.length ? contratistasConTalleres.map((c) => (
              <CollapsibleGroup
                key={c.id}
                open={!colapsoContratista.isCollapsed(c.id)}
                onToggle={() => colapsoContratista.toggle(c.id)}
                header={
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SubAvatar name={c.nombre} id={c.id} />{c.nombre}
                    <Badge variant="secondary">{c.items.length} taller(es)</Badge>
                  </div>
                }
              >
                <TallaresTabla items={c.items} showSub={false} subName={subName} validacionDe={validacionDe} renderCells={renderCells} seleccion={soloLectura ? undefined : seleccion} onToggleUno={toggleSeleccionUno} onToggleVisibles={toggleSeleccionVisibles} />
              </CollapsibleGroup>
            )) : <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres planificados para esta semana. Agrega varios a la vez con el botón de arriba.</div>
          )}

          {vista === 'global' && (
            <TallaresTabla items={globalFiltered} showSub subName={subName} validacionDe={validacionDe} renderCells={renderCells} seleccion={soloLectura ? undefined : seleccion} onToggleUno={toggleSeleccionUno} onToggleVisibles={toggleSeleccionVisibles} />
          )}

          {vista === 'semanal' && (
            vistaSemanalGrupos.length ? vistaSemanalGrupos.map((g) => (
              <CollapsibleGroup
                key={g.subId}
                open={!colapsoSemanal.isCollapsed(g.subId)}
                onToggle={() => colapsoSemanal.toggle(g.subId)}
                header={
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SubAvatar name={g.nombre} id={g.subId} />{g.nombre}
                    <Badge variant="secondary">{g.total} taller(es)</Badge>
                  </div>
                }
              >
                {g.proyectos.map((p) => (
                  <div key={p.proyecto} className="mb-3">
                    <div className="mb-1.5 ml-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{p.proyecto}</div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[12px]">
                        <thead>
                          <tr>
                            {DIAS_ORDER.map((d) => (
                              <th key={d} className="border-b border-border bg-muted/40 px-2 py-1.5 text-left font-medium">{d} <span className="text-[10px] text-muted-foreground">{fmtDate(fechaDeISODia(semanaActual, d))}</span></th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {DIAS_ORDER.map((d) => (
                              <td key={d} className="vertical-align-top border-b border-border p-1.5 align-top">
                                <div className="space-y-1">
                                  {p.porDia[d]?.map((t) => {
                                    const val = validacionDe(t.id);
                                    const estado = val?.resultado || 'PENDIENTE';
                                    return (
                                      <button
                                        key={t.id}
                                        onClick={() => goToTaller(t.id)}
                                        className="block w-full rounded-md border border-border/70 bg-card px-2 py-1.5 text-left hover:border-primary hover:bg-muted/40"
                                      >
                                        <div className="font-medium">{t.esGeneral ? <Badge variant="secondary" className="mr-1">General</Badge> : `${t.edificio} ${t.unidad}`}{!!t.vecesArrastrado && <Badge variant="destructive" className="ml-1">{t.vecesArrastrado}x</Badge>}</div>
                                        <div className="truncate text-[10.5px] text-muted-foreground">{t.actividad || 'Sin actividad'}</div>
                                        <div className="mt-0.5"><EstadoLiberacionBadge estado={estado} /></div>
                                      </button>
                                    );
                                  }) || null}
                                </div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </CollapsibleGroup>
            )) : <div className="py-10 text-center text-sm text-muted-foreground">No hay talleres planificados para esta semana.</div>
          )}

          {vista === 'personalizada' && (
            <ArbolAgrupado
              nodos={arbolPersonalizado}
              isCollapsed={colapsoPersonalizada.isCollapsed}
              onToggle={colapsoPersonalizada.toggle}
              renderHoja={(items) => <TallaresTabla items={items} showSub subName={subName} validacionDe={validacionDe} renderCells={renderCells} seleccion={soloLectura ? undefined : seleccion} onToggleUno={toggleSeleccionUno} onToggleVisibles={toggleSeleccionVisibles} />}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!correccionModal} onOpenChange={(o) => !o && setCorreccionModal(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Mover a otra semana (corrección)</DialogTitle></DialogHeader>
          {correccionModal && (
            <div className="space-y-3.5">
              <div className="rounded-md bg-muted/40 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
                Usa esto cuando un taller quedó en la semana equivocada por error. Se moverá a la semana que elijas <strong>conservando el mismo día</strong>, y <strong>no</strong> se contará como arrastre (no suma al contador ni marca atraso). Para mover talleres atrasados que sí se están postergando, usa el botón "Mover a esta semana" del aviso de atrasados.
              </div>
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium">Semana destino</div>
                <WeekCalendarPicker
                  semanaActual={correccionModal.semanaDestino}
                  onChange={(monday) => setCorreccionModal((prev) => (prev ? { ...prev, semanaDestino: monday } : prev))}
                />
              </div>
              <div className="rounded-md border border-border p-2.5">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{correccionModal.talleres.length} taller(es) a mover</div>
                <div className="max-h-[180px] space-y-1 overflow-y-auto text-[12.5px]">
                  {correccionModal.talleres.map((t) => (
                    <div key={t.id}>
                      <span className="font-medium">{subName(t.subcontratistaId)}</span> — {t.esGeneral ? 'General' : `${t.edificio} ${t.unidad}`}
                      <span className="ml-1.5 text-muted-foreground">(desde semana del {weekRangeLabel(t.semana)}, {t.dia})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorreccionModal(null)}>Cancelar</Button>
            <Button onClick={confirmarCorreccion}>Reubicar sin contar arrastre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmarBorradoMasivo} onOpenChange={(o) => !o && setConfirmarBorradoMasivo(false)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Eliminar talleres seleccionados</DialogTitle></DialogHeader>
          <p className="text-[13.5px] leading-relaxed">
            Vas a eliminar <strong>{seleccion.size} taller(es)</strong> junto con sus validaciones y entregas asociadas. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarBorradoMasivo(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={borrarSeleccionados}><Trash2 size={13} />Eliminar definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMulti} onOpenChange={setShowMulti}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Agregar talleres a la planificación</DialogTitle></DialogHeader>
          <MultiTallerForm subs={subs} catalogo={catalogo} unidadesProyecto={unidadesProyecto} talleresExistentes={talleres} onSaveMany={saveMany} onCancel={() => setShowMulti(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!arrastreModal} onOpenChange={(o) => !o && setArrastreModal(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>¿Para qué día de la semana del {weekRangeLabel(semanaActual)} se mueve{arrastreModal && arrastreModal.talleres.length > 1 ? 'n' : ''}?</DialogTitle>
          </DialogHeader>
          {arrastreModal && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
                Por defecto se sugiere el mismo día que tenían, pero puedes elegir otro. Esto queda registrado: si un taller ya se había arrastrado antes, el contador de arrastres sube y se conserva la semana y el día en que se planificó originalmente.
              </div>
              {arrastreModal.talleres.length > 1 && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <span className="text-[12px] font-medium">Aplicar el mismo día a todos:</span>
                  <Select value={diaMasivoArrastre} onValueChange={(v) => aplicarDiaATodos(v as DiaSemana)}>
                    <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Elegir día..." /></SelectTrigger>
                    <SelectContent>
                      {DIAS_ORDER.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
                {arrastreModal.talleres.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-[12.5px]">
                    <span>
                      <span className="font-medium">{subName(t.subcontratistaId)}</span> — {t.esGeneral ? 'General' : `${t.edificio} ${t.unidad}`}
                      <span className="ml-1.5 text-muted-foreground">
                        (semana original: {weekRangeLabel(t.semanaOriginal || t.semana)}, {t.diaOriginal || t.dia}{!!t.vecesArrastrado && ` · arrastrado ${t.vecesArrastrado}x`})
                      </span>
                    </span>
                    <Select value={arrastreModal.dias[t.id] || t.dia} onValueChange={(v) => cambiarDiaArrastre(t.id, v as DiaSemana)}>
                      <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIAS_ORDER.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" className="text-[12px]" onClick={() => confirmarArrastre(true)}>
              Fue un error de semana — mover sin contar arrastre
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setArrastreModal(null)}>Cancelar</Button>
              <Button onClick={() => confirmarArrastre(false)}>Confirmar y mover</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Editar taller</DialogTitle></DialogHeader>
          {editing && <TallerForm subs={subs} catalogo={catalogo} unidadesProyecto={unidadesProyecto} initial={editing} onSave={saveOne} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewPlantilla} onOpenChange={(o) => !o && setPreviewPlantilla(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Confirmar importación de plantilla</DialogTitle></DialogHeader>
          {previewPlantilla && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 p-3 text-[13px]">
                Se detectaron <strong>{previewPlantilla.totalFilas}</strong> fila(s) en el archivo, de las cuales <strong>{previewPlantilla.talleres.length}</strong> se importarán como talleres en la semana del {weekRangeLabel(semanaActual)}.
              </div>
              {previewPlantilla.erroresFila.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[12.5px]">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive"><AlertTriangle size={14} />Filas con errores (no se importarán)</div>
                  <ul className="max-h-[140px] list-disc space-y-0.5 overflow-y-auto pl-4">
                    {previewPlantilla.erroresFila.map((e, i) => <li key={i}>Fila {e.fila}: {e.motivo}</li>)}
                  </ul>
                </div>
              )}
              {previewPlantilla.talleres.length > 0 && (
                <div className="max-h-[160px] overflow-y-auto rounded-md border border-border text-[11.5px]">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr><th className="px-2 py-1 text-left">Edificio</th><th className="px-2 py-1 text-left">Unidad</th><th className="px-2 py-1 text-left">Actividad</th><th className="px-2 py-1 text-left">Día</th></tr>
                    </thead>
                    <tbody>
                      {previewPlantilla.talleres.slice(0, 8).map((t, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1">{t.edificio}</td>
                          <td className="px-2 py-1">{t.unidad}</td>
                          <td className="px-2 py-1">{t.actividad}</td>
                          <td className="px-2 py-1">{t.dia}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewPlantilla.talleres.length > 8 && <div className="px-2 py-1 text-muted-foreground">… y {previewPlantilla.talleres.length - 8} más</div>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPlantilla(null)}>Cancelar</Button>
            <Button onClick={confirmarImportacionPlantilla} disabled={!previewPlantilla?.talleres.length}>Confirmar importación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
