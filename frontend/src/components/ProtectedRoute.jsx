// src/components/ProtectedRoute.jsx
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function ProtectedRoute({ children }) {
  const isBootstrapped = useAuth(s => s.isBootstrapped);
  const isAuthed       = useAuth(s => s.isAuthed);
  const reauthUrl      = useAuth(s => s.reauthUrl);
  const bootstrap      = useAuth(s => s.bootstrap);

  useEffect(() => { if (!isBootstrapped) bootstrap(); }, [isBootstrapped, bootstrap]);

  if (!isBootstrapped) return null;            // ممكن سبينر
  if (reauthUrl)       return <Navigate to="/reconnect" replace />;
  if (!isAuthed)       return <Navigate to="/login" replace />;
  return children;
}
