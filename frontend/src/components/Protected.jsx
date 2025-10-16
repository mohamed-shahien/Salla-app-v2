import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Protected({ children }) {
        const { isBootstrapped, session } = useAuth();
        if (!isBootstrapped) return null; // ممكن تعمل سكيليتون هنا
        if (!session?.authenticated) return <Navigate to="/" replace />;
        return children;
}
