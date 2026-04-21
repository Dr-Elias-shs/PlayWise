"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllWallets, getAllRedemptions, getAllShopItems,
  addShopItem, toggleShopItem, deleteShopItem,
  updateRedemptionStatus, formatPlayTime,
} from '@/lib/wallet';

const ADMIN_PIN = '1234'; // change this in production

type Tab = 'students' | 'redemptions' | 'shop';

interface Wallet {
  student_name: string; coins: number; total_earned: number;
  total_redeemed: number; play_time_seconds: number; games_played: number;
}
interface Redemption {
  id: string; student_name: string; item_name: string;
  item_emoji: string; cost: number; status: string; redeemed_at: string;
}
interface ShopItem {
  id: string; name: string; description: string;
  cost: number; emoji: string; available: boolean;
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const check = () => {
    if (pin === ADMIN_PIN) { onUnlock(); }
    else { setError(true); setPin(''); setTimeout(() => setError(false), 1500); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 rounded-3xl p-8 w-full max-w-sm text-center border border-slate-700">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-2xl font-black text-white mb-1">Admin Access</h2>
        <p className="text-slate-400 text-sm mb-6">Enter your PIN to continue</p>
        <input
          type="password" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="PIN"
          className={`w-full text-center text-2xl font-black tracking-widest bg-slate-700 text-white border-2 rounded-2xl py-3 outline-none mb-4 transition-colors ${
            error ? 'border-red-500' : 'border-slate-600 focus:border-violet-500'
          }`}
        />
        {error && <p className="text-red-400 text-sm mb-3 font-bold">Wrong PIN</p>}
        <button onClick={check}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl transition-colors">
          Unlock
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>('students');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New shop item form
  const [form, setForm] = useState({ name: '', description: '', cost: '', emoji: '🎁' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [w, r, s] = await Promise.all([getAllWallets(), getAllRedemptions(), getAllShopItems()]);
    setWallets(w); setRedemptions(r); setShopItems(s);
    setLoading(false);
  };

  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  const handleAddItem = async () => {
    if (!form.name || !form.cost) return;
    setSaving(true);
    await addShopItem(form.name, form.description, parseInt(form.cost), form.emoji);
    setForm({ name: '', description: '', cost: '', emoji: '🎁' });
    await load();
    setSaving(false);
  };

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    await updateRedemptionStatus(id, status);
    await load();
  };

  const pendingCount = redemptions.filter(r => r.status === 'pending').length;

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors font-bold">← Back</button>
        <div className="flex-1">
          <h1 className="text-xl font-black">🛠️ Admin Dashboard</h1>
          <p className="text-slate-400 text-xs">PlayWise — School Management</p>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-1 pt-3">
        {([
          { id: 'students',    label: '👨‍🎓 Students',    badge: wallets.length },
          { id: 'redemptions', label: '🎁 Redemptions', badge: pendingCount || undefined },
          { id: 'shop',        label: '🏪 Shop Items',  badge: shopItems.length },
        ] as { id: Tab; label: string; badge?: number }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 font-bold text-sm rounded-t-xl transition-all relative ${
              tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
            {t.badge !== undefined && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-black ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
              className="w-10 h-10 border-4 border-slate-300 border-t-slate-800 rounded-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── Students ── */}
            {tab === 'students' && (
              <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Student', 'Coins', 'Total Earned', 'Redeemed', 'Play Time', 'Games'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-slate-500 font-bold text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {wallets.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-10 text-slate-400">No students yet. Play some games!</td></tr>
                      )}
                      {wallets.map((w, i) => (
                        <motion.tr key={w.student_name}
                          initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-800">{w.student_name}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 font-black text-amber-600">
                              ₿ {w.coins.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">₿ {w.total_earned.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-600">₿ {w.total_redeemed.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-600">{formatPlayTime(w.play_time_seconds)}</td>
                          <td className="px-4 py-3 text-slate-600">{w.games_played}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Redemptions ── */}
            {tab === 'redemptions' && (
              <motion.div key="redemptions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Student', 'Item', 'Cost', 'Date', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-slate-500 font-bold text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {redemptions.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-10 text-slate-400">No redemptions yet.</td></tr>
                      )}
                      {redemptions.map((r, i) => (
                        <motion.tr key={r.id}
                          initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-800">{r.student_name}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <span>{r.item_emoji}</span>
                              <span className="text-slate-700">{r.item_name}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-amber-600 font-bold">₿ {r.cost}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.redeemed_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
                              r.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-red-100 text-red-600'
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            {r.status === 'pending' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleStatus(r.id, 'approved')}
                                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors">
                                  ✓ Approve
                                </button>
                                <button onClick={() => handleStatus(r.id, 'rejected')}
                                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors">
                                  ✕ Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Shop items ── */}
            {tab === 'shop' && (
              <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                {/* Add new item form */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h3 className="font-black text-slate-800 mb-4">➕ Add New Reward</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                      placeholder="Emoji 🎁"
                      className="border-2 border-slate-200 focus:border-violet-400 rounded-xl px-3 py-2 text-center text-2xl outline-none" />
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Reward name *"
                      className="border-2 border-slate-200 focus:border-violet-400 rounded-xl px-3 py-2 outline-none font-medium" />
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description (optional)"
                      className="border-2 border-slate-200 focus:border-violet-400 rounded-xl px-3 py-2 outline-none" />
                    <input value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                      type="number" placeholder="Cost in ₿ *" min="1"
                      className="border-2 border-slate-200 focus:border-violet-400 rounded-xl px-3 py-2 outline-none font-bold" />
                  </div>
                  <button onClick={handleAddItem} disabled={saving || !form.name || !form.cost}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-black rounded-xl transition-colors">
                    {saving ? 'Adding...' : 'Add Reward'}
                  </button>
                </div>

                {/* Existing items */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Item', 'Description', 'Cost', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-slate-500 font-bold text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {shopItems.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-10 text-slate-400">No items yet. Add one above!</td></tr>
                      )}
                      {shopItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2 font-bold text-slate-800">
                              <span className="text-xl">{item.emoji}</span> {item.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{item.description || '—'}</td>
                          <td className="px-4 py-3 text-amber-600 font-black">₿ {item.cost}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>{item.available ? 'Active' : 'Hidden'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => toggleShopItem(item.id, !item.available).then(load)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">
                                {item.available ? 'Hide' : 'Show'}
                              </button>
                              <button onClick={() => deleteShopItem(item.id).then(load)}
                                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold rounded-lg transition-colors">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
