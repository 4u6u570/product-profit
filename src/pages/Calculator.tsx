import React from 'react';
import { Calculator, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { ProductForm } from '@/components/ProductForm';
import { ProductList } from '@/components/ProductList';

export default function CalculatorPage() {
  const { user, signOut } = useAuth();

  return (
    <ProductsProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
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

          {/* Layout Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Izquierdo - Formulario */}
            <div className="space-y-6">
              <ProductForm />
            </div>

            {/* Panel Derecho - Lista */}
            <div className="space-y-6">
              <ProductList />
            </div>
          </div>
        </div>
      </div>
    </ProductsProvider>
  );
}