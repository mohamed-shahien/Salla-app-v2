// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import Protected from '../components/Protected';
import { api } from '../lib/api';

function Content() {
  const [brands, setBrands] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/brands');
        setBrands(data);
      } catch (e) {
        setBrands({ error: e?.response?.data || e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl mb-3">لوحة التحكم</h1>
      <pre className="bg-gray-100 p-3 rounded overflow-auto text-xs">
        {JSON.stringify(brands, null, 2)}
      </pre>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Protected>
      <Content />
    </Protected>
  );
}
