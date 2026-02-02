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

// 获取涨跌颜色 - 浅色背景
export function getChangeColor(change: number): string {
  if (change > 0) return 'text-red-600';
  if (change < 0) return 'text-green-600';
  return 'text-slate-500';
}

// 获取涨跌背景色
export function getChangeBgColor(change: number): string {
  if (change > 0) return 'bg-red-50';
  if (change < 0) return 'bg-green-50';
  return 'bg-slate-100';
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
