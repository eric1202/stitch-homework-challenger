import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, liveQuery } from '../db';
import { useTranslation } from 'react-i18next';
import { getTodayDateString } from '../utils/date';
import { CalendarSync, Edit2, Plus, RotateCw, Star, Trash2, X } from 'lucide-react';

export default function DailyCheckinView() {
  const { t } = useTranslation();
  const today = getTodayDateString();

  const [templates, setTemplates] = useState([]);
  const [userName, setUserName] = useState('Hero');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('Math');
  const [formPoints, setFormPoints] = useState(10);
  const [formScheduleType, setFormScheduleType] = useState('weekdays');
  const [formCustomDays, setFormCustomDays] = useState([]);
  const [formStartDate, setFormStartDate] = useState(today);
  const [formEndDate, setFormEndDate] = useState('');

  const subjects = ["Chinese", 'Math', 'English', 'Science', 'Art', 'Reading', 'Sports', 'Other'];
  const subjectColors = {
    Chinese: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
    Math: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
    English: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
    Science: 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300',
    Art: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300',
    Reading: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
    Sports: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
    Other: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
  };

  const scheduleTypes = ['daily', 'weekdays', 'weekends', 'custom'];
  const weekDays = [
    { key: 'sun', value: 0 }, { key: 'mon', value: 1 }, { key: 'tue', value: 2 },
    { key: 'wed', value: 3 }, { key: 'thu', value: 4 }, { key: 'fri', value: 5 },
    { key: 'sat', value: 6 },
  ];

  // Subscriptions
  useEffect(() => {
    let templatesSub = null;

    const nameSub = liveQuery(() => db.settings.get('userName'))
      .subscribe(result => {
        const newName = result?.value || 'Hero';
        setUserName(newName);

        if (templatesSub) templatesSub.unsubscribe();
        templatesSub = liveQuery(() =>
          db.dailyCheckinTemplates.where('user_name').equals(newName).toArray()
        ).subscribe(result => {
          setTemplates(result || []);
        });
      });

    return () => {
      nameSub.unsubscribe();
      if (templatesSub) templatesSub.unsubscribe();
    };
  }, []);

  const refreshTemplates = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await db.dailyCheckinTemplates.where('user_name').equals(userName).toArray();
      setTemplates(result || []);
    } catch (error) {
      console.error('Failed to refresh templates:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const groupedTemplates = useMemo(() => {
    const groups = {};
    templates.forEach(tpl => {
      const s = tpl.subject || 'Other';
      if (!groups[s]) groups[s] = [];
      groups[s].push(tpl);
    });

    const sortedSubjects = Object.keys(groups).sort((a, b) => {
      const indexA = subjects.indexOf(a);
      const indexB = subjects.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return sortedSubjects.map(subject => ({ subject, templates: groups[subject] }));
  }, [templates]);

  const getScheduleDays = (scheduleType, customDays) => {
    switch (scheduleType) {
      case 'daily': return [0, 1, 2, 3, 4, 5, 6];
      case 'weekdays': return [1, 2, 3, 4, 5];
      case 'weekends': return [0, 6];
      case 'custom': return customDays || [];
      default: return [];
    }
  };

  const generateDates = (startDate, endDate, scheduleType, customDays) => {
    const dates = [];
    const scheduleDays = getScheduleDays(scheduleType, customDays);
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    if (!endDate) end.setDate(end.getDate() + 27);

    const current = new Date(start);
    while (current <= end) {
      if (scheduleDays.includes(current.getDay())) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormTitle(''); setFormSubject('Math'); setFormPoints(10);
    setFormScheduleType('weekdays'); setFormCustomDays([]);
    setFormStartDate(today); setFormEndDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormTitle(template.title); setFormSubject(template.subject);
    setFormPoints(template.points); setFormScheduleType(template.schedule_type);
    setFormCustomDays(template.custom_days || []);
    setFormStartDate(template.start_date); setFormEndDate(template.end_date || '');
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingTemplate(null); };

  const toggleDay = (dayValue) => {
    setFormCustomDays(prev =>
      prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]
    );
  };

  const createTemplate = async () => {
    if (!formTitle.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const templateData = {
        title: formTitle.trim(), subject: formSubject, points: formPoints,
        schedule_type: formScheduleType,
        custom_days: formScheduleType === 'custom' ? formCustomDays : [],
        start_date: formStartDate, end_date: formEndDate || null,
        is_active: true, user_name: userName
      };
      await db.dailyCheckinTemplates.add(templateData);

      const dates = generateDates(formStartDate, formEndDate, formScheduleType, formCustomDays);
      for (const date of dates) {
        await db.tasks.add({
          title: formTitle.trim(), subject: formSubject, points: formPoints,
          completed: false, date, user_name: userName
        });
      }
      closeModal();
      alert(t('dailyCheckin.tasksGenerated', { count: dates.length }));
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('创建失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate || !formTitle.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await db.dailyCheckinTemplates.update(editingTemplate.id, {
        title: formTitle.trim(), subject: formSubject, points: formPoints,
        schedule_type: formScheduleType,
        custom_days: formScheduleType === 'custom' ? formCustomDays : [],
        start_date: formStartDate, end_date: formEndDate || null
      });
      closeModal();
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('更新失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (template) => {
    if (!confirm(t('dailyCheckin.deleteConfirm'))) return;
    try {
      await db.dailyCheckinTemplates.delete(template.id);
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const formatSchedule = (template) => {
    const type = template.schedule_type;
    if (type === 'custom' && template.custom_days?.length > 0) {
      return template.custom_days
        .sort((a, b) => a - b)
        .map(d => t(`dailyCheckin.days.${weekDays.find(w => w.value === d)?.key || 'sun'}`))
        .join(', ');
    }
    return t(`dailyCheckin.scheduleTypes.${type}`);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-8 pb-24 md:pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
        <div className="flex flex-col gap-1 md:gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <h1 className="text-2xl md:text-5xl font-black tracking-tight leading-tight">
              {t('dailyCheckin.title')} 📅
            </h1>
            <button
              onClick={refreshTemplates}
              disabled={isRefreshing}
              className="p-1.5 md:p-2 rounded-lg md:rounded-xl text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              title="刷新列表"
            >
              <RotateCw className={`w-5 h-5 md:w-6 md:h-6 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-text-sub-light dark:text-text-sub-dark text-sm md:text-lg font-medium">
            {t('dailyCheckin.subtitle')}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="hidden md:flex items-center bg-surface-light dark:bg-surface-dark  hover:bg-primary-dark text-black font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95 duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>{t('dailyCheckin.addNew')}</span>
        </button>
      </header>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="py-10 md:py-16 text-center bg-surface-light dark:bg-surface-dark rounded-2xl md:rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
          <div className="size-14 md:size-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-gray-300">
            <CalendarSync className="w-8 h-8 md:w-12 md:h-12" />
          </div>
          <p className="text-base md:text-xl font-black text-gray-400">{t('dailyCheckin.noTemplates')}</p>
          <p className="text-sm md:text-base text-gray-300 font-bold mb-4 md:mb-6 px-4">{t('dailyCheckin.noTemplatesDesc')}</p>
          <button onClick={openCreateModal} className="text-primary font-bold flex items-center justify-center gap-1 mx-auto hover:underline text-sm md:text-base">
            <Plus className="w-5 h-5" /> {t('dailyCheckin.addNew')}
          </button>
        </div>
      )}

      {/* Template List */}
      <section className="flex flex-col gap-3 md:gap-5">
        {groupedTemplates.map(group => (
          <div
            key={group.subject}
            className={`flex flex-col gap-2 md:gap-4 p-3 md:p-5 rounded-2xl md:rounded-[2rem] transition-all duration-300 ${subjectColors[group.subject]?.split(' ').filter(c => c.startsWith('bg-') || c.includes('/30')).join(' ') || 'bg-slate-50 dark:bg-slate-900/20'}`}
          >
            <div className="flex items-center justify-between px-1">
              <h4 className={`text-xs md:text-lg font-black uppercase tracking-[0.15em] md:tracking-[0.2em] flex items-center gap-2 md:gap-3 ${subjectColors[group.subject]?.split(' ')[0]}`}>
                <span className={`size-2 md:size-3 rounded-full shadow-sm ${subjectColors[group.subject]?.split(' ')[0].replace('text-', 'bg-')}`}></span>
                {t(`home.subjects.${group.subject}`)}
              </h4>
              <span className="text-[10px] md:text-xs font-bold opacity-50 uppercase tracking-widest">{group.templates.length} {t('app.nav.tasks')}</span>
            </div>

            <div className="flex flex-col gap-2 md:gap-3">
              {group.templates.map(tpl => (
                <div
                  key={tpl.id}
                  className="group flex items-center gap-2 md:gap-5 bg-surface-light dark:bg-surface-dark py-2.5 md:py-4 px-3 md:px-5 rounded-xl md:rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/40 transition-all duration-300"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm md:text-lg font-bold text-text-main-light dark:text-text-main-dark group-hover:text-primary transition-colors duration-300 leading-tight truncate">
                      {tpl.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-0.5 mt-0.5 md:mt-1 text-[10px] md:text-sm text-text-sub-light dark:text-text-sub-dark">
                      <span className="flex items-center gap-0.5 md:gap-1">
                        <CalendarSync className="w-3 h-3 md:w-4 md:h-4" />
                        {formatSchedule(tpl)}
                      </span>
                      <span className="flex items-center gap-0.5 md:gap-1 font-black text-primary/80">
                        <Star className="w-3 h-3 md:w-4 md:h-4" />
                        +{tpl.points}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0 flex-shrink-0">
                    <button onClick={() => openEditModal(tpl)} className="p-2 md:p-3 text-gray-400 hover:text-primary transition-colors rounded-lg md:rounded-xl hover:bg-primary/10 active:scale-95">
                      <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={() => deleteTemplate(tpl)} className="p-2 md:p-3 text-gray-300 hover:text-red-500 transition-colors rounded-lg md:rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95">
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Mobile Floating Add Button */}
      <button
        onClick={openCreateModal}
        className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 size-14 bg-primary text-black rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-50 active:scale-90 transition-transform duration-200"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center modal-overlay" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div
            className="relative bg-surface-light dark:bg-surface-dark w-full md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl border-t md:border border-gray-200 dark:border-gray-700 max-h-[85vh] md:max-h-[90vh] flex flex-col modal-content"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <h3 className="text-lg md:text-2xl font-black flex items-center gap-2">
                <CalendarSync className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                {editingTemplate ? t('dailyCheckin.modal.edit') : t('dailyCheckin.modal.create')}
              </h3>
              <button onClick={closeModal} className="p-1.5 md:p-2 rounded-lg md:rounded-xl text-text-sub-light hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4 md:gap-5 p-4 md:p-6 overflow-y-auto flex-1">
              <div className="flex flex-col gap-1.5 md:gap-2">
                <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('dailyCheckin.templateName')}</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} type="text"
                  className="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base"
                  placeholder={t('dailyCheckin.templateNamePlaceholder')} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('home.inputs.subject')}</label>
                  <select value={formSubject} onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base">
                    {subjects.map(s => <option key={s} value={s}>{t(`home.subjects.${s}`)}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('home.inputs.points')}</label>
                  <input value={formPoints} onChange={(e) => setFormPoints(Number(e.target.value))} type="number"
                    className="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-center text-sm md:text-base" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:gap-2">
                <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('dailyCheckin.schedule')}</label>
                <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                  {scheduleTypes.map(type => (
                    <button key={type} onClick={() => setFormScheduleType(type)}
                      className={`py-2 md:py-3 px-1 md:px-4 rounded-lg md:rounded-xl font-bold transition-all duration-200 active:scale-95 text-xs md:text-sm ${formScheduleType === type ? 'bg-primary text-black' : 'bg-background-light dark:bg-background-dark hover:bg-primary/10'}`}>
                      {t(`dailyCheckin.scheduleTypes.${type}`)}
                    </button>
                  ))}
                </div>
              </div>

              {formScheduleType === 'custom' && (
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('dailyCheckin.selectDays')}</label>
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {weekDays.map(day => (
                      <button key={day.value} onClick={() => toggleDay(day.value)}
                        className={`py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold transition-all duration-200 active:scale-95 text-xs md:text-sm ${formCustomDays.includes(day.value) ? 'bg-primary text-black' : 'bg-background-light dark:bg-background-dark hover:bg-primary/10'}`}>
                        {t(`dailyCheckin.days.${day.key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('dailyCheckin.startDate')}</label>
                  <input value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} type="date"
                    className="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base" />
                </div>
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('dailyCheckin.endDate')}</label>
                  <input value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} type="date"
                    className="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base" />
                </div>
              </div>

              <button
                onClick={editingTemplate ? updateTemplate : createTemplate}
                disabled={isLoading || !formTitle.trim()}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3.5 md:py-4 rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 duration-200 uppercase tracking-widest text-xs md:text-sm mt-2 md:mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <RotateCw className="w-4 h-4 animate-spin" />}
                <span>{editingTemplate ? t('dailyCheckin.editBtn') : t('dailyCheckin.createBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
