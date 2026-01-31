import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import {
  SkillPreset,
  SkillGroup,
  SKILL_GROUPS,
  getSkillsByGroup,
  getGroupOrder,
} from '../skills.js';

interface SkillSelectorProps {
  onSelect: (skill: SkillPreset | 'custom') => void;
  onCancel: () => void;
}

export function SkillSelector({ onSelect, onCancel }: SkillSelectorProps) {
  const { exit } = useApp();
  const groups = getGroupOrder();
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const currentGroup = groups[activeGroupIndex];
  const skills = getSkillsByGroup(currentGroup);

  // 添加 "自定义 URL" 选项
  const items = [...skills, null]; // null 代表自定义选项
  const maxIndex = items.length - 1;

  // 切换分组时重置选择索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeGroupIndex]);

  useInput((input, key) => {
    // Tab: 切换到下一个分组
    if (key.tab && !key.shift) {
      setActiveGroupIndex((prev) => (prev + 1) % groups.length);
      return;
    }

    // Shift+Tab: 切换到上一个分组
    if (key.tab && key.shift) {
      setActiveGroupIndex((prev) => (prev - 1 + groups.length) % groups.length);
      return;
    }

    // 上下箭头: 选择 skill
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(maxIndex, prev + 1));
      return;
    }

    // Enter: 确认选择
    if (key.return) {
      const selected = items[selectedIndex];
      if (selected === null) {
        onSelect('custom');
      } else {
        onSelect(selected);
      }
      return;
    }

    // Escape 或 q: 取消
    if (key.escape || input === 'q') {
      onCancel();
      exit();
      return;
    }
  });

  return (
    <Box flexDirection="column">
      {/* Tab 栏 */}
      <Box marginBottom={1}>
        {groups.map((group, index) => {
          const meta = SKILL_GROUPS[group];
          const isActive = index === activeGroupIndex;
          return (
            <Box key={group} marginRight={2}>
              <Text
                bold={isActive}
                color={isActive ? 'cyan' : 'gray'}
                inverse={isActive}
              >
                {' '}{meta.icon} {meta.label}{' '}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* 分隔线 */}
      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>

      {/* Skill 列表 */}
      <Box flexDirection="column">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const prefix = isSelected ? '❯ ' : '  ';

          if (item === null) {
            // 自定义 URL 选项
            return (
              <Box key="custom">
                <Text color={isSelected ? 'yellow' : 'gray'}>
                  {prefix}输入自定义 GitHub URL
                </Text>
              </Box>
            );
          }

          return (
            <Box key={item.name}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {prefix}
                <Text bold={isSelected}>{item.name}</Text>
                <Text color="gray"> - {item.description}</Text>
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* 帮助提示 */}
      <Box marginTop={1}>
        <Text color="gray">
          Tab 切换分组 | ↑↓ 选择 | Enter 确认 | Esc 取消
        </Text>
      </Box>
    </Box>
  );
}
