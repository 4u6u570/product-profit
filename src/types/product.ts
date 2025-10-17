export interface Product {
  id: string;
  sku?: string;
  nombre?: string;
  color?: string;
  cantidadPorCaja: number;
  tipoPrecio: 'unitario' | 'caja';
  precioBase: number;
  fleteTotal: number;
  modoProrrateoFlete: 'uniforme' | 'proporcional';
  preciosIndividuales?: number[];
  absorboEnvio: boolean;
  costoEnvioUnitario?: number;
  modoProducto: 'propio' | 'tercero';
  pctGanancia: number;
  pctMP: number;
  pctCupon: number;
  clTipo: 'porcentaje' | 'fijo';
  pctCL?: number;
  clFijo?: number;
  pctIVA?: number;
  pctDescTransfer: number;
  reglaRedondeo: 'none' | '10' | '50' | '100' | 'psico';
  
  // Resultados calculados
  costos: {
    costoUnitario: number;
    fleteUnitario: number;
  };
  webMP: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
  webTransfer: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
  webCupon: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
  marketplace?: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
  
  // Metadatos
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  selected?: boolean;
  version_calculadora?: string;
}

export interface ProductFormData {
  sku?: string;
  nombre?: string;
  color?: string;
  cantidadPorCaja: number;
  tipoPrecio: 'unitario' | 'caja';
  precioBase: number;
  fleteTotal: number;
  modoProrrateoFlete: 'uniforme' | 'proporcional';
  preciosIndividuales?: number[];
  absorboEnvio: boolean;
  costoEnvioUnitario?: number;
  modoProducto: 'propio' | 'tercero';
  pctGanancia: number;
  pctMP: number;
  pctCupon: number;
  clTipo: 'porcentaje' | 'fijo';
  pctCL?: number;
  clFijo?: number;
  pctIVA?: number;
  pctDescTransfer: number;
  reglaRedondeo: 'none' | '10' | '50' | '100' | 'psico';
}

export interface ProductCalculationResult {
  costos: {
    costoUnitario: number;
    fleteUnitario: number;
  };
  webMP: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
  webTransfer: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
  webCupon: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
  marketplace?: {
    precio: number;
    gananciaNeta: number;
    margenPct: number;
  };
}