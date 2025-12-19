import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  created_at: string;
  activity_type: string;
  description: string;
  metadata: any;
  success: boolean;
}

export const ActivityFooter = () => {
  const [lastActivity, setLastActivity] = useState<ActivityLog | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('New activity detected:', payload);
          setLastActivity(payload.new as ActivityLog);
          setActivityCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentActivity = async () => {
    try {
      // Get last activity
      const { data: lastLog, error: lastError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastError && lastError.code !== 'PGRST116') {
        console.error('Error fetching last activity:', lastError);
      } else if (lastLog) {
        setLastActivity(lastLog);
      }

      // Get count of activities in last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const { count, error: countError } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (countError) {
        console.error('Error fetching activity count:', countError);
      } else {
        setActivityCount(count || 0);
      }

    } catch (error) {
      console.error('Error in fetchRecentActivity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'data_cleanup':
        return '🧹';
      case 'health_check':
        return '❤️';
      case 'sync_check':
        return '🔄';
      case 'stats_update':
        return '📊';
      default:
        return '⚡';
    }
  };

  if (loading) {
    return (
      <footer className="border-t bg-muted/30 py-3 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse" />
          <span>Cargando estado del sistema...</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="sticky bottom-0 border-t bg-gradient-to-r from-background via-muted/40 to-background py-3 px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span className="font-medium">Sistema activo</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-xs">{activityCount} actividades (24h)</span>
        </div>

        {lastActivity && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {getActivityIcon(lastActivity.activity_type)}
            </span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Última actividad:{' '}
              <span className="font-semibold text-foreground">
                {formatDistanceToNow(new Date(lastActivity.created_at), {
                  addSuffix: true,
                  locale: es
                })}
              </span>
            </span>
            <span className="hidden md:inline text-xs text-muted-foreground">
              ({lastActivity.description})
            </span>
          </div>
        )}
      </div>
    </footer>
  );
};
