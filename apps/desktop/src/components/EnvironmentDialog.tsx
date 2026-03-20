import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LaunchButton } from "@/components/ui/LaunchButton";
import { useLocale } from "@/locales";
import { ENV_PRESETS, ENV_PRESET_METADATA } from "@ccem/core/browser";
import {
  ArrowRight,
  BookTemplate,
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Key,
  PenLine,
  RefreshCw,
  ServerCog,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { Environment } from "@/store";

interface EnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  environment?: Environment;
  onSave: (env: Environment) => void;
  onServerSync?: (
    url: string,
    secret: string
  ) => Promise<{
    count: number;
    environments: Array<{
      name: string;
      original_name: string;
      renamed: boolean;
    }>;
  }>;
}

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
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [name, setName] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [authToken, setAuthToken] = React.useState("");
  const [defaultOpusModel, setDefaultOpusModel] = React.useState("");
  const [defaultSonnetModel, setDefaultSonnetModel] = React.useState("");
  const [defaultHaikuModel, setDefaultHaikuModel] = React.useState("");
  const [runtimeModel, setRuntimeModel] = React.useState("opus");
  const [subagentModel, setSubagentModel] = React.useState("");
  const [serverUrl, setServerUrl] = React.useState("");
  const [serverSecret, setServerSecret] = React.useState("");
  const [serverLoading, setServerLoading] = React.useState(false);
  const [serverPasteCommand, setServerPasteCommand] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && environment) {
      setName(environment.name);
      setBaseUrl(environment.baseUrl);
      setAuthToken(environment.authToken || "");
      setDefaultOpusModel(environment.defaultOpusModel);
      setDefaultSonnetModel(
        environment.defaultSonnetModel || environment.defaultOpusModel
      );
      setDefaultHaikuModel(environment.defaultHaikuModel || "");
      setRuntimeModel(environment.runtimeModel || "opus");
      setSubagentModel(environment.subagentModel || "");
      setSelectedPreset(null);
      setShowAdvanced(
        Boolean(
          environment.subagentModel ||
            (environment.runtimeModel &&
              environment.runtimeModel !== "opus") ||
            (environment.defaultSonnetModel &&
              environment.defaultSonnetModel !== environment.defaultOpusModel)
        )
      );
      return;
    }

    setName("");
    setBaseUrl("");
    setAuthToken("");
    setDefaultOpusModel("");
    setDefaultSonnetModel("");
    setDefaultHaikuModel("");
    setRuntimeModel("opus");
    setSubagentModel("");
    setActiveTab("manual");
    setServerUrl("");
    setServerSecret("");
    setServerLoading(false);
    setSelectedPreset(null);
    setShowAdvanced(false);
  }, [environment, mode, open]);

  const handlePresetSelect = (presetKey: string) => {
    const preset = ENV_PRESETS[presetKey];
    if (!preset) {
      return;
    }

    setSelectedPreset(presetKey);
    setName(presetKey);
    setBaseUrl(preset.ANTHROPIC_BASE_URL ?? "");
    setDefaultOpusModel(preset.ANTHROPIC_DEFAULT_OPUS_MODEL ?? "");
    setDefaultSonnetModel(
      preset.ANTHROPIC_DEFAULT_SONNET_MODEL ??
        preset.ANTHROPIC_DEFAULT_OPUS_MODEL ??
        ""
    );
    setDefaultHaikuModel(preset.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? "");
    setRuntimeModel(preset.ANTHROPIC_MODEL ?? "opus");
    setSubagentModel("");
    setActiveTab("manual");
  };

  const handleServerSync = async () => {
    if (!onServerSync) {
      return;
    }

    setServerLoading(true);
    try {
      const result = await onServerSync(serverUrl.trim(), serverSecret.trim());
      toast.success(
        t("environmentDialog.serverSyncSuccess").replace(
          "{count}",
          String(result.count)
        )
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(t("environmentDialog.serverSyncError") + ": " + String(err));
    } finally {
      setServerLoading(false);
    }
  };

  const handlePasteCommand = (value: string) => {
    const trimmed = value.trim();
    const match = trimmed.match(/^ccem\s+load\s+(\S+)\s+--secret\s+(\S+)$/);
    if (match) {
      setServerUrl(match[1]);
      setServerSecret(match[2]);
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedBaseUrl = baseUrl.trim();
    const trimmedOpusModel = defaultOpusModel.trim();
    const trimmedSonnetModel = defaultSonnetModel.trim() || trimmedOpusModel;
    const trimmedRuntimeModel = runtimeModel.trim() || "opus";

    if (!trimmedName || !trimmedBaseUrl || !trimmedOpusModel) {
      return;
    }

    const env: Environment = {
      name: trimmedName,
      baseUrl: trimmedBaseUrl,
      defaultOpusModel: trimmedOpusModel,
      defaultSonnetModel: trimmedSonnetModel,
      runtimeModel: trimmedRuntimeModel,
      ...(authToken.trim() && { authToken: authToken.trim() }),
      ...(defaultHaikuModel.trim() && {
        defaultHaikuModel: defaultHaikuModel.trim(),
      }),
      ...(subagentModel.trim() && { subagentModel: subagentModel.trim() }),
    };

    onSave(env);
    onOpenChange(false);
  };

  const isValid =
    Boolean(name.trim()) &&
    Boolean(baseUrl.trim()) &&
    Boolean(defaultOpusModel.trim());

  const presetMetadata = selectedPreset
    ? ENV_PRESET_METADATA[selectedPreset]
    : undefined;

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
        <div className="flex items-center justify-between">
          <Label htmlFor="authToken" className="flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            {t("environmentDialog.authToken")}{" "}
            <span className="text-xs text-muted-foreground">
              {t("environmentDialog.optional")}
            </span>
          </Label>
          {presetMetadata?.credentialUrl && (
            <a
              href={presetMetadata.credentialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              onClick={(e) => e.stopPropagation()}
            >
              {t("environmentDialog.getAuthToken")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <Input
          id="authToken"
          type="password"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          placeholder={t("environmentDialog.authTokenPlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="defaultOpusModel" className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          {t("environmentDialog.defaultOpusModel")}{" "}
          <span className="text-xs text-muted-foreground">
            *{t("environmentDialog.required")}
          </span>
        </Label>
        <Input
          id="defaultOpusModel"
          value={defaultOpusModel}
          onChange={(e) => setDefaultOpusModel(e.target.value)}
          placeholder={t("environmentDialog.defaultOpusModelPlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="defaultHaikuModel" className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          {t("environmentDialog.defaultHaikuModel")}{" "}
          <span className="text-xs text-muted-foreground">
            {t("environmentDialog.optional")}
          </span>
        </Label>
        <Input
          id="defaultHaikuModel"
          value={defaultHaikuModel}
          onChange={(e) => setDefaultHaikuModel(e.target.value)}
          placeholder={t("environmentDialog.defaultHaikuModelPlaceholder")}
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            {t("environmentDialog.advancedSettings")}
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="defaultSonnetModel"
                className="flex items-center gap-1.5"
              >
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                {t("environmentDialog.defaultSonnetModel")}{" "}
                <span className="text-xs text-muted-foreground">
                  {t("environmentDialog.optional")}
                </span>
              </Label>
              <Input
                id="defaultSonnetModel"
                value={defaultSonnetModel}
                onChange={(e) => setDefaultSonnetModel(e.target.value)}
                placeholder={t(
                  "environmentDialog.defaultSonnetModelPlaceholder"
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="runtimeModel" className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                {t("environmentDialog.runtimeModel")}{" "}
                <span className="text-xs text-muted-foreground">
                  {t("environmentDialog.optional")}
                </span>
              </Label>
              <Input
                id="runtimeModel"
                value={runtimeModel}
                onChange={(e) => setRuntimeModel(e.target.value)}
                placeholder={t("environmentDialog.runtimeModelPlaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subagentModel" className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                {t("environmentDialog.subagentModel")}{" "}
                <span className="text-xs text-muted-foreground">
                  {t("environmentDialog.optional")}
                </span>
              </Label>
              <Input
                id="subagentModel"
                value={subagentModel}
                onChange={(e) => setSubagentModel(e.target.value)}
                placeholder={t("environmentDialog.subagentModelPlaceholder")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={mode === "add" ? "sm:max-w-[560px]" : "sm:max-w-[520px]"}
      >
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
                <p className="mb-3 text-sm text-muted-foreground">
                  {t("environmentDialog.presetSelect")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(ENV_PRESETS).map(([key, preset]) => {
                    const metadata = ENV_PRESET_METADATA[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePresetSelect(key)}
                        className="group flex flex-col items-start gap-1.5 rounded-lg border border-border bg-surface-raised p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {metadata?.displayName[lang] ?? key}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {metadata?.description[lang] ??
                            t("environments.presetDefault").replace(
                              "{name}",
                              key
                            )}
                        </span>
                        <span className="line-clamp-1 font-mono text-xs text-muted-foreground/70">
                          {preset.ANTHROPIC_DEFAULT_OPUS_MODEL}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("environmentDialog.presetNeedAuthToken")}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="server">
              <div className="py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="serverPasteCommand"
                      className="flex items-center gap-1.5"
                    >
                      <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("environmentDialog.serverPasteCommand")}
                    </Label>
                    <Input
                      id="serverPasteCommand"
                      value={serverPasteCommand}
                      onChange={(e) => {
                        setServerPasteCommand(e.target.value);
                        handlePasteCommand(e.target.value);
                      }}
                      placeholder={t(
                        "environmentDialog.serverPasteCommandPlaceholder"
                      )}
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
                    <Label
                      htmlFor="serverUrl"
                      className="flex items-center gap-1.5"
                    >
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
                    <Label
                      htmlFor="serverSecret"
                      className="flex items-center gap-1.5"
                    >
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
                    disabled={
                      !serverUrl.trim() ||
                      !serverSecret.trim() ||
                      serverLoading ||
                      !onServerSync
                    }
                    className="w-full gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        serverLoading ? "animate-spin" : ""
                      }`}
                    />
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
          {/* Save button */}
          <LaunchButton
            onClick={handleSave}
            disabled={!isValid || (mode === "add" && activeTab !== "manual")}
            size="md"
          >
            {mode === "add"
              ? t("environmentDialog.add")
              : t("environmentDialog.save")}
          </LaunchButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
