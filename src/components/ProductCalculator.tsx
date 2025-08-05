import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calculator, Plus, Info, LogOut } from 'lucide-react';
import type { Product, ProductFormData } from '@/types/product';
import { ProductList } from './ProductList';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';

const productSchema = z.object({
  nombre: z.string().min(1, 'El nombre del producto es requerido'),
  sku: z.string().min(1, 'El SKU es requerido'),
  color: z.string().min(1, 'El color es requerido'),
  cantidadPorCaja: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  tipoPreçioBase: z.enum(['porCaja', 'unitarioFijo', 'unitarioMargen']),
  precioBase: z.number().min(0, 'El precio base debe ser mayor o igual a 0'),
  porcentajeGanancia: z.number().min(0, 'El porcentaje de ganancia debe ser mayor o igual a 0'),
  comisionMP: z.number().min(0).max(100, 'La comisión MP debe estar entre 0 y 100%'),
  porcentajeCupon: z.number().min(0).max(100, 'El porcentaje de cupón debe estar entre 0 y 100%'),
  tipoComisionCompraLinda: z.enum(['porcentaje', 'precioFijo']),
  comisionCompraLinda: z.number().min(0, 'La comisión debe ser mayor o igual a 0'),
  fleteTotal: z.number().min(0, 'El flete total debe ser mayor o igual a 0'),
});

export function ProductCalculator() {
  const { user, signOut } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProducts();
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nombre: '',
      sku: '',
      color: '',
      cantidadPorCaja: 1,
      tipoPreçioBase: 'porCaja',
      precioBase: 0,
      porcentajeGanancia: 0,
      comisionMP: 0,
      porcentajeCupon: 0,
      tipoComisionCompraLinda: 'porcentaje',
      comisionCompraLinda: 0,
      fleteTotal: 0,
    },
  });

  const calculateProduct = (data: ProductFormData): Product => {
    const id = Date.now().toString();
    
    // Calcular costo unitario según el tipo de precio base
    let costoUnitario = 0;
    
    switch (data.tipoPreçioBase) {
      case 'porCaja':
        costoUnitario = data.precioBase / data.cantidadPorCaja;
        break;
      case 'unitarioFijo':
        costoUnitario = data.precioBase;
        break;
      case 'unitarioMargen':
        costoUnitario = data.precioBase * (1 + data.porcentajeGanancia / 100);
        break;
    }

    // Agregar flete unitario
    const fleteUnitario = data.fleteTotal / data.cantidadPorCaja;
    costoUnitario += fleteUnitario;

    // Calcular precio de venta con márgenes
    let precioVenta = costoUnitario;
    
    // Aplicar ganancia si no es unitarioMargen
    if (data.tipoPreçioBase !== 'unitarioMargen') {
      precioVenta *= (1 + data.porcentajeGanancia / 100);
    }

    // Aplicar comisiones y descuentos
    const comisionMPDecimal = data.comisionMP / 100;
    const cuponDecimal = data.porcentajeCupon / 100;
    
    // Comisión Compra Linda
    let comisionCL = 0;
    if (data.tipoComisionCompraLinda === 'porcentaje') {
      comisionCL = precioVenta * (data.comisionCompraLinda / 100);
    } else {
      comisionCL = data.comisionCompraLinda;
    }

    // Precio final considerando todas las comisiones
    const precioFinal = (precioVenta + comisionCL) / (1 - comisionMPDecimal - cuponDecimal);
    
    const gananciaNeta = precioFinal - costoUnitario - (precioFinal * comisionMPDecimal) - (precioFinal * cuponDecimal) - comisionCL;
    const margenFinal = (gananciaNeta / precioFinal) * 100;

    return {
      ...data,
      id,
      costoUnitario,
      precioVenta: precioFinal,
      gananciaNeta,
      margenFinal,
    };
  };

  const onSubmit = async (data: ProductFormData) => {
    await addProduct(data);
    form.reset();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/50 p-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Calculator className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Calculadora de Productos
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Calcula precios, márgenes y ganancias de tus productos de forma precisa y profesional
            </p>
          </div>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-6 w-6 text-primary" />
                Agregar Nuevo Producto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Información básica del producto */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Producto</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del producto" {...field} className="transition-all duration-300 focus:shadow-md" />
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
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="Código SKU" {...field} className="transition-all duration-300 focus:shadow-md" />
                          </FormControl>
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
                            <Input placeholder="Color del producto" {...field} className="transition-all duration-300 focus:shadow-md" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Cantidad y precio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField
                      control={form.control}
                      name="cantidadPorCaja"
                      render={({ field }) => (
                        <FormItem>
                           <FormLabel className="flex items-center gap-2">
                             Cantidad por Caja
                             <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help inline-flex">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Cuántas unidades individuales vienen en esta caja/lote
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="transition-all duration-300 focus:shadow-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipoPreçioBase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            💰 Precio Base *
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help inline-flex">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Precio que pagas por toda la caja o lote completo
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="transition-all duration-300 focus:shadow-md">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="porCaja">Por Caja/Lote</SelectItem>
                              <SelectItem value="unitarioFijo">Unitario Fijo</SelectItem>
                              <SelectItem value="unitarioMargen">Unitario + Margen</SelectItem>
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
                              placeholder="Precio base"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="transition-all duration-300 focus:shadow-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                                Margen de ganancia sobre el costo unitario
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="Ingresá un porcentaje"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="transition-all duration-300 focus:shadow-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Comisiones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField
                      control={form.control}
                      name="comisionMP"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            % Comisión MP
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help inline-flex">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Comisión de la plataforma Mercado Pago
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="Ingresá la comisión de MP"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="transition-all duration-300 focus:shadow-md"
                            />
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
                          <FormLabel className="flex items-center gap-2">
                            % Cupón
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help inline-flex">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Descuento promedio por cupones/promociones
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="Ingresá el porcentaje del cupón de descuento"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="transition-all duration-300 focus:shadow-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipoComisionCompraLinda"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            🏪 Comisión Compra Linda
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help inline-flex">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Comisión adicional por ventas dropshipping
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="transition-all duration-300 focus:shadow-md">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="porcentaje">Porcentaje</SelectItem>
                              <SelectItem value="precioFijo">Precio Fijo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="comisionCompraLinda"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Comisión</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Ingresá el valor"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="transition-all duration-300 focus:shadow-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Flete */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <FormField
                      control={form.control}
                      name="fleteTotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Flete Total
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help inline-flex">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Se divide entre las unidades de cada caja individual
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Ingresá un monto"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="transition-all duration-300 focus:shadow-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-6">
                    <Button 
                      type="submit" 
                      size="lg"
                      className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <Calculator className="h-5 w-5 mr-2" />
                      Calcular y agregar producto
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Mis Productos</h2>
            <Button
              onClick={signOut}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : products.length > 0 ? (
            <ProductList 
              products={products} 
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              onAddProduct={addProduct}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay productos guardados aún.</p>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}