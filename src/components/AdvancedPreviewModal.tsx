import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Download, TrendingUp, TrendingDown, FileText, CheckCircle2 } from 'lucide-react';
import { ProductFormData, ProductCalculationResult } from '@/types/product';
import { calculateProduct } from '@/utils/productCalculations';
import { formatCurrency } from '@/utils/formatting';
import { useProductStore } from '@/hooks/useProductStore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CURRENT_VERSION = 'v2.2';

const CHANGELOG = [
  { version: 'v2.2', changes: 'Control de envío editable y monto absorbido configurable' },
  { version: 'v2.1', changes: 'Prorrateo de flete proporcional al costo' },
  { version: 'v2.0', changes: 'Aplicación secuencial y multiplicativa de factores' }
];

interface AdvancedPreviewModalProps {
  open: boolean;
  onClose: () => void;
  currentFormData: ProductFormData;
  currentPreview: ProductCalculationResult | null;
  productVersion?: string;
}

export function AdvancedPreviewModal({
  open,
  onClose,
  currentFormData,
  currentPreview,
  productVersion = 'v2.0'
}: AdvancedPreviewModalProps) {
  const { products, updateProduct } = useProductStore();
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const needsUpdate = productVersion !== CURRENT_VERSION;

  // Recalcular con la versión actual
  const recalculatedPreview = useMemo(() => {
    return calculateProduct(currentFormData);
  }, [currentFormData]);

  // Calcular diferencias
  const differences = useMemo(() => {
    if (!currentPreview) return null;

    return {
      costoUnitario: {
        old: currentPreview.costos.costoUnitario,
        new: recalculatedPreview.costos.costoUnitario,
        diff: recalculatedPreview.costos.costoUnitario - currentPreview.costos.costoUnitario,
        diffPct: ((recalculatedPreview.costos.costoUnitario - currentPreview.costos.costoUnitario) / currentPreview.costos.costoUnitario) * 100
      },
      webMP: {
        old: currentPreview.webMP.precio,
        new: recalculatedPreview.webMP.precio,
        diff: recalculatedPreview.webMP.precio - currentPreview.webMP.precio,
        diffPct: ((recalculatedPreview.webMP.precio - currentPreview.webMP.precio) / currentPreview.webMP.precio) * 100
      },
      webTransfer: {
        old: currentPreview.webTransfer.precio,
        new: recalculatedPreview.webTransfer.precio,
        diff: recalculatedPreview.webTransfer.precio - currentPreview.webTransfer.precio,
        diffPct: ((recalculatedPreview.webTransfer.precio - currentPreview.webTransfer.precio) / currentPreview.webTransfer.precio) * 100
      },
      marketplace: {
        old: currentPreview.webCupon.precio,
        new: recalculatedPreview.webCupon.precio,
        diff: recalculatedPreview.webCupon.precio - currentPreview.webCupon.precio,
        diffPct: ((recalculatedPreview.webCupon.precio - currentPreview.webCupon.precio) / currentPreview.webCupon.precio) * 100
      }
    };
  }, [currentPreview, recalculatedPreview]);

  // Productos que pueden actualizarse
  const outdatedProducts = useMemo(() => {
    return products.filter(p => (p.version_calculadora || 'v2.0') !== CURRENT_VERSION);
  }, [products]);

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === outdatedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(outdatedProducts.map(p => p.id));
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedProducts.length === 0) return;

    try {
      // Crear backup antes de actualizar
      const backupData = outdatedProducts
        .filter(p => selectedProducts.includes(p.id))
        .map(p => ({
          id: p.id,
          nombre: p.nombre,
          version: p.version_calculadora,
          webMP: p.webMP.precio,
          webTransfer: p.webTransfer.precio,
          marketplace: p.webCupon.precio
        }));

      // Guardar backup en localStorage
      const backupKey = `backup-${new Date().toISOString()}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      // Actualizar productos
      for (const productId of selectedProducts) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        // Recalcular con la nueva versión
        const formData: ProductFormData = {
          sku: product.sku,
          nombre: product.nombre,
          color: product.color,
          cantidadPorCaja: product.cantidadPorCaja,
          tipoPrecio: product.tipoPrecio,
          precioBase: product.precioBase,
          fleteTotal: product.fleteTotal,
          modoProrrateoFlete: product.modoProrrateoFlete,
          preciosIndividuales: product.preciosIndividuales,
          absorboEnvio: product.absorboEnvio,
          costoEnvioUnitario: product.costoEnvioUnitario,
          modoProducto: product.modoProducto,
          pctGanancia: product.pctGanancia,
          pctMP: product.pctMP,
          pctCupon: product.pctCupon,
          clTipo: product.clTipo,
          pctCL: product.pctCL,
          clFijo: product.clFijo,
          pctIVA: product.pctIVA,
          pctDescTransfer: product.pctDescTransfer,
          reglaRedondeo: product.reglaRedondeo
        };

        await updateProduct(productId, {
          ...formData,
          version_calculadora: CURRENT_VERSION
        } as any);
      }

      toast({
        title: 'Actualización completada',
        description: `Se actualizaron ${selectedProducts.length} productos a ${CURRENT_VERSION}. Backup guardado como ${backupKey}`
      });

      setSelectedProducts([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo completar la actualización',
        variant: 'destructive'
      });
    }
  };

  const exportBackup = () => {
    const backupData = products.map(p => ({
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      version: p.version_calculadora || 'v2.0',
      precioBase: p.precioBase,
      webMP: p.webMP.precio,
      webTransfer: p.webTransfer.precio,
      marketplace: p.webCupon.precio,
      margenWebMP: p.webMP.margenPct
    }));

    const csv = [
      ['ID', 'SKU', 'Nombre', 'Versión', 'Precio Base', 'Web MP', 'Web Transfer', 'Marketplace', 'Margen %'],
      ...backupData.map(p => [
        p.id,
        p.sku,
        p.nombre,
        p.version,
        p.precioBase,
        p.webMP,
        p.webTransfer,
        p.marketplace,
        p.margenWebMP
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-precios-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Backup exportado',
      description: 'Se ha descargado el archivo CSV con los precios actuales'
    });
  };

  const DifferenceCell = ({ diff, diffPct }: { diff: number; diffPct: number }) => {
    const isPositive = diff > 0;
    const isZero = Math.abs(diff) < 0.01;

    if (isZero) {
      return <span className="text-muted-foreground text-xs">Sin cambios</span>;
    }

    return (
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="h-3 w-3 text-orange-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-emerald-500" />
        )}
        <span className={isPositive ? 'text-orange-500' : 'text-emerald-500'}>
          {isPositive ? '+' : ''}{formatCurrency(diff)}
        </span>
        <span className="text-xs text-muted-foreground">
          ({isPositive ? '+' : ''}{diffPct.toFixed(2)}%)
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Vista Previa Avanzada</DialogTitle>
            {needsUpdate && (
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Actualización disponible
              </Badge>
            )}
          </div>
          <DialogDescription>
            Control de versión y migración de productos
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison">Comparación</TabsTrigger>
            <TabsTrigger value="batch">
              Actualización por lotes
              {outdatedProducts.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-500/10 text-orange-500">
                  {outdatedProducts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="changelog">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            {needsUpdate && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este producto usa una versión anterior de la calculadora ({productVersion}). 
                  La versión actual es {CURRENT_VERSION}. Los valores mostrados reflejan la nueva lógica de cálculo.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Versión de calculadora</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{productVersion}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="default">{CURRENT_VERSION}</Badge>
                </div>
              </div>

              {differences && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo</TableHead>
                      <TableHead>Valor actual</TableHead>
                      <TableHead>Valor recalculado</TableHead>
                      <TableHead>Diferencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Costo Unitario</TableCell>
                      <TableCell>{formatCurrency(differences.costoUnitario.old)}</TableCell>
                      <TableCell>{formatCurrency(differences.costoUnitario.new)}</TableCell>
                      <TableCell>
                        <DifferenceCell diff={differences.costoUnitario.diff} diffPct={differences.costoUnitario.diffPct} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Web MP</TableCell>
                      <TableCell>{formatCurrency(differences.webMP.old)}</TableCell>
                      <TableCell>{formatCurrency(differences.webMP.new)}</TableCell>
                      <TableCell>
                        <DifferenceCell diff={differences.webMP.diff} diffPct={differences.webMP.diffPct} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Web Transferencia</TableCell>
                      <TableCell>{formatCurrency(differences.webTransfer.old)}</TableCell>
                      <TableCell>{formatCurrency(differences.webTransfer.new)}</TableCell>
                      <TableCell>
                        <DifferenceCell diff={differences.webTransfer.diff} diffPct={differences.webTransfer.diffPct} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Marketplace</TableCell>
                      <TableCell>{formatCurrency(differences.marketplace.old)}</TableCell>
                      <TableCell>{formatCurrency(differences.marketplace.new)}</TableCell>
                      <TableCell>
                        <DifferenceCell diff={differences.marketplace.diff} diffPct={differences.marketplace.diffPct} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              <div className="bg-muted/50 p-4 rounded-lg mt-4">
                <h5 className="font-semibold text-sm mb-2">Márgenes recalculados</h5>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Web MP</p>
                    <p className="font-semibold">{recalculatedPreview.webMP.margenPct.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Web Transfer</p>
                    <p className="font-semibold">{recalculatedPreview.webTransfer.margenPct.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Marketplace</p>
                    <p className="font-semibold">{recalculatedPreview.webCupon.margenPct.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 mt-4">
            {outdatedProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                <p>Todos los productos están actualizados a {CURRENT_VERSION}</p>
              </div>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Se detectaron {outdatedProducts.length} productos con versiones anteriores. 
                    Selecciona los productos que deseas actualizar a {CURRENT_VERSION}.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedProducts.length === outdatedProducts.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportBackup}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar backup
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedProducts.length === outdatedProducts.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Versión actual</TableHead>
                        <TableHead>Nueva versión</TableHead>
                        <TableHead>Web MP actual</TableHead>
                        <TableHead>Web MP nuevo</TableHead>
                        <TableHead>Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outdatedProducts.map(product => {
                        const formData: ProductFormData = {
                          sku: product.sku,
                          nombre: product.nombre,
                          color: product.color,
                          cantidadPorCaja: product.cantidadPorCaja,
                          tipoPrecio: product.tipoPrecio,
                          precioBase: product.precioBase,
                          fleteTotal: product.fleteTotal,
                          modoProrrateoFlete: product.modoProrrateoFlete,
                          preciosIndividuales: product.preciosIndividuales,
                          absorboEnvio: product.absorboEnvio,
                          costoEnvioUnitario: product.costoEnvioUnitario,
                          modoProducto: product.modoProducto,
                          pctGanancia: product.pctGanancia,
                          pctMP: product.pctMP,
                          pctCupon: product.pctCupon,
                          clTipo: product.clTipo,
                          pctCL: product.pctCL,
                          clFijo: product.clFijo,
                          pctIVA: product.pctIVA,
                          pctDescTransfer: product.pctDescTransfer,
                          reglaRedondeo: product.reglaRedondeo
                        };

                        const recalculated = calculateProduct(formData);
                        const diff = recalculated.webMP.precio - product.webMP.precio;
                        const diffPct = (diff / product.webMP.precio) * 100;

                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={() => handleToggleProduct(product.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                            <TableCell>{product.nombre}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.version_calculadora || 'v2.0'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">{CURRENT_VERSION}</Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(product.webMP.precio)}</TableCell>
                            <TableCell>{formatCurrency(recalculated.webMP.precio)}</TableCell>
                            <TableCell>
                              <DifferenceCell diff={diff} diffPct={diffPct} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {selectedProducts.length > 0 && (
                  <Alert className="bg-primary/5 border-primary/20">
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Se creará un backup automático antes de actualizar {selectedProducts.length} productos
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="changelog" className="space-y-4 mt-4">
            <div className="space-y-3">
              {CHANGELOG.map((entry, index) => (
                <div
                  key={entry.version}
                  className={`p-4 rounded-lg border ${entry.version === CURRENT_VERSION ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={entry.version === CURRENT_VERSION ? 'default' : 'outline'}>
                      {entry.version}
                    </Badge>
                    {entry.version === CURRENT_VERSION && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                        Actual
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.changes}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Cerrar sin cambios
          </Button>
          {outdatedProducts.length > 0 && (
            <Button
              onClick={handleBatchUpdate}
              disabled={selectedProducts.length === 0}
            >
              Aplicar actualización ({selectedProducts.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
