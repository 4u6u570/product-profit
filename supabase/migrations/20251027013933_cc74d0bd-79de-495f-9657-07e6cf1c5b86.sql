-- Create table for product price history
CREATE TABLE IF NOT EXISTS public.product_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  precio_base numeric NOT NULL,
  web_mp numeric NOT NULL,
  web_transfer numeric NOT NULL,
  marketplace numeric,
  pct_ganancia numeric NOT NULL,
  pct_cupon numeric NOT NULL,
  pct_mp numeric NOT NULL,
  user_id uuid NOT NULL,
  grupo_id uuid
);

-- Enable RLS
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their group's price history"
ON public.product_price_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM grupo_miembros gm
    WHERE gm.user_id = auth.uid() AND gm.grupo_id = product_price_history.grupo_id
  )
);

CREATE POLICY "Users can insert their group's price history"
ON public.product_price_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM grupo_miembros gm
    WHERE gm.user_id = auth.uid() AND gm.grupo_id = product_price_history.grupo_id
  )
);

-- Create index for faster queries
CREATE INDEX idx_product_price_history_product_id ON public.product_price_history(product_id);
CREATE INDEX idx_product_price_history_created_at ON public.product_price_history(created_at DESC);

-- Enable realtime
ALTER TABLE public.product_price_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_price_history;