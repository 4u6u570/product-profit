-- Fix security warnings by setting search_path properly
CREATE OR REPLACE FUNCTION ensure_user_in_default_group()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    default_group_id uuid;
    current_user_id uuid;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Exit if no user is authenticated
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get or create the default group
    SELECT id INTO default_group_id 
    FROM grupos 
    WHERE nombre = 'default' 
    LIMIT 1;
    
    -- Create default group if it doesn't exist
    IF default_group_id IS NULL THEN
        INSERT INTO grupos (nombre) 
        VALUES ('default') 
        RETURNING id INTO default_group_id;
    END IF;
    
    -- Check if user is already in the group
    IF NOT EXISTS (
        SELECT 1 FROM grupo_miembros 
        WHERE user_id = current_user_id 
        AND grupo_id = default_group_id
    ) THEN
        -- Add user to the default group
        INSERT INTO grupo_miembros (user_id, grupo_id, rol)
        VALUES (current_user_id, default_group_id, 'editor');
    END IF;
END;
$$;

-- Fix the get_user_group function  
CREATE OR REPLACE FUNCTION get_user_group()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_group_id uuid;
    current_user_id uuid;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Return null if no user is authenticated
    IF current_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Try to find user's group
    SELECT gm.grupo_id INTO user_group_id
    FROM grupo_miembros gm
    WHERE gm.user_id = current_user_id
    LIMIT 1;
    
    -- If user has no group, ensure they are in default group
    IF user_group_id IS NULL THEN
        PERFORM ensure_user_in_default_group();
        
        -- Try again to get the group
        SELECT gm.grupo_id INTO user_group_id
        FROM grupo_miembros gm
        WHERE gm.user_id = current_user_id
        LIMIT 1;
    END IF;
    
    RETURN user_group_id;
END;
$$;