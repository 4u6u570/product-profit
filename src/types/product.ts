export interface Product {
  id: string;
  nombre: string;
  sku: string;
  color: string;
  cantidadPorCaja: number;
  tipoPreçioBase: 'porCaja' | 'unitarioFijo' | 'unitarioMargen';
  precioBase: number;
  porcentajeGanancia: number;
  comisionMP: number;
  porcentajeCupon: number;
  tipoComisionCompraLinda: 'porcentaje' | 'precioFijo';
  comisionCompraLinda: number;
  fleteTotal: number;
  // Campos calculados
  costoUnitario?: number;
  precioVenta?: number;
  gananciaNeta?: number;
  margenFinal?: number;
}

export interface ProductFormData {
  nombre: string;
  sku: string;
  color: string;
  cantidadPorCaja: number;
  tipoPreçioBase: 'porCaja' | 'unitarioFijo' | 'unitarioMargen';
  precioBase: number;
  porcentajeGanancia: number;
  comisionMP: number;
  porcentajeCupon: number;
  tipoComisionCompraLinda: 'porcentaje' | 'precioFijo';
  comisionCompraLinda: number;
  fleteTotal: number;
}