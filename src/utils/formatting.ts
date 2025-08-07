/**
 * Formatea número para mostrar en formato argentino ($ 30.300,00)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formatea número para mostrar sin símbolo de moneda (30.300,00)
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formatea número para edición (30300.00)
 */
export const formatForEdit = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Formatea número para copia al clipboard (30300.00)
 */
export const formatForCopy = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Formatea porcentaje para mostrar
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

/**
 * Parsea string de input a número
 */
export const parseInputNumber = (value: string): number => {
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formatea número para exportación CSV/Excel (sin formato, solo 2 decimales)
 */
export const formatForExport = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Copia texto al clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};