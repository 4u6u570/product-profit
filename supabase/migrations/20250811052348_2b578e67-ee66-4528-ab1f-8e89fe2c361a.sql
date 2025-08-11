-- Fix security linter warnings for functions

-- Update get_user_group function with secure search_path
CREATE OR REPLACE FUNCTION public.get_user_group()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT gm.grupo_id
  FROM public.grupo_miembros gm
  WHERE gm.user_id = auth.uid()
  LIMIT 1;
$$;

-- Update ensure_user_in_default_group function with secure search_path
CREATE OR REPLACE FUNCTION public.ensure_user_in_default_group()
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
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