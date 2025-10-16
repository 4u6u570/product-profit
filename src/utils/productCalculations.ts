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
      // Obtener la parte entera hasta las centenas
      const hundreds = Math.floor(price / 100) * 100;
      const remainder = price - hundreds;
      
      // Si está entre 0-49.99, baja a X99 del bloque anterior
      if (remainder < 50) {
        return hundreds - 1;
      }
      // Si está entre 50-99.99, sube a X99 del mismo bloque
      else {
        return hundreds + 99;
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

  // 3. Calcular IVA sobre precio base
  const costoIVA = (data.pctIVA || 0) > 0 ? costoUnitarioBase * ((data.pctIVA || 0) / 100) : 0;

  // 4. Calcular costo unitario total (precio base + flete + IVA + envío absorbido)
  const costoEnvio = data.absorboEnvio ? (data.costoEnvioUnitario || 0) : 0;
  const costoUnitario = costoUnitarioBase + fleteUnitario + costoIVA + costoEnvio;

  // 5. Aplicar factores de forma secuencial y multiplicativa
  // PrecioFinal = CostoUnitario × (1 + %Ganancia) × (1 + %MP) × (1 + %Cupón) × (1 + ComisiónCL)
  let precioWebMPBruto: number;

  if (data.modoProducto === 'propio') {
    // Producto propio: aplicar todos los factores multiplicativamente
    const factorGanancia = 1 + (data.pctGanancia / 100);
    const factorMP = 1 + (data.pctMP / 100);
    const factorCupon = 1 + (data.pctCupon / 100);
    const factorCL = data.clTipo === 'porcentaje' 
      ? 1 + ((data.pctCL || 0) / 100)
      : 1;

    precioWebMPBruto = costoUnitario * factorGanancia * factorMP * factorCupon * factorCL;
    
    // Si CL es fijo, sumarlo al final
    if (data.clTipo === 'fijo') {
      precioWebMPBruto += (data.clFijo || 0);
    }
  } else {
    // Producto de tercero: aplicar ganancia, MP, cupón y luego sumar CL como ingreso
    const factorGanancia = 1 + (data.pctGanancia / 100);
    const factorMP = 1 + (data.pctMP / 100);
    const factorCupon = 1 + (data.pctCupon / 100);

    const precioBase = costoUnitario * factorGanancia * factorMP * factorCupon;
    
    const ingresoCL = data.clTipo === 'fijo' 
      ? (data.clFijo || 0)
      : precioBase * ((data.pctCL || 0) / 100);

    precioWebMPBruto = precioBase + ingresoCL;
  }

  // 6. Aplicar redondeo al precio Web MP
  const precioWebMP = applyRounding(precioWebMPBruto, data.reglaRedondeo);

  // 7. Calcular precio Web Transferencia (descuento sobre Web MP)
  const precioWebTransfer = applyRounding(
    precioWebMP * (1 - data.pctDescTransfer / 100), 
    data.reglaRedondeo
  );

  // 8. Recalcular ganancias y márgenes con precios finales
  const calcularGananciaNeta = (precio: number, esTransferencia: boolean = false): { gananciaNeta: number; margenPct: number } => {
    // Para transferencia: ganancia = precio - costo (sin comisiones)
    // Para Web MP: ganancia = precio - costo - todas las comisiones descontadas del precio
    if (esTransferencia) {
      const gananciaNeta = precio - costoUnitario;
      const margenPct = precio > 0 ? (gananciaNeta / precio) * 100 : 0;
      return { gananciaNeta, margenPct };
    }

    // Para Web MP, las comisiones ya están incorporadas en el precio inflado
    // La ganancia real es el precio menos el costo y menos todas las comisiones
    const comisionMP = precio / (1 + (data.pctMP / 100) + (data.pctCupon / 100)) * (data.pctMP / 100);
    const cupon = precio / (1 + (data.pctMP / 100) + (data.pctCupon / 100)) * (data.pctCupon / 100);
    
    let comisionCL = 0;
    if (data.modoProducto === 'propio') {
      comisionCL = data.clTipo === 'fijo' 
        ? (data.clFijo || 0)
        : precio * ((data.pctCL || 0) / 100);
    }
    
    let ingresoCL = 0;
    if (data.modoProducto === 'tercero') {
      ingresoCL = data.clTipo === 'fijo' 
        ? (data.clFijo || 0)
        : precio * ((data.pctCL || 0) / 100);
    }

    const gananciaNeta = data.modoProducto === 'propio'
      ? precio - costoUnitario - comisionMP - cupon - comisionCL
      : precio - costoUnitario - comisionMP - cupon + ingresoCL;
    
    const margenPct = precio > 0 ? (gananciaNeta / precio) * 100 : 0;

    return { gananciaNeta, margenPct };
  };

  const webMP = calcularGananciaNeta(precioWebMP);
  const webTransfer = calcularGananciaNeta(precioWebTransfer, true);

  // 10. Calcular precio Marketplace (costo + ganancia, sin infladores)
  const subtotalMarketplace = costoUnitario * (1 + (data.pctGanancia / 100));
  const precioMarketplace = applyRounding(subtotalMarketplace, data.reglaRedondeo);
  const marketplace = calcularGananciaNeta(precioMarketplace, true);

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
      precio: precioMarketplace,
      gananciaNeta: marketplace.gananciaNeta,
      margenPct: marketplace.margenPct,
    },
    marketplace: undefined,
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