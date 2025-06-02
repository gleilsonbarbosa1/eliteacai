import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ActivityStats() {
  const [activeUsers, setActiveUsers] = useState<number>(0);

  useEffect(() => {
    const updateActivity = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Update session activity
        await supabase.rpc('update_session_activity', {
          p_user_id: user.id
        });

        // Get active users count
        const { data: count } = await supabase.rpc('get_active_users_count');
        setActiveUsers(count || 0);
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    };

    // Update immediately
    updateActivity();

    // Update every minute
    const interval = setInterval(updateActivity, 60000);

    return () => clearInterval(interval);
  }, []);

  if (activeUsers === 0) return null;

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-purple-100 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
        <Users className="w-5 h-5 text-purple-600" />
      </div>
      <div>
        <p className="text-sm text-gray-600">Usuários online</p>
        <p className="text-lg font-semibold text-gray-900">
          {activeUsers} {activeUsers === 1 ? 'pessoa' : 'pessoas'}
        </p>
      </div>
    </div>
  );
}