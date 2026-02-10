import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/locales";
import { ENV_PRESETS } from "@ccem/core/browser";
import {
  PenLine,
  BookTemplate,
  ServerCog,
  Globe,
  Key,
  Bot,
  Zap,
  ArrowRight,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import type { Environment } from "@/store";

interface EnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  environment?: Environment;
  onSave: (env: Environment) => void;
  onServerSync?: (url: string, secret: string) => Promise<{ count: number; environments: Array<{ name: string; original_name: string; renamed: boolean }> }>;
}

const PRESET_DESCRIPTIONS: Record<string, { zh: string; en: string }> = {
  GLM: { zh: "智谱 AI GLM 系列模型", en: "Zhipu AI GLM Series" },
  KIMI: { zh: "月之暗面 Kimi 对话模型", en: "Moonshot Kimi" },
  MiniMax: { zh: "MiniMax 大模型服务", en: "MiniMax LLM Service" },
  DeepSeek: { zh: "DeepSeek AI 深度求索", en: "DeepSeek AI" },
};

export function EnvironmentDialog({
  open,
  onOpenChange,
  mode,
  environment,
  onSave,
  onServerSync,
}: EnvironmentDialogProps) {
  const { t, lang } = useLocale();
  const [activeTab, setActiveTab] = React.useState("manual");
  const [name, setName] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("");
  const [smallModel, setSmallModel] = React.useState("");
  const [serverUrl, setServerUrl] = React.useState("");
  const [serverSecret, setServerSecret] = React.useState("");
  const [serverLoading, setServerLoading] = React.useState(false);

  // Reset form when dialog opens or environment changes
  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && environment) {
        setName(environment.name);
        setBaseUrl(environment.baseUrl);
        setApiKey(environment.apiKey || "");
        setModel(environment.model);
        setSmallModel(environment.smallModel || "");
      } else {
        setName("");
        setBaseUrl("");
        setApiKey("");
        setModel("");
        setSmallModel("");
        setActiveTab("manual");
        setServerUrl("");
        setServerSecret("");
        setServerLoading(false);
      }
    }
  }, [open, mode, environment]);

  const handlePresetSelect = (presetKey: string) => {
    const preset = ENV_PRESETS[presetKey];
    if (!preset) return;
    setName(presetKey);
    setBaseUrl(preset.ANTHROPIC_BASE_URL ?? "");
    setModel(preset.ANTHROPIC_MODEL ?? "");
    setSmallModel(preset.ANTHROPIC_SMALL_FAST_MODEL ?? "");
    setActiveTab("manual");
  };

  const handleServerSync = async () => {
    if (!onServerSync) return;
    setServerLoading(true);
    try {
      const result = await onServerSync(serverUrl.trim(), serverSecret.trim());
      toast.success(t("environmentDialog.serverSyncSuccess").replace("{count}", String(result.count)));
      onOpenChange(false);
    } catch (err) {
      toast.error(t("environmentDialog.serverSyncError") + ": " + String(err));
    } finally {
      setServerLoading(false);
    }
  };

  // Parse `ccem load <url> --secret <secret>` command string
  const handlePasteCommand = (value: string) => {
    const trimmed = value.trim();
    // Match: ccem load <url> --secret <secret>
    const match = trimmed.match(/^ccem\s+load\s+(\S+)\s+--secret\s+(\S+)$/);
    if (match) {
      setServerUrl(match[1]);
      setServerSecret(match[2]);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !baseUrl.trim() || !model.trim()) {
      return;
    }

    const env: Environment = {
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      ...(apiKey.trim() && { apiKey: apiKey.trim() }),
      ...(smallModel.trim() && { smallModel: smallModel.trim() }),
    };

    onSave(env);
    onOpenChange(false);
  };

  const isValid = name.trim() && baseUrl.trim() && model.trim();

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">
          {t("environmentDialog.name")}{" "}
          <span className="text-xs text-muted-foreground">
            *{t("environmentDialog.required")}
          </span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("environmentDialog.namePlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="baseUrl" className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          {t("environmentDialog.baseUrl")}{" "}
          <span className="text-xs text-muted-foreground">
            *{t("environmentDialog.required")}
          </span>
        </Label>
        <Input
          id="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={t("environmentDialog.baseUrlPlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="apiKey" className="flex items-center gap-1.5">
          <Key className="h-3.5 w-3.5 text-muted-foreground" />
          {t("environmentDialog.apiKey")}{" "}
          <span className="text-xs text-muted-foreground">
            {t("environmentDialog.optional")}
          </span>
        </Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t("environmentDialog.apiKeyPlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="model" className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          {t("environmentDialog.model")}{" "}
          <span className="text-xs text-muted-foreground">
            *{t("environmentDialog.required")}
          </span>
        </Label>
        <Input
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={t("environmentDialog.modelPlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="smallModel" className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          {t("environmentDialog.smallModel")}{" "}
          <span className="text-xs text-muted-foreground">
            {t("environmentDialog.optional")}
          </span>
        </Label>
        <Input
          id="smallModel"
          value={smallModel}
          onChange={(e) => setSmallModel(e.target.value)}
          placeholder={t("environmentDialog.smallModelPlaceholder")}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={mode === "add" ? "sm:max-w-[520px]" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>
            {mode === "add"
              ? t("environmentDialog.addTitle")
              : t("environmentDialog.editTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? t("environmentDialog.addDescription")
              : t("environmentDialog.editDescription")}
          </DialogDescription>
        </DialogHeader>

        {mode === "add" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual" className="gap-1.5 text-xs">
                <PenLine className="h-3.5 w-3.5" />
                {t("environmentDialog.tabManual")}
              </TabsTrigger>
              <TabsTrigger value="preset" className="gap-1.5 text-xs">
                <BookTemplate className="h-3.5 w-3.5" />
                {t("environmentDialog.tabPreset")}
              </TabsTrigger>
              <TabsTrigger value="server" className="gap-1.5 text-xs">
                <ServerCog className="h-3.5 w-3.5" />
                {t("environmentDialog.tabServer")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">{formFields}</TabsContent>

            <TabsContent value="preset">
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {t("environmentDialog.presetSelect")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(ENV_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePresetSelect(key)}
                      className="group flex flex-col items-start gap-1.5 rounded-lg border border-border bg-surface-raised p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {key}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {PRESET_DESCRIPTIONS[key]?.[lang] ??
                          t("environments.presetDefault").replace(
                            "{name}",
                            key
                          )}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground/70 line-clamp-1">
                        {preset.ANTHROPIC_MODEL}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("environmentDialog.presetNeedApiKey")}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="server">
              <div className="py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="serverPasteCommand" className="flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("environmentDialog.serverPasteCommand")}
                    </Label>
                    <Input
                      id="serverPasteCommand"
                      value=""
                      onChange={(e) => handlePasteCommand(e.target.value)}
                      placeholder={t("environmentDialog.serverPasteCommandPlaceholder")}
                      disabled={serverLoading}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t("environmentDialog.serverOrFillManually")}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="serverUrl" className="flex items-center gap-1.5">
                      <ServerCog className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("environmentDialog.serverUrl")}
                    </Label>
                    <Input
                      id="serverUrl"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder={t("environmentDialog.serverPlaceholder")}
                      disabled={serverLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="serverSecret" className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("environmentDialog.serverSecret")}
                    </Label>
                    <Input
                      id="serverSecret"
                      type="password"
                      value={serverSecret}
                      onChange={(e) => setServerSecret(e.target.value)}
                      placeholder={t("environmentDialog.serverSecretPlaceholder")}
                      disabled={serverLoading}
                    />
                  </div>
                  <Button
                    onClick={handleServerSync}
                    disabled={!serverUrl.trim() || !serverSecret.trim() || serverLoading || !onServerSync}
                    className="w-full gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${serverLoading ? "animate-spin" : ""}`} />
                    {serverLoading
                      ? t("environmentDialog.serverSyncing")
                      : t("environmentDialog.serverSync")}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          formFields
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("environmentDialog.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || (mode === "add" && activeTab !== "manual")}
          >
            {mode === "add"
              ? t("environmentDialog.add")
              : t("environmentDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
