import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOutletContext } from 'react-router-dom';

interface Withdrawal {
  id: string;
  botId: string;
  userId: string;
  telegramId: number;
  fullName: string;
  telegramUsername?: string;
  amount: number;
  method: string;
  methodDetail?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  redeemCode?: string;
  createdAt: any;
}

interface Settings {
  id?: string;
  botId: string;
  withdrawalsEnabled?: boolean;
  upiMinWithdrawal?: number;
  redeemMinWithdrawal?: number;
}

export default function WithdrawalsList() {
  const { botId } = useOutletContext<{ botId: string }>();
  const { user } = useAuth();
  
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settings, setSettings] = useState<Settings>({ botId, withdrawalsEnabled: true, upiMinWithdrawal: 10, redeemMinWithdrawal: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingRedeemId, setApprovingRedeemId] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');

  const fetchData = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [wRes, sRes] = await Promise.all([
        fetch(`/api/withdrawals?botId=${botId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/settings/${botId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (wRes.ok) {
        const wData = await wRes.json();
        setWithdrawals(wData.data || []);
      }
      
      if (sRes.ok) {
        const sData = await sRes.json();
        setSettings({
          botId,
          withdrawalsEnabled: sData.withdrawalsEnabled ?? true,
          upiMinWithdrawal: sData.upiMinWithdrawal ?? 10,
          redeemMinWithdrawal: sData.redeemMinWithdrawal ?? 50
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, botId]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSettings(true);
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
         res = await fetch(`/api/settings`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({ ...settings, id: botId })
         });
      }
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save settings: HTTP ${res.status}`);
      }
      
      alert('Settings saved successfully');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApprove = async (withdrawal: Withdrawal) => {
    if (withdrawal.method === 'Redeem Code') {
      setApprovingRedeemId(withdrawal.id);
      return;
    }
    
    if (!user || !window.confirm('Are you sure you want to approve this withdrawal?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/withdrawals/${withdrawal.id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to approve');
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRedeemApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !approvingRedeemId || !redeemCode.trim()) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/withdrawals/${approvingRedeemId}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ redeemCode: redeemCode.trim() })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to approve');
      }
      setApprovingRedeemId(null);
      setRedeemCode('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectingId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/withdrawals/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to reject');
      }
      setRejectingId(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-6">Loading withdrawals...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Withdrawals Management</h1>
        <p className="text-gray-500 mt-1">Manage withdrawal settings and requests for this bot.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
        <form onSubmit={saveSettings} className="space-y-4 max-w-xl">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="withdrawalsEnabled"
              checked={settings.withdrawalsEnabled}
              onChange={(e) => setSettings({ ...settings, withdrawalsEnabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="withdrawalsEnabled" className="text-sm font-medium text-gray-700">
              Enable Withdrawals
            </label>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI Min. Amount</label>
              <input
                type="number"
                min="1"
                required
                value={settings.upiMinWithdrawal}
                onChange={(e) => setSettings({ ...settings, upiMinWithdrawal: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redeem Code Min. Amount</label>
              <input
                type="number"
                min="1"
                required
                value={settings.redeemMinWithdrawal}
                onChange={(e) => setSettings({ ...settings, redeemMinWithdrawal: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={savingSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Withdrawal Requests</h2>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">User</th>
                <th className="px-4 py-3 font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-700">Method</th>
                <th className="px-4 py-3 font-medium text-gray-700">Detail</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{w.fullName}</div>
                      <div className="text-gray-500 text-xs">@{w.telegramUsername || 'N/A'} ({w.telegramId})</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{w.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${w.method === 'UPI' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {w.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{w.methodDetail || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        w.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        w.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
                      {w.reason && <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={w.reason}>{w.reason}</div>}
                      {w.redeemCode && <div className="text-xs text-green-600 mt-1 max-w-[150px] font-mono truncate" title={w.redeemCode}>{w.redeemCode}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {w.createdAt ? new Date((w.createdAt._seconds ? w.createdAt._seconds * 1000 : (w.createdAt.seconds ? w.createdAt.seconds * 1000 : w.createdAt)) as any).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {w.status === 'pending' && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(w)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(w.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Withdrawal</h3>
            <form onSubmit={handleReject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                  placeholder="e.g. Invalid UPI ID"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {approvingRedeemId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Redeem Code</h3>
            <form onSubmit={handleRedeemApprove}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Redeem Code</label>
                <input
                  type="text"
                  required
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. XXXX-XXXX-XXXX"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setApprovingRedeemId(null); setRedeemCode(''); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Send Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
