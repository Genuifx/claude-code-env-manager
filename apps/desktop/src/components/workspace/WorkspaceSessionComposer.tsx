import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { ArrowUp, LoaderCircle } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceSessionComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  placeholder: string;
  disabled?: boolean;
  canSubmit: boolean;
  isSubmitting?: boolean;
  submitLabel: string;
  loadingLabel?: string;
  aboveComposer?: ReactNode;
  aboveTextarea?: ReactNode;
  onPrimaryAction?: () => void | Promise<void>;
  primaryActionLabel?: string;
  primaryActionIcon?: ReactNode;
  primaryActionDisabled?: boolean;
  primaryActionVariant?: ButtonProps['variant'];
  primaryActionClassName?: string;
  controls?: ReactNode;
  secondaryActions?: ReactNode;
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'placeholder' | 'disabled'>;
}

export function WorkspaceSessionComposer({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  disabled = false,
  canSubmit,
  isSubmitting = false,
  submitLabel,
  loadingLabel = submitLabel,
  aboveComposer,
  aboveTextarea,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionIcon,
  primaryActionDisabled,
  primaryActionVariant = 'default',
  primaryActionClassName,
  controls,
  secondaryActions,
  textareaProps,
}: WorkspaceSessionComposerProps) {
  const resolvedActionLabel = isSubmitting ? loadingLabel : (primaryActionLabel ?? submitLabel);
  const resolvedPrimaryAction = onPrimaryAction ?? onSubmit;
  const resolvedPrimaryDisabled = primaryActionDisabled ?? (!canSubmit || disabled);
  const resolvedPrimaryIcon = isSubmitting
    ? <LoaderCircle className="h-4 w-4 animate-spin" />
    : (primaryActionIcon ?? <ArrowUp className="h-4 w-4" />);

  return (
    <div className="px-4 pb-3 pt-2">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-0">
        {aboveComposer ? (
          <div className="workspace-attention-dock mx-auto w-full max-w-[960px] rounded-t-[20px] bg-background px-6 pt-4">
            {aboveComposer}
          </div>
        ) : null}

        <div className="relative z-20 rounded-[20px] border border-border/60 bg-surface-raised px-5 py-3.5 shadow-[0_40px_120px_-70px_rgba(0,0,0,0.38)]">
          {aboveTextarea ? (
            <div className="mb-3">
              {aboveTextarea}
            </div>
          ) : null}

          <textarea
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              textareaProps?.onKeyDown?.(event);
              if (event.defaultPrevented) {
                return;
              }
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void onSubmit();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[80px] w-full resize-none bg-transparent text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground/75 disabled:cursor-not-allowed disabled:text-muted-foreground"
            {...textareaProps}
          />

          <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-border/40 pt-2.5">
            {controls}

            <div className="ml-auto flex items-center gap-2">
              {secondaryActions}

              <Button
                type="button"
                size="icon"
                variant={primaryActionVariant}
                aria-label={resolvedActionLabel}
                title={resolvedActionLabel}
                disabled={resolvedPrimaryDisabled}
                onClick={() => void resolvedPrimaryAction()}
                className={cn(
                  'h-9 w-9 rounded-full shadow-[0_14px_36px_-18px_rgba(0,0,0,0.42)]',
                  primaryActionClassName,
                )}
              >
                {resolvedPrimaryIcon}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
