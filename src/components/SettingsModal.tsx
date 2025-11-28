import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { githubToken: string; refreshInterval: number }) => void;
  currentConfig: { githubToken: string; refreshInterval: number };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [token, setToken] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setToken(currentConfig.githubToken);
      setRefreshInterval(currentConfig.refreshInterval);
      setShowToken(false);
      setError(null);
    }
  }, [isOpen, currentConfig]);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('El token no puede estar vacío');
      return;
    }

    if (refreshInterval < 10 || refreshInterval > 600) {
      setError('El intervalo debe estar entre 10 y 600 segundos');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await window.electronAPI.saveConfig({
        githubToken: token.trim(),
        refreshInterval: refreshInterval
      });

      onSave({
        githubToken: token.trim(),
        refreshInterval: refreshInterval
      });

      onClose();
    } catch (err) {
      console.error('Error saving config:', err);
      setError(`Error al guardar la configuración: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setToken(currentConfig.githubToken);
    setRefreshInterval(currentConfig.refreshInterval);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-github-gray-800 rounded-github border border-github-gray-600 p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-400">⚙️ Configuración</h2>
          <button
            onClick={handleCancel}
            className="text-github-gray-400 hover:text-white text-2xl leading-none"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Token de GitHub */}
          <div>
            <label htmlFor="github-token" className="block text-github-gray-100 mb-2 font-medium">
              Token de GitHub
            </label>
            <div className="relative">
              <input
                id="github-token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 pr-24 bg-github-gray-900 border border-github-gray-600 rounded-github text-github-gray-100 focus:outline-none focus:border-blue-500"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-blue-400 hover:text-blue-300"
              >
                {showToken ? '🙈 Ocultar' : '👁️ Mostrar'}
              </button>
            </div>
            <p className="mt-2 text-xs text-github-gray-400">
              Genera un token en: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">GitHub Settings → Personal Access Tokens</a>
            </p>
          </div>

          {/* Intervalo de refresco */}
          <div>
            <label htmlFor="refresh-interval" className="block text-github-gray-100 mb-2 font-medium">
              Intervalo de Refresco (segundos)
            </label>
            <input
              id="refresh-interval"
              type="number"
              min="10"
              max="600"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 60)}
              className="w-full px-4 py-2 bg-github-gray-900 border border-github-gray-600 rounded-github text-github-gray-100 focus:outline-none focus:border-blue-500"
              disabled={saving}
            />
            <p className="mt-2 text-xs text-github-gray-400">
              Frecuencia con la que se actualizan las PRs automáticamente (mín: 10s, máx: 600s)
            </p>
          </div>

          {/* Información de almacenamiento */}
          <div className="bg-github-gray-900 border border-github-gray-600 rounded-github p-4">
            <h3 className="text-sm font-semibold text-github-gray-100 mb-2">📁 Almacenamiento</h3>
            <p className="text-xs text-github-gray-400">
              {process.env.NODE_ENV === 'development'
                ? '🔧 Desarrollo: La configuración se guarda en .env.local'
                : '📦 Producción: La configuración se guarda en el directorio de datos de usuario de la aplicación'}
            </p>
            <p className="mt-2 text-xs text-green-400">
              🔒 Tu token nunca se sube a git ni se comparte
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-600 rounded-github p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 bg-github-gray-700 border border-github-gray-600 text-white rounded-github cursor-pointer font-medium transition-all duration-200 hover:bg-github-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !token.trim()}
            className="px-6 py-2 bg-github-green border border-green-600 text-white rounded-github cursor-pointer font-medium transition-all duration-200 hover:bg-green-600 hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
