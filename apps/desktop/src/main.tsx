import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initPerformanceMode } from './lib/performance';
import './index.css';

initPerformanceMode();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
