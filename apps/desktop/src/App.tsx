import { useState, useEffect } from 'react';
import { ENV_PRESETS, PERMISSION_PRESETS } from '@ccem/core';

function App() {
  const [environments, setEnvironments] = useState<string[]>([]);
  const [currentEnv, setCurrentEnv] = useState<string>('official');

  useEffect(() => {
    // Load environment presets
    setEnvironments(Object.keys(ENV_PRESETS));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">CCEM Desktop</h1>
        <p className="text-gray-500 text-sm mt-1">Claude Code Environment Manager</p>
      </header>

      <main className="space-y-6">
        {/* Environment Card */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Environments</h2>
          <div className="space-y-2">
            {environments.map((env) => (
              <div
                key={env}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  currentEnv === env
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                }`}
                onClick={() => setCurrentEnv(env)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{env}</span>
                  {currentEnv === env && (
                    <span className="text-green-600 text-sm">Active</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  {ENV_PRESETS[env as keyof typeof ENV_PRESETS]?.ANTHROPIC_BASE_URL || 'Custom'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Permission Modes Card */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Permission Modes</h2>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(PERMISSION_PRESETS).map((mode) => (
              <button
                key={mode}
                className="btn-secondary text-sm"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="btn-primary">
            Launch Claude Code
          </button>
          <button className="btn-secondary">
            Settings
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
