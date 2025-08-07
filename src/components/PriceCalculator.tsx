import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calculator, Copy, Download, Info, AlertCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { CalculatorFormData, CalculatedPrices } from '@/types/calculator';
import { calculatePrices, validateCommissions } from '@/utils/calculations';
import { formatCurrency, formatForCopy, formatPercentage, copyToClipboard } from '@/utils/formatting';
import { roundingOptions } from '@/utils/rounding';
import { exportToCSV, exportToExcel, prepareExportData } from '@/utils/export';

const calculatorSchema = z.object({
  producto: z.string().optional(),
  sku: z.string().min(1, 'El SKU es requerido para exportar'),
  color: z.string().optional(),
  cantidadPorCaja: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  tipoPrecioBase: z.enum(['unitarioFijo', 'porCaja']),
  precioBase: z.number().min(0, 'El precio base debe ser mayor o igual a 0'),
  fleteTotal: z.number().min(0, 'El flete total debe ser mayor o igual a 0'),
  costoEnvioUnitario: z.number().min(0, 'El costo de envío debe ser mayor o igual a 0'),
  absorboEnvio: z.boolean(),
  modoProducto: z.enum(['propio', 'tercero']),
  porcentajeGanancia: z.number().min(0).max(500, 'El porcentaje de ganancia debe estar entre 0 y 500%'),
  comisionMP: z.number().min(0).max(100, 'La comisión MP debe estar entre 0 y 100%'),
  porcentajeCupon: z.number().min(0).max(100, 'El porcentaje de cupón debe estar entre 0 y 100%'),
  tipoComisionCL: z.enum(['porcentaje', 'fijo']),
  comisionCL: z.number().min(0, 'La comisión debe ser mayor o igual a 0'),
  porcentajeMarketplace: z.number().min(0).max(100, 'El porcentaje de marketplace debe estar entre 0 y 100%'),
  descuentoTransferencia: z.number().min(0).max(100, 'El descuento debe estar entre 0 y 100%'),
  tipoRedondeo: z.enum(['sin', 'diez', 'cincuenta', 'cien', 'psicologico']),
});

