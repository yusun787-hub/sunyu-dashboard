import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  defaultBookNotes,
  defaultDiaries,
  defaultFocusLogs,
  defaultLifeTodos,
  defaultProjects,
  defaultStockNotes,
  defaultWorkTodos,
  defaultWorkouts,
  quotes,
} from './data';
import { useLocalStorage, useTodayKey } from './hooks';
import { fetchMarketIndices, fetchShanghaiWeather, weatherText } from './services';
import type { BookNote, Diary, FocusLog, MarketIndex, MoodKey, Project, StockNote, Todo, WeatherDay, Workout } from './types';

const moodThemes: Record<MoodKey, { label: string; emoji: string; className: string; hint: string }> = {
  bright: { label: '元气满满', emoji: '🌞', className: 'theme-bright', hint: '适合进攻型任务，把最难的事放到上午。' },
  focused: { label: '专注稳定', emoji: '🧭', className: 'theme-focused', hint: '进入深度工作，减少切换。' },
  calm: { label: '平静温和', emoji: '🌿', className: 'theme-calm', hint: '稳稳推进，给自己留呼吸空间。' },
  warm: { label: '柔软治愈', emoji: '☕', className: 'theme-warm', hint: '适合整理、复盘和照顾生活秩序。' },
  tired: { label: '有点疲惫', emoji: '🌙', className: 'theme-tired', hint: '降低颗粒度，只完成最关键的一步。' },
};

