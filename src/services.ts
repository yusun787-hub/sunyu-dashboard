import type { MarketIndex, WeatherDay } from './types';

export async function fetchShanghaiWeather(): Promise<WeatherDay[]> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=31.2304&longitude=121.4737&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=5';
  const res = await fetch(url);
  if (!res.ok) throw new Error('天气服务暂不可用');
  const data = await res.json();
  return data.daily.time.map((date: string, index: number) => ({
    date,
    min: Math.round(data.daily.temperature_2m_min[index]),
    max: Math.round(data.daily.temperature_2m_max[index]),
    code: data.daily.weather_code[index],
  }));
}

export function weatherText(code: number) {
  if (code === 0) return '晴';
  if ([1, 2, 3].includes(code)) return '多云';
  if ([45, 48].includes(code)) return '雾';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '雨';
  if ([71, 73, 75, 85, 86].includes(code)) return '雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天气';
}

type EastMoneyRow = {
  f12: string;
  f14: string;
  f2: number;
  f3: number;
  f4: number;
};

type EastMoneyResponse = {
  data?: {
    diff?: EastMoneyRow[];
  };
};

declare global {
  interface Window {
    [key: `sunyuMarketCallback_${string}`]: (payload: EastMoneyResponse) => void;
  }
}

export function fetchMarketIndices(): Promise<MarketIndex[]> {
  return new Promise((resolve, reject) => {
    const callbackName = `sunyuMarketCallback_${Date.now()}`;
    const script = document.createElement('script');
    script.src = `https://push2.eastmoney.com/api/qt/ulist.np/get?cb=${callbackName}&fltt=2&secids=1.000001,0.399001,0.399006&fields=f12,f14,f2,f3,f4`;
    const cleanup = () => {
      delete window[callbackName as `sunyuMarketCallback_${string}`];
      script.remove();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('行情加载超时'));
    }, 6000);

    window[callbackName as `sunyuMarketCallback_${string}`] = (payload: EastMoneyResponse) => {
      window.clearTimeout(timer);
      const rows = payload.data?.diff || [];
      const parsed = rows.map((item) => ({
        code: item.f12,
        name: item.f14,
        price: Number(item.f2).toFixed(2),
        change: Number(item.f4).toFixed(2),
        percent: Number(item.f3).toFixed(2),
      }));
      cleanup();
      if (!parsed.length) reject(new Error('行情数据为空'));
      else resolve(parsed);
    };

    script.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('行情服务暂不可用'));
    };
    document.body.appendChild(script);
  });
}
