import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
