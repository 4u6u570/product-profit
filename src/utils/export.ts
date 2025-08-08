import * as XLSX from 'xlsx';
import { Product } from '@/types/product';

export const prepareExportData = (products: Product[]) => {
  return products.map(product => ({
    SKU: product.sku || '',
    Producto: product.nombre || '',
    Color: product.color || '',
    'Cantidad por caja': product.cantidadPorCaja,
    'Costo unitario': product.costos.costoUnitario.toFixed(2),
    '% Ganancia': product.pctGanancia.toFixed(2),
    '% MP': product.pctMP.toFixed(2),
    '% Cupón': product.pctCupon.toFixed(2),
    '% CL': product.pctCL?.toFixed(2) || '0.00',
    'CL fijo': product.clFijo?.toFixed(2) || '0.00',
    'Precio Web MP': product.webMP.precio.toFixed(2),
    'Ganancia Neta Web MP': product.webMP.gananciaNeta.toFixed(2),
    'Margen % Web MP': product.webMP.margenPct.toFixed(2),
    'Precio Web Transfer': product.webTransfer.precio.toFixed(2),
    'Ganancia Neta Web Transfer': product.webTransfer.gananciaNeta.toFixed(2),
    'Margen % Web Transfer': product.webTransfer.margenPct.toFixed(2),
    'Precio Marketplace': product.marketplace?.precio.toFixed(2) || '',
    'Ganancia Neta Marketplace': product.marketplace?.gananciaNeta.toFixed(2) || '',
    'Margen % Marketplace': product.marketplace?.margenPct.toFixed(2) || '',
    'Absorbo envío': product.absorboEnvio ? 'Sí' : 'No',
    'Costo envío unitario': product.costoEnvioUnitario?.toFixed(2) || '0.00',
    'Flete unitario': product.costos.fleteUnitario.toFixed(2),
    'Regla de redondeo': product.reglaRedondeo,
    'Modo': product.modoProducto === 'propio' ? 'Propio' : 'Tercero'
  }));
};

export const exportToCSV = (data: any[], filename: string = 'productos'): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

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

export const exportToExcel = (data: any[], filename: string = 'productos'): void => {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};