import { memo } from 'react';
import { Bot } from 'lucide-react';
import { Claude, Codex, OpenAI, DeepSeek, Minimax, Moonshot, Zhipu, Gemini, Ollama, Qwen } from '@lobehub/icons';

interface ModelIconProps {
  model?: string;
  size?: number;
  className?: string;
}

type IconEntry = {
  icon: any;
  color?: string;
  variant?: 'color';
};

/** Map a model ID string to the corresponding lobe-icons component + brand color */
function resolveIcon(model: string | undefined): IconEntry | null {
  if (!model) return null;
  const m = model.toLowerCase();

  if (m.includes('codex')) return { icon: Codex, variant: 'color' };
  if (m.includes('claude') || m.includes('anthropic')) return { icon: Claude, color: '#D97757' };
  if (m.includes('gpt') || m.includes('openai') || m.includes('o1-') || m.includes('o3-') || m.includes('o4-')) return { icon: OpenAI, color: '#10A37F' };
  if (m.includes('deepseek')) return { icon: DeepSeek, color: '#4D6BFE' };
  if (m.includes('minimax') || m.includes('abab')) return { icon: Minimax, color: '#F23F5D' };
  if (m.includes('moonshot') || m.includes('kimi')) return { icon: Moonshot, color: '#fff' };
  if (m.includes('qwen') || m.includes('qwq') || m.includes('dashscope') || m.includes('tongyi')) return { icon: Qwen, color: '#615CED' };
  if (m.includes('glm') || m.includes('zhipu') || m.includes('chatglm')) return { icon: Zhipu, color: '#3859FF' };
  if (m.includes('gemini') || m.includes('google')) return { icon: Gemini, color: '#4285F4' };
  if (m.includes('ollama')) return { icon: Ollama, color: '#fff' };

  return null;
}

export const ModelIcon = memo(function ModelIcon({ model, size = 14, className }: ModelIconProps) {
  const entry = resolveIcon(model);

  if (!entry) {
    return <Bot className={className} style={{ width: size, height: size }} />;
  }

  if (entry.variant === 'color') {
    return <entry.icon.Color className={className} size={size} />;
  }

  const style = entry.color ? { color: entry.color } : undefined;
  return <entry.icon className={className} size={size} style={style} />;
});
