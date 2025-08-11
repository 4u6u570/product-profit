import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const GROUP_CACHE_KEY = 'user-group-cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface GroupCache {
  groupId: string | null;
  timestamp: number;
}

export const useGroup = () => {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) {
      if (!user) setLoading(false);
      return;
    }

    const initializeGroup = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(GROUP_CACHE_KEY);
        if (cached) {
          const cacheData: GroupCache = JSON.parse(cached);
          const isValid = Date.now() - cacheData.timestamp < CACHE_DURATION;
          
          if (isValid && cacheData.groupId) {
            setGroupId(cacheData.groupId);
            setLoading(false);
            // Background refresh without blocking UI
            refreshGroupInBackground();
            return;
          }
        }

        // Fresh fetch
        await refreshGroup();
      } catch (error) {
        console.error('Error initializing group:', error);
        setLoading(false);
      }
    };

    const refreshGroup = async () => {
      // Ensure user is in default group if whitelisted
      await supabase.rpc('ensure_user_in_default_group');
      
      // Get user's group
      const { data, error } = await supabase.rpc('get_user_group');
      
      if (error) throw error;
      
      setGroupId(data);
      
      // Cache the result
      const cacheData: GroupCache = {
        groupId: data,
        timestamp: Date.now()
      };
      localStorage.setItem(GROUP_CACHE_KEY, JSON.stringify(cacheData));
      setLoading(false);
    };

    const refreshGroupInBackground = async () => {
      try {
        await supabase.rpc('ensure_user_in_default_group');
        const { data } = await supabase.rpc('get_user_group');
        
        if (data && data !== groupId) {
          setGroupId(data);
        }
        
        // Update cache
        const cacheData: GroupCache = {
          groupId: data,
          timestamp: Date.now()
        };
        localStorage.setItem(GROUP_CACHE_KEY, JSON.stringify(cacheData));
      } catch (error) {
        console.error('Background group refresh failed:', error);
      }
    };

    initialized.current = true;
    initializeGroup();
  }, [user, groupId]);

  return { groupId, loading };
};