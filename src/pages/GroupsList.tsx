import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash2, Edit2, X, Check, XCircle } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  chatId: string;
  inviteLink: string;
  isMandatory: boolean;
  botId: string;
}

export default function GroupsList() {
  const { botId } = useOutletContext<{ botId: string }>();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    chatId: '',
    inviteLink: '',
    isMandatory: true
  });

  const fetchGroups = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/groups?botId=${botId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user, botId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const url = editingGroup 
        ? `/api/groups/${editingGroup.id}`
        : `/api/groups`;
        
      const method = editingGroup ? 'PUT' : 'POST';
      
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

      if (!response.ok) throw new Error('Failed to save group');
      
      setIsModalOpen(false);
      setEditingGroup(null);
      setFormData({ name: '', chatId: '', inviteLink: '', isMandatory: true });
      fetchGroups();
    } catch (error) {
      console.error(error);
      alert('Error saving group');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this group?')) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete');
      fetchGroups();
    } catch (error) {
      console.error(error);
      alert('Error deleting group');
    }
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      chatId: group.chatId,
      inviteLink: group.inviteLink,
      isMandatory: group.isMandatory
    });
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingGroup(null);
    setFormData({ name: '', chatId: '', inviteLink: '', isMandatory: true });
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Mandatory Groups</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          No groups configured. Add one to require users to join it before using the bot.
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
              {groups.map(group => (
                <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{group.name}</td>
                  <td className="p-4 text-gray-500 font-mono text-sm">{group.chatId}</td>
                  <td className="p-4 text-blue-600 text-sm truncate max-w-[200px]">
                    <a href={group.inviteLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {group.inviteLink}
                    </a>
                  </td>
                  <td className="p-4">
                    {group.isMandatory ? (
                      <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><Check className="w-3 h-3"/> Yes</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs font-medium"><XCircle className="w-3 h-3"/> No</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(group)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(group.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
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
                {editingGroup ? 'Edit Group' : 'Add Group'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Official Community Group"
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
                  placeholder="e.g., -1009876543210"
                />
                <p className="text-xs text-gray-500 mt-1">Make sure the bot is added as an admin to this group.</p>
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
                  id="isMandatoryGroup"
                  checked={formData.isMandatory}
                  onChange={e => setFormData({ ...formData, isMandatory: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isMandatoryGroup" className="text-sm font-medium text-gray-700">
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
                  {editingGroup ? 'Save Changes' : 'Add Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
