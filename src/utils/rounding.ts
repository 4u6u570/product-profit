import { RoundingType } from '@/types/calculator';

/**
 * Aplica redondeo según el tipo especificado
 */
export const applyRounding = (price: number, type: RoundingType): number => {
  switch (type) {
    case 'sin':
      return price;
    
    case 'diez':
      return Math.round(price / 10) * 10;
    
    case 'cincuenta':
      return Math.round(price / 50) * 50;
    
    case 'cien':
      return Math.round(price / 100) * 100;
    
    case 'psicologico':
      // Redondeo psicológico a .99 o .90
      const integer = Math.floor(price);
      const decimal = price - integer;
      
      if (decimal <= 0.90) {
        return integer + 0.90;
      } else {
        return integer + 0.99;
      }
    
    default:
      return price;
  }
};

/**
 * Opciones de redondeo disponibles
 */
export const roundingOptions = [
  { value: 'sin', label: 'Sin redondeo' },
  { value: 'diez', label: 'A $10' },
  { value: 'cincuenta', label: 'A $50' },
  { value: 'cien', label: 'A $100' },
  { value: 'psicologico', label: 'Psicológico (,99 o ,90)' },
] as const;