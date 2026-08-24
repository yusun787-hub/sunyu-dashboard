import type { BookNote, BookRecommendation, DailyTask, Diary, FocusEntry, FocusLog, FocusNotebook, Habit, Project, QuoteCard, StockNote, Workout } from './types';

export const quoteCards: QuoteCard[] = [
  { text: '所谓无底深渊，下去，也是前程万里。', source: '木心' },
  { text: '一天中最美好的时刻，是终于开始认真生活的那一分钟。', source: '佚名' },
  { text: '把注意力放回自己能推动的事上，事情就会慢慢变清楚。', source: '工作笔记' },
  { text: '无需一下子抵达远方，先把今天过得丰盈。', source: '单向历风格文案' },
  { text: '每一个认真记录的普通日子，都会在未来发光。', source: '今日摘抄' },
  { text: '越是繁忙，越要为内心留一盏台灯。', source: '读书摘抄' },
  { text: '把想法写出来，焦虑就会开始变成路径。', source: '产品手账' },
];

export const vintageIllustrationUrls = [
  'https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet,_Impression,_soleil_levant.jpg',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_Water_Lilies_-_Google_Art_Project.jpg',
  'https://commons.wikimedia.org/wiki/Special:FilePath/The_Artist%27s_Garden_at_Giverny_by_Claude_Monet_1900.jpeg',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_Poppy_Field_(Giverny)_-_1922.4465_-_Art_Institute_of_Chicago.jpg',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_The_Water_Lilies_-_Morning_-_Google_Art_Project.jpg',
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
  {
    id: 'p-1',
    name: 'AI 产品经理面试准备',
    stage: '高优先级',
    progress: 42,
    next: '补齐 4-1 面试官标准案例库',
    steps: [
      { id: 'p-1-s1', title: '整理 AI 产品案例库', done: true },
      { id: 'p-1-s2', title: '补充 4-1 面试官问题清单', done: false },
      { id: 'p-1-s3', title: '模拟一轮完整面试', done: false },
    ],
  },
  {
    id: 'p-2',
    name: '个人工作面板',
    stage: '开发中',
    progress: 82,
    next: '体验细节打磨与部署',
    steps: [
      { id: 'p-2-s1', title: '整理页面信息结构', done: true },
      { id: 'p-2-s2', title: '补齐细节交互', done: false },
      { id: 'p-2-s3', title: '做一轮视觉统一', done: false },
    ],
  },
  {
    id: 'p-3',
    name: '每周成长复盘',
    stage: '规划中',
    progress: 18,
    next: '整理复盘模板',
    steps: [
      { id: 'p-3-s1', title: '定义复盘维度', done: false },
      { id: 'p-3-s2', title: '收集样例问题', done: false },
    ],
  },
];

export const defaultFocusLogs: FocusLog[] = [
  { id: 'f-1', title: 'PRD 重点阅读', minutes: 45, date: today() },
  { id: 'f-2', title: '面试案例复盘', minutes: 30, date: daysAgo(1) },
];

export const defaultFocusEntries: FocusEntry[] = [
  {
    id: 'focus-entry-1',
    topic: '先把今天最重要的一件事写下来',
    leftPage: '1. 先明确本轮专注目标\n2. 把任务拆成 25 分钟内能完成的动作\n3. 完成后记一句今天的感受',
    rightPage: '灵感、复盘、提醒都写在这里。\n像翻开一本专注本，把心慢慢收回来。',
    date: today(),
  },
  {
    id: 'focus-entry-2',
    topic: '把面试案例拆成可复述的框架',
    leftPage: '先写结论，再补案例细节。',
    rightPage: '今天最卡的是案例表达顺序。',
    date: daysAgo(1),
  },
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
  { id: 'b-3', book: '《置身事内》', note: '理解系统，才能理解具体问题为什么这样发生。', link: 'https://weread.qq.com/', date: daysAgo(2) },
];

export const dailyBookRecommendations: BookRecommendation[] = [
  {
    title: '《变量》',
    author: '何帆',
    excerpt: '变化不是威胁，变化本身就是生活的一部分。',
  },
  {
    title: '《置身事内》',
    author: '兰小欢',
    excerpt: '理解中国经济，离不开对政府与市场关系的理解。',
  },
  {
    title: '《纳瓦尔宝典》',
    author: '埃里克·乔根森',
    excerpt: '把自己产品化，然后把自己重复销售。',
  },
  {
    title: '《金字塔原理》',
    author: '芭芭拉·明托',
    excerpt: '读者的大脑会自动将信息归类组织，以便理解和记忆。',
  },
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
