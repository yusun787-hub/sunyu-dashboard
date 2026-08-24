import type { Diary, FocusLog, Project, Todo, Workout, BookNote, StockNote } from './types';

export const quotes = [
  '所谓无底深渊，下去，也是前程万里。——木心',
  '一天中最美好的时刻，是终于开始认真生活的那一分钟。',
  '把注意力放回自己能推动的事上，事情就会慢慢变清楚。',
  '无需一下子抵达远方，先把今天过得丰盈。',
  '每一个认真记录的普通日子，都会在未来发光。',
  '越是繁忙，越要为内心留一盏台灯。',
];

export const defaultWorkTodos: Todo[] = [
  { id: 'todo-1', title: '梳理今日最重要的 3 件事', done: false, tag: '计划' },
  { id: 'todo-2', title: '推进一个核心项目节点', done: false, tag: '项目' },
  { id: 'todo-3', title: '复盘一个 AI 产品经理面试题', done: false, tag: '成长' },
];

export const defaultLifeTodos: Todo[] = [
  { id: 'life-1', title: '喝水 8 杯', done: false, tag: '健康' },
  { id: 'life-2', title: '整理 15 分钟房间或桌面', done: false, tag: '生活' },
];

export const defaultProjects: Project[] = [
  { id: 'p-1', name: 'AI 产品经理面试准备', stage: '高优先级', progress: 42, next: '补齐 4-1 面试官标准案例库' },
  { id: 'p-2', name: '个人工作面板', stage: '开发中', progress: 75, next: '体验验证与部署' },
];

export const defaultFocusLogs: FocusLog[] = [
  { id: 'f-1', title: 'PRD 重点阅读', minutes: 45, date: today() },
];

export const defaultDiaries: Diary[] = [
  { id: 'd-1', title: '今天的小成功', content: '把要做的事写清楚，已经完成了一半。', date: today() },
];

export const defaultWorkouts: Workout[] = [
  { id: 'w-1', type: '快走', minutes: 30, weight: 55, date: today() },
];

export const defaultBookNotes: BookNote[] = [
  { id: 'b-1', book: '《原则》', note: '把问题写下来，拆成可验证的小假设。', link: 'https://weread.qq.com/', date: today() },
];

export const defaultStockNotes: StockNote[] = [
  { id: 's-1', symbol: '示例标的', action: '观察', thought: '先记录买入逻辑，再记录验证结果。', date: today() },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
