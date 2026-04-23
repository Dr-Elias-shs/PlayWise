"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllWallets, getAllRedemptions, getAllShopItems,
  addShopItem, toggleShopItem, deleteShopItem,
  updateRedemptionStatus, formatPlayTime,
  getAllScores, getAllTransactions, getAllSessions,
  getGlobalConfig, setGlobalConfig,
} from '@/lib/wallet';
import { ALL_GAMES } from '@/lib/gameConfigs';
import { MAP_REGISTRY } from '@/lib/map-registry';
import { ROOMS } from '@/lib/rooms';

const ADMIN_PIN = 'astalabista'; // change this in production

function resolveGameName(id: string | null | undefined, focusTable?: number): string {
  if (!id || id === 'multiplication') {
    // Multiplication score — show which table if known
    if (focusTable && focusTable > 0) return `✖️ ×${focusTable} Table`;
    const mult = ALL_GAMES.find(g => g.id === 'multiplication');
    if (mult) return `${mult.emoji} ${mult.title}`;
  }
  if (!id) return 'Unknown';
  const hub  = ALL_GAMES.find(g => g.id === id);
  if (hub)  return `${hub.emoji} ${hub.title}`;
  const room = ROOMS.find(r => r.key === id);
  if (room) return `${room.emoji} ${room.label}`;
  return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

type Tab = 'students' | 'redemptions' | 'shop' | 'analytics' | 'games' | 'settings';

interface Wallet {
  student_name: string; coins: number; total_earned: number;
  total_redeemed: number; play_time_seconds: number; games_played: number;
  grade: string;
}
interface Redemption {
  id: string; student_name: string; item_name: string;
  item_emoji: string; cost: number; status: string; redeemed_at: string;
}
interface ShopItem {
  id: string; name: string; description: string;
  cost: number; emoji: string; available: boolean;
}
interface Score {
  student_name: string; game_type: string | null; focus_table: number; score: number; timestamp: string;
}
interface Transaction {
  student_name: string; amount: number; source: string; game_id: string; created_at: string;
}
interface Session {
  student_name: string; game_id: string; coins_earned: number; play_time_seconds: number; created_at: string;
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
  const [scores, setScores] = useState<Score[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [wallEditorConfigs, setWallEditorConfigs] = useState<Record<string, boolean>>({});
  const [gameSettings, setGameSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Student filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'coins' | 'games' | 'playtime' | 'name'>('coins');

  // New shop item form
  const [form, setForm] = useState({ name: '', description: '', cost: '', emoji: '🎁' });
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [analyticsGameId, setAnalyticsGameId] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [w, r, s, sc, tr, se, cfg, gs] = await Promise.all([
        getAllWallets().catch(() => []),
        getAllRedemptions().catch(() => []),
        getAllShopItems().catch(() => []),
        getAllScores().catch(() => []),
        getAllTransactions().catch(() => []),
        getAllSessions().catch(() => []),
        getGlobalConfig('wall_editor_enabled').catch(() => ({})),
        getGlobalConfig('game_settings').catch(() => ({})),
      ]);
      setWallets(w); setRedemptions(r); setShopItems(s);
      setScores(sc); setTransactions(tr); setSessions(se);
      setWallEditorConfigs(cfg || {});
      setGameSettings(gs || {});
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
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
          { id: 'analytics',   label: '📊 Analytics' },
          { id: 'games',       label: '🎮 Games', badge: Object.values(gameSettings).filter(v => v === false).length || undefined },
          { id: 'settings',    label: '⚙️ Settings' },
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
              <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                {/* Filters bar */}
                <div className="flex flex-wrap gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  {/* Search */}
                  <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Search by name..."
                    className="flex-1 min-w-[180px] px-3 py-2 border-2 border-slate-200 focus:border-violet-400 rounded-xl text-sm font-medium outline-none"
                  />
                  {/* Grade filter */}
                  <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                    className="px-3 py-2 border-2 border-slate-200 focus:border-violet-400 rounded-xl text-sm font-bold outline-none bg-white cursor-pointer">
                    <option value="">All Grades</option>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                  {/* Sort */}
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border-2 border-slate-200 focus:border-violet-400 rounded-xl text-sm font-bold outline-none bg-white cursor-pointer">
                    <option value="coins">Sort: Most Coins</option>
                    <option value="games">Sort: Most Games</option>
                    <option value="playtime">Sort: Most Play Time</option>
                    <option value="name">Sort: Name A–Z</option>
                  </select>
                  {/* Stats summary */}
                  <div className="ml-auto flex items-center gap-4 text-xs text-slate-400 font-medium">
                    <span>{wallets.length} total students</span>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['#', 'Student', 'Grade', 'Coins', 'Games Played', 'Play Time', 'Total Earned', 'Redeemed'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-slate-500 font-bold text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(() => {
                        const filtered = wallets
                          .filter(w =>
                            (!search || w.student_name.toLowerCase().includes(search.toLowerCase())) &&
                            (!gradeFilter || w.grade === gradeFilter)
                          )
                          .sort((a, b) => {
                            if (sortBy === 'coins')    return b.coins - a.coins;
                            if (sortBy === 'games')    return b.games_played - a.games_played;
                            if (sortBy === 'playtime') return b.play_time_seconds - a.play_time_seconds;
                            return a.student_name.localeCompare(b.student_name);
                          });

                        if (filtered.length === 0) return (
                          <tr><td colSpan={8} className="text-center py-10 text-slate-400">
                            {wallets.length === 0 ? 'No students yet. Play some games!' : 'No students match your filters.'}
                          </td></tr>
                        );

                        return filtered.map((w, i) => (
                          <motion.tr key={w.student_name}
                            initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => setSelectedStudent(w.student_name)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group">
                            <td className="px-4 py-3 text-slate-400 font-bold text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 group-hover:text-violet-600 transition-colors">
                              {w.student_name}
                              <span className="ml-2 opacity-0 group-hover:opacity-100 text-[10px] uppercase text-violet-400">View Details →</span>
                            </td>
                            <td className="px-4 py-3">
                              {w.grade
                                ? <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs font-bold">Grade {w.grade}</span>
                                : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 font-black text-amber-600">
                                ₿ {w.coins.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5">
                                <span className="text-base">🎮</span>
                                <span className="font-bold text-slate-700">{w.games_played}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatPlayTime(w.play_time_seconds)}</td>
                            <td className="px-4 py-3 text-slate-500">₿ {w.total_earned.toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-500">₿ {w.total_redeemed.toLocaleString()}</td>
                          </motion.tr>
                        ));
                      })()}
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
                {/* ... existing shop content ... */}
                {/* (I'll keep the existing content here, but I need to make sure I don't break the structure) */}
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

            {/* ── Analytics ── */}
            {tab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-wider">🎯 Filter:</span>

                  {/* Game filter — hub games + world rooms */}
                  <select value={analyticsGameId} onChange={e => setAnalyticsGameId(e.target.value)}
                    className="px-3 py-2 border-2 border-slate-200 focus:border-violet-400 rounded-xl text-sm font-bold outline-none bg-white cursor-pointer">
                    <option value="all">All Games</option>
                    <optgroup label="── Hub Games">
                      {ALL_GAMES.map(g => (
                        <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>
                      ))}
                    </optgroup>
                    <optgroup label="── World Rooms">
                      {ROOMS.map(r => (
                        <option key={r.key} value={r.key}>{r.emoji} {r.label}</option>
                      ))}
                    </optgroup>
                  </select>

                  {/* Grade filter */}
                  <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                    className="px-3 py-2 border-2 border-slate-200 focus:border-violet-400 rounded-xl text-sm font-bold outline-none bg-white cursor-pointer">
                    <option value="">All Grades</option>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>

                  <div className="ml-auto text-xs font-bold text-slate-400">{sessions.length} total sessions</div>
                </div>

                {/* Summary cards */}
                {(() => {
                  const gradeStudents = gradeFilter
                    ? new Set(wallets.filter(w => w.grade === gradeFilter).map(w => w.student_name))
                    : null;

                  const filteredSessions = sessions
                    .filter(s => analyticsGameId === 'all' || s.game_id === analyticsGameId)
                    .filter(s => !gradeStudents || gradeStudents.has(s.student_name));

                  const totalCoins    = filteredSessions.reduce((a, s) => a + (s.coins_earned || 0), 0);
                  const totalTimeSec  = filteredSessions.reduce((a, s) => a + (s.play_time_seconds || 0), 0);
                  const avgTime       = filteredSessions.length > 0 ? Math.round(totalTimeSec / filteredSessions.length) : 0;
                  const uniquePlayers = new Set(filteredSessions.map(s => s.student_name)).size;

                  const sevenDaysAgo  = Date.now() - 7 * 24 * 60 * 60 * 1000;
                  const activePlayers = new Set(
                    filteredSessions
                      .filter(s => new Date(s.created_at).getTime() > sevenDaysAgo)
                      .map(s => s.student_name)
                  ).size;

                  const statCards = [
                    { icon: '🎮', label: 'Sessions',       value: filteredSessions.length.toLocaleString(), color: 'text-violet-600' },
                    { icon: '💰', label: 'Coins Earned',   value: `₿ ${totalCoins.toLocaleString()}`,       color: 'text-amber-600'  },
                    { icon: '⏱️', label: 'Total Play Time', value: formatPlayTime(totalTimeSec),             color: 'text-blue-600'   },
                    { icon: '⌛', label: 'Avg per Session', value: formatPlayTime(avgTime),                  color: 'text-teal-600'   },
                    { icon: '👥', label: 'Unique Players',  value: uniquePlayers.toLocaleString(),            color: 'text-slate-700'  },
                    { icon: '🔥', label: 'Active (7 days)', value: activePlayers.toLocaleString(),            color: 'text-emerald-600'},
                  ];

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {statCards.map(c => (
                        <div key={c.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="text-2xl mb-1">{c.icon}</div>
                          <div className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-0.5">{c.label}</div>
                          <div className={`text-lg font-black ${c.color}`}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Most Played / Top Players */}
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                    {analyticsGameId === 'all' ? (
                      <>
                        <h3 className="text-lg font-black text-slate-800 mb-6">🔥 Most Played Games</h3>
                        <div className="space-y-3">
                          {(() => {
                            const gradeStudents = gradeFilter
                              ? new Set(wallets.filter(w => w.grade === gradeFilter).map(w => w.student_name))
                              : null;
                            const counts: Record<string, number> = {};
                            sessions
                              .filter(s => !gradeStudents || gradeStudents.has(s.student_name))
                              .forEach(s => { if (s.game_id) counts[s.game_id] = (counts[s.game_id] || 0) + 1; });
                            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                            const max = sorted[0]?.[1] || 1;
                            if (sorted.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">No sessions yet.</p>;
                            return sorted.map(([id, count]) => (
                              <div key={id}>
                                <div className="flex justify-between text-sm font-bold mb-1">
                                  <span className="text-slate-700">{resolveGameName(id)}</span>
                                  <span className="text-slate-400">{count}×</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }}
                                    className="h-full bg-violet-500 rounded-full" />
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-black text-slate-800 mb-6">👑 Top Players — {resolveGameName(analyticsGameId)}</h3>
                        <div className="space-y-3">
                          {(() => {
                            const gradeStudents = gradeFilter
                              ? new Set(wallets.filter(w => w.grade === gradeFilter).map(w => w.student_name))
                              : null;
                            const playerSessions: Record<string, { coins: number; count: number }> = {};
                            sessions
                              .filter(s => s.game_id === analyticsGameId)
                              .filter(s => !gradeStudents || gradeStudents.has(s.student_name))
                              .forEach(s => {
                                if (!playerSessions[s.student_name]) playerSessions[s.student_name] = { coins: 0, count: 0 };
                                playerSessions[s.student_name].coins += s.coins_earned || 0;
                                playerSessions[s.student_name].count += 1;
                              });
                            const sorted = Object.entries(playerSessions).sort((a, b) => b[1].coins - a[1].coins).slice(0, 8);
                            if (sorted.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">No players yet.</p>;
                            const medals = ['🥇','🥈','🥉'];
                            return sorted.map(([name, { coins, count }], i) => (
                              <div key={name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                                <span className="text-lg w-6 text-center">{medals[i] ?? `${i+1}`}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-slate-700 truncate text-sm">{name}</div>
                                  <div className="text-[10px] text-slate-400">{count} session{count !== 1 ? 's' : ''}</div>
                                </div>
                                <span className="font-black text-amber-600 text-sm">₿ {coins.toLocaleString()}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Coins by Game / Per-game time breakdown */}
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                    {analyticsGameId === 'all' ? (
                      <>
                        <h3 className="text-lg font-black text-slate-800 mb-6">💰 Coins Earned by Game</h3>
                        <div className="space-y-3">
                          {(() => {
                            const gradeStudents = gradeFilter
                              ? new Set(wallets.filter(w => w.grade === gradeFilter).map(w => w.student_name))
                              : null;
                            const earned: Record<string, number> = {};
                            sessions
                              .filter(s => !gradeStudents || gradeStudents.has(s.student_name))
                              .forEach(s => { if (s.game_id) earned[s.game_id] = (earned[s.game_id] || 0) + (s.coins_earned || 0); });
                            const sorted = Object.entries(earned).sort((a, b) => b[1] - a[1]);
                            const max = sorted[0]?.[1] || 1;
                            if (sorted.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">No data yet.</p>;
                            return sorted.map(([id, coins]) => (
                              <div key={id}>
                                <div className="flex justify-between text-sm font-bold mb-1">
                                  <span className="text-slate-700">{resolveGameName(id)}</span>
                                  <span className="text-amber-600">₿ {coins.toLocaleString()}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${(coins / max) * 100}%` }}
                                    className="h-full bg-amber-400 rounded-full" />
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-black text-slate-800 mb-6">📈 Recent Sessions — {resolveGameName(analyticsGameId)}</h3>
                        <div className="divide-y divide-slate-50">
                          {(() => {
                            const gradeStudents = gradeFilter
                              ? new Set(wallets.filter(w => w.grade === gradeFilter).map(w => w.student_name))
                              : null;
                            const filtered = sessions
                              .filter(s => s.game_id === analyticsGameId)
                              .filter(s => !gradeStudents || gradeStudents.has(s.student_name))
                              .slice(0, 8);
                            if (filtered.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">No activity yet.</p>;
                            return filtered.map((s, i) => (
                              <div key={i} className="py-3 flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-slate-700 text-sm">{s.student_name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-amber-600 font-black text-sm">+₿ {s.coins_earned}</div>
                                  {s.play_time_seconds > 0 && (
                                    <div className="text-[10px] text-slate-400">{formatPlayTime(s.play_time_seconds)}</div>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-800">
                      🕒 Activity Log {analyticsGameId !== 'all' && `— ${resolveGameName(analyticsGameId)}`}
                      {gradeFilter && ` · Grade ${gradeFilter}`}
                    </h3>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          {['Student', 'Game', 'Coins', 'Play Time', 'Date'].map(h => (
                            <th key={h} className="text-left px-6 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(() => {
                          const gradeStudents = gradeFilter
                            ? new Set(wallets.filter(w => w.grade === gradeFilter).map(w => w.student_name))
                            : null;
                          const filtered = sessions
                            .filter(s => analyticsGameId === 'all' || s.game_id === analyticsGameId)
                            .filter(s => !gradeStudents || gradeStudents.has(s.student_name));

                          if (filtered.length === 0) return (
                            <tr><td colSpan={5} className="text-center py-16 text-slate-400 font-bold">No activity for this filter.</td></tr>
                          );

                          return filtered.slice(0, 100).map((s, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3 font-bold text-slate-700">{s.student_name}</td>
                              <td className="px-6 py-3">
                                <span className="px-2 py-1 bg-slate-100 rounded-lg text-[11px] font-black text-slate-500 whitespace-nowrap">
                                  {resolveGameName(s.game_id)}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-black text-amber-600">+₿ {(s.coins_earned || 0).toLocaleString()}</td>
                              <td className="px-6 py-3 text-slate-500 text-xs">
                                {s.play_time_seconds > 0 ? formatPlayTime(s.play_time_seconds) : '—'}
                              </td>
                              <td className="px-6 py-3 text-slate-400 text-xs">
                                {new Date(s.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Games ── */}
            {tab === 'games' && (
              <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                {(() => {
                  const toggleGame = async (id: string, currentlyEnabled: boolean) => {
                    const next = { ...gameSettings, [id]: !currentlyEnabled };
                    setGameSettings(next);
                    const { error } = await setGlobalConfig('game_settings', next);
                    if (error) {
                      alert('Failed to save. Make sure you ran the SQL setup!');
                      const cfg = await getGlobalConfig('game_settings');
                      if (cfg) setGameSettings(cfg);
                    } else {
                      const cfg = await getGlobalConfig('game_settings');
                      if (cfg) setGameSettings(cfg);
                    }
                  };

                  return (
                    <>
                      {/* PlayWise World */}
                      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                        <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                          🗺️ PlayWise World
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">
                          Enable or disable the entire world exploration section for all students.
                        </p>
                        {(() => {
                          const isEnabled = gameSettings['world'] !== false;
                          return (
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-slate-200 bg-white">
                                  🌍
                                </div>
                                <div>
                                  <div className="font-black text-slate-800">World Exploration</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Walk the school, enter rooms, earn PlayBits</div>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleGame('world', isEnabled)}
                                className={`px-6 py-2 rounded-xl font-black text-sm transition-all shadow-sm ${
                                  isEnabled
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                }`}
                              >
                                {isEnabled ? '✅ Enabled' : '❌ Disabled'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Hub Games */}
                      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                        <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                          🕹️ Hub Games
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">
                          Toggle which games appear on the student hub page.
                        </p>
                        <div className="space-y-3">
                          {ALL_GAMES.map(game => {
                            const isEnabled = gameSettings[game.id] !== false;
                            return (
                              <div key={game.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-slate-200 bg-white">
                                    {game.emoji}
                                  </div>
                                  <div>
                                    <div className="font-black text-slate-800">{game.title}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {game.id}</div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleGame(game.id, isEnabled)}
                                  className={`px-6 py-2 rounded-xl font-black text-sm transition-all shadow-sm ${
                                    isEnabled
                                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                  }`}
                                >
                                  {isEnabled ? '✅ Enabled' : '❌ Disabled'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* World Rooms */}
                      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                        <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                          🗺️ World Rooms
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">
                          Toggle which rooms students can enter in the PlayWise World.
                        </p>
                        <div className="space-y-3">
                          {ROOMS.map(room => {
                            const isEnabled = gameSettings[room.key] !== false;
                            return (
                              <div key={room.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-slate-200 bg-white">
                                    {room.emoji}
                                  </div>
                                  <div>
                                    <div className="font-black text-slate-800">{room.label}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key: {room.key}</div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleGame(room.key, isEnabled)}
                                  className={`px-6 py-2 rounded-xl font-black text-sm transition-all shadow-sm ${
                                    isEnabled
                                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                  }`}
                                >
                                  {isEnabled ? '✅ Enabled' : '❌ Disabled'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* ── Settings ── */}
            {tab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    🧱 Wall Editor Controls
                  </h3>
                  <p className="text-slate-500 text-sm mb-8">
                    Enable or disable the wall editor button on the World Map for specific plans.
                  </p>

                  <div className="space-y-4">
                    {MAP_REGISTRY.map(map => {
                      const isEnabled = wallEditorConfigs[map.id] || false;
                      return (
                        <div key={map.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-sm">
                              🗺️
                            </div>
                            <div>
                              <div className="font-black text-slate-800">{map.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Map ID: {map.id}</div>
                            </div>
                          </div>

                          <button
                            disabled={loading}
                            onClick={async () => {
                              const next = { ...wallEditorConfigs, [map.id]: !isEnabled };
                              // Update local UI immediately for responsiveness
                              setWallEditorConfigs(next);
                              
                              // Save to DB
                              const { error } = await setGlobalConfig('wall_editor_enabled', next);
                              
                              if (error) {
                                alert('Failed to save setting. Make sure you ran the SQL setup!');
                                // Revert local state on error
                                const cfg = await getGlobalConfig('wall_editor_enabled');
                                if (cfg) setWallEditorConfigs(cfg);
                              } else {
                                // Final sync from DB to be absolutely sure
                                const cfg = await getGlobalConfig('wall_editor_enabled');
                                if (cfg) setWallEditorConfigs(cfg);
                              }
                            }}
                            className={`px-6 py-2 rounded-xl font-black text-sm transition-all shadow-sm ${
                              isEnabled 
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                            }`}
                          >
                            {isEnabled ? '✅ Enabled' : '❌ Disabled'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6">
                  <div className="flex gap-4">
                    <div className="text-3xl">💡</div>
                    <div>
                      <h4 className="font-black text-amber-900 mb-1">Admin Tip</h4>
                      <p className="text-amber-800/70 text-sm leading-relaxed font-medium">
                        When enabled, players will see a "✏️ Walls" button in their HUD. 
                        This is useful for quick fixes, but should usually be disabled during normal gameplay.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Student Detail Modal ── */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 border border-white/20"
            >
              {(() => {
                const w = wallets.find(x => x.student_name === selectedStudent);
                const sScores = scores.filter(s => s.student_name === selectedStudent);
                const sSessions = sessions.filter(s => s.student_name === selectedStudent);
                
                if (!w) return null;

                return (
                  <>
                    <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 blur-[100px] -mr-20 -mt-20" />
                      <div className="relative flex items-end gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center text-5xl shadow-xl">
                          {w.student_name[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-black">{w.student_name}</h2>
                            {w.grade && <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">Grade {w.grade}</span>}
                          </div>
                          <p className="text-slate-400 font-medium">Player Profile & Statistics</p>
                        </div>
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-0 right-0 text-slate-400 hover:text-white text-2xl">✕</button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                          { label: 'Current Balance', value: `₿ ${w.coins.toLocaleString()}`, color: 'text-amber-600', icon: '💰' },
                          { label: 'Total Earned', value: `₿ ${w.total_earned.toLocaleString()}`, color: 'text-emerald-600', icon: '📈' },
                          { label: 'Games Played', value: w.games_played, color: 'text-violet-600', icon: '🎮' },
                          { label: 'Play Time', value: formatPlayTime(w.play_time_seconds), color: 'text-blue-600', icon: '⏱️' },
                        ].map(stat => (
                          <div key={stat.label} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <div className="text-xl mb-1">{stat.icon}</div>
                            <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">{stat.label}</div>
                            <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* High Scores */}
                        <div>
                          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                            🏆 Best Scores
                          </h3>
                          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            {sScores.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 text-sm">No scores yet</div>
                            ) : (
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                  <tr>
                                    <th className="text-left px-4 py-2 text-slate-500 font-bold text-[10px] uppercase">Game</th>
                                    <th className="text-right px-4 py-2 text-slate-500 font-bold text-[10px] uppercase">Best Score</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {sScores.map((s, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-3 font-bold text-slate-700">{resolveGameName(s.game_type, s.focus_table)}</td>
                                      <td className="px-4 py-3 text-right font-black text-violet-600">{s.score.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>

                        {/* Recent Game Sessions */}
                        <div>
                          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                            🎮 Recent Sessions
                          </h3>
                          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            {sSessions.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 text-sm">No activity recorded</div>
                            ) : (
                              <div className="divide-y divide-slate-50">
                                {sSessions.slice(0, 5).map((s, i) => (
                                  <div key={i} className="p-4 flex justify-between items-center">
                                    <div>
                                      <div className="font-bold text-slate-700">{resolveGameName(s.game_id)}</div>
                                      <div className="text-[10px] text-slate-400">{new Date(s.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-amber-600 font-bold">+₿ {s.coins_earned}</div>
                                      <div className="text-[10px] text-slate-400">{formatPlayTime(s.play_time_seconds)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
