import { describe, it, expect } from 'vitest';
import { calculateProduct, validateProductData, applyRounding } from './productCalculations';
import { ProductFormData } from '@/types/product';

describe('productCalculations - Rounding Rules', () => {
  describe('applyRounding', () => {
    it('should not round when rule is "none"', () => {
      expect(applyRounding(1234.56, 'none')).toBe(1234.56);
      expect(applyRounding(999.99, 'none')).toBe(999.99);
    });

    it('should round to nearest 10', () => {
      expect(applyRounding(1234, '10')).toBe(1230);
      expect(applyRounding(1235, '10')).toBe(1240);
      expect(applyRounding(1234.5, '10')).toBe(1230);
    });

    it('should round to nearest 50', () => {
      expect(applyRounding(1224, '50')).toBe(1200);
      expect(applyRounding(1225, '50')).toBe(1250);
      expect(applyRounding(1274, '50')).toBe(1250);
    });

    it('should round to nearest 100', () => {
      expect(applyRounding(1249, '100')).toBe(1200);
      expect(applyRounding(1250, '100')).toBe(1300);
      expect(applyRounding(1349, '100')).toBe(1300);
    });

    it('should apply psychological pricing (X99)', () => {
      expect(applyRounding(1234, 'psico')).toBe(1299); // 1200-1299 range
      expect(applyRounding(1149, 'psico')).toBe(1099); // Below 50, goes to previous X99
      expect(applyRounding(1050, 'psico')).toBe(1099); // Above 50, goes to current X99
      expect(applyRounding(999, 'psico')).toBe(999);
    });
  });
});

describe('productCalculations - Cost Calculations', () => {
  const baseProductData: ProductFormData = {
    sku: 'TEST001',
    nombre: 'Producto Test',
    color: 'Azul',
    cantidadPorCaja: 1,
    tipoPrecio: 'unitario',
    precioBase: 1000,
    fleteTotal: 100,
    costoEnvioUnitario: 0,
    absorboEnvio: false,
    modoProducto: 'propio',
    pctGanancia: 30,
    pctMP: 10,
    pctCupon: 5,
    clTipo: 'porcentaje',
    pctCL: 2,
    clFijo: 0,
    pctIVA: 0,
    pctDescTransfer: 10,
    reglaRedondeo: 'none',
  };

  it('should calculate unit cost for "unitario" pricing', () => {
    const result = calculateProduct(baseProductData);
    // Costo base: 1000
    // Flete unitario: 100/1 = 100
    // Total: 1100
    expect(result.costos.costoUnitario).toBe(1100);
    expect(result.costos.fleteUnitario).toBe(100);
  });

  it('should calculate unit cost for "caja" pricing', () => {
    const data = {
      ...baseProductData,
      tipoPrecio: 'caja' as const,
      precioBase: 6000,
      cantidadPorCaja: 6,
      fleteTotal: 300,
    };
    const result = calculateProduct(data);
    // Costo base unitario: 6000/6 = 1000
    // Flete unitario: 300/6 = 50
    // Total: 1050
    expect(result.costos.costoUnitario).toBe(1050);
    expect(result.costos.fleteUnitario).toBe(50);
  });

  it('should include IVA in unit cost', () => {
    const data = {
      ...baseProductData,
      pctIVA: 21,
    };
    const result = calculateProduct(data);
    // Costo base: 1000
    // Flete unitario: 100
    // IVA: 1000 * 0.21 = 210
    // Total: 1310
    expect(result.costos.costoUnitario).toBe(1310);
  });

  it('should include shipping cost when absorbed', () => {
    const data = {
      ...baseProductData,
      absorboEnvio: true,
      costoEnvioUnitario: 75,
    };
    const result = calculateProduct(data);
    // Costo base: 1000
    // Flete unitario: 100
    // Costo envío: 75
    // Total: 1175
    expect(result.costos.costoUnitario).toBe(1175);
  });

  it('should calculate cost with IVA and absorbed shipping', () => {
    const data = {
      ...baseProductData,
      pctIVA: 21,
      absorboEnvio: true,
      costoEnvioUnitario: 50,
    };
    const result = calculateProduct(data);
    // Costo base: 1000
    // Flete unitario: 100
    // Costo envío: 50
    // IVA: 1000 * 0.21 = 210
    // Total: 1360
    expect(result.costos.costoUnitario).toBe(1360);
  });
});

