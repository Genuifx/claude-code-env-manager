import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface LaunchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  launched?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: ReactNode;
  shortcut?: string;
  type?: 'button' | 'submit';
}

const sizeClasses = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-14 px-6 text-[15px] rounded-2xl',
};

export function LaunchButton({
  children,
  onClick,
  disabled = false,
  launched = false,
  size = 'md',
  className,
  icon,
  shortcut,
  type = 'button',
}: LaunchButtonProps) {
  const isEnabled = !disabled && !launched;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'liquid-launch-btn relative flex items-center justify-center gap-2 font-semibold whitespace-nowrap',
        'transform-gpu',
        sizeClasses[size],
        launched
          ? 'launched text-primary'
          : disabled
            ? 'opacity-50 cursor-not-allowed bg-surface-raised text-muted-foreground'
            : 'text-white cursor-pointer',
        className
      )}
    >
      {/* Caustic refraction highlight — stronger upper arc */}
      {isEnabled && (
        <span
          className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
          }}
        />
      )}
      {/* Top specular edge */}
      {isEnabled && (
        <span
          className="absolute top-0 left-[12%] right-[12%] h-[1px] pointer-events-none rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.6) 70%, transparent)',
          }}
        />
      )}

      {/* Icon */}
      {icon && (
        <span className={cn('relative z-[1]', isEnabled && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]')}>
          {icon}
        </span>
      )}

      {/* Text */}
      <span className={cn('relative z-[1]', isEnabled && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]')}>
        {children}
      </span>

      {/* Keyboard shortcut */}
      {shortcut && isEnabled && (
        <kbd className="relative z-[1] text-[10px] font-mono text-white/80 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/[0.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          {shortcut}
        </kbd>
      )}

      {/* Launched pulse */}
      {launched && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
    </button>
  );
}
