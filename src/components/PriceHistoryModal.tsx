import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PriceHistory {
  id: string;
  created_at: string;
  precio_base: number;
  web_mp: number;
  web_transfer: number;
  marketplace: number | null;
  pct_ganancia: number;
  pct_cupon: number;
  pct_mp: number;
}

interface PriceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

export function PriceHistoryModal({
  open,
  onOpenChange,
  productId,
  productName,
}: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && productId) {
      loadHistory();
    }
  }, [open, productId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_price_history')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Historial de Precios</DialogTitle>
          <DialogDescription>
            Historial de cambios de precios para: <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay historial de precios disponible para este producto.
          </div>
        ) : (
          <ScrollArea className="h-[500px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Precio Base</TableHead>
                  <TableHead className="text-right">Web MP</TableHead>
                  <TableHead className="text-right">Web Transfer</TableHead>
                  <TableHead className="text-right">Marketplace</TableHead>
                  <TableHead className="text-right">% Ganancia</TableHead>
                  <TableHead className="text-right">% MP</TableHead>
                  <TableHead className="text-right">% Cupón</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(record.precio_base))}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(record.web_mp))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(record.web_transfer))}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.marketplace ? formatCurrency(Number(record.marketplace)) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(record.pct_ganancia).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(record.pct_mp).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(record.pct_cupon).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
