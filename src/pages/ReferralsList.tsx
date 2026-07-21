import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Save, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Referral {
  id: string;
  botId: string;
  referrerId: number;
  referredUserId: number;
  status: 'pending' | 'completed' | 'failed';
  rewardAmount: number;
  reason?: string;
  createdAt: { _seconds: number, _nanoseconds: number } | string;
}

interface User {
  telegramId: number;
  telegramUsername?: string;
}

export default function ReferralsList() {
  const { botId } = useOutletContext<{ botId: string }>();
  const { user } = useAuth();
  
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [usersMap, setUsersMap] = useState<Record<number, User>>({});
  
  const [rewardAmount, setRewardAmount] = useState<string>('0');
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        
        // 1. Fetch Setting
        const settingsRes = await fetch(`/api/settings/${botId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setRewardAmount(settingsData.referralReward?.toString() || '0');
        } else if (settingsRes.status === 404) {
          setRewardAmount('0');
        }

        // 2. Fetch Referrals
        let fetchedReferrals: any[] = [];
        const refRes = await fetch(`/api/referrals?botId=${botId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (refRes.ok) {
          const refData = await refRes.json();
          fetchedReferrals = refData.data || [];
          setReferrals(fetchedReferrals);
        }

        // 3. Fetch Users for lookup map efficiently (only specific users)
        const userIds = new Set<number>();
        fetchedReferrals.forEach((ref: any) => {
          if (ref.referrerId) userIds.add(ref.referrerId);
          if (ref.referredUserId) userIds.add(ref.referredUserId);
        });

        const map: Record<number, User> = {};
        
        // Fetch only needed users in parallel (good for up to ~50 users)
        await Promise.all(
          Array.from(userIds).map(async (tid) => {
            try {
              const res = await fetch(`/api/users?botId=${botId}&searchField=telegramId&searchValue=${tid}&exactMatch=true&isNumeric=true&limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                const data = await res.json();
                if (data.data && data.data.length > 0) {
                  map[tid] = data.data[0];
                }
              }
            } catch (e) {
               console.error('Error fetching user', tid, e);
            }
          })
        );
        
        setUsersMap(map);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, botId]);

  const saveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      const token = await user.getIdToken();
      
      const payload = {
        referralReward: parseFloat(rewardAmount) || 0,
        botId: botId
      };

      // Upsert using PUT to /api/settings/:botId
      // Ensure the setting document exists or creates it if not (Firebase set with merge is supported via standard endpoints if implemented).
      // If crud.ts doesn't support direct create via PUT when not exist, we'll try PUT first, then POST if failed.
      let res = await fetch(`/api/settings/${botId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok && res.status === 404) {
         // Create it via POST
         res = await fetch(`/api/settings`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({ ...payload, id: botId }) // assuming id can be passed or we might need to adjust.
         });
      }
      
      if (!res.ok) {
         throw new Error(`Failed to save settings: ${res.statusText}`);
      }
      
      alert('Settings saved successfully');
    } catch (error) {
      console.error(error);
      alert('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const formatDate = (dateObj: any) => {
    if (!dateObj) return 'N/A';
    if (typeof dateObj === 'string') return new Date(dateObj).toLocaleString();
    if (dateObj._seconds) return new Date(dateObj._seconds * 1000).toLocaleString();
    return 'Invalid Date';
  };

  const renderUser = (tid: number) => {
    const u = usersMap[tid];
    if (u && u.telegramUsername) {
      return <span className="font-medium text-gray-900">@{u.telegramUsername}</span>;
    }
    return <span className="text-gray-500 font-mono text-sm">{tid}</span>;
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Referral Settings</h3>
        <div className="flex items-end gap-4 max-w-md">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Referral Reward Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 5.00"
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          This amount will be automatically credited to the referrer's wallet when their referred user successfully registers and completes mandatory group/channel verification.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Referrals History</h3>
          <span className="text-sm text-gray-500">Read-only view</span>
        </div>
        
        {referrals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No referrals found for this bot yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Referrer</th>
                  <th className="p-4 font-medium">Referred User</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">
                      {formatDate(ref.createdAt)}
                    </td>
                    <td className="p-4">
                      {renderUser(ref.referrerId)}
                    </td>
                    <td className="p-4">
                      {renderUser(ref.referredUserId)}
                    </td>
                    <td className="p-4">
                      {ref.status === 'completed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                      {ref.status === 'failed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" title={ref.reason}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                      {ref.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      ${ref.rewardAmount?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
