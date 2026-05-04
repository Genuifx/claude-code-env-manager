import { MacFullscreenWindowControls } from './MacFullscreenWindowControls';

export function StartupSplash() {
  return (
    <div className="startup-splash" data-tauri-drag-region aria-label="CCEM loading">
      <MacFullscreenWindowControls />
      <div className="startup-splash-grain" aria-hidden="true" />
      <div className="startup-splash-sheen" aria-hidden="true" />

      <div className="startup-splash-center">
        <div className="startup-logo-aura" aria-hidden="true" />
        <img src="/logo.png" alt="CCEM" className="startup-logo" />
        <div className="startup-brand" aria-hidden="true">CCEM</div>
      </div>
    </div>
  );
}
