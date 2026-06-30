import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ExportarButtonProps {
  onExcel: () => void;
  onPDF: () => void;
  disabled?: boolean;
}

/** Botón único "Exportar" que despliega las opciones Excel / PDF, en vez de dos botones separados. */
export function ExportarButton({ onExcel, onPDF, disabled }: ExportarButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download size={14} />Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onExcel}>
          <FileSpreadsheet size={14} />Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPDF}>
          <FileText size={14} />PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
