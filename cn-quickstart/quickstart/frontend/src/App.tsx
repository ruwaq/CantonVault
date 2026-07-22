// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import './styles/vault.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './stores/toastStore';
import LoginView from './views/LoginView';
import Header from './components/Header';
import ToastNotification from './components/ToastNotification';
import RequireAuth from './components/RequireAuth';
import VaultView from './views/VaultView';

/**
 * App shell. SWR owns data fetching/caching globally (no per-store Providers
 * needed), so the only remaining Provider is ToastProvider for notifications.
 * UserProvider and VaultProvider are now passthrough Fragments kept only so
 * the import graph compiles; they can be removed in a follow-up.
 */

const App: React.FC = () => {
    return (
        <ToastProvider>
            <div className="app-container">
                <Routes>
                    {/* Full-screen public pages — no app chrome */}
                    <Route path="/" element={<Navigate to="/vault" replace />} />
                    <Route path="/login" element={<LoginView />} />
                    {/* Authenticated app — with header nav */}
                    <Route path="/*" element={
                        <RequireAuth>
                            <>
                                <Header />
                                <main className="container app-main">
                                    <Routes>
                                        <Route path="/home" element={<Navigate to="/vault" replace />} />
                                        <Route path="/vault" element={<VaultView />} />
                                        <Route path="*" element={
                                            <div className="text-center mt-5">
                                                <h3 className="text-white">Page not found</h3>
                                                <p className="text-on-glass">The page you requested does not exist.</p>
                                            </div>
                                        } />
                                    </Routes>
                                </main>
                            </>
                        </RequireAuth>
                    } />
                </Routes>
            </div>
            <ToastNotification />
        </ToastProvider>
    );
};

export default App;
