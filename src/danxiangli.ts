import { recognize } from 'tesseract.js';

export type DanxiangliContent = {
  monthLabel: string;
  dayLabel: string;
  recommendation: string;
  lunarLabel: string;
  quoteText: string;
  sourceTitle: string;
  sourceMeta: string;
  isDark: boolean;
};

const cache = new Map<string, DanxiangliContent>();

function normalizeLine(line: string) {
  return line.trim().replace(/\u3000/g, ' ').replace(/\s+/g, ' ').replace(/^(导演|作者|编剧|译者|主编|策划)[，,:：]\s*/, '$1：');
}

function chineseNumber(value: number) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (value <= 10) return value === 10 ? '十' : digits[value];
  if (value < 20) return `十${digits[value % 10]}`;
  const tens = Math.floor(value / 10);
  const units = value % 10;
  return units ? `${digits[tens]}十${digits[units]}` : `${digits[tens]}十`;
}

function fallbackMonthLabel(date: string) {
  return `${chineseNumber(Number(date.slice(5, 7)))}月`;
}

function parseDanxiangliText(rawText: string, date: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  const dayNumeric = String(Number(date.slice(8, 10)));
  const monthLabel = lines.find((line) => line.endsWith('月') && line.length <= 4) || fallbackMonthLabel(date);
  const dayLabel = lines.find((line) => /^\d{1,2}$/.test(line)) || dayNumeric;
  const recommendation = lines.find((line) => line.startsWith('宜')) || '宜认真生活';
  const lunarLabel = lines.find((line) => line.startsWith('农历')) || '农历信息同步中';

  const dayIndex = lines.findIndex((line) => line === dayLabel);
  const weekdayIndex = lines.findIndex((line) => line.startsWith('星期'));
  const owspaceIndex = lines.findIndex((line) => line.replace(/\s+/g, '').toUpperCase() === 'OWSPACE');

  let sourceStart = owspaceIndex >= 0 ? owspaceIndex + 1 : -1;
  if (sourceStart < 0) {
    sourceStart = lines.findIndex((line, index) => index > dayIndex && /^(电影《|电视剧《|纪录片《|《|作者：|导演：|编剧：|译者：|主编：)/.test(line));
  }

  const quoteEnd = sourceStart >= 0 ? sourceStart : weekdayIndex >= 0 ? weekdayIndex : lines.length;
  const quoteText = lines
    .filter((line, index) => index > dayIndex && index < quoteEnd)
    .filter((line) => !line.startsWith('宜') && !line.startsWith('农历'))
    .filter((line) => !/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年/.test(line))
    .filter((line) => !line.startsWith('星期'))
    .filter((line) => !/單向历|单向历|OWSPACE/i.test(line.replace(/\s+/g, '')))
    .join('')
    .replace(/[“”]/g, '')
    .trim();

  const sourceLines = (sourceStart >= 0 ? lines.slice(sourceStart, weekdayIndex >= 0 ? weekdayIndex : lines.length) : [])
    .filter((line) => !/單向历|单向历|OWSPACE/i.test(line.replace(/\s+/g, '')));

  return {
    monthLabel,
    dayLabel,
    recommendation,
    lunarLabel,
    quoteText,
    sourceTitle: sourceLines[0] || '',
    sourceMeta: sourceLines.slice(1).join(' · '),
  };
}

function measureImageDarkness(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(false);
        return;
      }
      context.drawImage(image, 0, 0, 64, 64);
      const { data } = context.getImageData(0, 0, 64, 64);
      let total = 0;
      for (let index = 0; index < data.length; index += 4) {
        total += data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      }
      resolve(total / (64 * 64) < 140);
    };
    image.onerror = () => resolve(false);
    image.src = imageUrl;
  });
}

export async function getDanxiangliContent(date: string, imageUrl: string): Promise<DanxiangliContent> {
  const cacheKey = `${date}:${imageUrl}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [ocrResult, isDark] = await Promise.all([
    recognize(imageUrl, 'chi_sim+eng', { logger: () => undefined }),
    measureImageDarkness(imageUrl),
  ]);
  const parsed = parseDanxiangliText(ocrResult.data.text || '', date);
  const content: DanxiangliContent = {
    ...parsed,
    quoteText: parsed.quoteText || '今天的单向历文案同步中。',
    sourceTitle: parsed.sourceTitle || '《单向历》',
    sourceMeta: parsed.sourceMeta,
    isDark,
  };
  cache.set(cacheKey, content);
  return content;
}
