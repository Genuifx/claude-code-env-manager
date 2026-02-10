import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package, Wrench, Lightbulb, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '../locales';
import { useAppStore } from '@/store';
import { SkillsSkeleton } from '@/components/ui/skeleton-states';

interface Skill {
  name: string;
  path: string;
  source: 'local' | 'official';
  type: 'skill' | 'mcp';
}

// TODO: Load skills from Tauri backend when available
const installedSkills: Skill[] = [];

export function Skills() {
  const { t } = useLocale();
  const { isLoadingSkills } = useAppStore();

  const handleViewFile = (path: string) => {
    // TODO: Open file path via Tauri shell
    console.log('Open path:', path);
  };

  const handleUninstall = (name: string) => {
    toast.info(t('skills.uninstallToast').replace('{name}', name));
  };

  const sourceLabel = (source: Skill['source']) =>
    source === 'local' ? t('common.local') : t('skills.official');

  // Show skeleton when skills are loading
  if (isLoadingSkills) {
    return <SkillsSkeleton />;
  }

  return (
    <div className="page-transition-enter grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between lg:col-span-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Skills
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('skills.subtitle')}
          </p>
        </div>
        <Button
          disabled
          title={t('skills.addSkillCLIHint')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="mr-2">+</span>
          {t('skills.addSkill')}
        </Button>
      </div>

      {/* Installed Skills List */}
      <div className="lg:col-span-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {t('skills.installedSkills')}
        </h3>
        <div className="space-y-3">
          {installedSkills.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              message={t('skills.noSkills')}
              action={t('skills.addFirstSkill')}
              onAction={() => toast.info(t('skills.addSkillCLIHint'))}
            />
          ) : null}
          {installedSkills.map((skill) => (
            <Card key={skill.name} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {skill.type === 'skill' ? (
                      <Package className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Wrench className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {skill.name}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                        {sourceLabel(skill.source)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {skill.type === 'skill' ? (
                        skill.path ? (
                          <span className="font-mono text-xs">{skill.path}</span>
                        ) : (
                          <span>Skill</span>
                        )
                      ) : (
                        <span>MCP Server</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {skill.path && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFile(skill.path)}
                    >
                      {t('skills.viewFile')}
                    </Button>
                  )}
                  {skill.source === 'official' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title={t('skills.officialProtected')}
                    >
                      {t('common.protected')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:border-red-300 dark:hover:border-red-700"
                      onClick={() => handleUninstall(skill.name)}
                    >
                      {t('skills.uninstall')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CLI Hint Section */}
      <Card className="p-6 bg-muted/50 border-border lg:col-span-1">
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            {t('skills.cliHintTitle')}
          </div>
          <div className="font-mono text-xs space-y-1.5 pl-4">
            <div className="flex gap-4">
              <span className="text-primary w-48 shrink-0">ccem skill add &lt;name&gt;</span>
              <span className="text-muted-foreground">{t('skills.cliHintAdd')}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-primary w-48 shrink-0">ccem skill ls</span>
              <span className="text-muted-foreground">{t('skills.cliHintList')}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-primary w-48 shrink-0">ccem skill rm &lt;name&gt;</span>
              <span className="text-muted-foreground">{t('skills.cliHintRemove')}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
