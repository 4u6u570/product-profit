import { ProductFormData, ProductCalculationResult } from '@/types/product';

export function applyRounding(price: number, rule: 'none' | '10' | '50' | '100' | 'psico'): number {
  switch (rule) {
    case 'none':
      return price;
    case '10':
      return Math.round(price / 10) * 10;
    case '50':
      return Math.round(price / 50) * 50;
    case '100':
      return Math.round(price / 100) * 100;
    case 'psico': {
      const integer = Math.floor(price);
      const decimal = price - integer;
      if (decimal <= 0.90) {
        return integer + 0.90;
      } else {
        return integer + 0.99;
      }
    }
    default:
      return price;
  }
}

export function calculateProduct(data: ProductFormData): ProductCalculationResult {
  // 1. Calcular costo unitario base
  const costoUnitarioBase = data.tipoPrecio === 'unitario' 
    ? data.precioBase 
    : data.precioBase / data.cantidadPorCaja;

  // 2. Calcular flete unitario
  const fleteUnitario = data.fleteTotal / data.cantidadPorCaja;

  // 3. Calcular costo unitario total (incluye IVA si está configurado)
  const costoEnvio = data.absorboEnvio ? (data.costoEnvioUnitario || 0) : 0;
  const costoIVA = (data.pctIVA || 0) > 0 ? costoUnitarioBase * ((data.pctIVA || 0) / 100) : 0;
  const costoUnitario = costoUnitarioBase + fleteUnitario + costoEnvio + costoIVA;

  // 4. Calcular ganancia deseada y subtotal
  const gananciaDeseada = costoUnitario * (data.pctGanancia / 100);
  const subtotal = costoUnitario + gananciaDeseada;

  // 5. Calcular precio Web MP según modo de producto
  let precioWebMPBruto: number;

  if (data.modoProducto === 'propio') {
    // Producto propio: comisiones se descuentan del cobro
    const tMP = data.pctMP / 100;
    const tCup = data.pctCupon / 100;
    const tCL = data.clTipo === 'porcentaje' ? (data.pctCL || 0) / 100 : 0;

    const comisionesTotales = tMP + tCup + tCL;
    
    if (comisionesTotales >= 1) {
      // Evitar división por cero
      precioWebMPBruto = subtotal * 2;
    } else {
      precioWebMPBruto = subtotal / (1 - comisionesTotales);
    }
  } else {
    // Producto de tercero: CL es ingreso adicional
    const tMP = data.pctMP / 100;
    const tCup = data.pctCupon / 100;

    const precioSinMPCupon = subtotal / (1 - tMP - tCup);
    const ingresoCL = data.clTipo === 'fijo' 
      ? (data.clFijo || 0) 
      : precioSinMPCupon * ((data.pctCL || 0) / 100);

    precioWebMPBruto = precioSinMPCupon + ingresoCL;
  }

  // 6. Aplicar redondeo al precio Web MP
  const precioWebMP = applyRounding(precioWebMPBruto, data.reglaRedondeo);

  // 7. Calcular precio Web Transferencia
  const precioWebTransfer = applyRounding(
    precioWebMP * (1 - data.pctDescTransfer / 100), 
    data.reglaRedondeo
  );

  // 8. Sin marketplace - IVA ya está incluido en el costo unitario
  const marketplace = undefined;

  // 9. Recalcular ganancias y márgenes con precios redondeados
  const calcularGananciaNeta = (precio: number, esTransferencia: boolean = false): { gananciaNeta: number; margenPct: number } => {
    if (data.modoProducto === 'propio') {
      // Producto propio
      const comisionMP = esTransferencia ? 0 : precio * (data.pctMP / 100);
      const cupon = esTransferencia ? 0 : precio * (data.pctCupon / 100);
      const comisionCL = esTransferencia ? 0 : 
        (data.clTipo === 'fijo' ? (data.clFijo || 0) : precio * ((data.pctCL || 0) / 100));

      const gananciaNeta = precio - costoUnitario - comisionMP - cupon - comisionCL;
      const margenPct = precio > 0 ? (gananciaNeta / precio) * 100 : 0;

      return { gananciaNeta, margenPct };
    } else {
      // Producto de tercero
      const comisionMP = esTransferencia ? 0 : precio * (data.pctMP / 100);
      const cupon = esTransferencia ? 0 : precio * (data.pctCupon / 100);
      const ingresoCL = esTransferencia ? 0 : 
        (data.clTipo === 'fijo' ? (data.clFijo || 0) : precio * ((data.pctCL || 0) / 100));

      const gananciaNeta = (precio - comisionMP - cupon) - costoUnitario + ingresoCL;
      const margenPct = precio > 0 ? (gananciaNeta / precio) * 100 : 0;

      return { gananciaNeta, margenPct };
    }
  };

  const webMP = calcularGananciaNeta(precioWebMP);
  const webTransfer = calcularGananciaNeta(precioWebTransfer, true);

  // 10. Calcular precio Web Cupón (Web Transfer con descuento del 10%)
  const precioWebCupon = applyRounding(
    precioWebTransfer * 0.9, 
    data.reglaRedondeo
  );
  const webCupon = calcularGananciaNeta(precioWebCupon, true);

  return {
    costos: {
      costoUnitario,
      fleteUnitario,
    },
    webMP: {
      precio: precioWebMP,
      gananciaNeta: webMP.gananciaNeta,
      margenPct: webMP.margenPct,
    },
    webTransfer: {
      precio: precioWebTransfer,
      gananciaNeta: webTransfer.gananciaNeta,
      margenPct: webTransfer.margenPct,
    },
    webCupon: {
      precio: precioWebCupon,
      gananciaNeta: webCupon.gananciaNeta,
      margenPct: webCupon.margenPct,
    },
    marketplace,
  };
}

export function validateProductData(data: ProductFormData): string | null {
  if (data.modoProducto === 'propio') {
    const comisionCL = data.clTipo === 'porcentaje' ? (data.pctCL || 0) : 0;
    const total = data.pctMP + data.pctCupon + comisionCL;
    
    if (total >= 100) {
      return 'La suma de comisiones no puede ser mayor o igual al 100%';
    }
  }
  
  return null;
}