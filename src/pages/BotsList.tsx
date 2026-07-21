import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Bot, Plus, Activity, PauseCircle, Wrench, MoreVertical, CheckCircle2, XCircle, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BotData {
  id: string;
  name: string;
  username: string;
  botToken: string;
  status: 'active' | 'paused' | 'maintenance';
  webhookConnected?: boolean;
}

export default function BotsList() {
  const { token } = useAuth();
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', username: '', botToken: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit status state
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchBots = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/bots', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch bots: ${res.status}`);
      }
      const json = await res.json();
      setBots(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, [token]);

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        ...newBot,
        status: 'active',
        webhookConnected: false
      };
      
      console.log('Sending POST /api/bots payload:', payload);
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      console.log('POST /api/bots response status:', res.status);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('POST /api/bots error data:', errData);
        throw new Error(errData.error || `Failed to create bot: HTTP ${res.status}`);
      }
      
      await fetchBots();
      setIsModalOpen(false);
      setNewBot({ name: '', username: '', botToken: '' });
    } catch (err: any) {
      console.error('handleAddBot error:', err);
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      setBots(bots.map(b => b.id === id ? { ...b, status: status as any } : b));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditingId(null);
    }
  };

  const handleConnectWebhook = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/bots/${id}/webhook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect webhook');
      
      alert('Webhook connected successfully!');
      setBots(bots.map(b => b.id === id ? { ...b, webhookConnected: true } : b));
    } catch (err: any) {
      alert('Webhook error: ' + err.message);
    } finally {
      setEditingId(null);
    }
  };

  const maskToken = (token: string) => {
    if (!token) return '***';
    if (token.length <= 4) return '***';
    return `•`.repeat(20) + token.slice(-4);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'active': return <Activity className="w-4 h-4 text-green-500" />;
      case 'paused': return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bot Manager</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Bot
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : bots.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-gray-500">
          No bots found. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {bots.map((bot) => (
            <div key={bot.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 truncate max-w-[150px]">{bot.name}</h3>
                      <p className="text-sm text-gray-500">@{bot.username}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setEditingId(editingId === bot.id ? null : bot.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {editingId === bot.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1">
                        <button onClick={() => handleUpdateStatus(bot.id, 'active')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-500" /> Set Active
                        </button>
                        <button onClick={() => handleUpdateStatus(bot.id, 'paused')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <PauseCircle className="w-4 h-4 text-yellow-500" /> Set Paused
                        </button>
                        <button onClick={() => handleUpdateStatus(bot.id, 'maintenance')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                          <Wrench className="w-4 h-4 text-red-500" /> Set Maintenance
                        </button>
                        <button onClick={() => handleConnectWebhook(bot.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-blue-500" /> Connect Webhook
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="flex items-center gap-1.5 font-medium text-gray-900 capitalize">
                      <StatusIcon status={bot.status} />
                      {bot.status || 'unknown'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Webhook</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {bot.webhookConnected ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-900">Connected</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-gray-900">Disconnected</span></>
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Bot Token</span>
                      <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded text-gray-600 block truncate max-w-[120px]">
                        {maskToken(bot.botToken)}
                      </code>
                    </div>
                    <Link 
                      to={`/bots/${bot.id}/users`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Bot</h2>
            </div>
            
            <form onSubmit={handleAddBot} className="p-6 space-y-4">
              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {submitError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Name</label>
                <input
                  type="text"
                  required
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Support Bot"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Username</label>
                <input
                  type="text"
                  required
                  value={newBot.username}
                  onChange={(e) => setNewBot({ ...newBot, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. my_support_bot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                <input
                  type="text"
                  required
                  value={newBot.botToken}
                  onChange={(e) => setNewBot({ ...newBot, botToken: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                  placeholder="1234567890:AAHq..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
