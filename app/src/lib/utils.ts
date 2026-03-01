import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化数字
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

// 格式化金额
export function formatAmount(amount: number, unit: '元' | '万' | '亿' = '元'): string {
  if (unit === '亿') {
    return (amount / 100000000).toFixed(2) + '亿';
  } else if (unit === '万') {
    return (amount / 10000).toFixed(2) + '万';
  }
  return amount.toFixed(2);
}

// 格式化百分比
export function formatPercent(num: number, showSign: boolean = true): string {
  const sign = showSign && num > 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

// 格式化成交量
export function formatVolume(vol: number): string {
  if (vol >= 100000000) {
    return (vol / 100000000).toFixed(2) + '亿';
  } else if (vol >= 10000) {
    return (vol / 10000).toFixed(2) + '万';
  }
  return vol.toString();
}

// 获取涨跌颜色 - 使用主题变量
export function getChangeColor(change: number): string {
  if (change > 0) return 'text-stock-up';
  if (change < 0) return 'text-stock-down';
  return 'text-stock-flat';
}

// 获取涨跌背景色
export function getChangeBgColor(change: number): string {
  if (change > 0) return 'bg-stock-up-bg';
  if (change < 0) return 'bg-stock-down-bg';
  return 'bg-muted';
}

// 格式化日期时间
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 格式化日期
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 防抖函数
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 格式化大数值（通用版：千元单位转亿/万）
export function formatLargeNumber(value: number, unit: 'qian' | 'wan' | 'ge' = 'qian'): string {
  if (!value) return '-';
  // 统一转换到"元"为基准
  let yuanValue = value;
  if (unit === 'qian') yuanValue = value * 1000;      // 千元 → 元
  else if (unit === 'wan') yuanValue = value * 10000;  // 万元 → 元

  if (yuanValue >= 1e8) return (yuanValue / 1e8).toFixed(2) + '亿';
  if (yuanValue >= 1e4) return (yuanValue / 1e4).toFixed(2) + '万';
  return yuanValue.toFixed(2);
}

// 格式化成交量（手）
export function formatVolumeHand(vol: number): string {
  if (!vol) return '-';
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万手';
  return vol.toFixed(0) + '手';
}

// 格式化市值（万元 → 亿）
export function formatMarketCap(value: number): string {
  if (!value) return '-';
  if (value >= 10000) return (value / 10000).toFixed(2) + '亿';
  return value.toFixed(2) + '万';
}