describe('productCalculations - Propio Mode Pricing', () => {
  const baseProductData: ProductFormData = {
    sku: 'TEST001',
    nombre: 'Producto Test',
    color: 'Azul',
    cantidadPorCaja: 1,
    tipoPrecio: 'unitario',
    precioBase: 1000,
    fleteTotal: 100,
    costoEnvioUnitario: 0,
    absorboEnvio: false,
    modoProducto: 'propio',
    pctGanancia: 30,
    pctMP: 10,
    pctCupon: 5,
    clTipo: 'porcentaje',
    pctCL: 2,
    clFijo: 0,
    pctIVA: 0,
    pctDescTransfer: 10,
    reglaRedondeo: 'none',
  };

  it('should calculate Web MP price for propio product', () => {
    const result = calculateProduct(baseProductData);
    // Costo unitario: 1100
    // Ganancia deseada: 1100 * 0.30 = 330
    // Subtotal: 1430
    // Comisiones: 10% + 5% + 2% = 17%
    // Precio Web MP: 1430 / (1 - 0.17) = 1430 / 0.83 ≈ 1722.89
    expect(result.webMP.precio).toBeCloseTo(1722.89, 2);
  });

  it('should calculate Web Transfer price (subtotal with discount)', () => {
    const result = calculateProduct(baseProductData);
    // Subtotal: 1430
    // Descuento transferencia: 10%
    // Precio Web Transfer: 1430 * 0.9 = 1287
    expect(result.webTransfer.precio).toBe(1287);
  });

  it('should calculate Marketplace price (subtotal without transfer discount)', () => {
    const result = calculateProduct(baseProductData);
    // Marketplace = Subtotal sin descuento de transferencia
    // Subtotal: 1430
    expect(result.webCupon.precio).toBe(1430);
  });

  it('should calculate net profit and margin for Web MP', () => {
    const result = calculateProduct(baseProductData);
    // Precio Web MP: ~1722.89
    // Comisión MP: 1722.89 * 0.10 = 172.29
    // Cupón: 1722.89 * 0.05 = 86.14
    // Comisión CL: 1722.89 * 0.02 = 34.46
    // Ganancia neta: 1722.89 - 1100 - 172.29 - 86.14 - 34.46 = 330
    // Margen: (330 / 1722.89) * 100 ≈ 19.15%
    expect(result.webMP.gananciaNeta).toBeCloseTo(330, 2);
    expect(result.webMP.margenPct).toBeCloseTo(19.15, 2);
  });

  it('should calculate net profit for Web Transfer (no commissions)', () => {
    const result = calculateProduct(baseProductData);
    // Precio Web Transfer: 1287
    // Ganancia neta: 1287 - 1100 = 187
    // Margen: (187 / 1287) * 100 ≈ 14.53%
    expect(result.webTransfer.gananciaNeta).toBe(187);
    expect(result.webTransfer.margenPct).toBeCloseTo(14.53, 2);
  });

  it('should work with fixed CL commission', () => {
    const data = {
      ...baseProductData,
      clTipo: 'fijo' as const,
      clFijo: 100,
      pctCL: 0,
    };
    const result = calculateProduct(data);
    // Comisiones: 10% + 5% = 15% (CL fijo se suma después)
    // Precio Web MP: 1430 / 0.85 ≈ 1682.35
    // Ganancia neta: 1682.35 - 1100 - 168.24 - 84.12 - 100 = 230
    expect(result.webMP.precio).toBeCloseTo(1682.35, 2);
    expect(result.webMP.gananciaNeta).toBeCloseTo(230, 2);
  });
});

