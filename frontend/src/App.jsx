import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './store/auth';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import VerifyStore from './pages/VerifyStore';
import NotFound from './pages/NotFound';

export default function App() {
  const { bootstrap, isBootstrapped } = useAuth();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (!isBootstrapped) return null; // مكان جيد لسكيليتون

  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/verify" element={<VerifyStore />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