export function PriceCalculator() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [calculations, setCalculations] = useState<CalculatedPrices | null>(null);
  const [exportData, setExportData] = useState<any[]>([]);

  const form = useForm<CalculatorFormData>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      producto: '',
      sku: '',
      color: '',
      cantidadPorCaja: 1,
      tipoPrecioBase: 'unitarioFijo',
      precioBase: 0,
      fleteTotal: 0,
      costoEnvioUnitario: 0,
      absorboEnvio: false,
      modoProducto: 'propio',
      porcentajeGanancia: 0,
      comisionMP: 7.61,
      porcentajeCupon: 0,
      tipoComisionCL: 'porcentaje',
      comisionCL: 0,
      porcentajeMarketplace: 0,
      descuentoTransferencia: 10,
      tipoRedondeo: 'sin',
    },
  });

  const watchedValues = form.watch();

  // Recalcular en tiempo real cuando cambian los valores
  useEffect(() => {
    const validationError = validateCommissions(watchedValues);
    if (!validationError) {
      const newCalculations = calculatePrices(watchedValues);
      setCalculations(newCalculations);
    } else {
      setCalculations(null);
    }
  }, [watchedValues]);

  const handleCopyPrice = async (price: number, channel: string) => {
    const success = await copyToClipboard(formatForCopy(price));
    if (success) {
      toast({
        title: "Precio copiado",
        description: `Precio de ${channel} copiado al portapapeles`,
      });
    }
  };

  const handleAddToExport = () => {
    if (!calculations) return;

    const newData = prepareExportData(watchedValues, calculations);
    setExportData(prev => [...prev, newData]);
    
    toast({
      title: "Producto agregado",
      description: "Producto agregado a la lista de exportación",
    });
  };

  const handleExportCSV = () => {
    if (exportData.length === 0) {
      toast({
        title: "Error",
        description: "No hay productos para exportar",
        variant: "destructive"
      });
      return;
    }

    exportToCSV(exportData);
    toast({
      title: "Exportación completada",
      description: "Archivo CSV descargado exitosamente",
    });
  };

  const handleExportExcel = () => {
    if (exportData.length === 0) {
      toast({
        title: "Error",
        description: "No hay productos para exportar",
        variant: "destructive"
      });
      return;
    }

    exportToExcel(exportData);
    toast({
      title: "Exportación completada",
      description: "Archivo Excel descargado exitosamente",
    });
  };

  const commissionError = validateCommissions(watchedValues);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/50 p-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Calculadora de Precios Pro
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                {user?.email}
              </span>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Panel de Entrada */}
            <div className="xl:col-span-2">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
                <CardHeader>
                  <CardTitle className="text-2xl">Configuración del Producto</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <div className="space-y-6">
                      {/* Información Básica */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="producto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Producto</FormLabel>
                              <FormControl>
                                <Input placeholder="Nombre del producto (opcional)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU *</FormLabel>
                              <FormControl>
                                <Input placeholder="Código SKU" {...field} />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">Requerido para exportar</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color</FormLabel>
                              <FormControl>
                                <Input placeholder="Color (opcional)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Precio y Cantidad */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="cantidadPorCaja"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cantidad por Caja</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tipoPrecioBase"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Precio</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unitarioFijo">Unitario Fijo</SelectItem>
                                  <SelectItem value="porCaja">Por Caja/Lote</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="precioBase"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Precio Base</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="30300.00"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">Ej.: 30300.00 (usa punto para decimales)</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fleteTotal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Flete Total</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Configuración de Producto */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="modoProducto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modo de Producto</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="propio">Propio</SelectItem>
                                  <SelectItem value="tercero">De Tercero</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="absorboEnvio"
                          render={({ field }) => (
                            <FormItem className="flex flex-col justify-between">
                              <FormLabel>¿Absorbo envío?</FormLabel>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {field.value ? 'Sí' : 'No'}
                                </span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {watchedValues.absorboEnvio && (
                          <FormField
                            control={form.control}
                            name="costoEnvioUnitario"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Costo Envío Unitario</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Ganancia y Comisiones */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="porcentajeGanancia"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                % Ganancia
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help inline-flex">
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Ganancia neta deseada sobre el costo base
                                  </TooltipContent>
                                </Tooltip>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1"
                                  placeholder="10, 25, 100"
                                  className="bg-background text-foreground"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="comisionMP"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>% MP</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    className="pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="porcentajeCupon"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>% Cupón</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    className="pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tipoComisionCL"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comisión CL</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="porcentaje">Porcentaje</SelectItem>
                                  <SelectItem value="fijo">Precio Fijo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="comisionCL"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {watchedValues.tipoComisionCL === 'porcentaje' ? '% CL' : 'CL Fijo (ARS)'}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    className={watchedValues.tipoComisionCL === 'porcentaje' ? "pr-8" : ""}
                                  />
                                  {watchedValues.tipoComisionCL === 'porcentaje' && (
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="porcentajeMarketplace"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>% Marketplace</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    className="pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="descuentoTransferencia"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>% Desc. Transferencia</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    className="pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tipoRedondeo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Redondeo</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {roundingOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Error de comisiones */}
                      {commissionError && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive">{commissionError}</span>
                        </div>
                      )}
                    </div>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Panel de Resultados */}
            <div className="xl:col-span-1">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/20 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-2xl">Resultados</CardTitle>
                </CardHeader>
                <CardContent>
                  {calculations && !commissionError ? (
                    <div className="space-y-6">
                      {/* Costos */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Costos</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Costo unitario:</span>
                            <span className="font-mono">{formatCurrency(calculations.costoUnitario)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Flete unitario:</span>
                            <span className="font-mono">{formatCurrency(calculations.fleteUnitario)}</span>
                          </div>
                          {calculations.costoEnvioUnitario > 0 && (
                            <div className="flex justify-between">
                              <span>Envío absorbido:</span>
                              <span className="font-mono">{formatCurrency(calculations.costoEnvioUnitario)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Precios por Canal */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Precios por Canal</h3>
                        
                        {/* Web MP */}
                        <div className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Web MP</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCopyPrice(calculations.precioWebMP, 'Web MP')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(calculations.precioWebMP)}
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Ganancia neta:</span>
                              <span>{formatCurrency(calculations.gananciaNetaWebMP)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Margen final:</span>
                              <span>{formatPercentage(calculations.margenFinalWebMP)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Web Transferencia */}
                        <div className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Web Transferencia</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCopyPrice(calculations.precioWebTransferencia, 'Web Transferencia')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(calculations.precioWebTransferencia)}
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Ganancia neta:</span>
                              <span>{formatCurrency(calculations.gananciaNetaWebTransferencia)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Margen final:</span>
                              <span>{formatPercentage(calculations.margenFinalWebTransferencia)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Marketplace */}
                        {watchedValues.porcentajeMarketplace > 0 && (
                          <div className="p-3 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Marketplace</span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCopyPrice(calculations.precioMarketplace, 'Marketplace')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                              {formatCurrency(calculations.precioMarketplace)}
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span>Ganancia neta:</span>
                                <span>{formatCurrency(calculations.gananciaNetaMarketplace)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Margen final:</span>
                                <span>{formatPercentage(calculations.margenFinalMarketplace)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="space-y-2">
                        <Button 
                          onClick={handleAddToExport} 
                          className="w-full"
                          disabled={!watchedValues.sku}
                        >
                          Agregar a Exportación
                        </Button>
                        
                        {exportData.length > 0 && (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              onClick={handleExportCSV}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              CSV ({exportData.length})
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleExportExcel}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Excel ({exportData.length})
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      {commissionError ? (
                        <div className="space-y-2">
                          <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                          <p>Error en la configuración</p>
                          <p className="text-sm">{commissionError}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Calculator className="h-8 w-8 mx-auto" />
                          <p>Completa los datos para ver los cálculos</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}