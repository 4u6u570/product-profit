import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/types/product';
import { debounce } from 'lodash';

interface ProductsContextType {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  togglePin: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelectedProducts: () => Product[];
  clearAll: () => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

const STORAGE_KEY = 'calculator-products';

// Debounced save to localStorage
const debouncedSave = debounce((products: Product[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}, 500);

interface ProductsProviderProps {
  children: ReactNode;
}

export function ProductsProvider({ children }: ProductsProviderProps) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Auto-save with debounce
  useEffect(() => {
    debouncedSave(products);
  }, [products]);

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === id 
          ? { ...product, ...updates, updatedAt: new Date().toISOString() }
          : product
      )
    );
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  };

  const duplicateProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      const duplicate: Product = {
        ...product,
        id: crypto.randomUUID(),
        sku: product.sku ? `${product.sku}-copia` : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        selected: false,
        pinned: false,
      };
      addProduct(duplicate);
    }
  };

  const togglePin = (id: string) => {
    updateProduct(id, { pinned: !products.find(p => p.id === id)?.pinned });
  };

  const toggleSelect = (id: string) => {
    updateProduct(id, { selected: !products.find(p => p.id === id)?.selected });
  };

  const selectAll = () => {
    setProducts(prev => prev.map(product => ({ ...product, selected: true })));
  };

  const deselectAll = () => {
    setProducts(prev => prev.map(product => ({ ...product, selected: false })));
  };

  const getSelectedProducts = () => {
    return products.filter(product => product.selected);
  };

  const clearAll = () => {
    setProducts([]);
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        togglePin,
        toggleSelect,
        selectAll,
        deselectAll,
        getSelectedProducts,
        clearAll,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}