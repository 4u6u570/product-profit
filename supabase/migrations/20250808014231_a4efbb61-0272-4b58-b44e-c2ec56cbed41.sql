-- Create products table with correct structure for dual persistence
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sku text,
  nombre text,
  color text,
  cantidad_por_caja integer NOT NULL,
  tipo_precio text NOT NULL CHECK (tipo_precio IN ('unitario', 'caja')),
  precio_base numeric NOT NULL,
  flete_total numeric NOT NULL,
  absorbo_envio boolean NOT NULL DEFAULT false,
  costo_envio_unitario numeric,
  modo_producto text NOT NULL CHECK (modo_producto IN ('propio', 'tercero')),
  pct_ganancia numeric NOT NULL,
  pct_mp numeric NOT NULL,
  pct_cupon numeric NOT NULL DEFAULT 0,
  cl_tipo text NOT NULL CHECK (cl_tipo IN ('porcentaje', 'fijo')),
  pct_cl numeric,
  cl_fijo numeric,
  pct_marketplace numeric,
  pct_desc_transfer numeric NOT NULL DEFAULT 10,
  regla_redondeo text NOT NULL DEFAULT 'none' CHECK (regla_redondeo IN ('none', '10', '50', '100', 'psico')),
  computed jsonb NOT NULL,
  pinned boolean DEFAULT false,
  selected boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.products;