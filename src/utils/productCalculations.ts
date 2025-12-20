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
  let fleteUnitario: number;
  
  if (data.modoProrrateoFlete === 'proporcional' && data.preciosIndividuales && data.preciosIndividuales.length > 0) {
    // Modo proporcional: calcular el peso del producto actual
    const sumaPreciosBase = data.preciosIndividuales.reduce((sum, precio) => sum + precio, 0);
    const pesoProducto = sumaPreciosBase > 0 ? costoUnitarioBase / sumaPreciosBase : 1 / data.cantidadPorCaja;
    fleteUnitario = pesoProducto * data.fleteTotal;
  } else {
    // Modo uniforme (por defecto)
    fleteUnitario = data.fleteTotal / data.cantidadPorCaja;
  }

  // 3. Calcular IVA sobre precio base
  const costoIVA = (data.pctIVA || 0) > 0 ? costoUnitarioBase * ((data.pctIVA || 0) / 100) : 0;

  // 4. Calcular costo unitario total (precio base + flete + IVA + envío absorbido)
  const costoEnvio = data.absorboEnvio ? (data.costoEnvioUnitario || 0) : 0;
  const costoUnitario = costoUnitarioBase + fleteUnitario + costoIVA + costoEnvio;

  // 5. Calcular ganancia deseada
  const gananciaDeseada = costoUnitario * (data.pctGanancia / 100);
  const subtotal = costoUnitario + gananciaDeseada;

  let precioWebMPBruto: number;

  if (data.modoProducto === 'propio') {
    if (data.clTipo === 'fijo') {
      // PRODUCTO PROPIO con CL FIJO: sumar CL al subtotal antes del gross-up
      // Fórmula: precio = (subtotal + clFijo) / (1 - pctMP - pctCupon)
      const subtotalConCL = subtotal + (data.clFijo || 0);
      const comisionesMPCupon = (data.pctMP + data.pctCupon) / 100;
      
      if (comisionesMPCupon >= 1) {
        precioWebMPBruto = subtotalConCL * 2;
      } else {
        precioWebMPBruto = subtotalConCL / (1 - comisionesMPCupon);
      }
    } else {
      // PRODUCTO PROPIO con CL PORCENTAJE: gross-up combinado
      const comisionesTotales = (data.pctMP + data.pctCupon + (data.pctCL || 0)) / 100;
      
      if (comisionesTotales >= 1) {
        precioWebMPBruto = subtotal * 2;
      } else {
        precioWebMPBruto = subtotal / (1 - comisionesTotales);
      }
    }
  } else {
    // PRODUCTO DE TERCERO: gross-up combinado sobre MP + Cupón, luego sumar CL
    const comisionesMPCupon = (data.pctMP + data.pctCupon) / 100;
    
    let precioSinMPCupon: number;
    if (comisionesMPCupon >= 1) {
      precioSinMPCupon = subtotal * 2;
    } else {
      precioSinMPCupon = subtotal / (1 - comisionesMPCupon);
    }

    // Agregar CL (fijo o %)
    if (data.clTipo === 'fijo') {
      precioWebMPBruto = precioSinMPCupon + (data.clFijo || 0);
    } else {
      precioWebMPBruto = precioSinMPCupon + (precioSinMPCupon * ((data.pctCL || 0) / 100));
    }
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

    // Para Web MP, las comisiones se calculan sobre el precio final (gross-up combinado)
    const comisionMP = precio * (data.pctMP / 100);
    const cupon = precio * (data.pctCupon / 100);
    
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