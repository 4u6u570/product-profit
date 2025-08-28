import React, { useEffect, useState } from 'react';
import { Calculator, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProductStore } from '@/hooks/useProductStore';
import { useGroup } from '@/hooks/useGroup';
import { ProductForm } from '@/components/ProductForm';
import { ProductList } from '@/components/ProductList';
import { Product } from '@/types/product';

export default function CalculatorPage() {
  const { user, signOut } = useAuth();
  const { groupId, loading: groupLoading } = useGroup();
  const { loadFromLocalStorage, loadProducts } = useProductStore();
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  useEffect(() => {
    // Load initial data from localStorage
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    if (groupId && !groupLoading) {
      loadProducts(groupId);
    }
  }, [groupId, groupLoading, loadProducts]);

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
  };

  const handleEditComplete = () => {
    setProductToEdit(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/50 p-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <Calculator className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
            <h1 className="text-xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent truncate">
              Calculadora de Precios Pro
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <span className="text-muted-foreground text-sm md:text-base truncate max-w-32 md:max-w-none">
              {user?.email}
            </span>
            <Button variant="outline" onClick={signOut} size="sm" className="flex-shrink-0">
              <LogOut className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Salir</span>
              <span className="md:hidden">Salir</span>
            </Button>
          </div>
        </div>

        {/* Layout Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Panel Izquierdo - Formulario */}
          <div className="space-y-4 lg:space-y-6">
            <ProductForm 
              productToEdit={productToEdit} 
              onEditComplete={handleEditComplete}
            />
          </div>

          {/* Panel Derecho - Lista */}
          <div className="space-y-4 lg:space-y-6">
            <ProductList onEditProduct={handleEditProduct} />
          </div>
        </div>
      </div>
    </div>
  );
}