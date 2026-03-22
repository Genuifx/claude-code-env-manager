import { MessageCircle, Send, type LucideIcon } from 'lucide-react';
import type { ChannelKind, ManagedSessionSource } from '@/lib/tauri-ipc';

export type RemotePlatformId = 'telegram' | 'weixin';

interface RemotePlatformMeta {
  id: RemotePlatformId;
  displayName: string;
  labelKey: string;
  sourceLabelKey: string;
  channelLabelKey: string;
  icon: LucideIcon;
}

const REMOTE_PLATFORM_META: Record<RemotePlatformId, RemotePlatformMeta> = {
  telegram: {
    id: 'telegram',
    displayName: 'Telegram',
    labelKey: 'chatApp.telegram',
    sourceLabelKey: 'sessions.source_telegram',
    channelLabelKey: 'sessions.channel_telegram',
    icon: Send,
  },
  weixin: {
    id: 'weixin',
    displayName: 'Weixin',
    labelKey: 'chatApp.weixin',
    sourceLabelKey: 'sessions.source_weixin',
    channelLabelKey: 'sessions.channel_weixin',
    icon: MessageCircle,
  },
};

export const REMOTE_PLATFORM_ORDER: RemotePlatformId[] = ['telegram', 'weixin'];

export function getRemotePlatformMeta(platform: RemotePlatformId): RemotePlatformMeta {
  return REMOTE_PLATFORM_META[platform];
}

export function getRemotePlatformFromSource(source: ManagedSessionSource): RemotePlatformId | null {
  switch (source.type) {
    case 'telegram':
      return 'telegram';
    case 'weixin':
      return 'weixin';
    default:
      return null;
  }
}

export function getRemotePlatformFromChannel(kind: ChannelKind | string): RemotePlatformId | null {
  const rawKind = typeof kind === 'string' ? kind : kind.kind;
  switch (rawKind) {
    case 'telegram':
      return 'telegram';
    case 'weixin':
      return 'weixin';
    default:
      return null;
  }
}

export function formatRemoteSourceHint(source: ManagedSessionSource): string | null {
  switch (source.type) {
    case 'telegram':
      return `${source.chat_id}/${source.thread_id}`;
    case 'weixin':
      return source.peer_id;
    default:
      return null;
  }
}
