import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductFormData } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadProducts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const productsWithCalculations = data.map(product => ({
        ...product,
        tipoPreçioBase: product.tipo_precio_base as 'porCaja' | 'unitarioFijo' | 'unitarioMargen',
        tipoComisionCompraLinda: product.tipo_comision_compra_linda as 'porcentaje' | 'precioFijo',
        cantidadPorCaja: product.cantidad_por_caja,
        precioBase: product.precio_base,
        porcentajeGanancia: product.porcentaje_ganancia,
        comisionMP: product.comision_mp,
        porcentajeCupon: product.porcentaje_cupon,
        comisionCompraLinda: product.comision_compra_linda,
        fleteTotal: product.flete_total,
        ...calculateProductValues({
          cantidadPorCaja: product.cantidad_por_caja,
          tipoPreçioBase: product.tipo_precio_base as 'porCaja' | 'unitarioFijo' | 'unitarioMargen',
          precioBase: product.precio_base,
          porcentajeGanancia: product.porcentaje_ganancia,
          comisionMP: product.comision_mp,
          porcentajeCupon: product.porcentaje_cupon,
          tipoComisionCompraLinda: product.tipo_comision_compra_linda as 'porcentaje' | 'precioFijo',
          comisionCompraLinda: product.comision_compra_linda,
          fleteTotal: product.flete_total,
          nombre: product.nombre,
          sku: product.sku,
          color: product.color
        })
      }));

      setProducts(productsWithCalculations);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (formData: ProductFormData) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          user_id: user.id,
          nombre: formData.nombre,
          sku: formData.sku,
          color: formData.color,
          cantidad_por_caja: formData.cantidadPorCaja,
          tipo_precio_base: formData.tipoPreçioBase,
          precio_base: formData.precioBase,
          porcentaje_ganancia: formData.porcentajeGanancia,
          comision_mp: formData.comisionMP,
          porcentaje_cupon: formData.porcentajeCupon,
          tipo_comision_compra_linda: formData.tipoComisionCompraLinda,
          comision_compra_linda: formData.comisionCompraLinda,
          flete_total: formData.fleteTotal
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Producto agregado",
        description: "El producto se guardó correctamente"
      });

      await loadProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive"
      });
    }
  };

  const updateProduct = async (id: string, formData: ProductFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          nombre: formData.nombre,
          sku: formData.sku,
          color: formData.color,
          cantidad_por_caja: formData.cantidadPorCaja,
          tipo_precio_base: formData.tipoPreçioBase,
          precio_base: formData.precioBase,
          porcentaje_ganancia: formData.porcentajeGanancia,
          comision_mp: formData.comisionMP,
          porcentaje_cupon: formData.porcentajeCupon,
          tipo_comision_compra_linda: formData.tipoComisionCompraLinda,
          comision_compra_linda: formData.comisionCompraLinda,
          flete_total: formData.fleteTotal
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Producto actualizado",
        description: "Los cambios se guardaron correctamente"
      });

      await loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Producto eliminado",
        description: "El producto se eliminó correctamente"
      });

      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts: loadProducts
  };
};

const calculateProductValues = (data: ProductFormData) => {
  let costoUnitario = 0;
  
  if (data.tipoPreçioBase === 'porCaja') {
    costoUnitario = data.precioBase / data.cantidadPorCaja;
  } else if (data.tipoPreçioBase === 'unitarioFijo') {
    costoUnitario = data.precioBase;
  } else if (data.tipoPreçioBase === 'unitarioMargen') {
    costoUnitario = data.precioBase * (1 + data.porcentajeGanancia / 100);
  }

  const fleteUnitario = data.fleteTotal / data.cantidadPorCaja;
  const costoConFlete = costoUnitario + fleteUnitario;
  const precioConMargen = costoConFlete * (1 + data.porcentajeGanancia / 100);
  
  let comisionCompraLindaUnitaria = 0;
  if (data.tipoComisionCompraLinda === 'porcentaje') {
    comisionCompraLindaUnitaria = precioConMargen * (data.comisionCompraLinda / 100);
  } else {
    comisionCompraLindaUnitaria = data.comisionCompraLinda;
  }
  
  const precioConComision = precioConMargen + comisionCompraLindaUnitaria;
  const comisionMP = precioConComision * (data.comisionMP / 100);
  const cuponDescuento = precioConComision * (data.porcentajeCupon / 100);
  const precioVenta = precioConComision + comisionMP + cuponDescuento;
  const gananciaNeta = precioVenta - costoConFlete - comisionCompraLindaUnitaria - comisionMP - cuponDescuento;
  const margenFinal = (gananciaNeta / precioVenta) * 100;

  return {
    costoUnitario,
    precioVenta,
    gananciaNeta,
    margenFinal
  };
};