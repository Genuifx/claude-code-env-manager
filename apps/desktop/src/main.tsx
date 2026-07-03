import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App';
import { PetOverlay } from './pages/PetOverlay';
import { TrayCockpit } from './pages/TrayCockpit';
import { initPerformanceMode } from './lib/performance';
import { initPerfLog } from './lib/perf-log';
import './index.css';

initPerformanceMode();
initPerfLog();

function resolveRoot() {
  const requestedWindow = new URLSearchParams(window.location.search).get('window');
  if (requestedWindow === 'desktop-pet') {
    document.documentElement.dataset.window = 'desktop-pet';
    return PetOverlay;
  }
  if (requestedWindow === 'tray-cockpit') {
    document.documentElement.dataset.window = 'tray-cockpit';
    return TrayCockpit;
  }

  try {
    if (getCurrentWindow().label === 'desktop-pet') {
      document.documentElement.dataset.window = 'desktop-pet';
      return PetOverlay;
    }
    if (getCurrentWindow().label === 'tray-cockpit') {
      document.documentElement.dataset.window = 'tray-cockpit';
      return TrayCockpit;
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
