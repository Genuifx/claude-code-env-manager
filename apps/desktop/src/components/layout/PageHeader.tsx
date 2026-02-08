import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="h-12 flex items-center justify-between px-8 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </header>
  );
}
