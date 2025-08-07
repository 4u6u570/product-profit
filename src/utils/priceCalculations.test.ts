import { describe, test, expect } from 'vitest';
import { calculatePrices, validateCommissions } from './calculations';
import { CalculatorFormData } from '@/types/calculator';

describe('Nueva Calculadora de Precios - Tests', () => {
  describe('Producto Propio - Cálculos básicos', () => {
    test('debe calcular precio web MP correctamente para producto propio', () => {
      const data: CalculatorFormData = {
        producto: 'Test Product',
        sku: 'TEST-001',
        color: 'Azul',
        cantidadPorCaja: 4,
        tipoPrecioBase: 'porCaja',
        precioBase: 80,
        fleteTotal: 16,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'propio',
        porcentajeGanancia: 100,
        comisionMP: 10,
        porcentajeCupon: 0,
        tipoComisionCL: 'porcentaje',
        comisionCL: 10,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      // Costo unitario: 80/4 = 20
      // Flete unitario: 16/4 = 4
      // Costo total: 20 + 4 = 24
      // Ganancia deseada: 24 * 1 = 24
      // Subtotal: 24 + 24 = 48
      // Comisiones totales: 10% + 0% + 10% = 20%
      // Precio web MP: 48 / (1 - 0.20) = 48 / 0.80 = 60

      expect(result.costoUnitario).toBe(24);
      expect(result.fleteUnitario).toBe(4);
      expect(result.precioWebMP).toBe(60);
    });

    test('debe aplicar descuento por transferencia correctamente', () => {
      const data: CalculatorFormData = {
        producto: 'Test Product',
        sku: 'TEST-002',
        color: 'Rojo',
        cantidadPorCaja: 1,
        tipoPrecioBase: 'unitarioFijo',
        precioBase: 100,
        fleteTotal: 0,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'propio',
        porcentajeGanancia: 50,
        comisionMP: 10,
        porcentajeCupon: 5,
        tipoComisionCL: 'porcentaje',
        comisionCL: 5,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      // Precio web MP debería ser calculado primero
      // Precio transferencia = precio web MP * (1 - 0.10)
      const expectedTransferPrice = result.precioWebMP * 0.90;
      
      expect(result.precioWebTransferencia).toBeCloseTo(expectedTransferPrice, 2);
    });
  });

  describe('Producto de Tercero - Cálculos específicos', () => {
    test('debe calcular correctamente para producto de tercero con comisión CL fija', () => {
      const data: CalculatorFormData = {
        producto: 'Producto Tercero',
        sku: 'TERCERO-001',
        color: 'Verde',
        cantidadPorCaja: 1,
        tipoPrecioBase: 'unitarioFijo',
        precioBase: 100,
        fleteTotal: 0,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'tercero',
        porcentajeGanancia: 50,
        comisionMP: 10,
        porcentajeCupon: 5,
        tipoComisionCL: 'fijo',
        comisionCL: 25,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      // Para tercero:
      // Costo: 100, Ganancia: 50, Subtotal: 150
      // Precio sin MP/cupón: 150 / (1 - 0.15) = 150 / 0.85 = 176.47
      // Precio web MP: 176.47 + 25 = 201.47
      
      expect(result.costoUnitario).toBe(100);
      expect(result.precioWebMP).toBeCloseTo(201.47, 2);
    });

    test('debe calcular correctamente para producto de tercero con comisión CL porcentual', () => {
      const data: CalculatorFormData = {
        producto: 'Producto Tercero %',
        sku: 'TERCERO-002',
        color: 'Amarillo',
        cantidadPorCaja: 1,
        tipoPrecioBase: 'unitarioFijo',
        precioBase: 100,
        fleteTotal: 0,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'tercero',
        porcentajeGanancia: 50,
        comisionMP: 10,
        porcentajeCupon: 5,
        tipoComisionCL: 'porcentaje',
        comisionCL: 12,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      // Para tercero con CL porcentual:
      // Precio sin MP/cupón: 150 / 0.85 = 176.47
      // Precio web MP: 176.47 + (176.47 * 0.12) = 176.47 + 21.18 = 197.65
      
      expect(result.precioWebMP).toBeCloseTo(197.65, 2);
    });
  });

  describe('Envío absorbido', () => {
    test('debe incluir costo de envío cuando se absorbe', () => {
      const data: CalculatorFormData = {
        producto: 'Con Envío',
        sku: 'ENVIO-001',
        color: 'Negro',
        cantidadPorCaja: 2,
        tipoPrecioBase: 'porCaja',
        precioBase: 100,
        fleteTotal: 20,
        costoEnvioUnitario: 15,
        absorboEnvio: true,
        modoProducto: 'propio',
        porcentajeGanancia: 100,
        comisionMP: 10,
        porcentajeCupon: 0,
        tipoComisionCL: 'porcentaje',
        comisionCL: 10,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      // Costo unitario base: 100/2 = 50
      // Flete unitario: 20/2 = 10
      // Envío absorbido: 15
      // Costo total: 50 + 10 + 15 = 75
      
      expect(result.costoUnitario).toBe(75);
      expect(result.costoEnvioUnitario).toBe(15);
    });

    test('no debe incluir costo de envío cuando no se absorbe', () => {
      const data: CalculatorFormData = {
        producto: 'Sin Envío',
        sku: 'NOENVIO-001',
        color: 'Blanco',
        cantidadPorCaja: 2,
        tipoPrecioBase: 'porCaja',
        precioBase: 100,
        fleteTotal: 20,
        costoEnvioUnitario: 15,
        absorboEnvio: false,
        modoProducto: 'propio',
        porcentajeGanancia: 100,
        comisionMP: 10,
        porcentajeCupon: 0,
        tipoComisionCL: 'porcentaje',
        comisionCL: 10,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      // Costo unitario base: 100/2 = 50
      // Flete unitario: 20/2 = 10
      // Envío NO absorbido: 0
      // Costo total: 50 + 10 + 0 = 60
      
      expect(result.costoUnitario).toBe(60);
      expect(result.costoEnvioUnitario).toBe(0);
    });
  });

  describe('Validaciones', () => {
    test('debe detectar error cuando comisiones suman 100% o más en producto propio', () => {
      const data: CalculatorFormData = {
        producto: 'Error Test',
        sku: 'ERROR-001',
        color: 'Rojo',
        cantidadPorCaja: 1,
        tipoPrecioBase: 'unitarioFijo',
        precioBase: 100,
        fleteTotal: 0,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'propio',
        porcentajeGanancia: 50,
        comisionMP: 50,
        porcentajeCupon: 30,
        tipoComisionCL: 'porcentaje',
        comisionCL: 25, // Total: 50 + 30 + 25 = 105%
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const error = validateCommissions(data);
      expect(error).toBeTruthy();
      expect(error).toContain('100%');
    });

    test('no debe reportar error para producto de tercero con comisiones altas', () => {
      const data: CalculatorFormData = {
        producto: 'Tercero OK',
        sku: 'TERCERO-OK-001',
        color: 'Verde',
        cantidadPorCaja: 1,
        tipoPrecioBase: 'unitarioFijo',
        precioBase: 100,
        fleteTotal: 0,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'tercero',
        porcentajeGanancia: 50,
        comisionMP: 50,
        porcentajeCupon: 30,
        tipoComisionCL: 'fijo',
        comisionCL: 100,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const error = validateCommissions(data);
      expect(error).toBeNull();
    });
  });

  describe('Marketplace', () => {
    test('debe calcular precio marketplace sin comisión CL', () => {
      const data: CalculatorFormData = {
        producto: 'Marketplace Test',
        sku: 'MARKET-001',
        color: 'Azul',
        cantidadPorCaja: 1,
        tipoPrecioBase: 'unitarioFijo',
        precioBase: 100,
        fleteTotal: 0,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'propio',
        porcentajeGanancia: 50,
        comisionMP: 10,
        porcentajeCupon: 5,
        tipoComisionCL: 'porcentaje',
        comisionCL: 10,
        porcentajeMarketplace: 8,
        descuentoTransferencia: 10,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      // Para marketplace: subtotal / (1 - (%marketplace + %cupon))
      // Subtotal: 100 + 50 = 150
      // Comisiones: 8% + 5% = 13%
      // Precio marketplace: 150 / (1 - 0.13) = 150 / 0.87 = 172.41
      
      expect(result.precioMarketplace).toBeCloseTo(172.41, 2);
    });
  });

  describe('Casos extremos', () => {
    test('debe manejar valores cero correctamente', () => {
      const data: CalculatorFormData = {
        producto: 'Cero Test',
        sku: 'CERO-001',
        color: 'Gris',
        cantidadPorCaja: 1,
        tipoPrecioBase: 'unitarioFijo',
        precioBase: 100,
        fleteTotal: 0,
        costoEnvioUnitario: 0,
        absorboEnvio: false,
        modoProducto: 'propio',
        porcentajeGanancia: 0,
        comisionMP: 0,
        porcentajeCupon: 0,
        tipoComisionCL: 'porcentaje',
        comisionCL: 0,
        porcentajeMarketplace: 0,
        descuentoTransferencia: 0,
        tipoRedondeo: 'sin',
      };

      const result = calculatePrices(data);
      
      expect(result.costoUnitario).toBe(100);
      expect(result.precioWebMP).toBe(100);
      expect(result.precioWebTransferencia).toBe(100);
      expect(result.gananciaNetaWebMP).toBe(0);
    });
  });
});