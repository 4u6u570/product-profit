import { CalculatorFormData, CalculatedPrices } from '@/types/calculator';
import { applyRounding } from './rounding';

/**
 * Calcula todos los precios y márgenes según las nuevas especificaciones
 */
export const calculatePrices = (data: CalculatorFormData): CalculatedPrices => {
  // 1. Calcular costo unitario base
  const costoUnitarioBase = data.tipoPrecioBase === 'unitarioFijo' 
    ? data.precioBase 
    : data.precioBase / data.cantidadPorCaja;

  // 2. Calcular flete unitario
  const fleteUnitario = data.fleteTotal / data.cantidadPorCaja;

  // 3. Calcular costo unitario total (incluye envío si se absorbe)
  const costoEnvio = data.absorboEnvio ? data.costoEnvioUnitario : 0;
  const costoUnitario = costoUnitarioBase + fleteUnitario + costoEnvio;

  // 4. Calcular ganancia deseada
  const gananciaDeseada = costoUnitario * (data.porcentajeGanancia / 100);
  const subtotal = costoUnitario + gananciaDeseada;

  let precioWebMP: number;
  let precioWebTransferencia: number;
  let precioMarketplace: number;

  if (data.modoProducto === 'propio') {
    // PRODUCTO PROPIO: precio_web_mp = subtotal / (1 - (%MP + %Cupon + %CL))
    const comisionCLPorcentaje = data.tipoComisionCL === 'porcentaje' 
      ? data.comisionCL 
      : (data.comisionCL / subtotal) * 100;
    
    const comisionesTotales = (data.comisionMP + data.porcentajeCupon + comisionCLPorcentaje) / 100;
    
    if (comisionesTotales >= 1) {
      // Prevenir división por cero
      precioWebMP = subtotal * 2;
    } else {
      precioWebMP = subtotal / (1 - comisionesTotales);
    }
  } else {
    // PRODUCTO DE TERCERO
    // precio_sin_mp_cupon = subtotal / (1 - %MP - %Cupon)
    const comisionesMPCupon = (data.comisionMP + data.porcentajeCupon) / 100;
    
    let precioSinMPCupon: number;
    if (comisionesMPCupon >= 1) {
      precioSinMPCupon = subtotal * 2;
    } else {
      precioSinMPCupon = subtotal / (1 - comisionesMPCupon);
    }

    // precio_web_mp = precio_sin_mp_cupon + CL (fijo o %)
    if (data.tipoComisionCL === 'fijo') {
      precioWebMP = precioSinMPCupon + data.comisionCL;
    } else {
      precioWebMP = precioSinMPCupon + (precioSinMPCupon * data.comisionCL / 100);
    }
  }

  // 5. Calcular precio con transferencia
  precioWebTransferencia = precioWebMP * (1 - data.descuentoTransferencia / 100);

  // 6. Calcular precio marketplace
  const comisionesMarketplace = (data.porcentajeMarketplace + data.porcentajeCupon) / 100;
  if (comisionesMarketplace >= 1) {
    precioMarketplace = subtotal * 2;
  } else {
    precioMarketplace = subtotal / (1 - comisionesMarketplace);
  }

  // 7. Aplicar redondeo
  precioWebMP = applyRounding(precioWebMP, data.tipoRedondeo);
  precioWebTransferencia = applyRounding(precioWebTransferencia, data.tipoRedondeo);
  precioMarketplace = applyRounding(precioMarketplace, data.tipoRedondeo);

  // 8. Recalcular ganancias y márgenes después del redondeo
  const calcularGananciaMArgen = (precio: number) => {
    const comisionMPReal = precio * (data.comisionMP / 100);
    const cuponReal = precio * (data.porcentajeCupon / 100);
    
    let comisionCLReal = 0;
    if (data.tipoComisionCL === 'fijo') {
      comisionCLReal = data.comisionCL;
    } else {
      comisionCLReal = precio * (data.comisionCL / 100);
    }

    const gananciaNeta = precio - costoUnitario - comisionMPReal - cuponReal - comisionCLReal;
    const margenFinal = precio > 0 ? (gananciaNeta / precio) * 100 : 0;

    return { gananciaNeta, margenFinal };
  };

  const webMP = calcularGananciaMArgen(precioWebMP);
  const webTransfer = calcularGananciaMArgen(precioWebTransferencia);
  
  // Para marketplace, no incluir comisión CL
  const comisionMPMarket = precioMarketplace * (data.porcentajeMarketplace / 100);
  const cuponMarket = precioMarketplace * (data.porcentajeCupon / 100);
  const gananciaNetaMarketplace = precioMarketplace - costoUnitario - comisionMPMarket - cuponMarket;
  const margenFinalMarketplace = precioMarketplace > 0 ? (gananciaNetaMarketplace / precioMarketplace) * 100 : 0;

  return {
    costoUnitario,
    fleteUnitario,
    costoEnvioUnitario: costoEnvio,
    costoTotal: costoUnitario,
    
    precioWebMP,
    precioWebTransferencia,
    precioMarketplace,
    
    gananciaNetaWebMP: webMP.gananciaNeta,
    gananciaNetaWebTransferencia: webTransfer.gananciaNeta,
    gananciaNetaMarketplace,
    
    margenFinalWebMP: webMP.margenFinal,
    margenFinalWebTransferencia: webTransfer.margenFinal,
    margenFinalMarketplace,
  };
};

/**
 * Valida que las comisiones no superen el 100%
 */
export const validateCommissions = (data: CalculatorFormData): string | null => {
  if (data.modoProducto === 'propio') {
    const comisionCL = data.tipoComisionCL === 'porcentaje' ? data.comisionCL : 0;
    const total = data.comisionMP + data.porcentajeCupon + comisionCL;
    
    if (total >= 100) {
      return 'La suma de comisiones no puede ser mayor o igual al 100%';
    }
  }
  
  return null;
};