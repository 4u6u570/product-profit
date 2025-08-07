import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Trash2, 
  Copy as CopyIcon, 
  Pin, 
  PinOff, 
  Download, 
  Check, 
  X,
  Edit3,
  MoreHorizontal,
  FileDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { Product } from '@/types/product';
import { useProducts } from '@/contexts/ProductsContext';
import { formatCurrency, formatPercentage, copyToClipboard, formatForCopy } from '@/utils/formatting';
import { calculateProduct } from '@/utils/productCalculations';
import { exportToCSV, exportToExcel } from '@/utils/export';

export function ProductList() {
  const { products } = useProducts();
  const { toast } = useToast();

  return (
    <Card className="h-fit shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
      <CardHeader>
        <CardTitle className="text-2xl">Lista de Productos ({products.length})</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 max-h-[800px] overflow-y-auto">
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay productos en la lista</p>
            <p className="text-sm">Agrega productos desde el formulario de la izquierda</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {products.map((product) => (
              <Card key={product.id} className="shadow-sm border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{product.nombre || 'Sin nombre'}</h4>
                      {product.sku && <Badge variant="outline" className="text-xs">{product.sku}</Badge>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Web MP</p>
                      <p className="font-semibold">{formatCurrency(product.webMP.precio)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Web Transfer</p>
                      <p className="font-semibold">{formatCurrency(product.webTransfer.precio)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}