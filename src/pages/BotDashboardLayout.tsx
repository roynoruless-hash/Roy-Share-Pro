import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Settings, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface BotData {
  id: string;
  name: string;
  username: string;
}

export default function BotDashboardLayout() {
  const { botId } = useParams<{ botId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bot, setBot] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBot = async () => {
      if (!user || !botId) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/bots/${botId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch bot');
        const data = await response.json();
        setBot(data);
      } catch (error) {
        console.error(error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchBot();
  }, [user, botId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bot) return null;

  const tabs = [
    { name: 'Users', href: `/bots/${botId}/users`, icon: Users },
    { name: 'Channels', href: `/bots/${botId}/channels`, icon: MessageSquare },
    { name: 'Groups', href: `/bots/${botId}/groups`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to="/"
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
          <p className="text-sm text-gray-500">@{bot.username}</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => {
            const isActive = location.pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-2">
        <Outlet context={{ botId }} />
      </div>
    </div>
  );
}
