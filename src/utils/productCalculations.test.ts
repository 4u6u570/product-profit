import { describe, test, expect } from 'vitest';

// Función de cálculo extraída para testing
export const calculateProductValues = (data: {
  cantidadPorCaja: number;
  tipoPreçioBase: 'porCaja' | 'unitarioFijo' | 'unitarioMargen';
  precioBase: number;
  porcentajeGanancia: number;
  comisionMP: number;
  porcentajeCupon: number;
  tipoComisionCompraLinda: 'porcentaje' | 'precioFijo';
  comisionCompraLinda: number;
  fleteTotal: number;
}) => {
  let costoUnitario = 0;
  
  if (data.tipoPreçioBase === 'porCaja') {
    costoUnitario = data.precioBase / data.cantidadPorCaja;
  } else if (data.tipoPreçioBase === 'unitarioFijo') {
    costoUnitario = data.precioBase;
  } else if (data.tipoPreçioBase === 'unitarioMargen') {
    costoUnitario = data.precioBase * (1 + data.porcentajeGanancia / 100);
  }

  const fleteUnitario = data.fleteTotal / data.cantidadPorCaja;
  const costoConFlete = costoUnitario + fleteUnitario;
  const precioConMargen = costoConFlete * (1 + data.porcentajeGanancia / 100);
  
  let comisionCompraLindaUnitaria = 0;
  if (data.tipoComisionCompraLinda === 'porcentaje') {
    comisionCompraLindaUnitaria = precioConMargen * (data.comisionCompraLinda / 100);
  } else {
    comisionCompraLindaUnitaria = data.comisionCompraLinda;
  }
  
  const precioConComision = precioConMargen + comisionCompraLindaUnitaria;
  const comisionMP = precioConComision * (data.comisionMP / 100);
  const cuponDescuento = precioConComision * (data.porcentajeCupon / 100);
  const precioVenta = precioConComision + comisionMP + cuponDescuento;
  const gananciaNeta = precioVenta - costoConFlete - comisionCompraLindaUnitaria - comisionMP - cuponDescuento;
  const margenFinal = (gananciaNeta / precioVenta) * 100;

  return {
    costoUnitario,
    precioVenta,
    gananciaNeta,
    margenFinal
  };
};

