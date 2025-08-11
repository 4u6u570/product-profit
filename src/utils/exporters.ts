import * as XLSX from 'xlsx';
import { Product } from '@/types/product';

interface CompactProductData {
  sku: string;
  name: string;
  cost: number;
  gain: number;
  mp?: number;
  cupon?: number;
  cl_pct?: number;
  cl_fix?: number;
  ship_absorb: number;
  ship_cost: number;
  freight: number;
  round: string;
}

const DEFAULT_VALUES = {
  mp: 0.10,
  cupon: 0.10,
  cl_pct: 0.00,
  cl_fix: 0,
  ship_absorb: 0,
  ship_cost: 0,
  freight: 0,
  round: 'none'
};

export const prepareCompactExportData = (products: Product[]): CompactProductData[] => {
  return products.map(product => {
    const data: CompactProductData = {
      sku: product.sku || '',
      name: product.nombre || '',
      cost: product.costos.costoUnitario,
      gain: product.pctGanancia / 100, // Convert percentage to fraction
      ship_absorb: product.absorboEnvio ? 1 : 0,
      ship_cost: product.costoEnvioUnitario || 0,
      freight: product.costos.fleteUnitario,
      round: product.reglaRedondeo
    };

    // Only include overrides if different from defaults
    if (product.pctMP !== DEFAULT_VALUES.mp * 100) {
      data.mp = product.pctMP / 100;
    }
    if (product.pctCupon !== DEFAULT_VALUES.cupon * 100) {
      data.cupon = product.pctCupon / 100;
    }
    if (product.pctCL && product.pctCL !== DEFAULT_VALUES.cl_pct * 100) {
      data.cl_pct = product.pctCL / 100;
    }
    if (product.clFijo && product.clFijo !== DEFAULT_VALUES.cl_fix) {
      data.cl_fix = product.clFijo;
    }

    return data;
  });
};

export const exportCompactCSV = (data: CompactProductData[], filename: string = 'productos-compacto'): void => {
  if (data.length === 0) return;

  const headers = ['sku', 'name', 'cost', 'gain', 'mp', 'cupon', 'cl_pct', 'cl_fix', 'ship_absorb', 'ship_cost', 'freight', 'round'];
  
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header as keyof CompactProductData];
      if (value === undefined || value === null) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      if (typeof value === 'number') {
        return value.toFixed(value % 1 === 0 ? 0 : 2);
      }
      return value;
    }).join(',')
  );

  const csvContent = [
    headers.join(','),
    ...rows
  ].join('\n');

  // Add BOM for proper Excel UTF-8 handling
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

export const exportCompactXLSX = (data: CompactProductData[], filename: string = 'productos-compacto'): void => {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

  // Format numbers with proper decimal places
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (cell && typeof cell.v === 'number') {
        cell.z = cell.v % 1 === 0 ? '0' : '0.00';
      }
    }
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};