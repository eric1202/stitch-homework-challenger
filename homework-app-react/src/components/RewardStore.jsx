import { useState, useEffect, useMemo, useRef } from 'react';
import { db, liveQuery } from '../db';
import { useTranslation } from 'react-i18next';
import { triggerConfetti } from '../utils/confetti';
import {
  Gamepad2, IceCream, Palmtree, Book, Gift, Plus, Edit2,
  Trash2, History, Clock, CheckCircle2, X, RefreshCw
} from 'lucide-react';

const iconComponents = { Gamepad2, IceCream, Palmtree, Book, Gift };

const iconPresets = [
  { name: 'Gamepad2', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { name: 'IceCream', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  { name: 'Palmtree', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  { name: 'Book', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { name: 'Gift', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' }
];

export default function RewardStore() {
  const { t } = useTranslation();

  const [rewards, setRewards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [isSavingReward, setIsSavingReward] = useState(false);
  const [isRedeemingReward, setIsRedeemingReward] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userName, setUserName] = useState('Hero');
  const userNameRef = useRef('Hero');

  const [rewardForm, setRewardForm] = useState({
    title: '', icon: 'Gift', points: 50, expiryDate: '', stock: 1
  });

  useEffect(() => { userNameRef.current = userName; }, [userName]);

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date().setHours(0, 0, 0, 0);
  };

  const categories = useMemo(() => {
    const all = { key: 'all', label: t('rewards.categories.all'), count: rewards.length };
    const groups = iconPresets.map(preset => ({
      key: preset.name, label: t(`rewards.categories.${preset.name}`),
      iconName: preset.name, color: preset.color, bg: preset.bg,
      count: rewards.filter(r => r.icon === preset.name).length
    }));
    return [all, ...groups.filter(g => g.count > 0)];
  }, [rewards, t]);

  const filteredRewards = useMemo(() => {
    let list = rewards;
    if (selectedCategory !== 'all') list = list.filter(r => r.icon === selectedCategory);
    return [...list].sort((a, b) => {
      const aUnavailable = isExpired(a.expiry_date) || a.stock <= 0;
      const bUnavailable = isExpired(b.expiry_date) || b.stock <= 0;
      if (aUnavailable !== bUnavailable) return aUnavailable ? 1 : -1;
      return (b.id || 0) - (a.id || 0);
    });
  }, [rewards, selectedCategory]);

  const getIconComponent = (iconName) => iconComponents[iconName] || Gift;
  const getIconColor = (iconName) => iconPresets.find(p => p.name === iconName)?.color || 'text-primary';

  // Subscriptions
  useEffect(() => {
    let rewardsSub = null, logsSub = null, pointsSub = null;

    const nameSub = liveQuery(() => db.settings.get('userName')).subscribe(result => {
      const newName = result?.value || 'Hero';
      setUserName(newName);

      if (rewardsSub) rewardsSub.unsubscribe();
      if (logsSub) logsSub.unsubscribe();
      if (pointsSub) pointsSub.unsubscribe();

      rewardsSub = liveQuery(() => db.rewards.where('user_name').equals(newName).toArray()).subscribe(setRewards);
      logsSub = liveQuery(() => db.redemptionLogs.where('user_name').equals(newName).reverse().toArray()).subscribe(setLogs);
      pointsSub = liveQuery(async () => {
        try {
          const allTasks = await db.tasks.where('user_name').equals(newName).toArray();
          const spentLogs = await db.redemptionLogs.where('user_name').equals(newName).toArray();
          const spent = spentLogs.reduce((sum, log) => sum + (log.spent_points || 0), 0);
          const earned = allTasks.filter(t => t.completed).reduce((sum, t) => sum + (Number(t.points) || 0), 0);
          return earned - spent;
        } catch { return 0; }
      }).subscribe(setTotalPoints);
    });

    return () => {
      nameSub.unsubscribe();
      if (rewardsSub) rewardsSub.unsubscribe();
      if (logsSub) logsSub.unsubscribe();
      if (pointsSub) pointsSub.unsubscribe();
    };
  }, []);

  const refreshRewards = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const name = userNameRef.current;
      setRewards(await db.rewards.where('user_name').equals(name).toArray());
      setLogs(await db.redemptionLogs.where('user_name').equals(name).reverse().toArray());
      const allTasks = await db.tasks.where('user_name').equals(name).toArray();
      const spentLogs = await db.redemptionLogs.where('user_name').equals(name).toArray();
      const spent = spentLogs.reduce((sum, log) => sum + (log.spent_points || 0), 0);
      const earned = allTasks.filter(t => t.completed).reduce((sum, t) => sum + (Number(t.points) || 0), 0);
      setTotalPoints(earned - spent);
    } catch (error) {
      console.error('Failed to refresh:', error);
      alert(t('rewards.refreshFail'));
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const openAddModal = () => {
    setRewardForm({ title: '', icon: 'Gift', points: 50, expiryDate: '', stock: 1 });
    setShowAddModal(true);
  };

  const openEditModal = (reward) => {
    setEditingReward(reward);
    setRewardForm({ ...reward });
    setShowEditModal(true);
  };

  const saveReward = async () => {
    if (!rewardForm.title || isSavingReward) return;
    setIsSavingReward(true);
    try {
      const data = {
        title: rewardForm.title, icon: rewardForm.icon,
        points: Number(rewardForm.points) || 0,
        expiry_date: rewardForm.expiryDate,
        stock: Number(rewardForm.stock) || 0,
        user_name: userNameRef.current
      };
      if (editingReward) {
        await db.rewards.update(editingReward.id, data);
      } else {
        await db.rewards.add(data);
      }
      setShowAddModal(false); setShowEditModal(false); setEditingReward(null);
      await refreshRewards();
    } catch (err) {
      console.error('Failed to save reward:', err);
      alert(t('rewards.redeemFail') + err.message);
    } finally {
      setIsSavingReward(false);
    }
  };

  const deleteReward = async (id) => {
    if (confirm(t('rewards.deleteConfirm'))) await db.rewards.delete(id);
  };

  const redeemReward = async (reward) => {
    if (totalPoints < reward.points || reward.stock <= 0 || isExpired(reward.expiry_date) || isRedeemingReward) return;
    setIsRedeemingReward(true);
    try {
      await db.transaction('rw', db.rewards, db.redemptionLogs, async () => {
        const freshReward = await db.rewards.get(reward.id);
        if (!freshReward || freshReward.stock <= 0) throw new Error(t('rewards.outOfStock'));
        await db.rewards.update(reward.id, { stock: freshReward.stock - 1 });
        await db.redemptionLogs.add({
          reward_title: String(reward.title), spent_points: Number(reward.points),
          timestamp: Date.now(), user_name: userNameRef.current
        });
      });
      triggerConfetti();
      await refreshRewards();
    } catch (err) {
      alert(t('rewards.redeemFail') + err.message);
    } finally {
      setIsRedeemingReward(false);
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {isAdmin ? t('rewards.manageTitle') : t('rewards.title')} 🎁
          </h2>
          <p className="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{t('rewards.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsAdmin(!isAdmin)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${isAdmin ? 'bg-primary text-black' : 'bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800'}`}>
            <Edit2 className="w-4 h-4" />
            {isAdmin ? t('rewards.exitParentMode') : t('rewards.parentMode')}
          </button>
          {isAdmin && (
            <button onClick={openAddModal} className="bg-black text-white dark:bg-white dark:text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg">
              <Plus className="w-5 h-5" /> <span>{t('rewards.addNew')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Points Banner */}
      <div className="bg-primary p-6 rounded-3xl shadow-lg shadow-primary/20 flex items-center justify-between text-white overflow-hidden relative group">
        <div className="absolute -right-4 -top-4 size-32 bg-white/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest opacity-70">{t('rewards.availableBalance')}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black">{totalPoints}</span>
            <span className="text-xl font-bold">pts</span>
          </div>
        </div>
        <History className="w-16 h-16 opacity-20 relative z-10" />
      </div>

      {/* Rewards Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black flex items-center gap-2">
            <Gift className="w-8 h-8 text-primary" /> {t('rewards.rewardsList') || '奖励列表'}
          </h3>
          <button onClick={refreshRewards} disabled={isRefreshing}
            className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
            <RefreshCw className={`w-5 h-5 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {categories.map(cat => {
            const CatIcon = cat.iconName ? iconComponents[cat.iconName] : null;
            return (
              <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-200 shrink-0 border ${selectedCategory === cat.key
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : 'bg-surface-light dark:bg-surface-dark border-gray-100 dark:border-gray-800 text-text-sub-light dark:text-text-sub-dark hover:border-primary/30'}`}>
                {CatIcon && <CatIcon className="w-4 h-4" />}
                <span>{cat.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg min-w-[20px] text-center ${selectedCategory === cat.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark'}`}>{cat.count}</span>
              </button>
            );
          })}
        </div>

        {rewards.length === 0 ? (
          <div className="py-20 text-center bg-surface-light dark:bg-surface-dark rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
            <p className="text-xl font-black text-text-sub-light">{t('rewards.noRewards')}</p>
            {isAdmin && <button onClick={openAddModal} className="mt-4 text-primary font-bold hover:underline">{t('rewards.addFirst')}</button>}
          </div>
        ) : filteredRewards.length === 0 ? (
          <div className="py-16 text-center bg-surface-light dark:bg-surface-dark rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
            <p className="text-lg font-bold text-text-sub-light">{t('rewards.noRewardsInCategory')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredRewards.map(reward => {
              const IconComp = getIconComponent(reward.icon);
              return (
                <div key={reward.id}
                  className={`relative bg-surface-light dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 flex flex-col gap-4 group hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 ${(isExpired(reward.expiry_date) || reward.stock <= 0) ? 'opacity-60 grayscale scale-[0.98]' : ''}`}>
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                    {isExpired(reward.expiry_date) ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-lg uppercase">{t('rewards.expired')}</span>
                    ) : reward.stock <= 0 ? (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg uppercase">{t('rewards.soldOut')}</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black rounded-lg uppercase whitespace-nowrap">{t('rewards.left', { count: reward.stock })}</span>
                    )}
                  </div>
                  <div className="size-16 rounded-2xl bg-background-light dark:bg-background-dark flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
                    <IconComp className={`w-8 h-8 ${getIconColor(reward.icon)}`} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black truncate">{reward.title}</h4>
                    <div className="flex items-center gap-1.5 text-text-sub-light dark:text-text-sub-dark mt-1">
                      <span className="text-base font-black text-primary">{reward.points}</span>
                      <span className="text-xs font-bold uppercase tracking-wider">pts</span>
                    </div>
                    {reward.expiry_date && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-text-sub-light">
                        <Clock className="w-3 h-3" />
                        <span>{t('rewards.ends', { date: new Date(reward.expiry_date).toLocaleDateString() })}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-800/50 flex gap-2">
                    {isAdmin ? (
                      <>
                        <button onClick={() => openEditModal(reward)} className="flex-1 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-primary transition-all rounded-xl flex items-center justify-center group/btn">
                          <Edit2 className="w-4 h-4 group-hover/btn:text-white" />
                        </button>
                        <button onClick={() => deleteReward(reward.id)} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-xl flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => redeemReward(reward)}
                        disabled={totalPoints < reward.points || reward.stock <= 0 || isExpired(reward.expiry_date) || isRedeemingReward}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2 ${totalPoints >= reward.points && !isRedeemingReward ? 'bg-primary text-white hover:bg-primary-dark shadow-primary/20' : 'bg-gray-100 text-gray-400'}`}>
                        {isRedeemingReward && <RefreshCw className="w-4 h-4 animate-spin" />}
                        <span>{isRedeemingReward ? t('rewards.redeeming') : (totalPoints < reward.points ? t('rewards.needPoints') : t('rewards.redeem'))}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Redemption Logs */}
      <section className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-12">
        <div className="flex items-center gap-3 mb-8">
          <History className="text-primary w-8 h-8" />
          <h3 className="text-2xl font-black">{t('rewards.history')}</h3>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background-light dark:bg-background-dark/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest">{t('rewards.table.reward')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest">{t('rewards.table.cost')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest">{t('rewards.table.date')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest text-right">{t('rewards.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {logs.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-text-sub-light font-medium italic">{t('rewards.emptyHistory')}</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4"><span className="font-black">{log.reward_title}</span></td>
                  <td className="px-6 py-4"><span className="font-bold text-red-500">-{log.spent_points} pts</span></td>
                  <td className="px-6 py-4 text-xs font-medium text-text-sub-light">{formatTime(log.timestamp)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase">
                      <CheckCircle2 className="w-3 h-3" /> {t('rewards.table.success')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-overlay">
          <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800 modal-content flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <header className="flex justify-between items-center">
              <h3 className="text-2xl font-black">{showEditModal ? t('rewards.modal.edit') : t('rewards.modal.create')} 🎁</h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all">
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{t('rewards.modal.name')}</label>
                <input value={rewardForm.title} onChange={(e) => setRewardForm(f => ({ ...f, title: e.target.value }))} type="text" placeholder={t('rewards.modal.namePlaceholder')}
                  className="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{t('rewards.modal.price')}</label>
                  <input value={rewardForm.points} onChange={(e) => setRewardForm(f => ({ ...f, points: Number(e.target.value) }))} type="number"
                    className="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all text-center" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{t('rewards.modal.stock')}</label>
                  <input value={rewardForm.stock} onChange={(e) => setRewardForm(f => ({ ...f, stock: Number(e.target.value) }))} type="number"
                    className="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all text-center" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{t('rewards.modal.icon')}</label>
                <div className="flex gap-3 mt-1">
                  {iconPresets.map(preset => {
                    const IC = iconComponents[preset.name];
                    return (
                      <button key={preset.name} onClick={() => setRewardForm(f => ({ ...f, icon: preset.name }))}
                        className={`size-12 rounded-xl flex items-center justify-center transition-all border-2 ${rewardForm.icon === preset.name ? 'border-primary bg-primary/10 shadow-sm' : 'border-transparent bg-background-light dark:bg-background-dark hover:border-gray-200'}`}>
                        <IC className={`w-6 h-6 ${preset.color}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{t('rewards.modal.expiry')}</label>
                <input value={rewardForm.expiryDate} onChange={(e) => setRewardForm(f => ({ ...f, expiryDate: e.target.value }))} type="date"
                  className="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all" />
              </div>
            </div>
            <button onClick={saveReward} disabled={isSavingReward}
              className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSavingReward && <RefreshCw className="w-5 h-5 animate-spin" />}
              <span>{isSavingReward ? t('rewards.saving') : (showEditModal ? t('rewards.modal.btnUpdate') : t('rewards.modal.btnCreate'))}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