describe('Calculadora de Productos - Fórmulas', () => {
  describe('Cálculo tipo "porCaja"', () => {
    test('debe calcular correctamente el costo unitario dividiendo precio base por cantidad', () => {
      const data = {
        cantidadPorCaja: 10,
        tipoPreçioBase: 'porCaja' as const,
        precioBase: 100,
        porcentajeGanancia: 20,
        comisionMP: 5,
        porcentajeCupon: 10,
        tipoComisionCompraLinda: 'porcentaje' as const,
        comisionCompraLinda: 15,
        fleteTotal: 20
      };

      const result = calculateProductValues(data);
      
      // Costo unitario: 100/10 = 10
      // Flete unitario: 20/10 = 2
      // Costo con flete: 10 + 2 = 12
      expect(result.costoUnitario).toBe(10);
    });

    test('debe calcular precio de venta final correctamente con todas las comisiones', () => {
      const data = {
        cantidadPorCaja: 4,
        tipoPreçioBase: 'porCaja' as const,
        precioBase: 80,
        porcentajeGanancia: 25,
        comisionMP: 6,
        porcentajeCupon: 8,
        tipoComisionCompraLinda: 'porcentaje' as const,
        comisionCompraLinda: 10,
        fleteTotal: 16
      };

      const result = calculateProductValues(data);
      
      // Costo unitario: 80/4 = 20
      // Flete unitario: 16/4 = 4  
      // Costo con flete: 20 + 4 = 24
      // Precio con margen: 24 * 1.25 = 30
      // Comisión CL: 30 * 0.10 = 3
      // Precio con comisión: 30 + 3 = 33
      // Comisión MP: 33 * 0.06 = 1.98
      // Cupón: 33 * 0.08 = 2.64
      // Precio final: 33 + 1.98 + 2.64 = 37.62
      
      expect(result.precioVenta).toBeCloseTo(37.62, 2);
    });
  });

  describe('Cálculo tipo "unitarioFijo"', () => {
    test('debe usar el precio base como costo unitario directamente', () => {
      const data = {
        cantidadPorCaja: 5,
        tipoPreçioBase: 'unitarioFijo' as const,
        precioBase: 15,
        porcentajeGanancia: 30,
        comisionMP: 4,
        porcentajeCupon: 5,
        tipoComisionCompraLinda: 'precioFijo' as const,
        comisionCompraLinda: 2,
        fleteTotal: 10
      };

      const result = calculateProductValues(data);
      
      // Costo unitario directo: 15
      expect(result.costoUnitario).toBe(15);
    });
  });

  describe('Cálculo tipo "unitarioMargen"', () => {
    test('debe aplicar el margen directamente al precio base', () => {
      const data = {
        cantidadPorCaja: 8,
        tipoPreçioBase: 'unitarioMargen' as const,
        precioBase: 12,
        porcentajeGanancia: 50,
        comisionMP: 3,
        porcentajeCupon: 7,
        tipoComisionCompraLinda: 'porcentaje' as const,
        comisionCompraLinda: 12,
        fleteTotal: 24
      };

      const result = calculateProductValues(data);
      
      // Costo unitario: 12 * 1.5 = 18
      expect(result.costoUnitario).toBe(18);
    });
  });

  describe('Comisión Compra Linda - Precio Fijo', () => {
    test('debe aplicar comisión fija sin calcular porcentaje', () => {
      const data = {
        cantidadPorCaja: 6,
        tipoPreçioBase: 'unitarioFijo' as const,
        precioBase: 20,
        porcentajeGanancia: 40,
        comisionMP: 5,
        porcentajeCupon: 10,
        tipoComisionCompraLinda: 'precioFijo' as const,
        comisionCompraLinda: 3.5,
        fleteTotal: 12
      };

      const result = calculateProductValues(data);
      
      // Costo unitario: 20
      // Flete unitario: 12/6 = 2
      // Costo con flete: 20 + 2 = 22
      // Precio con margen: 22 * 1.4 = 30.8
      // Comisión CL fija: 3.5
      // Precio con comisión: 30.8 + 3.5 = 34.3
      // Comisión MP: 34.3 * 0.05 = 1.715
      // Cupón: 34.3 * 0.10 = 3.43
      // Precio final: 34.3 + 1.715 + 3.43 = 39.445
      
      expect(result.precioVenta).toBeCloseTo(39.45, 2);
    });
  });

  describe('Margen Final', () => {
    test('debe calcular el margen final como porcentaje de ganancia sobre precio de venta', () => {
      const data = {
        cantidadPorCaja: 2,
        tipoPreçioBase: 'porCaja' as const,
        precioBase: 40,
        porcentajeGanancia: 100,
        comisionMP: 0,
        porcentajeCupon: 0,
        tipoComisionCompraLinda: 'porcentaje' as const,
        comisionCompraLinda: 0,
        fleteTotal: 0
      };

      const result = calculateProductValues(data);
      
      // Costo unitario: 40/2 = 20
      // Sin flete: 20
      // Con margen: 20 * 2 = 40
      // Sin comisiones: 40
      // Ganancia neta: 40 - 20 = 20
      // Margen final: (20/40) * 100 = 50%
      
      expect(result.margenFinal).toBeCloseTo(50, 2);
    });
  });

  describe('Casos límite', () => {
    test('debe manejar valores cero correctamente', () => {
      const data = {
        cantidadPorCaja: 1,
        tipoPreçioBase: 'unitarioFijo' as const,
        precioBase: 10,
        porcentajeGanancia: 0,
        comisionMP: 0,
        porcentajeCupon: 0,
        tipoComisionCompraLinda: 'porcentaje' as const,
        comisionCompraLinda: 0,
        fleteTotal: 0
      };

      const result = calculateProductValues(data);
      
      expect(result.costoUnitario).toBe(10);
      expect(result.precioVenta).toBe(10);
      expect(result.gananciaNeta).toBe(0);
      expect(result.margenFinal).toBe(0);
    });

    test('debe manejar porcentajes altos correctamente', () => {
      const data = {
        cantidadPorCaja: 1,
        tipoPreçioBase: 'unitarioFijo' as const,
        precioBase: 100,
        porcentajeGanancia: 200,
        comisionMP: 15,
        porcentajeCupon: 25,
        tipoComisionCompraLinda: 'porcentaje' as const,
        comisionCompraLinda: 20,
        fleteTotal: 0
      };

      const result = calculateProductValues(data);
      
      // Verificar que no hay errores de cálculo con porcentajes altos
      expect(result.precioVenta).toBeGreaterThan(result.costoUnitario);
      expect(result.margenFinal).toBeGreaterThan(0);
    });
  });
});