import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Percent 
} from 'lucide-react';
import type { Product } from '@/types/product';

interface ProductListProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

interface EditingState {
  id: string;
  field: string;
  value: string;
  originalValue: string;
}

export function ProductList({ products, onUpdateProducts }: ProductListProps) {
  const [editingState, setEditingState] = useState<EditingState | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleEdit = (productId: string, field: string, currentValue: string) => {
    setEditingState({
      id: productId,
      field,
      value: currentValue,
      originalValue: currentValue,
    });
  };

  const handleSaveEdit = () => {
    if (!editingState) return;

    const updatedProducts = products.map(product => {
      if (product.id === editingState.id) {
        const updatedProduct = { ...product };
        const numericValue = parseFloat(editingState.value);
        
        switch (editingState.field) {
          case 'nombre':
          case 'sku':
          case 'color':
            (updatedProduct as any)[editingState.field] = editingState.value;
            break;
          case 'cantidadPorCaja':
          case 'precioBase':
          case 'porcentajeGanancia':
          case 'comisionMP':
          case 'porcentajeCupon':
          case 'comisionCompraLinda':
          case 'fleteTotal':
            if (!isNaN(numericValue)) {
              (updatedProduct as any)[editingState.field] = numericValue;
              // Recalcular valores
              return recalculateProduct(updatedProduct);
            }
            break;
        }
        return updatedProduct;
      }
      return product;
    });

    onUpdateProducts(updatedProducts);
    setEditingState(null);
  };

  const handleCancelEdit = () => {
    setEditingState(null);
  };

  const recalculateProduct = (product: Product): Product => {
    // Recalcular usando la misma lógica del calculador
    let costoUnitario = 0;
    
    switch (product.tipoPreçioBase) {
      case 'porCaja':
        costoUnitario = product.precioBase / product.cantidadPorCaja;
        break;
      case 'unitarioFijo':
        costoUnitario = product.precioBase;
        break;
      case 'unitarioMargen':
        costoUnitario = product.precioBase * (1 + product.porcentajeGanancia / 100);
        break;
    }

    const fleteUnitario = product.fleteTotal / product.cantidadPorCaja;
    costoUnitario += fleteUnitario;

    let precioVenta = costoUnitario;
    
    if (product.tipoPreçioBase !== 'unitarioMargen') {
      precioVenta *= (1 + product.porcentajeGanancia / 100);
    }

    const comisionMPDecimal = product.comisionMP / 100;
    const cuponDecimal = product.porcentajeCupon / 100;
    
    let comisionCL = 0;
    if (product.tipoComisionCompraLinda === 'porcentaje') {
      comisionCL = precioVenta * (product.comisionCompraLinda / 100);
    } else {
      comisionCL = product.comisionCompraLinda;
    }

    const precioFinal = (precioVenta + comisionCL) / (1 - comisionMPDecimal - cuponDecimal);
    const gananciaNeta = precioFinal - costoUnitario - (precioFinal * comisionMPDecimal) - (precioFinal * cuponDecimal) - comisionCL;
    const margenFinal = (gananciaNeta / precioFinal) * 100;

    return {
      ...product,
      costoUnitario,
      precioVenta: precioFinal,
      gananciaNeta,
      margenFinal,
    };
  };

  const handleDelete = (productId: string) => {
    const updatedProducts = products.filter(product => product.id !== productId);
    onUpdateProducts(updatedProducts);
  };

  const handleDuplicate = (product: Product) => {
    const duplicatedProduct = {
      ...product,
      id: Date.now().toString(),
      nombre: `${product.nombre} (Copia)`,
    };
    onUpdateProducts([...products, duplicatedProduct]);
  };

  const renderEditableField = (product: Product, field: string, value: string | number, type: 'text' | 'number' = 'text') => {
    const isEditing = editingState?.id === product.id && editingState?.field === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={editingState.value}
            onChange={(e) => setEditingState(prev => prev ? { ...prev, value: e.target.value } : null)}
            className="h-8 w-full"
            autoFocus
          />
          <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0 text-success hover:bg-success/10">
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors" 
        onClick={() => handleEdit(product.id, field, value.toString())}
      >
        {value}
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Package className="h-6 w-6 text-primary" />
          Lista de Productos ({products.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id} className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Información básica del producto */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg text-foreground">
                        {renderEditableField(product, 'nombre', product.nombre)}
                      </h3>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicate(product)}
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicar producto</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(product.id)}
                              className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar producto</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="font-medium">{renderEditableField(product, 'sku', product.sku)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Color:</span>
                        <span className="font-medium">{renderEditableField(product, 'color', product.color)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cantidad por caja:</span>
                        <span className="font-medium">{renderEditableField(product, 'cantidadPorCaja', product.cantidadPorCaja, 'number')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Precios y costos */}
                  <div className="lg:col-span-4 space-y-3">
                    <h4 className="font-semibold text-md flex items-center gap-2 text-foreground">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Precios y Costos
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio base:</span>
                        <span className="font-medium">{renderEditableField(product, 'precioBase', formatCurrency(product.precioBase))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <Badge variant="secondary" className="text-xs">
                          {product.tipoPreçioBase === 'porCaja' ? 'Por Caja' : 
                           product.tipoPreçioBase === 'unitarioFijo' ? 'Unitario Fijo' : 
                           'Unitario + Margen'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Costo unitario:</span>
                        <span className="font-medium text-warning">{formatCurrency(product.costoUnitario || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flete total:</span>
                        <span className="font-medium">{renderEditableField(product, 'fleteTotal', formatCurrency(product.fleteTotal))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resultados calculados */}
                  <div className="lg:col-span-4 space-y-3">
                    <h4 className="font-semibold text-md flex items-center gap-2 text-foreground">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Resultados
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio de venta:</span>
                        <span className="font-bold text-primary text-base">{formatCurrency(product.precioVenta || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ganancia neta:</span>
                        <span className={`font-semibold ${(product.gananciaNeta || 0) > 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(product.gananciaNeta || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Margen final:</span>
                        <Badge 
                          variant={(product.margenFinal || 0) > 20 ? 'default' : (product.margenFinal || 0) > 10 ? 'secondary' : 'destructive'}
                          className="font-semibold"
                        >
                          <Percent className="h-3 w-3 mr-1" />
                          {formatPercentage(product.margenFinal || 0)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuración de comisiones */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">% Ganancia:</span>
                      <span className="font-medium">{renderEditableField(product, 'porcentajeGanancia', `${product.porcentajeGanancia}%`)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">% MP:</span>
                      <span className="font-medium">{renderEditableField(product, 'comisionMP', `${product.comisionMP}%`)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">% Cupón:</span>
                      <span className="font-medium">{renderEditableField(product, 'porcentajeCupon', `${product.porcentajeCupon}%`)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisión CL:</span>
                      <span className="font-medium">
                        {product.tipoComisionCompraLinda === 'porcentaje' 
                          ? renderEditableField(product, 'comisionCompraLinda', `${product.comisionCompraLinda}%`)
                          : renderEditableField(product, 'comisionCompraLinda', formatCurrency(product.comisionCompraLinda))
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}