describe('productCalculations - Tercero Mode Pricing', () => {
  const baseProductData: ProductFormData = {
    sku: 'TEST001',
    nombre: 'Producto Test',
    color: 'Azul',
    cantidadPorCaja: 1,
    tipoPrecio: 'unitario',
    precioBase: 1000,
    fleteTotal: 100,
    costoEnvioUnitario: 0,
    absorboEnvio: false,
    modoProducto: 'tercero',
    pctGanancia: 30,
    pctMP: 10,
    pctCupon: 5,
    clTipo: 'porcentaje',
    pctCL: 3,
    clFijo: 0,
    pctIVA: 0,
    pctDescTransfer: 10,
    reglaRedondeo: 'none',
  };

  it('should calculate Web MP price with CL as income', () => {
    const result = calculateProduct(baseProductData);
    // Subtotal: 1430
    // Precio sin MP/Cupón: 1430 / (1 - 0.10 - 0.05) = 1430 / 0.85 ≈ 1682.35
    // Ingreso CL: 1682.35 * 0.03 ≈ 50.47
    // Precio Web MP: 1682.35 + 50.47 ≈ 1732.82
    expect(result.webMP.precio).toBeCloseTo(1732.82, 2);
  });

  it('should calculate net profit with CL as income', () => {
    const result = calculateProduct(baseProductData);
    // Precio: ~1732.82
    // Comisión MP: 1732.82 * 0.10 = 173.28
    // Cupón: 1732.82 * 0.05 = 86.64
    // Ingreso CL: 1732.82 * 0.03 = 51.98
    // Ganancia neta: (1732.82 - 173.28 - 86.64) - 1100 + 51.98 ≈ 424.88
    expect(result.webMP.gananciaNeta).toBeCloseTo(424.88, 2);
  });

  it('should work with fixed CL as income', () => {
    const data = {
      ...baseProductData,
      clTipo: 'fijo' as const,
      clFijo: 150,
      pctCL: 0,
    };
    const result = calculateProduct(data);
    // Precio sin MP/Cupón: 1430 / 0.85 ≈ 1682.35
    // Precio Web MP: 1682.35 + 150 = 1832.35
    expect(result.webMP.precio).toBeCloseTo(1832.35, 2);
  });
});

describe('productCalculations - Rounding Effects', () => {
  const baseProductData: ProductFormData = {
    sku: 'TEST001',
    nombre: 'Producto Test',
    color: 'Azul',
    cantidadPorCaja: 1,
    tipoPrecio: 'unitario',
    precioBase: 1000,
    fleteTotal: 100,
    costoEnvioUnitario: 0,
    absorboEnvio: false,
    modoProducto: 'propio',
    pctGanancia: 30,
    pctMP: 10,
    pctCupon: 5,
    clTipo: 'porcentaje',
    pctCL: 2,
    clFijo: 0,
    pctIVA: 0,
    pctDescTransfer: 10,
    reglaRedondeo: 'none',
  };

  it('should apply rounding to all prices', () => {
    const data = { ...baseProductData, reglaRedondeo: '100' as const };
    const result = calculateProduct(data);
    
    expect(result.webMP.precio % 100).toBe(0);
    expect(result.webTransfer.precio % 100).toBe(0);
    expect(result.webCupon.precio % 100).toBe(0);
  });

  it('should recalculate margins after rounding', () => {
    const dataNoRound = { ...baseProductData, reglaRedondeo: 'none' as const };
    const data100 = { ...baseProductData, reglaRedondeo: '100' as const };
    
    const resultNoRound = calculateProduct(dataNoRound);
    const result100 = calculateProduct(data100);
    
    // Margins should be different after rounding
    expect(resultNoRound.webMP.margenPct).not.toBe(result100.webMP.margenPct);
  });
});

describe('productCalculations - Validation', () => {
  const baseProductData: ProductFormData = {
    sku: 'TEST001',
    nombre: 'Producto Test',
    color: 'Azul',
    cantidadPorCaja: 1,
    tipoPrecio: 'unitario',
    precioBase: 1000,
    fleteTotal: 100,
    costoEnvioUnitario: 0,
    absorboEnvio: false,
    modoProducto: 'propio',
    pctGanancia: 30,
    pctMP: 10,
    pctCupon: 5,
    clTipo: 'porcentaje',
    pctCL: 2,
    clFijo: 0,
    pctIVA: 0,
    pctDescTransfer: 10,
    reglaRedondeo: 'none',
  };

  it('should pass validation with valid data', () => {
    const error = validateProductData(baseProductData);
    expect(error).toBeNull();
  });

  it('should fail validation when propio commissions >= 100%', () => {
    const data = {
      ...baseProductData,
      pctMP: 50,
      pctCupon: 30,
      pctCL: 20,
    };
    const error = validateProductData(data);
    expect(error).toBeTruthy();
    expect(error).toContain('100%');
  });

  it('should allow high commissions for tercero mode', () => {
    const data = {
      ...baseProductData,
      modoProducto: 'tercero' as const,
      pctMP: 50,
      pctCupon: 30,
      pctCL: 20,
    };
    const error = validateProductData(data);
    expect(error).toBeNull();
  });

  it('should not count fixed CL in percentage validation', () => {
    const data = {
      ...baseProductData,
      clTipo: 'fijo' as const,
      pctMP: 50,
      pctCupon: 49,
      pctCL: 0,
      clFijo: 1000,
    };
    const error = validateProductData(data);
    expect(error).toBeNull();
  });
});