type ViewerKey = 'workTodos' | 'projects' | 'focusLogs' | 'diaries' | 'lifeTodos' | 'workouts' | 'bookNotes' | 'stockNotes' | null;

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const todayKey = useTodayKey('sunyu-mood');
  const [mood, setMood] = useLocalStorage<MoodKey>('sunyu-dashboard-mood', 'focused');
  const [moodNote, setMoodNote] = useLocalStorage<string>('sunyu-dashboard-mood-note', '');
  const [moodSelectedToday, setMoodSelectedToday] = useLocalStorage<boolean>(todayKey, false);
  const [workTodos, setWorkTodos] = useLocalStorage<Todo[]>('sunyu-work-todos', defaultWorkTodos);
  const [lifeTodos, setLifeTodos] = useLocalStorage<Todo[]>('sunyu-life-todos', defaultLifeTodos);
  const [projects, setProjects] = useLocalStorage<Project[]>('sunyu-projects', defaultProjects);
  const [focusLogs, setFocusLogs] = useLocalStorage<FocusLog[]>('sunyu-focus-logs', defaultFocusLogs);
  const [diaries, setDiaries] = useLocalStorage<Diary[]>('sunyu-diaries', defaultDiaries);
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>('sunyu-workouts', defaultWorkouts);
  const [bookNotes, setBookNotes] = useLocalStorage<BookNote[]>('sunyu-book-notes', defaultBookNotes);
  const [stockNotes, setStockNotes] = useLocalStorage<StockNote[]>('sunyu-stock-notes', defaultStockNotes);
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [weatherError, setWeatherError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [viewer, setViewer] = useState<ViewerKey>(null);

  const quote = useMemo(() => quotes[new Date().getDate() % quotes.length], []);
  const theme = moodThemes[mood];
  const completion = Math.round((workTodos.filter((item) => item.done).length / Math.max(workTodos.length, 1)) * 100);
  const totalFocus = focusLogs.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const latestWeights = workouts.filter((item) => item.weight).slice(-7);
  const todayWeather = weather[0];
  const weatherSummary = weatherError || (todayWeather ? `上海 ${weatherText(todayWeather.code)} ${todayWeather.min}° / ${todayWeather.max}°` : '上海天气加载中…');

  useEffect(() => {
    fetchShanghaiWeather().then(setWeather).catch((err) => setWeatherError((err as Error).message));
    fetchMarketIndices().then(setIndices).catch((err) => setMarketError((err as Error).message));
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimerSeconds((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (timerSeconds === 0 && timerRunning) setTimerRunning(false);
  }, [timerSeconds, timerRunning]);

  const selectMood = (key: MoodKey, note: string) => {
    setMood(key);
    setMoodNote(note.trim());
    setMoodSelectedToday(true);
  };

  const viewerMeta = getViewerMeta(viewer, {
    workTodos,
    projects,
    focusLogs,
    diaries,
    lifeTodos,
    workouts,
    bookNotes,
    stockNotes,
  });

  return (
    <main className={`min-h-screen ${theme.className}`}>
      {!moodSelectedToday && <MoodModal defaultMood={mood} defaultNote={moodNote} onConfirm={selectMood} />}
      {viewerMeta && <RecordViewerModal title={viewerMeta.title} onClose={() => setViewer(null)}>{viewerMeta.content}</RecordViewerModal>}
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <Hero mood={theme} quote={quote} completion={completion} totalFocus={totalFocus} weatherSummary={weatherSummary} moodNote={moodNote} />

        <section className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <Card title="今日待办" eyebrow="WORK" action="点击查看" onAction={() => setViewer('workTodos')}>
            <TodoPanel todos={workTodos} setTodos={setWorkTodos} placeholder="新增一个今日任务" />
          </Card>
          <Card title="项目进展" eyebrow="PROJECTS" action="点击查看" onAction={() => setViewer('projects')}>
            <ProjectPanel projects={projects} setProjects={setProjects} />
          </Card>
        </section>

        <section className="mt-5">
          <Card title="专注区" eyebrow="FOCUS" action="点击查看" onAction={() => setViewer('focusLogs')}>
            <FocusPanel logs={focusLogs} setLogs={setFocusLogs} seconds={timerSeconds} setSeconds={setTimerSeconds} running={timerRunning} setRunning={setTimerRunning} />
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card title="成功日记本" eyebrow="WIN LOG" action="给努力留证据 · 点击查看" onAction={() => setViewer('diaries')}>
            <DiaryPanel diaries={diaries} setDiaries={setDiaries} />
          </Card>
          <Card title="生活待办区" eyebrow="LIFE" action="点击查看" onAction={() => setViewer('lifeTodos')}>
            <TodoPanel todos={lifeTodos} setTodos={setLifeTodos} placeholder="新增一个生活事项" compact />
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.05fr]">
          <Card title="运动记录区" eyebrow="HEALTH" action="点击查看" onAction={() => setViewer('workouts')}>
            <WorkoutPanel workouts={workouts} setWorkouts={setWorkouts} weights={latestWeights} />
          </Card>
          <Card title="读书笔记区" eyebrow="READING" action="点击查看" onAction={() => setViewer('bookNotes')}>
            <BookPanel notes={bookNotes} setNotes={setBookNotes} />
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1fr]">
          <Card title="炒股日记" eyebrow="INVEST" action="点击查看" onAction={() => setViewer('stockNotes')}>
            <StockDiaryPanel notes={stockNotes} setNotes={setStockNotes} />
          </Card>
          <Card title="今日股市指数" eyebrow="MARKET" action="真实行情">
            <MarketPanel indices={indices} error={marketError} />
          </Card>
        </section>
      </div>
    </main>
  );
}

