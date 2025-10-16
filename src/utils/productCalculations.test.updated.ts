import { describe, it, expect } from 'vitest';
import { calculateProduct, validateProductData } from './productCalculations';
import { ProductFormData } from '@/types/product';

describe('Product Calculations with IVA Integration', () => {
  const baseProductData: ProductFormData = {
    sku: 'TEST001',
    nombre: 'Producto Test',
    color: 'Azul',
    cantidadPorCaja: 1,
    tipoPrecio: 'unitario',
    precioBase: 1000,
    fleteTotal: 100,
    modoProrrateoFlete: 'uniforme',
    costoEnvioUnitario: 50,
    absorboEnvio: false,
    modoProducto: 'propio',
    pctGanancia: 30,
    pctMP: 7.61,
    pctCupon: 5,
    clTipo: 'porcentaje',
    pctCL: 2,
    clFijo: 0,
    pctIVA: 21, // 21% IVA
    pctDescTransfer: 10,
    reglaRedondeo: 'none',
  };

  it('should include IVA in unit cost calculation', () => {
    const result = calculateProduct(baseProductData);
    
    // Costo base: 1000
    // Flete unitario: 100/1 = 100
    // IVA: 1000 * 0.21 = 210
    // Costo unitario total: 1000 + 100 + 210 = 1310
    
    expect(result.costos.costoUnitario).toBe(1310);
  });

  it('should include IVA when shipping is absorbed', () => {
    const dataWithShipping = {
      ...baseProductData,
      absorboEnvio: true,
      costoEnvioUnitario: 75,
    };
    
    const result = calculateProduct(dataWithShipping);
    
    // Costo base: 1000
    // Flete unitario: 100/1 = 100
    // Costo envío: 75 (absorbed)
    // IVA: 1000 * 0.21 = 210
    // Costo unitario total: 1000 + 100 + 75 + 210 = 1385
    
    expect(result.costos.costoUnitario).toBe(1385);
  });

  it('should not create marketplace object when using IVA', () => {
    const result = calculateProduct(baseProductData);
    
    // Should not have marketplace since we removed that functionality
    expect(result.marketplace).toBeUndefined();
  });

  it('should calculate prices correctly with IVA included in cost', () => {
    const result = calculateProduct(baseProductData);
    
    // Costo unitario: 1310 (includes IVA)
    // Ganancia deseada: 1310 * 0.30 = 393
    // Subtotal: 1310 + 393 = 1703
    
    // For 'propio' mode:
    // Total commissions: 7.61% + 5% + 2% = 14.61%
    // Web MP price: 1703 / (1 - 0.1461) ≈ 1994.98
    
    expect(result.costos.costoUnitario).toBe(1310);
    expect(Math.round(result.webMP.precio)).toBe(1995);
  });

  it('should work with zero IVA', () => {
    const dataWithoutIVA = {
      ...baseProductData,
      pctIVA: 0,
    };
    
    const result = calculateProduct(dataWithoutIVA);
    
    // Costo base: 1000
    // Flete unitario: 100
    // IVA: 0
    // Costo unitario total: 1000 + 100 = 1100
    
    expect(result.costos.costoUnitario).toBe(1100);
  });

  it('should validate product data correctly', () => {
    const validData = { ...baseProductData };
    expect(validateProductData(validData)).toBeNull();
    
    // Test with excessive commissions for 'propio' mode
    const invalidData = {
      ...baseProductData,
      pctMP: 50,
      pctCupon: 30,
      pctCL: 25, // Total: 105% > 100%
    };
    
    const error = validateProductData(invalidData);
    expect(error).toBeTruthy();
    expect(error).toContain('100%');
  });

  it('should calculate Web Cupón price correctly', () => {
    const result = calculateProduct(baseProductData);
    
    // Web Cupón should be Web Transfer with 10% additional discount
    const expectedWebCupon = result.webTransfer.precio * (1 - 0.10);
    
    expect(Math.abs(result.webCupon.precio - expectedWebCupon)).toBeLessThan(0.01);
  });
});