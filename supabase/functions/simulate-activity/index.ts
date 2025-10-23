import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityLog {
  activity_type: string;
  description: string;
  metadata: Record<string, any>;
  success: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting simulated background activity...');

    // Simulate different types of activities randomly
    const activities = [
      {
        type: 'data_cleanup',
        action: async () => {
          // Count old logs (older than 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', thirtyDaysAgo.toISOString());

          return {
            activity_type: 'data_cleanup',
            description: 'Verificación de logs antiguos',
            metadata: { 
              old_logs_found: count || 0,
              threshold_days: 30 
            },
            success: true
          };
        }
      },
      {
        type: 'health_check',
        action: async () => {
          // Check products count
          const { count: productCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

          // Check grupos count
          const { count: groupCount } = await supabase
            .from('grupos')
            .select('*', { count: 'exact', head: true });

          return {
            activity_type: 'health_check',
            description: 'Verificación de salud del sistema',
            metadata: { 
              total_products: productCount || 0,
              total_groups: groupCount || 0,
              timestamp: new Date().toISOString()
            },
            success: true
          };
        }
      },
      {
        type: 'sync_check',
        action: async () => {
          // Get recent activity count
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);
          
          const { count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneHourAgo.toISOString());

          return {
            activity_type: 'sync_check',
            description: 'Verificación de sincronización',
            metadata: { 
              activities_last_hour: count || 0,
              check_time: new Date().toISOString()
            },
            success: true
          };
        }
      },
      {
        type: 'stats_update',
        action: async () => {
          // Get various statistics
          const { data: recentProducts } = await supabase
            .from('products')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(10);

          const avgAge = recentProducts && recentProducts.length > 0
            ? Math.floor((Date.now() - new Date(recentProducts[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return {
            activity_type: 'stats_update',
            description: 'Actualización de estadísticas',
            metadata: { 
              recent_products_analyzed: recentProducts?.length || 0,
              newest_product_age_days: avgAge
            },
            success: true
          };
        }
      }
    ];

    // Select a random activity
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    const activityLog = await randomActivity.action();

    // Insert activity log
    const { error: insertError } = await supabase
      .from('activity_logs')
      .insert([activityLog]);

    if (insertError) {
      console.error('Error inserting activity log:', insertError);
      throw insertError;
    }

    console.log('Activity logged successfully:', activityLog.activity_type);

    return new Response(
      JSON.stringify({ 
        success: true, 
        activity: activityLog.activity_type,
        message: 'Actividad simulada registrada correctamente'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in simulate-activity function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
