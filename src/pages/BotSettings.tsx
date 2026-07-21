import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Settings as SettingsIcon } from 'lucide-react';

interface BotSettings {
  id?: string;
  supportUsername: string;
  supportEmail: string;
  // include existing fields so we don't accidentally overwrite them entirely 
  // actually, PUT updates the whole document. Wait, our `crud.js` updateDocument uses `.set(req.body, { merge: true })`? Let's check crud.ts.
}

export default function BotSettings() {
  const { botId } = useParams<{ botId: string }>();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<BotSettings>({
    supportUsername: '',
    supportEmail: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user || !botId) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/settings/${botId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [botId, user]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !botId) return;
    setSaving(true);
    setMessage('');
    
    try {
      const token = await user.getIdToken();
      let res = await fetch(`/api/settings/${botId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!res.ok && res.status === 404) {
        // Document might not exist, POST it
        res = await fetch(`/api/settings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...settings, id: botId, botId })
        });
      }
      
      if (!res.ok) throw new Error('Failed to save settings');
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-700" />
          General Settings
        </h1>
        <p className="text-gray-500 mt-1">Configure general properties and support contacts for this bot.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Support Contact Information</h2>
        <form onSubmit={saveSettings} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Username</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">@</span>
                <input
                  type="text"
                  value={settings.supportUsername.replace('@', '')}
                  onChange={(e) => setSettings({ ...settings, supportUsername: e.target.value ? `@${e.target.value.replace('@', '')}` : '' })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin_username"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Telegram username for support</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="support@example.com"
              />
            </div>
          </div>
          
          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {message && (
              <span className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
