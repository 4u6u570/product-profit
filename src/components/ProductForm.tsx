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
import { Calculator, Eye, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { ProductFormData, ProductCalculationResult, Product } from '@/types/product';
import { calculateProduct, validateProductData } from '@/utils/productCalculations';
import { formatCurrency, formatNumber } from '@/utils/formatting';
import { useProducts } from '@/contexts/ProductsContext';

const formSchema = z.object({
  sku: z.string().optional(),
  nombre: z.string().optional(),
  color: z.string().optional(),
  cantidadPorCaja: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  tipoPrecio: z.enum(['unitario', 'caja']),
  precioBase: z.number().min(0, 'El precio base debe ser mayor o igual a 0'),
  fleteTotal: z.number().min(0, 'El flete total debe ser mayor o igual a 0'),
  costoEnvioUnitario: z.number().min(0, 'El costo de envío debe ser mayor o igual a 0').optional(),
  absorboEnvio: z.boolean(),
  modoProducto: z.enum(['propio', 'tercero']),
  pctGanancia: z.number().min(0).max(500, 'El porcentaje de ganancia debe estar entre 0 y 500%'),
  pctMP: z.number().min(0).max(100, 'La comisión MP debe estar entre 0 y 100%'),
  pctCupon: z.number().min(0).max(100, 'El porcentaje de cupón debe estar entre 0 y 100%'),
  clTipo: z.enum(['porcentaje', 'fijo']),
  pctCL: z.number().min(0).max(100, 'El porcentaje de CL debe estar entre 0 y 100%').optional(),
  clFijo: z.number().min(0, 'La comisión fija debe ser mayor o igual a 0').optional(),
  pctMarketplace: z.number().min(0).max(100, 'El porcentaje de marketplace debe estar entre 0 y 100%').optional(),
  pctDescTransfer: z.number().min(0).max(100, 'El descuento debe estar entre 0 y 100%'),
  reglaRedondeo: z.enum(['none', '10', '50', '100', 'psico']),
});

export function ProductForm() {
  const { toast } = useToast();
  const { addProduct } = useProducts();
  const [preview, setPreview] = useState<ProductCalculationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: '',
      nombre: '',
      color: '',
      cantidadPorCaja: 1,
      tipoPrecio: 'unitario',
      precioBase: 0,
      fleteTotal: 0,
      costoEnvioUnitario: 0,
      absorboEnvio: false,
      modoProducto: 'propio',
      pctGanancia: 0,
      pctMP: 7.61,
      pctCupon: 0,
      clTipo: 'porcentaje',
      pctCL: 0,
      clFijo: 0,
      pctMarketplace: 0,
      pctDescTransfer: 10,
      reglaRedondeo: 'none',
    },
  });

  const watchedValues = form.watch();

  // Calcular vista previa en tiempo real
  useEffect(() => {
    const error = validateProductData(watchedValues);
    setValidationError(error);
    
    if (!error) {
      const calculation = calculateProduct(watchedValues);
      setPreview(calculation);
    } else {
      setPreview(null);
    }
  }, [watchedValues]);

  const handlePreview = () => {
    if (!preview) return;
    
    toast({
      title: "Vista previa calculada",
      description: `Precio Web MP: ${formatCurrency(preview.webMP.precio)}`,
    });
  };

  const handleAddToList = () => {
    if (!preview) return;

    const newProduct: Product = {
      id: crypto.randomUUID(),
      ...watchedValues,
      ...preview,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selected: false,
      pinned: false,
    };

    addProduct(newProduct);
    
    toast({
      title: "Producto agregado",
      description: "Producto agregado a la lista exitosamente",
    });
  };

  return (
    <Card className="h-fit shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Crear Producto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información Básica */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="nombre">Producto</Label>
            <Input
              id="nombre"
              placeholder="Nombre del producto (opcional)"
              {...form.register('nombre')}
            />
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              placeholder="Código SKU"
              {...form.register('sku')}
            />
            <p className="text-xs text-muted-foreground mt-1">Requerido para exportar</p>
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              placeholder="Color (opcional)"
              {...form.register('color')}
            />
          </div>
        </div>

        {/* Precio y Cantidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="cantidadPorCaja">Cantidad por Caja</Label>
            <Input
              id="cantidadPorCaja"
              type="number"
              min="1"
              {...form.register('cantidadPorCaja', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="tipoPrecio">Tipo de Precio</Label>
            <Select onValueChange={(value) => form.setValue('tipoPrecio', value as 'unitario' | 'caja')} defaultValue="unitario">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unitario">Unitario Fijo</SelectItem>
                <SelectItem value="caja">Por Caja/Lote</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="precioBase">Precio Base</Label>
            <Input
              id="precioBase"
              type="number"
              step="0.01"
              placeholder="30300.00"
              {...form.register('precioBase', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground mt-1">Ej.: 30300.00 (usa punto para decimales)</p>
          </div>
          <div>
            <Label htmlFor="fleteTotal">Flete Total</Label>
            <Input
              id="fleteTotal"
              type="number"
              step="0.01"
              {...form.register('fleteTotal', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Configuración de Producto */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="modoProducto">Modo de Producto</Label>
            <Select onValueChange={(value) => form.setValue('modoProducto', value as 'propio' | 'tercero')} defaultValue="propio">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="propio">Propio</SelectItem>
                <SelectItem value="tercero">De Tercero</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col justify-between">
            <Label>¿Absorbo envío?</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={watchedValues.absorboEnvio}
                onCheckedChange={(checked) => form.setValue('absorboEnvio', checked)}
              />
              <span className="text-sm text-muted-foreground">
                {watchedValues.absorboEnvio ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
          {watchedValues.absorboEnvio && (
            <div>
              <Label htmlFor="costoEnvioUnitario">Costo Envío Unitario</Label>
              <Input
                id="costoEnvioUnitario"
                type="number"
                step="0.01"
                {...form.register('costoEnvioUnitario', { valueAsNumber: true })}
              />
            </div>
          )}
        </div>

        {/* Ganancia y Comisiones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="pctGanancia">% Ganancia</Label>
            <Input
              id="pctGanancia"
              type="number"
              step="0.1"
              placeholder="10, 25, 100"
              className="bg-background text-foreground"
              {...form.register('pctGanancia', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="pctMP">% MP</Label>
            <Input
              id="pctMP"
              type="number"
              step="0.01"
              {...form.register('pctMP', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="pctCupon">% Cupón</Label>
            <Input
              id="pctCupon"
              type="number"
              step="0.01"
              {...form.register('pctCupon', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="clTipo">Comisión CL</Label>
            <Select onValueChange={(value) => form.setValue('clTipo', value as 'porcentaje' | 'fijo')} defaultValue="porcentaje">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="porcentaje">Porcentaje</SelectItem>
                <SelectItem value="fijo">Fijo (ARS)</SelectItem>
              </SelectContent>
            </Select>
            {watchedValues.clTipo === 'porcentaje' ? (
              <Input
                type="number"
                step="0.01"
                placeholder="% CL"
                className="mt-2"
                {...form.register('pctCL', { valueAsNumber: true })}
              />
            ) : (
              <Input
                type="number"
                step="0.01"
                placeholder="Monto fijo"
                className="mt-2"
                {...form.register('clFijo', { valueAsNumber: true })}
              />
            )}
          </div>
        </div>

        {/* Configuración Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="pctMarketplace">% Marketplace</Label>
            <Input
              id="pctMarketplace"
              type="number"
              step="0.01"
              placeholder="0 = No usar"
              {...form.register('pctMarketplace', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="pctDescTransfer">% Desc. Transferencia</Label>
            <Input
              id="pctDescTransfer"
              type="number"
              step="0.01"
              {...form.register('pctDescTransfer', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="reglaRedondeo">Redondeo</Label>
            <Select onValueChange={(value) => form.setValue('reglaRedondeo', value as any)} defaultValue="none">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin redondeo</SelectItem>
                <SelectItem value="10">A $10</SelectItem>
                <SelectItem value="50">A $50</SelectItem>
                <SelectItem value="100">A $100</SelectItem>
                <SelectItem value="psico">Psicológico (,90/,99)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Errores de validación */}
        {validationError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{validationError}</p>
          </div>
        )}

        {/* Vista Previa de Resultados */}
        {preview && !validationError && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm">Vista Previa</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Costo Unitario</p>
                <p className="font-semibold">{formatCurrency(preview.costos.costoUnitario)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Web MP</p>
                <p className="font-semibold">{formatCurrency(preview.webMP.precio)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Web Transfer</p>
                <p className="font-semibold">{formatCurrency(preview.webTransfer.precio)}</p>
              </div>
              {preview.marketplace && (
                <div>
                  <p className="text-muted-foreground">Marketplace</p>
                  <p className="font-semibold">{formatCurrency(preview.marketplace.precio)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handlePreview}
            disabled={!preview || !!validationError}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button 
            onClick={handleAddToList}
            disabled={!preview || !!validationError}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar a Lista
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}