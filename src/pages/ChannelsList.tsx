import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash2, Edit2, X, Check, XCircle } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  chatId: string;
  inviteLink: string;
  isMandatory: boolean;
  botId: string;
}

export default function ChannelsList() {
  const { botId } = useOutletContext<{ botId: string }>();
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    chatId: '',
    inviteLink: '',
    isMandatory: true
  });

  const fetchChannels = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      // Use the generic /api/channels endpoint with a filter for this botId
      const response = await fetch(`/api/channels?botId=${botId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch channels');
      const data = await response.json();
      setChannels(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [user, botId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const url = editingChannel 
        ? `/api/channels/${editingChannel.id}`
        : `/api/channels`;
        
      const method = editingChannel ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        botId
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save channel: HTTP ${response.status}`);
      }
      
      setIsModalOpen(false);
      setEditingChannel(null);
      setFormData({ name: '', chatId: '', inviteLink: '', isMandatory: true });
      fetchChannels();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error saving channel');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/channels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to delete channel: HTTP ${response.status}`);
      }
      fetchChannels();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error deleting channel');
    }
  };

  const openEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      chatId: channel.chatId,
      inviteLink: channel.inviteLink,
      isMandatory: channel.isMandatory
    });
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingChannel(null);
    setFormData({ name: '', chatId: '', inviteLink: '', isMandatory: true });
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Mandatory Channels</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" /> Add Channel
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          No channels configured. Add one to require users to join it before using the bot.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Chat ID</th>
                <th className="p-4 font-medium">Invite Link</th>
                <th className="p-4 font-medium">Required</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {channels.map(channel => (
                <tr key={channel.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{channel.name}</td>
                  <td className="p-4 text-gray-500 font-mono text-sm">{channel.chatId}</td>
                  <td className="p-4 text-blue-600 text-sm truncate max-w-[200px]">
                    <a href={channel.inviteLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {channel.inviteLink}
                    </a>
                  </td>
                  <td className="p-4">
                    {channel.isMandatory ? (
                      <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><Check className="w-3 h-3"/> Yes</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs font-medium"><XCircle className="w-3 h-3"/> No</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(channel)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(channel.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingChannel ? 'Edit Channel' : 'Add Channel'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Official Updates"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  required
                  value={formData.chatId}
                  onChange={e => setFormData({ ...formData, chatId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., -1001234567890"
                />
                <p className="text-xs text-gray-500 mt-1">Make sure the bot is added as an admin to this channel.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invite Link</label>
                <input
                  type="url"
                  required
                  value={formData.inviteLink}
                  onChange={e => setFormData({ ...formData, inviteLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://t.me/..."
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={formData.isMandatory}
                  onChange={e => setFormData({ ...formData, isMandatory: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isMandatory" className="text-sm font-medium text-gray-700">
                  Required to join (Mandatory)
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  {editingChannel ? 'Save Changes' : 'Add Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
