export interface CalculatorFormData {
  // Información básica
  producto: string;
  sku: string;
  color: string;
  cantidadPorCaja: number;
  
  // Precio base
  tipoPrecioBase: 'unitarioFijo' | 'porCaja';
  precioBase: number;
  
  // Costos
  fleteTotal: number;
  costoEnvioUnitario: number;
  absorboEnvio: boolean;
  
  // Configuración de producto
  modoProducto: 'propio' | 'tercero';
  
  // Comisiones y márgenes
  porcentajeGanancia: number;
  comisionMP: number;
  porcentajeCupon: number;
  tipoComisionCL: 'porcentaje' | 'fijo';
  comisionCL: number;
  porcentajeMarketplace: number;
  
  // Descuentos
  descuentoTransferencia: number;
  
  // Redondeo
  tipoRedondeo: 'sin' | 'diez' | 'cincuenta' | 'cien' | 'psicologico';
}

export interface CalculatedPrices {
  costoUnitario: number;
  fleteUnitario: number;
  costoEnvioUnitario: number;
  costoTotal: number;
  
  // Precios por canal
  precioWebMP: number;
  precioWebTransferencia: number;
  precioMarketplace: number;
  
  // Ganancias por canal
  gananciaNetaWebMP: number;
  gananciaNetaWebTransferencia: number;
  gananciaNetaMarketplace: number;
  
  // Márgenes por canal
  margenFinalWebMP: number;
  margenFinalWebTransferencia: number;
  margenFinalMarketplace: number;
}

export interface ExportData extends CalculatorFormData, CalculatedPrices {
  timestamp: string;
}

export type RoundingType = 'sin' | 'diez' | 'cincuenta' | 'cien' | 'psicologico';