import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkillCard } from './SkillCard';
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

  const handleUninstall = async (name: string) => {
    setUninstallingNames(prev => new Set(prev).add(name));
    try {
      await invoke('uninstall_skill', { name, global: true });
      toast.success(t('skills.uninstallSuccess').replace('{name}', name));
      await loadSkills();
    } catch (err) {
      toast.error(t('skills.uninstallError').replace('{error}', String(err)));
    } finally {
      setUninstallingNames(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
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
