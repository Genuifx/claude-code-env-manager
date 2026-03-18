import { memo } from 'react';
import { Bot } from 'lucide-react';
import { Claude, Codex, OpenAI, DeepSeek, Minimax, Moonshot, Zhipu, Gemini, Ollama, Qwen } from '@lobehub/icons';

interface ModelIconProps {
  model?: string;
  size?: number;
  className?: string;
  /**
   * 为浅色图标添加背景衬托，确保在亮色模式下可见
   */
  withBg?: boolean;
}

type IconEntry = {
  icon: any;
  color?: string;
  variant?: 'color';
  /** 图标是否需要深色背景衬托（用于白色/浅色图标） */
  needsContrastBg?: boolean;
};

/** Map a model ID string to the corresponding lobe-icons component + brand color */
function resolveIcon(model: string | undefined): IconEntry | null {
  if (!model) return null;
  const m = model.toLowerCase();

  if (m.includes('codex')) return { icon: Codex, variant: 'color' };
  if (m.includes('claude') || m.includes('anthropic') || m.includes('opus') || m.includes('sonnet') || m.includes('haiku')) return { icon: Claude, color: '#D97757' };
  if (m.includes('gpt') || m.includes('openai') || m.includes('o1-') || m.includes('o3-') || m.includes('o4-')) return { icon: OpenAI, color: '#10A37F' };
  if (m.includes('deepseek')) return { icon: DeepSeek, color: '#4D6BFE' };
  if (m.includes('minimax') || m.includes('abab')) return { icon: Minimax, color: '#F23F5D' };
  if (m.includes('moonshot') || m.includes('kimi')) return { icon: Moonshot, color: '#fff', needsContrastBg: true };
  if (m.includes('qwen') || m.includes('qwq') || m.includes('dashscope') || m.includes('tongyi')) return { icon: Qwen, color: '#615CED' };
  if (m.includes('glm') || m.includes('zhipu') || m.includes('chatglm')) return { icon: Zhipu, color: '#3859FF' };
  if (m.includes('gemini') || m.includes('google')) return { icon: Gemini, color: '#4285F4' };
  if (m.includes('ollama')) return { icon: Ollama, color: '#fff', needsContrastBg: true };

  return null;
}

export const ModelIcon = memo(function ModelIcon({ model, size = 14, className, withBg }: ModelIconProps) {
  const entry = resolveIcon(model);

  if (!entry) {
    return <Bot className={className} style={{ width: size, height: size }} />;
  }

  if (entry.variant === 'color') {
    return <entry.icon.Color className={className} size={size} />;
  }

  const style = entry.color ? { color: entry.color } : undefined;
  const IconComponent = entry.icon;

  // 为需要对比背景的图标添加自适应背景容器
  // 亮色模式：深色背景衬托白色图标；暗色模式：透明背景（白色图标在暗色背景上自然可见）
  if (entry.needsContrastBg || withBg) {
    const padding = Math.max(2, Math.floor(size * 0.15));
    const borderRadius = Math.max(4, Math.floor(size * 0.25));
    return (
      <span
        className="inline-flex items-center justify-center bg-black/[0.75] dark:bg-transparent"
        style={{ padding, borderRadius }}
      >
        <IconComponent className={className} size={size} style={style} />
      </span>
    );
  }

  return <IconComponent className={className} size={size} style={style} />;
});
