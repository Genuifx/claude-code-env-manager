import React from 'react';
import { render } from 'ink';
import { SkillSelector } from './SkillSelector.js';
import { SkillPreset } from '../skills.js';

export interface SelectionResult {
  type: 'skill' | 'custom' | 'cancelled';
  skill?: SkillPreset;
}

/**
 * 运行交互式 skill 选择器
 * 返回选中的 skill 或 'custom' 表示用户选择自定义 URL
 */
export async function runSkillSelector(): Promise<SelectionResult> {
  return new Promise((resolve) => {
    let resolved = false;

    const { unmount, waitUntilExit } = render(
      <SkillSelector
        onSelect={(result) => {
          if (resolved) return;
          resolved = true;
          unmount();
          if (result === 'custom') {
            resolve({ type: 'custom' });
          } else {
            resolve({ type: 'skill', skill: result });
          }
        }}
        onCancel={() => {
          if (resolved) return;
          resolved = true;
          unmount();
          resolve({ type: 'cancelled' });
        }}
      />
    );

    waitUntilExit().then(() => {
      // 如果组件退出但没有调用 resolve，默认为取消
      if (!resolved) {
        resolve({ type: 'cancelled' });
      }
    });
  });
}
