import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkillCard } from './SkillCard';
import { useTauriEvent } from '@/hooks/useTauriEvents';
import { useLocale } from '@/locales';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { Sparkles, Plug, Globe, FolderOpen } from 'lucide-react';
import { shallow } from 'zustand/shallow';

export function InstalledTab() {
  const { t } = useLocale();
  const { installedSkills, setInstalledSkills } = useAppStore(
    (state) => ({
      installedSkills: state.installedSkills,
      setInstalledSkills: state.setInstalledSkills,
    }),
    shallow
  );
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

  // Group by scope
  const pluginSkills = installedSkills.filter(s => s.scope === 'plugin');
  const globalSkills = installedSkills.filter(s => s.scope === 'global');
  const projectSkills = installedSkills.filter(s => s.scope === 'project');

  const renderGroup = (
    label: string,
    icon: React.ReactNode,
    skills: typeof installedSkills,
  ) => {
    if (skills.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{label}</span>
          <span className="text-xs text-muted-foreground/60">({skills.length})</span>
        </div>
        {skills.map((skill) => (
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
  };

  return (
    <div className="space-y-6">
      {renderGroup(t('skills.scopePlugin'), <Plug className="w-4 h-4" />, pluginSkills)}
      {renderGroup(t('skills.scopeGlobal'), <Globe className="w-4 h-4" />, globalSkills)}
      {renderGroup(t('skills.scopeProject'), <FolderOpen className="w-4 h-4" />, projectSkills)}
    </div>
  );
}
