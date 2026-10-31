"use client";
import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/lib/msal';
import { useSessionStore } from '@/store/useSessionStore';

// Admin pages open by Wisely role, not by a PIN: sign in with the school Microsoft
// account and Wisely says whether this person is an admin or a member of staff.
//   level 'admin': admin, IT admin, academic director
//   level 'staff': any non-student account (question tools)
export function StaffGate({ level, onUnlock }: { level: 'admin' | 'staff'; onUnlock: () => void }) {
  const { instance, accounts } = useMsal();
  const { session, checked, load, start } = useSessionStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const allowed = !!session && (level === 'admin' ? session.isAdmin : session.isStaff || session.isAdmin);

  useEffect(() => { if (!checked) load(); }, [checked, load]);
  useEffect(() => { if (allowed) onUnlock(); }, [allowed, onUnlock]);

  const signIn = async () => {
    setBusy(true); setError('');
    try {
      const account = accounts[0] ?? (await instance.loginPopup(loginRequest)).account;
      const s = account ? await start(instance, account) : null;
      if (!s) setError('Sign-in could not be checked. Try again.');
      else if (!(level === 'admin' ? s.isAdmin : s.isStaff || s.isAdmin)) setError('This account does not have access to this page.');
    } catch (e) {
      if ((e as { errorCode?: string })?.errorCode !== 'user_cancelled') setError('Sign-in failed. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="bg-slate-800 rounded-3xl p-8 w-full max-w-sm text-center border border-slate-700">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-2xl font-black text-white mb-1">{level === 'admin' ? 'Admin access' : 'Staff access'}</h2>
        <p className="text-slate-400 text-sm mb-6">
          Sign in with your school Microsoft account. Access follows your role in Wisely.
        </p>
        {session && !allowed && (
          <p className="text-amber-300 text-sm mb-4">Signed in as {session.email}, which does not have access.</p>
        )}
        <button onClick={signIn} disabled={busy}
          className="w-full py-3 rounded-2xl font-black text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60">
          {busy ? 'Checking…' : 'Sign in with Microsoft'}
        </button>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    </div>
  );
}
