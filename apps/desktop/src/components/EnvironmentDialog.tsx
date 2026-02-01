import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Environment } from "@/store";

interface EnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  environment?: Environment;
  onSave: (env: Environment) => void;
}

export function EnvironmentDialog({
  open,
  onOpenChange,
  mode,
  environment,
  onSave,
}: EnvironmentDialogProps) {
  const [name, setName] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("");
  const [smallModel, setSmallModel] = React.useState("");

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
      }
    }
  }, [open, mode, environment]);

  const handleSave = () => {
    // Validate required fields
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Environment" : "Edit Environment"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Create a new environment configuration."
              : "Modify the environment configuration."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-environment"
              disabled={mode === "edit"}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="baseUrl">Base URL *</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.anthropic.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="claude-sonnet-4-5-20250929"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="smallModel">Small Model</Label>
            <Input
              id="smallModel"
              value={smallModel}
              onChange={(e) => setSmallModel(e.target.value)}
              placeholder="claude-haiku-4-5-20251001"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {mode === "add" ? "Add" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
