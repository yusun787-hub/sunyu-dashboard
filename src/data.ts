import type { BookNote, DailyTask, Diary, FocusLog, FocusNotebook, Habit, Project, QuoteCard, StockNote, Workout } from './types';

export const quoteCards: QuoteCard[] = [
  { text: '所谓无底深渊，下去，也是前程万里。', source: '木心' },
  { text: '一天中最美好的时刻，是终于开始认真生活的那一分钟。', source: '佚名' },
  { text: '把注意力放回自己能推动的事上，事情就会慢慢变清楚。', source: '工作笔记' },
  { text: '无需一下子抵达远方，先把今天过得丰盈。', source: '单向历风格文案' },
  { text: '每一个认真记录的普通日子，都会在未来发光。', source: '今日摘抄' },
  { text: '越是繁忙，越要为内心留一盏台灯。', source: '读书摘抄' },
  { text: '把想法写出来，焦虑就会开始变成路径。', source: '产品手账' },
];

export const defaultWorkHabits: Habit[] = [
  { id: 'work-habit-1', title: '晨间复盘 15 分钟', area: 'work', completedDates: [daysAgo(3), daysAgo(1)] },
  { id: 'work-habit-2', title: 'AI 面试题打卡 1 题', area: 'work', completedDates: [daysAgo(2), today()] },
];

export const defaultLifeHabits: Habit[] = [
  { id: 'life-habit-1', title: '喝水 8 杯', area: 'life', completedDates: [daysAgo(2), daysAgo(1), today()] },
  { id: 'life-habit-2', title: '晚间拉伸 10 分钟', area: 'life', completedDates: [daysAgo(1)] },
];

export const defaultWorkDailyTasks: DailyTask[] = [
  { id: 'work-task-1', title: '梳理今日最重要的 3 件事', area: 'work', date: today(), done: false },
  { id: 'work-task-2', title: '推进一个核心项目节点', area: 'work', date: today(), done: false },
  { id: 'work-task-3', title: '整理上周版本反馈', area: 'work', date: daysAgo(1), done: true },
];

export const defaultLifeDailyTasks: DailyTask[] = [
  { id: 'life-task-1', title: '补充家里日用品', area: 'life', date: today(), done: false },
  { id: 'life-task-2', title: '回一条重要消息', area: 'life', date: today(), done: false },
  { id: 'life-task-3', title: '给绿植浇水', area: 'life', date: daysAgo(1), done: true },
];

export const defaultProjects: Project[] = [
  { id: 'p-1', name: 'AI 产品经理面试准备', stage: '高优先级', progress: 42, next: '补齐 4-1 面试官标准案例库' },
  { id: 'p-2', name: '个人工作面板', stage: '开发中', progress: 82, next: '体验细节打磨与部署' },
  { id: 'p-3', name: '每周成长复盘', stage: '规划中', progress: 18, next: '整理复盘模板' },
];

export const defaultFocusLogs: FocusLog[] = [
  { id: 'f-1', title: 'PRD 重点阅读', minutes: 45, date: today() },
  { id: 'f-2', title: '面试案例复盘', minutes: 30, date: daysAgo(1) },
];

export const defaultFocusNotebook: FocusNotebook = {
  currentTopic: '先把今天最重要的一件事写下来',
  leftPage: '1. 先明确本轮专注目标\n2. 把任务拆成 25 分钟内能完成的动作\n3. 完成后记一句今天的感受',
  rightPage: '灵感、复盘、提醒都写在这里。\n像翻开一本专注本，把心慢慢收回来。',
};

export const defaultDiaries: Diary[] = [
  { id: 'd-1', title: '今天的小成功', content: '把要做的事写清楚，已经完成了一半。', date: today() },
  { id: 'd-2', title: '昨天的小成功', content: '把犹豫很久的需求点敲定了。', date: daysAgo(1) },
];

export const defaultWorkouts: Workout[] = [
  { id: 'w-1', type: '快走', minutes: 30, weight: 55, date: today() },
  { id: 'w-2', type: '拉伸', minutes: 15, weight: 55.2, date: daysAgo(1) },
  { id: 'w-3', type: '瑜伽', minutes: 25, weight: 55.4, date: daysAgo(2) },
];

export const defaultBookNotes: BookNote[] = [
  { id: 'b-1', book: '《原则》', note: '把问题写下来，拆成可验证的小假设。', link: 'https://weread.qq.com/', date: today() },
  { id: 'b-2', book: '《变量》', note: '先承认变化，才能主动设计变化。', link: 'https://weread.qq.com/', date: daysAgo(1) },
];

export const defaultStockNotes: StockNote[] = [
  { id: 's-1', symbol: '示例标的', action: '观察', thought: '先记录买入逻辑，再记录验证结果。', date: today() },
  { id: 's-2', symbol: '示例标的', action: '复盘', thought: '今天的波动更适合继续观察。', date: daysAgo(1) },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}
