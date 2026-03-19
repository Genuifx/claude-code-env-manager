import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Package, Trash2, Download, Check, Loader2, FolderOpen, Plug } from 'lucide-react';
import { useLocale } from '@/locales';
import { InstallDialog } from './InstallDialog';

export interface DiscoverSkillInfo {
  name: string;
  package_id: string;
  skill_name?: string;
  description: string;
  source?: string;
  install_type?: string; // "skills" | "plugin"
}

interface DiscoverCardProps {
  variant: 'discover';
  skill: DiscoverSkillInfo;
  isInstalled?: boolean;
  isInstalling?: boolean;
  onInstall: (packageId: string, skillName?: string, agents?: string[]) => void;
}

interface InstalledCardProps {
  variant: 'installed';
  skill: {
    name: string;
    description: string;
    path: string;
    scope: string;
    agents?: string[];
    source?: string;
    version?: string;
  };
  isUninstalling?: boolean;
  onUninstall: (name: string) => void;
}

type SkillCardProps = DiscoverCardProps | InstalledCardProps;

export function SkillCard(props: SkillCardProps) {
  const { t } = useLocale();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (props.variant === 'discover') {
    const { skill, isInstalled, isInstalling } = props;
    return (
      <>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg glass-icon-container flex items-center justify-center shrink-0 mt-0.5">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground truncate">{skill.name}</span>
                {skill.source && (
                  <span className="px-2 py-0.5 text-2xs rounded-full glass-badge text-muted-foreground shrink-0">
                    {skill.source}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
              {skill.package_id && (
                <p className="text-xs text-muted-foreground/60 font-mono mt-1 truncate">{skill.package_id}</p>
              )}
            </div>
            <div className="shrink-0">
              {isInstalled ? (
                <Button variant="outline" size="sm" className="glass-btn-outline" disabled>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {t('skills.installed')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-btn-outline"
                  disabled={isInstalling}
                  onClick={() => setDialogOpen(true)}
                >
                  {isInstalling ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-1" />
                  )}
                  {isInstalling ? t('skills.installing') : t('skills.install')}
                </Button>
              )}
            </div>
          </div>
        </Card>
        <InstallDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          packageId={skill.package_id}
          skillName={skill.skill_name || skill.name}
          displayName={skill.name}
          installType={skill.install_type || 'skills'}
        />
      </>
    );
  }

  // installed variant
  const { skill, isUninstalling, onUninstall } = props;
  const scopeLabel =
    skill.scope === 'plugin'
      ? t('skills.scopePlugin')
      : skill.scope === 'global'
        ? t('skills.scopeGlobal')
        : t('skills.scopeProject');

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg glass-icon-container flex items-center justify-center shrink-0 mt-0.5">
          {skill.scope === 'plugin' ? (
            <Plug className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Package className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground truncate">{skill.name}</span>
            <span className="px-2 py-0.5 text-2xs rounded-full glass-badge text-muted-foreground shrink-0">
              {scopeLabel}
            </span>
            {skill.source && (
              <span className="px-2 py-0.5 text-2xs rounded-full glass-badge text-muted-foreground shrink-0">
                {skill.source}
              </span>
            )}
          </div>
          {skill.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
              <FolderOpen className="w-3 h-3" />
              <span className="font-mono truncate max-w-[200px]">{skill.path}</span>
            </div>
            {skill.agents && skill.agents.length > 0 && (
              <div className="flex items-center gap-1">
                {skill.agents.map((agent) => (
                  <span
                    key={agent}
                    className="px-1.5 py-0.5 text-2xs rounded bg-primary/10 text-primary shrink-0"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 glass-btn-outline"
            disabled={isUninstalling}
            onClick={() => onUninstall(skill.name)}
          >
            {isUninstalling ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1" />
            )}
            {isUninstalling ? t('skills.uninstalling') : t('skills.uninstall')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
