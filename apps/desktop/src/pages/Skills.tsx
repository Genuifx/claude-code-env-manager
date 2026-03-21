import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLocale } from '../locales';
import { useAppStore } from '@/store';
import { SkillsSkeleton } from '@/components/ui/skeleton-states';
import { DiscoverTab } from '@/components/skills/DiscoverTab';
import { InstalledTab } from '@/components/skills/InstalledTab';

export function Skills() {
  const { t } = useLocale();
  const isLoadingSkills = useAppStore((state) => state.isLoadingSkills);

  if (isLoadingSkills) {
    return <SkillsSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-6">
      {/* Tabs */}
      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover">{t('skills.tabDiscover')}</TabsTrigger>
          <TabsTrigger value="installed">{t('skills.tabInstalled')}</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" forceMount className="data-[state=inactive]:hidden">
          <DiscoverTab />
        </TabsContent>

        <TabsContent value="installed" forceMount className="data-[state=inactive]:hidden">
          <InstalledTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
