/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import BotsList from './pages/BotsList';
import BotDashboardLayout from './pages/BotDashboardLayout';
import UsersList from './pages/UsersList';
import ChannelsList from './pages/ChannelsList';
import GroupsList from './pages/GroupsList';
import ReferralsList from './pages/ReferralsList';
import WithdrawalsList from './pages/WithdrawalsList';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<BotsList />} />
              <Route path="/bots/:botId" element={<BotDashboardLayout />}>
                <Route path="users" element={<UsersList />} />
                <Route path="channels" element={<ChannelsList />} />
                <Route path="groups" element={<GroupsList />} />
                <Route path="referrals" element={<ReferralsList />} />
                <Route path="withdrawals" element={<WithdrawalsList />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