describe('productCalculations - Edge Cases', () => {
  it('should handle zero profit margin', () => {
    const data: ProductFormData = {
      sku: 'TEST001',
      nombre: 'Producto Test',
      color: 'Azul',
      cantidadPorCaja: 1,
      tipoPrecio: 'unitario',
      precioBase: 1000,
      fleteTotal: 0,
      costoEnvioUnitario: 0,
      absorboEnvio: false,
      modoProducto: 'propio',
      pctGanancia: 0,
      pctMP: 10,
      pctCupon: 5,
      clTipo: 'porcentaje',
      pctCL: 2,
      clFijo: 0,
      pctIVA: 0,
      pctDescTransfer: 10,
      reglaRedondeo: 'none',
    };
    const result = calculateProduct(data);
    expect(result.costos.costoUnitario).toBe(1000);
  });

  it('should handle high profit margin (500%)', () => {
    const data: ProductFormData = {
      sku: 'TEST001',
      nombre: 'Producto Test',
      color: 'Azul',
      cantidadPorCaja: 1,
      tipoPrecio: 'unitario',
      precioBase: 1000,
      fleteTotal: 100,
      costoEnvioUnitario: 0,
      absorboEnvio: false,
      modoProducto: 'propio',
      pctGanancia: 500,
      pctMP: 10,
      pctCupon: 5,
      clTipo: 'porcentaje',
      pctCL: 2,
      clFijo: 0,
      pctIVA: 0,
      pctDescTransfer: 10,
      reglaRedondeo: 'none',
    };
    const result = calculateProduct(data);
    // Costo: 1100
    // Ganancia deseada: 1100 * 5 = 5500
    // Subtotal: 6600
    expect(result.webMP.gananciaNeta).toBeCloseTo(5500, 0);
  });

  it('should handle multiple items per box', () => {
    const data: ProductFormData = {
      sku: 'TEST001',
      nombre: 'Producto Test',
      color: 'Azul',
      cantidadPorCaja: 12,
      tipoPrecio: 'caja',
      precioBase: 12000,
      fleteTotal: 600,
      costoEnvioUnitario: 0,
      absorboEnvio: false,
      modoProducto: 'propio',
      pctGanancia: 30,
      pctMP: 10,
      pctCupon: 5,
      clTipo: 'porcentaje',
      pctCL: 2,
      clFijo: 0,
      pctIVA: 0,
      pctDescTransfer: 10,
      reglaRedondeo: 'none',
    };
    const result = calculateProduct(data);
    // Costo unitario: 12000/12 = 1000
    // Flete unitario: 600/12 = 50
    // Total: 1050
    expect(result.costos.costoUnitario).toBe(1050);
    expect(result.costos.fleteUnitario).toBe(50);
  });
});

describe('productCalculations - Transfer Discount Independence', () => {
  const baseProductData: ProductFormData = {
    sku: 'TEST001',
    nombre: 'Producto Test',
    color: 'Azul',
    cantidadPorCaja: 1,
    tipoPrecio: 'unitario',
    precioBase: 1000,
    fleteTotal: 100,
    costoEnvioUnitario: 0,
    absorboEnvio: false,
    modoProducto: 'propio',
    pctGanancia: 30,
    pctMP: 10,
    pctCupon: 5,
    clTipo: 'porcentaje',
    pctCL: 2,
    clFijo: 0,
    pctIVA: 0,
    pctDescTransfer: 10,
    reglaRedondeo: 'none',
  };

  it('should not apply transfer discount to Marketplace price', () => {
    const result = calculateProduct(baseProductData);
    // Subtotal: 1430
    // Marketplace debe ser igual al subtotal (sin descuento de transferencia)
    // Web Transfer debe tener el descuento: 1430 * 0.9 = 1287
    expect(result.webCupon.precio).toBe(1430);
    expect(result.webTransfer.precio).toBe(1287);
    expect(result.webCupon.precio).toBeGreaterThan(result.webTransfer.precio);
  });

  it('should only apply transfer discount to Web Transfer channel', () => {
    const dataWithHighDiscount = {
      ...baseProductData,
      pctDescTransfer: 20,
    };
    const result = calculateProduct(dataWithHighDiscount);
    // Subtotal: 1430
    // Web Transfer: 1430 * 0.8 = 1144
    // Marketplace: 1430 (sin descuento)
    expect(result.webTransfer.precio).toBe(1144);
    expect(result.webCupon.precio).toBe(1430);
  });
});
