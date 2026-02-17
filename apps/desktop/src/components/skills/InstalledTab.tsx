import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkillCard } from './SkillCard';
import { useTauriEvent } from '@/hooks/useTauriEvents';
import { useLocale } from '@/locales';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

export function InstalledTab() {
  const { t } = useLocale();
  const { installedSkills, setInstalledSkills } = useAppStore();
  const [uninstallingNames, setUninstallingNames] = useState<Set<string>>(new Set());

  const loadSkills = async () => {
    try {
      const skills = await invoke<any[]>('list_installed_skills');
      setInstalledSkills(skills);
    } catch (err) {
      console.error('Failed to load installed skills:', err);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  // Listen for uninstall completion events from Rust backend
  useTauriEvent<string>('skill-uninstall-done', async (raw) => {
    try {
      const data = JSON.parse(raw);
      const skillName = data.name || '';

      if (data.success) {
        toast.success(t('skills.uninstallSuccess').replace('{name}', skillName));
        await loadSkills();
      } else {
        const msg = String(data.message || '');
        const clean = msg
          .replace(/\x1b\[[0-9;]*[a-zA-Z]|\[\?25[hl]|\[999D|\[J/g, '')
          .replace(/[◒◐◓◑■│┌└◇─╔╗╚╝║═█▓░▒███████╗╚══════╝]/g, '')
          .trim();
        toast.error(t('skills.uninstallError').replace('{error}', clean || 'Uninstall failed'));
      }

      setUninstallingNames(prev => {
        const next = new Set(prev);
        next.delete(skillName);
        return next;
      });
    } catch {
      // Malformed event payload
    }
  });

  const handleUninstall = (name: string) => {
    setUninstallingNames(prev => new Set(prev).add(name));
    // Fire-and-forget — result comes via "skill-uninstall-done" event
    invoke('uninstall_skill', { name, global: true }).catch(() => {});
  };

  if (installedSkills.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        message={t('skills.noSkills')}
        action={t('skills.addFirstSkill')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {installedSkills.map((skill) => (
        <SkillCard
          key={skill.path}
          variant="installed"
          skill={skill}
          isUninstalling={uninstallingNames.has(skill.name)}
          onUninstall={handleUninstall}
        />
      ))}
    </div>
  );
}