function getViewerMeta(
  viewer: ViewerKey,
  data: {
    workTodos: Todo[];
    projects: Project[];
    focusLogs: FocusLog[];
    diaries: Diary[];
    lifeTodos: Todo[];
    workouts: Workout[];
    bookNotes: BookNote[];
    stockNotes: StockNote[];
  },
) {
  switch (viewer) {
    case 'workTodos':
      return {
        title: '今日待办 · 全部记录',
        content: <div className="space-y-3">{data.workTodos.map((todo) => <ViewerItem key={todo.id} title={todo.title} meta={`${todo.done ? '已完成' : '未完成'}${todo.tag ? ` · ${todo.tag}` : ''}`} />)}</div>,
      };
    case 'projects':
      return {
        title: '项目进展 · 全部记录',
        content: <div className="space-y-3">{data.projects.map((project) => <ViewerItem key={project.id} title={project.name} meta={`${project.stage} · ${project.progress}%`} body={`下一步：${project.next}`} />)}</div>,
      };
    case 'focusLogs':
      return {
        title: '专注区 · 全部记录',
        content: <div className="space-y-3">{data.focusLogs.map((log) => <ViewerItem key={log.id} title={log.title} meta={`${log.date} · ${log.minutes}min`} />)}</div>,
      };
    case 'diaries':
      return {
        title: '成功日记本 · 全部记录',
        content: <div className="space-y-3">{data.diaries.map((diary) => <ViewerItem key={diary.id} title={diary.title} meta={diary.date} body={diary.content} />)}</div>,
      };
    case 'lifeTodos':
      return {
        title: '生活待办区 · 全部记录',
        content: <div className="space-y-3">{data.lifeTodos.map((todo) => <ViewerItem key={todo.id} title={todo.title} meta={`${todo.done ? '已完成' : '未完成'}${todo.tag ? ` · ${todo.tag}` : ''}`} />)}</div>,
      };
    case 'workouts':
      return {
        title: '运动记录区 · 全部记录',
        content: <div className="space-y-3">{data.workouts.slice().reverse().map((item) => <ViewerItem key={item.id} title={item.type} meta={`${item.date} · ${item.minutes}min${item.weight ? ` · ${item.weight}kg` : ''}`} />)}</div>,
      };
    case 'bookNotes':
      return {
        title: '读书笔记区 · 全部记录',
        content: <div className="space-y-3">{data.bookNotes.map((item) => <ViewerItem key={item.id} title={item.book} meta={item.date} body={item.note} extra={item.link ? <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-strong)]">打开链接</a> : null} />)}</div>,
      };
    case 'stockNotes':
      return {
        title: '炒股日记 · 全部记录',
        content: <div className="space-y-3">{data.stockNotes.map((item) => <ViewerItem key={item.id} title={item.symbol} meta={`${item.date} · ${item.action}`} body={item.thought} />)}</div>,
      };
    default:
      return null;
  }
}

function Hero({
  mood,
  quote,
  completion,
  totalFocus,
  weatherSummary,
  moodNote,
}: {
  mood: { label: string; emoji: string; hint: string };
  quote: string;
  completion: number;
  totalFocus: number;
  weatherSummary: string;
  moodNote: string;
}) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/55 bg-white/55 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl lg:p-8">
      <div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.75fr] lg:items-stretch">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">{mood.emoji} 今日状态：{mood.label}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">孙瑜的工作生活面板</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">把工作推进、生活照料和成长记录放在同一个安静有质感的空间里。数据保存在本地浏览器，打开即可继续。</p>
          {moodNote && <p className="mt-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">今天想对自己说：{moodNote}</p>}
          <div className="mt-6 rounded-[1.8rem] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-950/10">
            <p className="text-sm text-white/50">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
            <p className="mt-5 text-4xl font-medium leading-tight lg:text-5xl">“{quote}”</p>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">{mood.hint}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Metric label="今日待办完成" value={`${completion}%`} />
          <Metric label="累计专注" value={`${totalFocus} min`} />
          <Metric label="上海天气" value={weatherSummary} small />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`${small ? 'text-base leading-6' : 'text-3xl'} mt-2 font-semibold text-slate-950`}>{value}</p></div>;
}

