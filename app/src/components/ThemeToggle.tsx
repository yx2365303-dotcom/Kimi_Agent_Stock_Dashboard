import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: '浅色' },
  { value: 'dark', icon: Moon, label: '暗色' },
  { value: 'system', icon: Monitor, label: '跟随系统' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  const current = themeOptions.find((o) => o.value === theme) || themeOptions[0];
  const Icon = current.icon;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        'relative group'
      )}
      title={`当前: ${current.label}`}
    >
      <Icon className="w-5 h-5" />
      <span className="sr-only">{current.label}</span>
    </Button>
  );
}
