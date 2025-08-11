import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useGroup = () => {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const initializeGroup = async () => {
      try {
        // Ensure user is in default group if whitelisted
        await supabase.rpc('ensure_user_in_default_group');
        
        // Get user's group
        const { data, error } = await supabase.rpc('get_user_group');
        
        if (error) throw error;
        
        setGroupId(data);
      } catch (error) {
        console.error('Error initializing group:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeGroup();
  }, [user]);

  return { groupId, loading };
};