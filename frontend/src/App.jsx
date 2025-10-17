// src/App.jsx
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './store/auth';
import Header from './components/Header';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const isBootstrapped = useAuth((s) => s.isBootstrapped);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (!isBootstrapped) return null; // ممكن سكيليتون

  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
