// src/pages/ChangePassword.jsx
import { useState } from 'react';
import { useAuth } from '../store/auth';
import { useNavigate } from 'react-router-dom';

export default function ChangePassword(){
  const [currentPassword, setCur] = useState('');
  const [newPassword, setNew]     = useState('');
  const [msg, setMsg]             = useState(null);
  const { changePassword, loading, error } = useAuth();
  const nav = useNavigate();

  async function onSubmit(e){
    e.preventDefault();
    const res = await changePassword(currentPassword, newPassword);
    if (res.ok) {
      setMsg('تم تغيير الباسورد بنجاح');
      setTimeout(()=> nav('/dashboard', { replace:true }), 700);
    }
  }

  return (
    <div style={{maxWidth:420, margin:'60px auto'}}>
      <h2>تغيير الباسورد</h2>
      <form onSubmit={onSubmit}>
        <div><label>الحالي</label><input type="password" value={currentPassword} onChange={e=>setCur(e.target.value)} required/></div>
        <div><label>الجديد</label><input type="password" value={newPassword} onChange={e=>setNew(e.target.value)} required/></div>
        {error && <div style={{color:'crimson', marginTop:8}}>خطأ: {String(error)}</div>}
        {msg && <div style={{color:'green', marginTop:8}}>{msg}</div>}
        <button disabled={loading} type="submit">{loading?'جارى التغيير…':'تغيير'}</button>
      </form>
    </div>
  );
}
