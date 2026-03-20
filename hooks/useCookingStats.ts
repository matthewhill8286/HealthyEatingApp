import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export type CookingStats = {
  totalRecipes: number;
  totalCooked: number;
  streak: number;
};

export function useCookingStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CookingStats>({ totalRecipes: 0, totalCooked: 0, streak: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      // Count user's recipes
      const { count: recipeCount } = await supabase
        .from('recipes')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id);

      // Count unique cooking log entries
      const { count: cookedCount } = await supabase
        .from('cooking_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate streak: consecutive days with cooking log entries
      const { data: recentLogs } = await supabase
        .from('cooking_log')
        .select('cooked_at')
        .eq('user_id', user.id)
        .order('cooked_at', { ascending: false })
        .limit(60);

      let streak = 0;
      if (recentLogs && recentLogs.length > 0) {
        const dates = [...new Set(recentLogs.map((l) => l.cooked_at?.split('T')[0]))].sort().reverse();
        const today = new Date().toISOString().split('T')[0];
        let checkDate = today;

        for (const date of dates) {
          if (date === checkDate) {
            streak++;
            const d = new Date(checkDate);
            d.setDate(d.getDate() - 1);
            checkDate = d.toISOString().split('T')[0];
          } else {
            break;
          }
        }
      }

      setStats({
        totalRecipes: recipeCount || 0,
        totalCooked: cookedCount || 0,
        streak,
      });
      setIsLoading(false);
    };

    fetchStats();
  }, [user?.id]);

  return { stats, isLoading };
}
