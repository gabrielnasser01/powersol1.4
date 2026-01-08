import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';
import { Home } from './pages/Home';
import { Lottery } from './pages/Lottery';
import { Affiliates } from './pages/Affiliates';
import { Profile } from './pages/Profile';
import { Transparency } from './pages/Transparency';
import { FAQ } from './pages/FAQ';
import { Terms } from './pages/Terms';
import { Jackpot } from './pages/Jackpot';
import { Halloween } from './pages/Halloween';
import { GrandPrize } from './pages/GrandPrize';
import { Missions } from './pages/Missions';
import { Privacy } from './pages/Privacy';
import { AffiliateDashboard } from './pages/AffiliateDashboard';
import { AffiliateDashboardLevel3 } from './pages/AffiliateDashboardLevel3';

export function AppRouter() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" style={{ background: '#0a0b0f' }}>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lottery" element={<Lottery />} />
          <Route path="/jackpot" element={<Jackpot />} />
          <Route path="/affiliates" element={<Affiliates />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/halloween" element={<Halloween />} />
          <Route path="/grand-prize" element={<GrandPrize />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/affiliate-dashboard" element={<AffiliateDashboard />} />
          <Route path="/affiliate-dashboard-level3" element={<AffiliateDashboardLevel3 />} />
        </Routes>
        <Footer />
        <BackToTop />
      </div>
    </Router>
  );
}