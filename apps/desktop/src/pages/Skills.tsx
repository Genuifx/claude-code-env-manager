import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLocale } from '../locales';
import { useAppStore } from '@/store';
import { SkillsSkeleton } from '@/components/ui/skeleton-states';
import { DiscoverTab } from '@/components/skills/DiscoverTab';
import { InstalledTab } from '@/components/skills/InstalledTab';

export function Skills() {
  const { t } = useLocale();
  const { isLoadingSkills } = useAppStore();

  if (isLoadingSkills) {
    return <SkillsSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Skills
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('skills.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover">{t('skills.tabDiscover')}</TabsTrigger>
          <TabsTrigger value="installed">{t('skills.tabInstalled')}</TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          <DiscoverTab />
        </TabsContent>

        <TabsContent value="installed">
          <InstalledTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