function Card({ title, eyebrow, action, onAction, children }: { title: string; eyebrow: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-[var(--accent-strong)]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h2>
        </div>
        {action && onAction ? (
          <button onClick={onAction} className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500 transition hover:bg-slate-950/10 hover:text-slate-700">{action}</button>
        ) : action ? (
          <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500">{action}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MoodModal({ defaultMood, defaultNote, onConfirm }: { defaultMood: MoodKey; defaultNote: string; onConfirm: (key: MoodKey, note: string) => void }) {
  const [selectedMood, setSelectedMood] = useState<MoodKey>(defaultMood);
  const [note, setNote] = useState(defaultNote);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <p className="text-sm font-bold tracking-[0.22em] text-slate-400">DAILY CHECK-IN</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">今天感觉怎么样？</h2>
        <p className="mt-2 text-slate-600">先选一个基调，再给自己留一句今天的心情备注。</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {(Object.keys(moodThemes) as MoodKey[]).map((key) => {
            const active = selectedMood === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMood(key)}
                className={`rounded-3xl border p-4 text-center transition hover:-translate-y-1 hover:bg-white hover:shadow-xl ${active ? 'border-[var(--accent-strong)] bg-white shadow-lg' : 'border-slate-200 bg-slate-50'}`}
              >
                <span className="text-3xl">{moodThemes[key].emoji}</span>
                <span className="mt-2 block text-sm font-medium text-slate-700">{moodThemes[key].label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">也可以自己写一句</p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="比如：今天想慢一点，但也想把最重要的事做好。"
            className="input mt-3 min-h-24 resize-none"
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => onConfirm(selectedMood, note)} className="btn">进入面板</button>
        </div>
      </div>
    </div>
  );
}

function TodoPanel({ todos, setTodos, placeholder, compact }: { todos: Todo[]; setTodos: React.Dispatch<React.SetStateAction<Todo[]>>; placeholder: string; compact?: boolean }) {
  const [text, setText] = useState('');
  const previewTodos = todos.slice(0, 10);
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setTodos([{ id: uid(), title: text.trim(), done: false, tag: compact ? '生活' : '今日' }, ...todos]);
    setText('');
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="input" />
        <button className="btn">添加</button>
      </form>
      <div className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
        {previewTodos.map((todo) => (
          <label key={todo.id} className="group flex items-center gap-3 rounded-2xl bg-slate-950/[0.035] p-3">
            <input checked={todo.done} onChange={() => setTodos(todos.map((item) => item.id === todo.id ? { ...item, done: !item.done } : item))} type="checkbox" className="h-5 w-5 accent-[var(--accent-strong)]" />
            <span className={`flex-1 text-sm ${todo.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{todo.title}</span>
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-400">{todo.tag}</span>
            <button onClick={(e) => { e.preventDefault(); setTodos(todos.filter((item) => item.id !== todo.id)); }} className="text-xs text-slate-300 opacity-0 transition group-hover:opacity-100">删除</button>
          </label>
        ))}
      </div>
      {todos.length > 10 && <p className="mt-3 text-xs text-slate-400">当前卡片支持滚动查看前 10 条，更多记录请点右上角查看。</p>}
    </div>
  );
}

function ProjectPanel({ projects, setProjects }: { projects: Project[]; setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) {
  const [name, setName] = useState('');
  const previewProjects = projects.slice(0, 10);
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setProjects([{ id: uid(), name: name.trim(), stage: '进行中', progress: 10, next: '写下下一步' }, ...projects]);
    setName('');
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="新增项目" />
        <button className="btn">添加</button>
      </form>
      <div className="mt-4 max-h-[16rem] space-y-3 overflow-y-auto pr-1">
        {previewProjects.map((project) => (
          <div key={project.id} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{project.name}</p>
                <p className="text-sm text-slate-500">{project.stage} · 下一步：{project.next}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-semibold text-[var(--accent-strong)]">{project.progress}%</span>
                <button onClick={() => setProjects(projects.filter((item) => item.id !== project.id))} className="text-xs text-slate-400 transition hover:text-rose-500">删除项目</button>
              </div>
            </div>
            <input type="range" min="0" max="100" value={project.progress} onChange={(e) => setProjects(projects.map((item) => item.id === project.id ? { ...item, progress: Number(e.target.value) } : item))} className="mt-3 w-full accent-[var(--accent-strong)]" />
          </div>
        ))}
      </div>
      {projects.length > 10 && <p className="mt-3 text-xs text-slate-400">当前卡片支持滚动查看前 10 条，更多记录请点右上角查看。</p>}
    </div>
  );
}

function FocusPanel({ logs, setLogs, seconds, setSeconds, running, setRunning }: { logs: FocusLog[]; setLogs: React.Dispatch<React.SetStateAction<FocusLog[]>>; seconds: number; setSeconds: React.Dispatch<React.SetStateAction<number>>; running: boolean; setRunning: React.Dispatch<React.SetStateAction<boolean>> }) {
  const [title, setTitle] = useState('');
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  const previewLogs = logs.slice(0, 10);
  const record = () => {
    if (!title.trim()) return;
    setLogs([{ id: uid(), title: title.trim(), minutes: 25, date: today() }, ...logs]);
    setTitle('');
  };

  return (
    <div>
      <div className="rounded-[1.5rem] bg-slate-950 p-5 text-center text-white">
        <p className="text-sm text-white/50">当前番茄钟</p>
        <p className="mt-2 text-6xl font-semibold tabular-nums">{minutes}:{sec}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={() => setRunning(!running)} className="btn light">{running ? '暂停' : '开始'}</button>
          <button onClick={() => { setRunning(false); setSeconds(25 * 60); }} className="btn ghost">重置</button>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="记录本轮专注内容" />
        <button onClick={record} className="btn">记录</button>
      </div>
      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
        {previewLogs.map((log) => <p key={log.id} className="rounded-2xl bg-slate-950/[0.035] px-3 py-2 text-sm text-slate-600">{log.date} · {log.title} · {log.minutes}min</p>)}
      </div>
      {logs.length > 10 && <p className="mt-3 text-xs text-slate-400">当前卡片支持滚动查看前 10 条，更多记录请点右上角查看。</p>}
    </div>
  );
}

function DiaryPanel({ diaries, setDiaries }: { diaries: Diary[]; setDiaries: React.Dispatch<React.SetStateAction<Diary[]>> }) {
  const [content, setContent] = useState('');
  const previewDiaries = diaries.slice(0, 10);
  const add = () => {
    if (!content.trim()) return;
    setDiaries([{ id: uid(), title: '今天的小成功', content: content.trim(), date: today() }, ...diaries]);
    setContent('');
  };

  return (
    <div>
      <textarea className="input min-h-24 resize-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下今天做成的一件小事" />
      <button onClick={add} className="btn mt-2 w-full">存入日记</button>
      <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1">
        {previewDiaries.map((diary) => (
          <article key={diary.id} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <p className="text-xs text-slate-400">{diary.date}</p>
            <p className="mt-1 font-medium text-slate-800">{diary.content}</p>
          </article>
        ))}
      </div>
      {diaries.length > 10 && <p className="mt-3 text-xs text-slate-400">当前卡片支持滚动查看前 10 条，更多记录请点右上角查看。</p>}
    </div>
  );
}

function WorkoutPanel({ workouts, setWorkouts, weights }: { workouts: Workout[]; setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>; weights: Workout[] }) {
  const [type, setType] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [weight, setWeight] = useState('');
  const previewWorkouts = workouts.slice(-10).reverse();
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!type.trim()) return;
    setWorkouts([...workouts, { id: uid(), type: type.trim(), minutes: Number(minutes), weight: weight ? Number(weight) : undefined, date: today() }]);
    setType('');
    setWeight('');
  };

  return (
    <div>
      <form onSubmit={add} className="grid grid-cols-3 gap-2">
        <input className="input col-span-3" value={type} onChange={(e) => setType(e.target.value)} placeholder="运动类型，如瑜伽/快走" />
        <input className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="分钟" />
        <input className="input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="体重" />
        <button className="btn">记录</button>
      </form>
      <div className="mt-5 h-32 rounded-3xl bg-slate-950/[0.035] p-4">
        <p className="mb-3 text-sm text-slate-500">体重趋势</p>
        <div className="flex h-20 items-end gap-2">{weights.map((item) => <div key={item.id} title={`${item.date} ${item.weight}kg`} className="flex-1 rounded-t-xl bg-[var(--accent)]" style={{ height: `${Math.max(18, Number(item.weight || 0) * 1.3)}%` }} />)}</div>
      </div>
      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
        {previewWorkouts.map((item) => <p key={item.id} className="text-sm text-slate-600">{item.date} · {item.type} {item.minutes}min {item.weight ? `· ${item.weight}kg` : ''}</p>)}
      </div>
      {workouts.length > 10 && <p className="mt-3 text-xs text-slate-400">当前卡片支持滚动查看前 10 条，更多记录请点右上角查看。</p>}
    </div>
  );
}

function BookPanel({ notes, setNotes }: { notes: BookNote[]; setNotes: React.Dispatch<React.SetStateAction<BookNote[]>> }) {
  const [book, setBook] = useState('');
  const [note, setNote] = useState('');
  const previewNotes = notes.slice(0, 10);
  const add = () => {
    if (!book.trim() || !note.trim()) return;
    setNotes([{ id: uid(), book, note, link: 'https://weread.qq.com/', date: today() }, ...notes]);
    setBook('');
    setNote('');
  };

  return (
    <div>
      <div className="grid gap-2">
        <input className="input" value={book} onChange={(e) => setBook(e.target.value)} placeholder="书名" />
        <textarea className="input min-h-20 resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="摘抄或想法" />
        <button onClick={add} className="btn">添加笔记</button>
      </div>
      <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1">
        {previewNotes.map((item) => (
          <article key={item.id} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <div className="flex justify-between gap-3">
              <p className="font-medium text-slate-900">{item.book}</p>
              <a href={item.link || 'https://weread.qq.com/'} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-strong)]">微信读书</a>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
          </article>
        ))}
      </div>
      {notes.length > 10 && <p className="mt-3 text-xs text-slate-400">当前卡片支持滚动查看前 10 条，更多记录请点右上角查看。</p>}
    </div>
  );
}

function StockDiaryPanel({ notes, setNotes }: { notes: StockNote[]; setNotes: React.Dispatch<React.SetStateAction<StockNote[]>> }) {
  const [symbol, setSymbol] = useState('');
  const [thought, setThought] = useState('');
  const add = () => {
    if (!symbol.trim() || !thought.trim()) return;
    setNotes([{ id: uid(), symbol: symbol.trim(), action: '观察', thought: thought.trim(), date: today() }, ...notes]);
    setSymbol('');
    setThought('');
  };
  const grouped = notes.reduce<Record<string, StockNote[]>>((acc, item) => {
    acc[item.symbol] = [...(acc[item.symbol] || []), item];
    return acc;
  }, {});
  const groupedEntries = Object.entries(grouped).slice(0, 10);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[0.5fr_1fr_auto]">
        <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="标的" />
        <input className="input" value={thought} onChange={(e) => setThought(e.target.value)} placeholder="交易想法/复盘" />
        <button onClick={add} className="btn">记录</button>
      </div>
      <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1">
        {groupedEntries.map(([key, items]) => (
          <div key={key} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <p className="font-semibold text-slate-900">{key}</p>
            {items.slice(0, 2).map((item) => <p key={item.id} className="mt-2 text-sm leading-6 text-slate-600">{item.date} · {item.thought}</p>)}
          </div>
        ))}
      </div>
      {Object.keys(grouped).length > 10 && <p className="mt-3 text-xs text-slate-400">当前卡片支持滚动查看前 10 条，更多记录请点右上角查看。</p>}
    </div>
  );
}

function MarketPanel({ indices, error }: { indices: MarketIndex[]; error: string }) {
  return <div className="grid gap-3 sm:grid-cols-3">{indices.length ? indices.map((item) => { const up = Number(item.change) >= 0; return <div key={item.code} className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="text-sm text-slate-500">{item.name}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{item.price}</p><p className={`mt-1 text-sm ${up ? 'text-rose-500' : 'text-emerald-600'}`}>{up ? '+' : ''}{item.change} · {item.percent}%</p></div>; }) : <p className="col-span-3 rounded-2xl bg-slate-950/[0.035] p-4 text-slate-500">正在加载沪深创业板指数…</p>}{error && <p className="col-span-3 text-xs text-amber-600">{error}</p>}</div>;
}

function RecordViewerModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-[0.22em] text-slate-400">VIEWER</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-950/5 px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-950/10 hover:text-slate-700">关闭</button>
        </div>
        <div className="mt-5 max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

function ViewerItem({ title, meta, body, extra }: { title: string; meta?: string; body?: string; extra?: React.ReactNode }) {
  return (
    <article className="rounded-3xl bg-slate-950/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          {meta && <p className="mt-1 text-sm text-slate-500">{meta}</p>}
        </div>
        {extra}
      </div>
      {body && <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>}
    </article>
  );
}
