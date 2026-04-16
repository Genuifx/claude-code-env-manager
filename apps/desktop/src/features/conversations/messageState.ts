import type {
  ConversationContentBlock,
  ConversationMessageData,
} from './types';

export interface SessionTokenUsage {
  input: number;
  output: number;
  total: number;
}

export function mergeToolResults(msgs: ConversationMessageData[]): ConversationMessageData[] {
  const toolUseMap = new Map<string, ConversationContentBlock>();
  const prepared = msgs.map((msg) => {
    if ((msg.msgType === 'assistant' || msg.msgType === 'ai') && Array.isArray(msg.content)) {
      const blocks = msg.content as ConversationContentBlock[];
      let nextBlocks: ConversationContentBlock[] | null = null;

      blocks.forEach((block, index) => {
        if (block.type !== 'tool_use' || !block.id) return;

        if (!nextBlocks) {
          nextBlocks = [...blocks];
        }

        const clonedBlock = { ...block };
        nextBlocks[index] = clonedBlock;
        toolUseMap.set(block.id, clonedBlock);
      });

      if (nextBlocks) {
        return {
          ...msg,
          content: nextBlocks as ConversationMessageData['content'],
        };
      }
    }

    return msg;
  });

  const result: ConversationMessageData[] = [];
  for (const msg of prepared) {
    if ((msg.msgType === 'user' || msg.msgType === 'human') && Array.isArray(msg.content)) {
      const blocks = msg.content as ConversationContentBlock[];
      let remaining: ConversationContentBlock[] | null = null;

      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        if (block.type === 'tool_result' && block.tool_use_id) {
          const target = toolUseMap.get(block.tool_use_id);
          if (target) {
            target._result = block.content;
            target._resultError = block.is_error === true;
            if (!remaining) {
              remaining = blocks.slice(0, index);
            }
            continue;
          }
        }

        if (remaining) {
          remaining.push(block);
        }
      }

      if (remaining) {
        if (remaining.length === 0) continue;
        result.push({
          ...msg,
          content: remaining as ConversationMessageData['content'],
        });
        continue;
      }
    }
    result.push(msg);
  }

  return result;
}

export function getSessionTokenUsage(messages: ConversationMessageData[]): SessionTokenUsage {
  const usage = messages.reduce(
    (acc, msg) => {
      acc.input += msg.inputTokens ?? 0;
      acc.output += msg.outputTokens ?? 0;
      return acc;
    },
    { input: 0, output: 0 }
  );

  return {
    ...usage,
    total: usage.input + usage.output,
  };
}
