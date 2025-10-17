// src/components/Protected.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Protected({ children }) {
        const isBootstrapped = useAuth((s) => s.isBootstrapped);
        const isAuthed = useAuth((s) => s.session?.authenticated);

        if (!isBootstrapped) return null;
        if (!isAuthed) return <Navigate to="/" replace />;
        return children;
}
