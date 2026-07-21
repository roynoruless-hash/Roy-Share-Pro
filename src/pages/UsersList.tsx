import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Search, Shield, Calendar, X, Eye } from 'lucide-react';

interface UserData {
  id: string;
  mobileNumber?: string;
  telegramUsername?: string;
  telegramId?: number;
  walletId?: string;
  isVerified: boolean;
  status: 'active' | 'banned';
  createdAt?: { _seconds: number };
  referrerId?: string;
}

interface WalletData {
  id: string;
  balance: number;
}

export default function UsersList() {
  const { botId } = useOutletContext<{ botId: string }>();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchField, setSearchField] = useState<'mobileNumber' | 'telegramUsername'>('mobileNumber');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  const fetchUsers = async (cursor?: string) => {
    if (!user || !botId) return;
    try {
      const token = await user.getIdToken();
      
      const queryParams = new URLSearchParams({
        botId,
        limit: '10'
      });
      
      if (cursor) queryParams.append('cursor', cursor);
      if (debouncedSearch) {
        queryParams.append('searchField', searchField);
        queryParams.append('searchValue', debouncedSearch);
      }

      const response = await fetch(`/api/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      
      if (cursor) {
        setUsers(prev => [...prev, ...data.data]);
      } else {
        setUsers(data.data);
      }
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchUsers();
  }, [user, botId, debouncedSearch, searchField]);

  const loadMore = () => {
    if (nextCursor) {
      setIsLoadingMore(true);
      fetchUsers(nextCursor);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'active' | 'banned') => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to update status: HTTP ${response.status}`);
      }
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      alert('Failed to update user status: ' + err.message);
    }
  };

  const openUserDetails = async (u: UserData) => {
    setSelectedUser(u);
    setIsModalOpen(true);
    setSelectedWallet(null);
    if (u.walletId && user) {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/wallets/${u.walletId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedWallet(data);
        }
      } catch (err) {
        console.error('Failed to fetch wallet', err);
      }
    }
  };

  const formatDate = (timestamp?: { _seconds: number }) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp._seconds * 1000).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="mobileNumber">Mobile Number</option>
          <option value="telegramUsername">Telegram Username</option>
        </select>
        
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search by ${searchField === 'mobileNumber' ? 'mobile number' : 'username'}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          No users found.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">Joined</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                          {u.telegramUsername ? u.telegramUsername.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {u.telegramUsername ? `@${u.telegramUsername}` : `ID: ${u.telegramId}`}
                            {u.isVerified && <Shield className="w-4 h-4 text-green-500" />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {u.mobileNumber || 'N/A'}
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(u.createdAt)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.status || 'unknown'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openUserDetails(u)}
                        className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {nextCursor && (
            <div className="p-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Details Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Telegram ID</label>
                  <div className="font-medium text-gray-900">{selectedUser.telegramId || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Username</label>
                  <div className="font-medium text-gray-900">{selectedUser.telegramUsername ? `@${selectedUser.telegramUsername}` : 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Mobile Number</label>
                  <div className="font-medium text-gray-900">{selectedUser.mobileNumber || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Joined Date</label>
                  <div className="font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Verification Status</label>
                  <div className="font-medium text-gray-900">
                    {selectedUser.isVerified ? (
                      <span className="text-green-600 flex items-center gap-1"><Shield className="w-4 h-4"/> Verified</span>
                    ) : (
                      <span className="text-gray-500 flex items-center gap-1">Unverified</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Referrer ID</label>
                  <div className="font-medium text-gray-900">{selectedUser.referrerId || 'None'}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <label className="block text-sm text-gray-500 mb-2">Wallet Balance</label>
                {selectedWallet ? (
                  <div className="text-2xl font-bold text-gray-900">
                    ${selectedWallet.balance.toFixed(2)}
                  </div>
                ) : selectedUser.walletId ? (
                  <div className="text-gray-500 text-sm">Loading balance...</div>
                ) : (
                  <div className="text-gray-500 text-sm">No wallet found</div>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Account Status</span>
                  {selectedUser.status === 'active' ? (
                    <button
                      onClick={() => handleUpdateStatus(selectedUser.id, 'banned')}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                    >
                      Ban User
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors"
                    >
                      Unban User
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Banned users will not be able to use the bot or access their wallet.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
