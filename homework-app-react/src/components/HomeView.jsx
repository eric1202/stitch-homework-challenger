import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, liveQuery } from '../db';
import { useTranslation } from 'react-i18next';
import SplitText from './SplitText';
import gsap from 'gsap';
import { Rocket, ArrowDown, Book, Calendar, CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronLeft, ChevronRight, Plus, RotateCw, Trash2, X } from 'lucide-react';
import { getTodayDateString, formatDateDisplay } from '../utils/date';
import { triggerConfetti } from '../utils/confetti';

export default function HomeView() {
  const { t } = useTranslation();
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Math');
  const [isAddingFormOpen, setIsAddingFormOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [userName, setUserName] = useState('Hero');
  const taskListRef = useRef(null);
  const userNameRef = useRef('Hero');
  const selectedDateRef = useRef(today);

  // Keep refs in sync
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  const calculatedPoints = useMemo(() => {
    if (!newTaskTitle.trim()) return 0;
    const str = `${newTaskSubject}-${newTaskTitle.trim()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 26) + 10;
  }, [newTaskTitle, newTaskSubject]);

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

  // Subscriptions
  useEffect(() => {
    let tasksSub = null;

    const nameSub = liveQuery(() => db.settings.get('userName'))
      .subscribe(result => {
        const newName = result?.value || 'Hero';
        setUserName(newName);

        if (tasksSub) tasksSub.unsubscribe();
        tasksSub = liveQuery(() =>
          db.tasks.where('user_name').equals(newName).toArray()
        ).subscribe(result => {
          setTasks(result.filter(t => t.date === selectedDateRef.current));
          if (isInitialLoading) {
            setTimeout(() => setIsInitialLoading(false), 600);
          }
        });
      });

    return () => {
      nameSub.unsubscribe();
      if (tasksSub) tasksSub.unsubscribe();
    };
  }, []);

  // Re-filter tasks when selectedDate changes
  const refreshTasks = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await db.tasks.where('user_name').equals(userNameRef.current).toArray();
      setTasks(result.filter(t => t.date === selectedDateRef.current));
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
      alert('刷新失败，请重试');
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, []);

  const isToday = selectedDate === today;
  const isLocked = tasks.length > 0 && tasks.every(t => t.completed);

  const groupedTasks = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const s = task.subject || 'Other';
      if (!groups[s]) groups[s] = [];
      groups[s].push(task);
    });

    const sortedSubjects = Object.keys(groups).sort((a, b) => {
      const indexA = subjects.indexOf(a);
      const indexB = subjects.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return sortedSubjects.map(subject => ({ subject, tasks: groups[subject] }));
  }, [tasks]);

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const addTask = async () => {
    if (!newTaskTitle.trim() || isAddingTask) return;
    setIsAddingTask(true);
    try {
      await db.tasks.add({
        title: newTaskTitle, subject: newTaskSubject, points: calculatedPoints,
        completed: false, date: selectedDate, user_name: userName
      });
      setNewTaskTitle('');
      setIsAddingFormOpen(false);
      await refreshTasks();
    } catch (error) {
      console.error('Failed to add task:', error);
      alert(t('home.addTaskError') || '添加任务失败，请重试');
    } finally {
      setIsAddingTask(false);
    }
  };

  const selectDate = (date) => {
    setSelectedDate(date);
    selectedDateRef.current = date;
    setIsDatePickerOpen(false);
    setTimeout(() => refreshTasks(), 50);
  };

  const goToToday = () => { selectDate(today); };

  const changeDate = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    selectDate(`${year}-${month}-${day}`);
  };

  const toggleTask = async (task) => {
    if (isLocked && task.completed) {
      alert(t('home.lockedMessage'));
      return;
    }
    const newStatus = !task.completed;
    await db.tasks.update(task.id, { completed: newStatus });
    if (newStatus) triggerConfetti();
  };

  const deleteTask = async (id) => {
    if (confirm(t('home.deleteConfirm'))) {
      await db.tasks.delete(id);
      await refreshTasks();
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Initial Loading */}
      {isInitialLoading && (
        <div className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex flex-col items-center justify-center gap-6 transition-opacity duration-500">
          <div className="relative">
            <div className="size-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-3xl font-black text-text-main-light dark:text-text-main-dark tracking-tight">Homework Challenger</h2>
            <div className="flex items-center gap-2">
              <div className="size-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <SplitText
            text={t('home.greeting', { name: userName }).replace(/<br\s*\/?>/gi, ' ')}
            className="text-4xl md:text-5xl font-black tracking-tight leading-tight"
            delay={100} duration={0.6}
            from={{ opacity: 0, y: 40 }} to={{ opacity: 1, y: 0 }}
            textAlign="left"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 md:gap-2">
              <button onClick={() => changeDate(-1)} className="p-1.5 md:p-2 rounded-lg md:rounded-xl text-text-sub-light dark:text-text-sub-dark hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setIsDatePickerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-text-sub-light dark:text-text-sub-dark hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95 group">
                <Calendar className="text-primary w-5 h-5 group-hover:scale-110 transition-transform" />
                <p className="text-base md:text-lg font-medium">{formatDateDisplay(selectedDate)}</p>
              </button>
              <button onClick={() => changeDate(1)} className="p-1.5 md:p-2 rounded-lg md:rounded-xl text-text-sub-light dark:text-text-sub-dark hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {!isToday && (
              <button onClick={goToToday} className="flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold text-xs md:text-sm transition-all duration-200 active:scale-95">
                <CalendarDays className="w-4 h-4" />
                <span>今天</span>
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsAddingFormOpen(!isAddingFormOpen)}
          className="hidden md:flex items-center bg-surface-light dark:bg-surface-dark  hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95 duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>{isAddingFormOpen ? t('settings.danger.resetBtn') : t('home.addTaskTitle')}</span>
        </button>
      </header>

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay" onClick={() => setIsDatePickerOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="relative bg-surface-light dark:bg-surface-dark rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 max-w-md w-full modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black flex items-center gap-2">
                <Calendar className="w-7 h-7 text-primary" /> 选择日期
              </h3>
              <button onClick={() => setIsDatePickerOpen(false)} className="p-2 rounded-xl text-text-sub-light hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-col gap-3 mb-6">
              <p className="text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">快捷选择</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => selectDate(today)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-200 active:scale-95 ${selectedDate === today ? 'bg-primary text-white' : 'bg-background-light dark:bg-background-dark hover:bg-primary/10'}`}>
                  <CalendarDays className="w-5 h-5" /> <span>今天</span>
                </button>
                <button onClick={() => {
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  selectDate(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`);
                }} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/10 font-bold transition-all duration-200 active:scale-95">
                  <CalendarPlus className="w-5 h-5" /> <span>明天</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">自定义日期</label>
              <input type="date" value={selectedDate} onChange={(e) => selectDate(e.target.value)}
                className="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-4 font-bold transition-all outline-none text-base" />
            </div>
            <div className="mt-6 p-4 bg-primary/10 rounded-xl">
              <p className="text-xs font-bold text-text-sub-light uppercase tracking-widest mb-1">当前选择</p>
              <p className="text-lg font-black text-primary">{formatDateDisplay(selectedDate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Card */}
      {tasks.length > 0 && (
        <section className="bg-surface-light dark:bg-surface-dark p-4 md:p-6 md:px-7 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 size-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
          <div className="flex flex-col gap-3 md:gap-5 relative z-10">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-1">{t('home.progress')}</h3>
                <p className="text-text-sub-light dark:text-text-sub-dark text-xs md:text-sm font-medium">
                  {completedCount === tasks.length ? 'Mission Accomplished! 🏆' : 'Keep going! You are doing great. 🔥'}
                </p>
              </div>
              <div className="text-2xl md:text-3xl font-black text-primary">{progressPercent}%</div>
            </div>
            <div className="h-4 md:h-5 w-full bg-background-light dark:bg-background-dark rounded-full overflow-hidden p-1">
              <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between text-xs md:text-sm font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">
              <span>{tasks.length} {t('app.nav.tasks')}</span>
              <span>{completedCount} of {tasks.length} {t('analytics.status.completed')}</span>
            </div>
          </div>
        </section>
      )}

      {/* Add Task Form */}
      {isAddingFormOpen && (
        <div className="bg-surface-light dark:bg-surface-dark p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-primary/20 shadow-xl shadow-primary/5">
          <div className="grid md:grid-cols-12 gap-3 md:gap-5">
            <div className="md:col-span-12">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">{t('home.addTaskTitle')} ✏️</h3>
            </div>
            <div className="md:col-span-5 flex flex-col gap-1.5 md:gap-2">
              <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('home.inputs.taskName')}</label>
              <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} type="text"
                className="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-xl md:rounded-2xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base"
                placeholder={t('home.inputs.placeholder')} />
            </div>
            <div className="md:col-span-3 flex flex-col gap-1.5 md:gap-2">
              <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('home.inputs.subject')}</label>
              <select value={newTaskSubject} onChange={(e) => setNewTaskSubject(e.target.value)}
                className="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-xl md:rounded-2xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base">
                {subjects.map(s => <option key={s} value={s}>{t(`home.subjects.${s}`)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5 md:gap-2">
              <label className="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{t('home.inputs.points')}</label>
              <div className="w-full h-full bg-background-light dark:bg-background-dark border-transparent rounded-xl md:rounded-2xl p-3 md:p-4 font-black transition-all outline-none text-center text-sm md:text-base text-primary/80 flex items-center justify-center select-none shadow-inner">-</div>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button onClick={addTask} disabled={isAddingTask}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 md:py-4 rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 duration-200 uppercase tracking-widest text-[10px] md:text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isAddingTask && <RotateCw className="w-4 h-4 animate-spin" />}
                <span>{isAddingTask ? '添加中...' : t('home.buttons.add')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <section className="flex flex-col gap-3 md:gap-5" ref={taskListRef}>
        <div className="flex items-center justify-between mb-2 md:mb-0">
          <h3 className="text-lg md:text-2xl font-black flex items-center gap-1.5 md:gap-2">
            <CheckCircle2 className="text-primary w-5 h-5 md:w-7 md:h-7" />
            {t('home.title')}
          </h3>
          <button onClick={refreshTasks} disabled={isRefreshing}
            className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
            <RotateCw className={`w-6 h-6 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="py-10 md:py-16 text-center bg-surface-light dark:bg-surface-dark rounded-2xl md:rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="size-16 md:size-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-gray-300">
              <Book className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            <p className="text-lg md:text-xl font-black text-gray-400">{t('home.noTasksTitle')}</p>
            <p className="text-sm md:text-base text-gray-300 font-bold">{t('home.noTasksDesc')}</p>
            <button onClick={() => setIsAddingFormOpen(true)} className="mt-4 md:mt-6 text-primary font-bold flex items-center justify-center gap-1 mx-auto hover:underline text-sm md:text-base">
              <Plus className="w-5 h-5" /> {t('home.addTaskTitle')}
            </button>
          </div>
        )}

        {groupedTasks.map(group => (
          <div key={group.subject}
            className={`flex flex-col gap-2 md:gap-4 p-2.5 md:p-5 rounded-xl md:rounded-[2rem] transition-all duration-300 ${subjectColors[group.subject]?.split(' ').filter(c => c.startsWith('bg-') || c.includes('/30')).join(' ') || 'bg-slate-50 dark:bg-slate-900/20'}`}>
            <div className="flex items-center justify-between px-1">
              <h4 className={`text-xs md:text-lg font-black uppercase tracking-[0.15em] md:tracking-[0.2em] flex items-center gap-1.5 md:gap-3 ${subjectColors[group.subject]?.split(' ')[0]}`}>
                <span className={`size-1.5 md:size-3 rounded-full shadow-sm ${subjectColors[group.subject]?.split(' ')[0].replace('text-', 'bg-')}`}></span>
                {t(`home.subjects.${group.subject}`)}
              </h4>
              <span className="text-[9px] md:text-xs font-bold opacity-50">{group.tasks.length} {t('app.nav.tasks')}</span>
            </div>

            <div className="flex flex-col gap-1.5 md:gap-3">
              {group.tasks.map(task => (
                <div key={task.id}
                  className={`group flex items-center gap-2 md:gap-5 bg-surface-light dark:bg-surface-dark py-2 px-2.5 md:py-3 md:px-5 rounded-lg md:rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5 ${task.completed ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task)}
                      disabled={isLocked && task.completed}
                      className="custom-checkbox appearance-none size-5 md:size-8 rounded-full border-2 border-gray-200 dark:border-gray-700 checked:bg-primary checked:border-primary transition-all cursor-pointer ring-offset-1 md:ring-offset-2 ring-primary/20 focus:ring-2 md:focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed" />
                    {task.completed && <Check className="absolute pointer-events-none text-white w-3 h-3 md:w-5 md:h-5" />}
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-2 md:gap-3 min-w-0">
                    <h4 className={`flex-1 text-base md:text-lg font-bold text-text-main-light dark:text-text-main-dark group-hover:text-primary transition-colors duration-300 break-words leading-snug pr-2 ${task.completed ? 'line-through decoration-2 decoration-primary/50 text-text-sub-light opacity-70' : ''}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs md:text-sm font-bold text-text-sub-light whitespace-nowrap">+{task.points} pts</span>
                      <button onClick={() => deleteTask(task.id)} className="p-1.5 md:p-3 text-gray-300 hover:text-red-500 transition-colors rounded-lg md:rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Mobile Floating Add Button */}
      <button onClick={() => setIsAddingFormOpen(true)}
        className="md:hidden fixed bottom-24 right-6 size-16 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-50 active:scale-90 transition-transform duration-200">
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
