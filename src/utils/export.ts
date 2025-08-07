import * as XLSX from 'xlsx';
import { ExportData } from '@/types/calculator';
import { formatForExport } from './formatting';

/**
 * Exporta datos a CSV
 */
export const exportToCSV = (data: ExportData[], filename: string = 'productos'): void => {
  const headers = [
    'SKU',
    'Producto',
    'Color',
    'Cantidad por Caja',
    'Costo Unitario',
    '% Ganancia',
    '% MP',
    '% Cupón',
    '% CL',
    'Precio Web MP',
    'Precio Web Transferencia',
    'Precio Marketplace',
    'Ganancia Neta Web MP',
    'Ganancia Neta Web Transferencia',
    'Margen Final % Web MP',
    'Margen Final % Web Transferencia',
    'Fecha Exportación'
  ];

  const rows = data.map(item => [
    item.sku,
    item.producto,
    item.color,
    item.cantidadPorCaja.toString(),
    formatForExport(item.costoUnitario),
    formatForExport(item.porcentajeGanancia),
    formatForExport(item.comisionMP),
    formatForExport(item.porcentajeCupon),
    formatForExport(item.comisionCL),
    formatForExport(item.precioWebMP),
    formatForExport(item.precioWebTransferencia),
    formatForExport(item.precioMarketplace),
    formatForExport(item.gananciaNetaWebMP),
    formatForExport(item.gananciaNetaWebTransferencia),
    formatForExport(item.margenFinalWebMP),
    formatForExport(item.margenFinalWebTransferencia),
    item.timestamp
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporta datos a Excel
 */
export const exportToExcel = (data: ExportData[], filename: string = 'productos'): void => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(item => ({
      'SKU': item.sku,
      'Producto': item.producto,
      'Color': item.color,
      'Cantidad por Caja': item.cantidadPorCaja,
      'Costo Unitario': parseFloat(formatForExport(item.costoUnitario)),
      '% Ganancia': parseFloat(formatForExport(item.porcentajeGanancia)),
      '% MP': parseFloat(formatForExport(item.comisionMP)),
      '% Cupón': parseFloat(formatForExport(item.porcentajeCupon)),
      '% CL': parseFloat(formatForExport(item.comisionCL)),
      'Precio Web MP': parseFloat(formatForExport(item.precioWebMP)),
      'Precio Web Transferencia': parseFloat(formatForExport(item.precioWebTransferencia)),
      'Precio Marketplace': parseFloat(formatForExport(item.precioMarketplace)),
      'Ganancia Neta Web MP': parseFloat(formatForExport(item.gananciaNetaWebMP)),
      'Ganancia Neta Web Transferencia': parseFloat(formatForExport(item.gananciaNetaWebTransferencia)),
      'Margen Final % Web MP': parseFloat(formatForExport(item.margenFinalWebMP)),
      'Margen Final % Web Transferencia': parseFloat(formatForExport(item.margenFinalWebTransferencia)),
      'Fecha Exportación': item.timestamp
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

  // Configurar formato de columnas numéricas
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1";
    if (!worksheet[address]) continue;
    const header = worksheet[address].v;
    
    // Aplicar formato de número con 2 decimales a columnas numéricas
    if (header && typeof header === 'string' && 
        (header.includes('Costo') || header.includes('Precio') || 
         header.includes('Ganancia') || header.includes('%'))) {
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!worksheet[cell_address]) continue;
        
        if (typeof worksheet[cell_address].v === 'number') {
          worksheet[cell_address].z = '0.00';
        }
      }
    }
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Genera datos de exportación con timestamp
 */
export const prepareExportData = (
  formData: any,
  calculations: any
): ExportData => {
  return {
    ...formData,
    ...calculations,
    timestamp: new Date().toLocaleString('es-AR')
  };
};