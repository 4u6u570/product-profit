-- 1. Crear tabla de grupos
CREATE TABLE IF NOT EXISTS public.grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear tabla de membresías
CREATE TABLE IF NOT EXISTS public.grupo_miembros (
  grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rol TEXT DEFAULT 'editor',
  PRIMARY KEY (grupo_id, user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS para grupos y miembros
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_miembros ENABLE ROW LEVEL SECURITY;

-- Políticas para grupos
CREATE POLICY "grupos_select" ON public.grupos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.grupo_miembros gm
    WHERE gm.user_id = auth.uid() AND gm.grupo_id = grupos.id
  )
);

-- Políticas para miembros
CREATE POLICY "miembros_select" ON public.grupo_miembros FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "miembros_insert" ON public.grupo_miembros FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 4. Añadir grupo_id a productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL;

-- 5. Crear grupo default y migrar datos existentes
INSERT INTO public.grupos (nombre)
SELECT 'default'
WHERE NOT EXISTS (SELECT 1 FROM public.grupos WHERE nombre = 'default');

-- Migrar productos existentes al grupo default
UPDATE public.products
SET grupo_id = (SELECT id FROM public.grupos WHERE nombre = 'default')
WHERE grupo_id IS NULL;

-- 6. Actualizar RLS de productos para usar grupo_id
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

CREATE POLICY "products_select" ON public.products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.grupo_miembros gm
    WHERE gm.user_id = auth.uid() AND gm.grupo_id = products.grupo_id
  )
);

CREATE POLICY "products_insert" ON public.products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.grupo_miembros gm
    WHERE gm.user_id = auth.uid() AND gm.grupo_id = products.grupo_id
  )
);

CREATE POLICY "products_update" ON public.products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.grupo_miembros gm
    WHERE gm.user_id = auth.uid() AND gm.grupo_id = products.grupo_id
  )
);

CREATE POLICY "products_delete" ON public.products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.grupo_miembros gm
    WHERE gm.user_id = auth.uid() AND gm.grupo_id = products.grupo_id
  )
);

-- 7. Función para obtener grupo del usuario
CREATE OR REPLACE FUNCTION public.get_user_group()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT gm.grupo_id
  FROM public.grupo_miembros gm
  WHERE gm.user_id = auth.uid()
  LIMIT 1;
$$;

-- 8. Función para verificar si usuario está en whitelist y asignarlo al grupo default
CREATE OR REPLACE FUNCTION public.ensure_user_in_default_group()
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  default_group_id UUID;
  whitelist TEXT[] := ARRAY['tu-email@gmail.com', 'roberto@gmail.com'];
BEGIN
  -- Obtener email del usuario actual
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Verificar si está en whitelist
  IF user_email = ANY(whitelist) THEN
    -- Obtener ID del grupo default
    SELECT id INTO default_group_id FROM public.grupos WHERE nombre = 'default';
    
    -- Insertar membresía si no existe
    INSERT INTO public.grupo_miembros (grupo_id, user_id, rol)
    VALUES (default_group_id, auth.uid(), 'editor')
    ON CONFLICT (grupo_id, user_id) DO NOTHING;
  END IF;
END;
$$;