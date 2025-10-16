import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductFormData } from '@/types/product';
import { calculateProduct } from '@/utils/productCalculations';

interface UnsyncedChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  data?: Partial<Product>;
  timestamp: number;
}

interface ProductStore {
  products: Product[];
  loading: boolean;
  lastSyncAt: number | null;
  unsyncedQueue: UnsyncedChange[];
  
  // Actions
  loadProducts: (groupId: string) => Promise<void>;
  addProduct: (formData: ProductFormData, groupId: string) => Promise<void>;
  updateProduct: (id: string, formData: Partial<ProductFormData>, groupId?: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  togglePin: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelectedProducts: () => Product[];
  clearAll: () => void;
  syncToSupabase: (groupId: string) => Promise<void>;
  
  // Local storage
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

const STORAGE_KEY = 'product-store';

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  loading: false,
  lastSyncAt: null,
  unsyncedQueue: [],

  loadFromLocalStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        set({
          products: data.products || [],
          lastSyncAt: data.lastSyncAt || null,
          unsyncedQueue: data.unsyncedQueue || []
        });
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  },

  saveToLocalStorage: () => {
    try {
      const { products, lastSyncAt, unsyncedQueue } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        products,
        lastSyncAt,
        unsyncedQueue
      }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  loadProducts: async (groupId: string) => {
    set({ loading: true });
    
    // Load from localStorage first for immediate render
    get().loadFromLocalStorage();
    
    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('grupo_id', groupId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Convert Supabase data to Product format
      const supabaseProducts: Product[] = data.map(row => {
        // Create form data from database row
        const formData: ProductFormData = {
          sku: row.sku,
          nombre: row.nombre,
          color: row.color,
          cantidadPorCaja: row.cantidad_por_caja,
          tipoPrecio: row.tipo_precio_base === 'unitarioFijo' ? 'unitario' : 'caja',
          precioBase: Number(row.precio_base),
          fleteTotal: Number(row.flete_total),
          modoProrrateoFlete: 'uniforme',
          preciosIndividuales: [],
          absorboEnvio: false, // Will be updated when schema matches
          costoEnvioUnitario: undefined,
          modoProducto: 'propio', // Will be updated when schema matches
          pctGanancia: Number(row.porcentaje_ganancia),
          pctMP: Number(row.comision_mp),
          pctCupon: Number(row.porcentaje_cupon),
          clTipo: row.tipo_comision_compra_linda === 'porcentaje' ? 'porcentaje' : 'fijo',
          pctCL: row.tipo_comision_compra_linda === 'porcentaje' ? Number(row.comision_compra_linda) : undefined,
          clFijo: row.tipo_comision_compra_linda === 'precioFijo' ? Number(row.comision_compra_linda) : undefined,
          pctIVA: undefined,
          pctDescTransfer: 10, // Default value
          reglaRedondeo: 'none'
        };

        // Calculate values
        const calculations = calculateProduct(formData);

        return {
          id: row.id,
          ...formData,
          ...calculations,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          pinned: false,
          selected: false
        };
      });

      // Merge with local data (prioritize newer data based on updated_at)
      const localProducts = get().products;
      const mergedProducts = [...supabaseProducts];
      
      // Add local products that are newer or don't exist in Supabase
      localProducts.forEach(localProduct => {
        const supabaseProduct = supabaseProducts.find(p => p.id === localProduct.id);
        if (!supabaseProduct || new Date(localProduct.updatedAt) > new Date(supabaseProduct.updatedAt)) {
          const index = mergedProducts.findIndex(p => p.id === localProduct.id);
          if (index >= 0) {
            mergedProducts[index] = localProduct;
          } else {
            mergedProducts.push(localProduct);
          }
        }
      });

      set({
        products: mergedProducts,
        lastSyncAt: Date.now(),
        loading: false
      });

      get().saveToLocalStorage();

      // Sync any unsynced changes
      await get().syncToSupabase(groupId);
      
    } catch (error) {
      console.error('Error loading products:', error);
      set({ loading: false });
    }
  },

  addProduct: async (formData: ProductFormData, groupId: string) => {
    const newProduct: Product = {
      id: crypto.randomUUID(),
      ...formData,
      ...calculateProduct(formData),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      selected: false
    };

    // Add to local state immediately
    set(state => ({
      products: [newProduct, ...state.products],
      unsyncedQueue: [
        ...state.unsyncedQueue,
        { id: newProduct.id, type: 'create', data: newProduct, timestamp: Date.now() }
      ]
    }));

    get().saveToLocalStorage();

    // Try to sync to Supabase
    try {
      await get().syncToSupabase(groupId);
    } catch (error) {
      console.error('Error syncing new product:', error);
    }
  },

  updateProduct: async (id: string, formData: Partial<ProductFormData>, groupId?: string) => {
    set(state => ({
      products: state.products.map(product => {
        if (product.id === id) {
          const updatedProduct = {
            ...product,
            ...formData,
            updatedAt: new Date().toISOString()
          };
          
          // Recalculate if necessary fields changed
          if (formData.precioBase || formData.pctGanancia || formData.pctMP || formData.pctCupon || formData.pctIVA || formData.pctCL || formData.clFijo || formData.pctDescTransfer) {
            const fullFormData: ProductFormData = {
              sku: updatedProduct.sku,
              nombre: updatedProduct.nombre,
              color: updatedProduct.color,
              cantidadPorCaja: updatedProduct.cantidadPorCaja,
              tipoPrecio: updatedProduct.tipoPrecio,
              precioBase: updatedProduct.precioBase,
              fleteTotal: updatedProduct.fleteTotal,
              modoProrrateoFlete: updatedProduct.modoProrrateoFlete || 'uniforme',
              preciosIndividuales: updatedProduct.preciosIndividuales || [],
              absorboEnvio: updatedProduct.absorboEnvio,
              costoEnvioUnitario: updatedProduct.costoEnvioUnitario,
              modoProducto: updatedProduct.modoProducto,
              pctGanancia: updatedProduct.pctGanancia,
              pctMP: updatedProduct.pctMP,
              pctCupon: updatedProduct.pctCupon,
              clTipo: updatedProduct.clTipo,
              pctCL: updatedProduct.pctCL,
              clFijo: updatedProduct.clFijo,
              pctIVA: updatedProduct.pctIVA,
              pctDescTransfer: updatedProduct.pctDescTransfer,
              reglaRedondeo: updatedProduct.reglaRedondeo
            };
            const calculations = calculateProduct(fullFormData);
            Object.assign(updatedProduct, calculations);
          }
          
          return updatedProduct;
        }
        return product;
      }),
      unsyncedQueue: [
        ...state.unsyncedQueue,
        { id, type: 'update', data: formData, timestamp: Date.now() }
      ]
    }));

    get().saveToLocalStorage();

    // Sincronizar inmediatamente a Supabase si se proporciona groupId
    if (groupId) {
      try {
        await get().syncToSupabase(groupId);
      } catch (error) {
        console.error('Error syncing after update:', error);
      }
    }
  },

  deleteProduct: async (id: string) => {
    set(state => ({
      products: state.products.filter(p => p.id !== id),
      unsyncedQueue: [
        ...state.unsyncedQueue,
        { id, type: 'delete', timestamp: Date.now() }
      ]
    }));

    get().saveToLocalStorage();
  },

  togglePin: (id: string) => {
    set(state => ({
      products: state.products.map(product =>
        product.id === id
          ? { ...product, pinned: !product.pinned, updatedAt: new Date().toISOString() }
          : product
      )
    }));
    get().saveToLocalStorage();
  },

  toggleSelect: (id: string) => {
    set(state => ({
      products: state.products.map(product =>
        product.id === id
          ? { ...product, selected: !product.selected }
          : product
      )
    }));
  },

  selectAll: () => {
    set(state => ({
      products: state.products.map(product => ({ ...product, selected: true }))
    }));
  },

  deselectAll: () => {
    set(state => ({
      products: state.products.map(product => ({ ...product, selected: false }))
    }));
  },

  getSelectedProducts: () => {
    return get().products.filter(product => product.selected);
  },

  clearAll: () => {
    set({ products: [], unsyncedQueue: [] });
    get().saveToLocalStorage();
  },

  syncToSupabase: async (groupId: string) => {
    const { unsyncedQueue } = get();
    if (unsyncedQueue.length === 0) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      for (const change of unsyncedQueue) {
        if (change.type === 'create' && change.data) {
          const product = change.data as Product;
          await supabase.from('products').insert({
            id: product.id,
            user_id: user.id,
            grupo_id: groupId,
            sku: product.sku || '',
            nombre: product.nombre || '',
            color: product.color || '',
            cantidad_por_caja: product.cantidadPorCaja,
            tipo_precio_base: product.tipoPrecio === 'unitario' ? 'unitarioFijo' : 'porCaja',
            precio_base: product.precioBase,
            flete_total: product.fleteTotal,
            porcentaje_ganancia: product.pctGanancia,
            comision_mp: product.pctMP,
            porcentaje_cupon: product.pctCupon,
            tipo_comision_compra_linda: product.clTipo === 'porcentaje' ? 'porcentaje' : 'precioFijo',
            comision_compra_linda: product.clTipo === 'porcentaje' ? (product.pctCL || 0) : (product.clFijo || 0)
          } as any);
        } else if (change.type === 'update') {
          // Map the update data to database schema
          const updateData: any = {};
          if (change.data) {
            const data = change.data as Partial<ProductFormData>;
            // Basic fields
            if (data.nombre !== undefined) updateData.nombre = data.nombre;
            if (data.sku !== undefined) updateData.sku = data.sku;
            if (data.color !== undefined) updateData.color = data.color;
            if (data.cantidadPorCaja !== undefined) updateData.cantidad_por_caja = data.cantidadPorCaja;
            if (data.tipoPrecio !== undefined) updateData.tipo_precio_base = data.tipoPrecio === 'unitario' ? 'unitarioFijo' : 'porCaja';
            if (data.precioBase !== undefined) updateData.precio_base = data.precioBase;
            if (data.fleteTotal !== undefined) updateData.flete_total = data.fleteTotal;
            // Commission fields
            if (data.pctGanancia !== undefined) updateData.porcentaje_ganancia = data.pctGanancia;
            if (data.pctMP !== undefined) updateData.comision_mp = data.pctMP;
            if (data.pctCupon !== undefined) updateData.porcentaje_cupon = data.pctCupon;
            if (data.clTipo !== undefined) updateData.tipo_comision_compra_linda = data.clTipo === 'porcentaje' ? 'porcentaje' : 'precioFijo';
            if (data.pctCL !== undefined || data.clFijo !== undefined) {
              updateData.comision_compra_linda = data.pctCL || data.clFijo || 0;
            }
          }
          
          await supabase
            .from('products')
            .update({ ...updateData, updated_at: new Date().toISOString() } as any)
            .eq('id', change.id);
        } else if (change.type === 'delete') {
          await supabase
            .from('products')
            .delete()
            .eq('id', change.id);
        }
      }

      // Clear synced changes
      set({
        unsyncedQueue: [],
        lastSyncAt: Date.now()
      });
      get().saveToLocalStorage();

    } catch (error) {
      console.error('Error syncing to Supabase:', error);
      throw error;
    }
  }
}));