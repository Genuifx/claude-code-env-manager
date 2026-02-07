import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Skill {
  name: string;
  path: string;
  source: string;
  type: 'skill' | 'mcp';
}

const mockSkills: Skill[] = [
  { name: 'product-designer', path: '.claude/skills/product-design/', source: '本地', type: 'skill' },
  { name: 'chrome-devtools', path: '', source: 'Official', type: 'mcp' },
];

export function Skills() {
  const handleViewFile = (path: string) => {
    // TODO: Open file path via Tauri shell
    console.log('Open path:', path);
  };

  const handleUninstall = (name: string) => {
    toast.info(`请在终端中运行: ccem skill rm ${name}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Skills
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            管理 Claude Code 技能扩展
          </p>
        </div>
        <Button
          disabled
          title="使用 CLI: ccem skill add"
          className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="mr-2">+</span>
          添加技能
        </Button>
      </div>

      {/* Installed Skills List */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          已安装的技能
        </h3>
        <div className="space-y-3">
          {mockSkills.map((skill) => (
            <Card key={skill.name} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-lg">
                    {skill.type === 'skill' ? '\u{1F4E6}' : '\u{1F527}'}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {skill.name}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {skill.source}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                      查看文件
                    </Button>
                  )}
                  {skill.source === 'Official' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="官方技能不可卸载"
                    >
                      受保护
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:border-red-300 dark:hover:border-red-700"
                      onClick={() => handleUninstall(skill.name)}
                    >
                      卸载
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CLI Hint Section */}
      <Card className="p-6 bg-slate-50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50">
        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
          <div className="font-medium text-slate-900 dark:text-white mb-3">
            {'\u{1F4A1}'} 提示: 更多技能管理请使用 CLI
          </div>
          <div className="font-mono text-xs space-y-1.5 pl-4">
            <div className="flex gap-4">
              <span className="text-violet-600 dark:text-violet-400 w-48 shrink-0">ccem skill add &lt;name&gt;</span>
              <span className="text-slate-500 dark:text-slate-400">添加技能</span>
            </div>
            <div className="flex gap-4">
              <span className="text-violet-600 dark:text-violet-400 w-48 shrink-0">ccem skill ls</span>
              <span className="text-slate-500 dark:text-slate-400">列出已安装</span>
            </div>
            <div className="flex gap-4">
              <span className="text-violet-600 dark:text-violet-400 w-48 shrink-0">ccem skill rm &lt;name&gt;</span>
              <span className="text-slate-500 dark:text-slate-400">移除技能</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
