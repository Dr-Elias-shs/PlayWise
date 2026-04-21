"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShopItems, getMyRedemptions, redeemItem, getWallet } from '@/lib/wallet';

interface ShopItem { id: string; name: string; description: string; cost: number; emoji: string; }
interface Redemption { id: string; item_name: string; item_emoji: string; cost: number; status: string; redeemed_at: string; }

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};

interface Props { studentName: string; onBack: () => void; onCoinsChanged: () => void; }

export function RedeemPage({ studentName, onBack, onCoinsChanged }: Props) {
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [tab, setTab] = useState<'shop' | 'history'>('shop');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = async () => {
    const [wallet, shopData, histData] = await Promise.all([
      getWallet(studentName),
      getShopItems(),
      getMyRedemptions(studentName),
    ]);
    setCoins(wallet?.coins ?? 0);
    setItems(shopData);
    setHistory(histData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRedeem = async (item: ShopItem) => {
    if (coins < item.cost) return;
    setRedeeming(item.id);
    try {
      await redeemItem(studentName, item.id, item.name, item.emoji, item.cost);
      setCoins(c => c - item.cost);
      await load();
      onCoinsChanged();
      showToast(`Redeemed ${item.name}! Waiting for approval.`, true);
    } catch (e: any) {
      showToast(e.message ?? 'Something went wrong', false);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 shadow-sm">
        <button onClick={onBack}
          className="text-slate-400 hover:text-slate-700 font-bold transition-colors">← Back</button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-800">🏪 Reward Shop</h1>
          <p className="text-slate-500 text-sm">Spend your PlayBits on cool rewards</p>
        </div>
        {/* Balance */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 rounded-2xl shadow">
          <span className="text-xl">₿</span>
          <div>
            <div className="text-white font-black text-lg leading-none">{coins.toLocaleString()}</div>
            <div className="text-yellow-100 text-xs">PlayBits</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-5 pb-2">
        {(['shop', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
              tab === t ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-amber-50'
            }`}>
            {t === 'shop' ? '🛍️ Shop' : '📜 My Redemptions'}
          </button>
        ))}
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
              className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── Shop ── */}
            {tab === 'shop' && (
              <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {items.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">🏗️</div>
                    <p className="text-slate-500 font-bold text-lg">Shop coming soon!</p>
                    <p className="text-slate-400 text-sm mt-1">Your teacher is adding rewards. Keep earning coins!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, i) => {
                      const canAfford = coins >= item.cost;
                      return (
                        <motion.div key={item.id}
                          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: i * 0.06 }}
                          className={`bg-white rounded-3xl p-6 shadow-md border-2 transition-all ${
                            canAfford ? 'border-amber-200 hover:border-amber-400 hover:shadow-lg' : 'border-slate-100 opacity-60'
                          }`}>
                          <div className="text-5xl mb-3 text-center">{item.emoji}</div>
                          <h3 className="font-black text-slate-800 text-lg text-center">{item.name}</h3>
                          {item.description && (
                            <p className="text-slate-500 text-sm text-center mt-1">{item.description}</p>
                          )}
                          <div className="flex items-center justify-center gap-1 mt-3 mb-4">
                            <span className="text-amber-500 font-black text-xl">₿</span>
                            <span className="text-amber-600 font-black text-xl">{item.cost}</span>
                          </div>
                          <button
                            onClick={() => handleRedeem(item)}
                            disabled={!canAfford || redeeming === item.id}
                            className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white hover:scale-105 shadow-md'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}>
                            {redeeming === item.id ? '⏳ Redeeming...'
                              : canAfford ? '🎁 Redeem'
                              : `Need ${item.cost - coins} more ₿`}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── History ── */}
            {tab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {history.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-slate-500 font-bold">No redemptions yet</p>
                    <p className="text-slate-400 text-sm mt-1">Visit the shop and spend your coins!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((r, i) => (
                      <motion.div key={r.id}
                        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-slate-100">
                        <div className="text-3xl">{r.item_emoji}</div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">{r.item_name}</div>
                          <div className="text-slate-400 text-xs mt-0.5">
                            {new Date(r.redeemed_at).toLocaleDateString()} · ₿{r.cost}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {r.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl font-bold text-white text-sm ${
              toast.ok ? 'bg-emerald-500' : 'bg-red-500'
            }`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
