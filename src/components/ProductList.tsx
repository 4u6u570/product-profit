import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Copy, 
  Trash2, 
  Pin, 
  PinOff, 
  Download, 
  Check, 
  X,
  Edit3,
  MoreHorizontal,
  FileDown,
  Search,
  ChevronDown,
  Loader2,
  Calculator,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

import { Product } from '@/types/product';
import { useProductStore } from '@/hooks/useProductStore';
import { formatCurrency, formatForCopy } from '@/utils/formatting';
import { exportToCSV, exportToExcel, prepareExportData } from '@/utils/export';
import { exportCompactCSV, exportCompactXLSX, prepareCompactExportData } from '@/utils/exporters';
import { useGroup } from '@/hooks/useGroup';

interface InlineEditState {
  productId: string;
  field: string;
  value: string;
}

interface ProductListProps {
  onEditProduct?: (product: Product) => void;
}

export function ProductList({ onEditProduct }: ProductListProps = {}) {
  const { groupId } = useGroup();
  const { 
    products, 
    updateProduct, 
    deleteProduct, 
    togglePin, 
    toggleSelect, 
    selectAll, 
    deselectAll, 
    getSelectedProducts,
    loadProducts 
  } = useProductStore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para lazy loading
  const [displayCount, setDisplayCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const ITEMS_PER_LOAD = 10;

  useEffect(() => {
    if (groupId) {
      loadProducts(groupId);
    }
  }, [groupId, loadProducts]);

  const handleCopyPrice = async (price: number) => {
    try {
      await navigator.clipboard.writeText(formatForCopy(price));
      toast({
        title: 'Precio copiado',
        description: `${formatForCopy(price)} copiado al portapapeles`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el precio',
        variant: 'destructive'
      });
    }
  };

  const startInlineEdit = (productId: string, field: string, currentValue: number | string) => {
    setInlineEdit({
      productId,
      field,
      value: currentValue.toString()
    });
  };

  const confirmInlineEdit = async () => {
    if (!inlineEdit) return;

    let finalValue: number | string = inlineEdit.value;
    
    // Para campos de texto, mantener como string
    if (inlineEdit.field === 'nombre') {
      finalValue = inlineEdit.value;
    } else {
      // Para campos numéricos
      const numericValue = parseFloat(inlineEdit.value);
      if (isNaN(numericValue)) {
        toast({
          title: 'Error',
          description: 'Valor inválido',
          variant: 'destructive'
        });
        return;
      }
      finalValue = numericValue;
    }

    try {
      await updateProduct(inlineEdit.productId, {
        [inlineEdit.field]: finalValue
      });
      
      toast({
        title: 'Producto actualizado',
        description: 'Los cambios se han guardado correctamente'
      });
      
      setInlineEdit(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el producto',
        variant: 'destructive'
      });
    }
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      toast({
        title: 'Producto eliminado',
        description: 'El producto se ha eliminado correctamente'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el producto',
        variant: 'destructive'
      });
    }
  };

  const handleExport = (type: 'csv' | 'excel', selected: boolean = false) => {
    const dataToExport = selected ? getSelectedProducts() : products;
    
    if (dataToExport.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay productos para exportar',
        variant: 'destructive'
      });
      return;
    }

    const exportData = prepareCompactExportData(dataToExport);
    const filename = `productos-${new Date().toISOString().split('T')[0]}`;

    if (type === 'csv') {
      exportCompactCSV(exportData, filename);
    } else {
      exportCompactXLSX(exportData, filename);
    }

    toast({
      title: 'Exportación completada',
      description: `Se han exportado ${dataToExport.length} productos`
    });
  };

  // Filtrado de productos por término de búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(product => 
      (product.nombre || '').toLowerCase().includes(term) ||
      (product.sku || '').toLowerCase().includes(term) ||
      (product.color || '').toLowerCase().includes(term) ||
      (product.webMP?.precio?.toString() || '').includes(term) ||
      (product.webTransfer?.precio?.toString() || '').includes(term)
    );
  }, [products, searchTerm]);

  // Productos a mostrar con lazy loading (no aplicar límite cuando hay búsqueda)
  const displayedProducts = useMemo(() => {
    // Si hay término de búsqueda, mostrar todos los resultados filtrados
    if (searchTerm.trim()) {
      return filteredProducts;
    }
    // Si no hay búsqueda, aplicar lazy loading
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount, searchTerm]);

  const hasMoreProducts = filteredProducts.length > displayCount && !searchTerm.trim();

  // Función para cargar más productos
  const loadMoreProducts = useCallback(() => {
    setIsLoadingMore(true);
    
    // Simular un delay para mostrar el loading
    setTimeout(() => {
      setDisplayCount(prev => prev + ITEMS_PER_LOAD);
      setIsLoadingMore(false);
    }, 300);
  }, [ITEMS_PER_LOAD]);

  // Resetear displayCount cuando cambie el término de búsqueda
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD);
  }, [searchTerm, ITEMS_PER_LOAD]);

  const selectedCount = getSelectedProducts().length;

  return (
    <Card className="h-fit shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="pb-4 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl md:text-2xl">Lista de Productos ({filteredProducts.length})</CardTitle>
            {displayedProducts.length !== filteredProducts.length && (
              <p className="text-sm text-muted-foreground mt-1">
                Mostrando {displayedProducts.length} de {filteredProducts.length} productos
              </p>
            )}
          </div>
          
          {products.length > 0 && (
            <div className="flex flex-col md:flex-row gap-2">
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                onClick={selectedCount > 0 ? deselectAll : selectAll}
                className="w-full md:w-auto"
              >
                {selectedCount > 0 ? 'Deseleccionar' : 'Seleccionar'} todo
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size={isMobile ? "default" : "sm"} className="w-full md:w-auto">
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv', false)}>
                    CSV - Todos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel', false)}>
                    Excel - Todos
                  </DropdownMenuItem>
                  {selectedCount > 0 && (
                    <>
                      <DropdownMenuItem onClick={() => handleExport('csv', true)}>
                        CSV - Seleccionados ({selectedCount})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('excel', true)}>
                        Excel - Seleccionados ({selectedCount})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Buscador */}
        {products.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, SKU, color o precio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${searchTerm ? 'pr-10' : 'pr-3'} ${isMobile ? 'h-12 text-base' : 'h-10 text-sm'}`}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-full"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className={`space-y-4 ${isMobile ? 'max-h-none' : 'max-h-[800px] overflow-y-auto'}`}>
        {filteredProducts.length === 0 ? (
          searchTerm ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No se encontraron productos que coincidan con "{searchTerm}"</p>
              <Button 
                variant="outline" 
                size={isMobile ? "default" : "sm"} 
                onClick={() => setSearchTerm('')}
                className="mt-2"
              >
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay productos en la lista</p>
            <p className="text-sm">Agrega productos desde el formulario de {isMobile ? 'arriba' : 'la izquierda'}</p>
          </div>
          )
        ) : (
          <>
            <div className="grid gap-3">
              {displayedProducts.map((product) => (
              <Card key={product.id} className={`shadow-sm border transition-all ${product.pinned ? 'border-primary bg-primary/5' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={product.selected || false}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                      <div>
                        {/* Nombre editable */}
                        {inlineEdit?.productId === product.id && inlineEdit?.field === 'nombre' ? (
                          <div className="flex items-center gap-1 mb-1">
                            <Input
                              type="text"
                              value={inlineEdit.value}
                              onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                              className="h-6 text-sm font-semibold"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={confirmInlineEdit} className="h-6 w-6 p-0">
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelInlineEdit} className="h-6 w-6 p-0">
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mb-1">
                            <h4 
                              className="font-semibold hover:text-primary cursor-pointer"
                              onClick={() => startInlineEdit(product.id, 'nombre', product.nombre || '')}
                            >
                              {product.nombre || 'Sin nombre'}
                            </h4>
                            <Edit3 className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        {product.sku && <Badge variant="outline" className="text-xs">{product.sku}</Badge>}
                        {product.color && <Badge variant="secondary" className="text-xs ml-1">{product.color}</Badge>}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onEditProduct?.(product)}>
                          <Calculator className="h-4 w-4 mr-2" />
                          Editar en Calculadora
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePin(product.id)}>
                          {product.pinned ? (
                            <>
                              <PinOff className="h-4 w-4 mr-2" />
                              Desanclar
                            </>
                          ) : (
                            <>
                              <Pin className="h-4 w-4 mr-2" />
                              Anclar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(product.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Precio Base de Referencia */}
                  <div className="mb-3 p-2 bg-muted/30 rounded-md">
                    <p className="text-muted-foreground text-xs mb-1">Precio Base de Referencia</p>
                    <button
                      onClick={() => handleCopyPrice(product.precioBase)}
                      className="text-sm font-medium hover:text-primary cursor-pointer flex items-center gap-1"
                    >
                      {formatCurrency(product.precioBase)}
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Precios principales */}
                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'} text-sm mb-4`}>
                    <div className={isMobile ? 'p-3 bg-background/50 rounded-md' : ''}>
                      <p className="text-muted-foreground text-xs">Web MP</p>
                      <button
                        onClick={() => product.webMP?.precio && handleCopyPrice(product.webMP.precio)}
                        className={`font-semibold hover:text-primary cursor-pointer flex items-center gap-1 ${isMobile ? 'text-base' : 'text-sm'}`}
                      >
                        {product.webMP?.precio ? formatCurrency(product.webMP.precio) : 'N/A'}
                        <Copy className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                      </button>
                    </div>
                    <div className={isMobile ? 'p-3 bg-background/50 rounded-md' : ''}>
                      <p className="text-muted-foreground text-xs">Web Transfer</p>
                      <button
                        onClick={() => product.webTransfer?.precio && handleCopyPrice(product.webTransfer.precio)}
                        className={`font-semibold hover:text-primary cursor-pointer flex items-center gap-1 ${isMobile ? 'text-base' : 'text-sm'}`}
                      >
                        {product.webTransfer?.precio ? formatCurrency(product.webTransfer.precio) : 'N/A'}
                        <Copy className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                      </button>
                    </div>
                    <div className={isMobile ? 'p-3 bg-[hsl(var(--emerald-final))]/10 rounded-md border border-[hsl(var(--emerald-final))]/20' : ''}>
                      <p className="text-[hsl(var(--emerald-final))] text-xs">Web Final</p>
                      <button
                        onClick={() => product.webCupon?.precio && handleCopyPrice(product.webCupon.precio)}
                        className={`font-semibold text-[hsl(var(--emerald-final))] hover:opacity-80 cursor-pointer flex items-center gap-1 ${isMobile ? 'text-base' : 'text-sm'}`}
                      >
                        {product.webCupon?.precio ? formatCurrency(product.webCupon.precio) : 'N/A'}
                        <Copy className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                      </button>
                    </div>
                    {product.marketplace?.precio && (
                      <div className={`${isMobile ? 'p-3 bg-background/50 rounded-md' : 'col-span-3'}`}>
                        <p className="text-muted-foreground text-xs">Marketplace</p>
                        <button
                          onClick={() => handleCopyPrice(product.marketplace!.precio)}
                          className={`font-semibold hover:text-primary cursor-pointer flex items-center gap-1 ${isMobile ? 'text-base' : 'text-sm'}`}
                        >
                          {formatCurrency(product.marketplace.precio)}
                          <Copy className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Campos editables inline */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {/* % Ganancia */}
                    <div className="flex items-center gap-2">
                      <span>% Ganancia:</span>
                      {inlineEdit?.productId === product.id && inlineEdit?.field === 'pctGanancia' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            className="h-6 w-16 text-xs"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={confirmInlineEdit} className="h-6 w-6 p-0">
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit} className="h-6 w-6 p-0">
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startInlineEdit(product.id, 'pctGanancia', product.pctGanancia)}
                          className="hover:text-primary"
                        >
                          {product.pctGanancia.toFixed(1)}%
                        </button>
                      )}
                    </div>

                    {/* % MP */}
                    <div className="flex items-center gap-2">
                      <span>% MP:</span>
                      {inlineEdit?.productId === product.id && inlineEdit?.field === 'pctMP' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            className="h-6 w-16 text-xs"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={confirmInlineEdit} className="h-6 w-6 p-0">
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit} className="h-6 w-6 p-0">
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startInlineEdit(product.id, 'pctMP', product.pctMP)}
                          className="hover:text-primary"
                        >
                          {product.pctMP.toFixed(2)}%
                        </button>
                      )}
                    </div>

                    {/* % Cupón */}
                    <div className="flex items-center gap-2">
                      <span>% Cupón:</span>
                      {inlineEdit?.productId === product.id && inlineEdit?.field === 'pctCupon' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            className="h-6 w-16 text-xs"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={confirmInlineEdit} className="h-6 w-6 p-0">
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit} className="h-6 w-6 p-0">
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startInlineEdit(product.id, 'pctCupon', product.pctCupon)}
                          className="hover:text-primary"
                        >
                          {product.pctCupon.toFixed(1)}%
                        </button>
                      )}
                    </div>

                    {/* Comisión CL */}
                    <div className="flex items-center gap-2">
                      <span>Comisión CL:</span>
                      {product.clTipo === 'fijo' ? (
                        inlineEdit?.productId === product.id && inlineEdit?.field === 'clFijo' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={inlineEdit.value}
                              onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                              className="h-6 w-16 text-xs"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={confirmInlineEdit} className="h-6 w-6 p-0">
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelInlineEdit} className="h-6 w-6 p-0">
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startInlineEdit(product.id, 'clFijo', product.clFijo || 0)}
                            className="hover:text-primary"
                          >
                            ${(product.clFijo || 0).toFixed(0)}
                          </button>
                        )
                      ) : (
                        inlineEdit?.productId === product.id && inlineEdit?.field === 'pctCL' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={inlineEdit.value}
                              onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                              className="h-6 w-16 text-xs"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={confirmInlineEdit} className="h-6 w-6 p-0">
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelInlineEdit} className="h-6 w-6 p-0">
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startInlineEdit(product.id, 'pctCL', product.pctCL || 0)}
                            className="hover:text-primary"
                          >
                            {(product.pctCL || 0).toFixed(1)}%
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMoreProducts && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMoreProducts}
                  disabled={isLoadingMore}
                  className={`${isMobile ? 'w-full h-12 text-base' : 'w-auto h-10 text-sm'} transition-all`}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2 animate-spin`} />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <ChevronDown className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
                      Cargar más productos ({filteredProducts.length - displayCount} restantes)
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Loading skeletons para productos adicionales */}
            {isLoadingMore && (
              <div className="grid gap-3 pt-2">
                {Array.from({ length: Math.min(ITEMS_PER_LOAD, filteredProducts.length - displayCount) }).map((_, index) => (
                  <Card key={`skeleton-${index}`} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-16 w-full" />
                        <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-4'}`}>
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}