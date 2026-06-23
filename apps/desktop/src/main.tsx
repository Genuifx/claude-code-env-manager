import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App';
import { PetOverlay } from './pages/PetOverlay';
import { initPerformanceMode } from './lib/performance';
import { initPerfLog } from './lib/perf-log';
import './index.css';

initPerformanceMode();
initPerfLog();

function resolveRoot() {
  try {
    if (getCurrentWindow().label === 'desktop-pet') {
      document.documentElement.dataset.window = 'desktop-pet';
      return PetOverlay;
    }
    return App;
  } catch {
    return App;
  }
}

const Root = resolveRoot();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
