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
  const [reposJSON, setReposJSON] = useState('');
  const [reposError, setReposError] = useState<string | null>(null);
  const [reposSaved, setReposSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setToken(currentConfig.githubToken);
      setRefreshInterval(currentConfig.refreshInterval);
      setShowToken(false);
      setError(null);
      setReposJSON('');
      setReposError(null);
      setReposSaved(false);
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

  const validateAndSetJSON = (jsonString: string, filename?: string) => {
    try {
      const parsed = JSON.parse(jsonString);

      // Validar estructura
      if (!parsed.repos || !Array.isArray(parsed.repos)) {
        setReposError('El JSON debe contener un array "repos"');
        return false;
      }

      if (typeof parsed.defaultRefreshInterval !== 'number') {
        setReposError('El JSON debe contener "defaultRefreshInterval" (número)');
        return false;
      }

      setReposJSON(jsonString);
      setReposError(null);
      if (filename) setFileName(filename);
      return true;
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setReposError('JSON inválido: ' + err.message);
      } else {
        setReposError('Error al procesar: ' + err.message);
      }
      return false;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setReposError('Por favor selecciona un archivo .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      validateAndSetJSON(content, file.name);
    };
    reader.onerror = () => {
      setReposError('Error al leer el archivo');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setReposError('Por favor arrastra un archivo .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      validateAndSetJSON(content, file.name);
    };
    reader.onerror = () => {
      setReposError('Error al leer el archivo');
    };
    reader.readAsText(file);
  };

  const handleSaveRepositories = async () => {
    if (!reposJSON.trim()) {
      setReposError('Debes cargar un archivo JSON primero');
      return;
    }

    try {
      const parsed = JSON.parse(reposJSON);

      // Guardar repositorios
      await window.electronAPI.saveRepositories(parsed);
      setReposSaved(true);
      setReposError(null);
      setTimeout(() => setReposSaved(false), 3000);
    } catch (err: any) {
      setReposError('Error al guardar: ' + err.message);
    }
  };

  const handleCancel = () => {
    setToken(currentConfig.githubToken);
    setRefreshInterval(currentConfig.refreshInterval);
    setError(null);
    setReposJSON('');
    setReposError(null);
    setFileName(null);
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

          {/* Gestión de Repositorios */}
          <div className="border-t border-github-gray-600 pt-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">📁 Repositorios</h3>

            <div>
              <label className="block text-github-gray-100 mb-2 font-medium">
                Cargar Configuración de Repositorios
              </label>

              {/* Zona de Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-github p-8 text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : fileName
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-github-gray-600 bg-github-gray-900 hover:border-blue-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {fileName ? (
                  <div className="space-y-3">
                    <div className="text-4xl">✅</div>
                    <p className="text-green-400 font-medium">{fileName}</p>
                    <p className="text-xs text-github-gray-400">
                      Archivo cargado correctamente
                    </p>
                    <button
                      onClick={() => {
                        setFileName(null);
                        setReposJSON('');
                        setReposError(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Cargar otro archivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-5xl">📄</div>
                    <p className="text-github-gray-100 font-medium">
                      Arrastra aquí tu archivo repos.json
                    </p>
                    <p className="text-sm text-github-gray-400">o</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 border border-blue-500 text-white rounded-github cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-blue-500"
                    >
                      Seleccionar Archivo
                    </button>
                    <p className="text-xs text-github-gray-500 mt-2">
                      Formato: archivo .json con estructura de repositorios
                    </p>
                  </div>
                )}
              </div>

              {/* Ejemplo de estructura */}
              <details className="mt-3">
                <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">
                  Ver ejemplo de estructura JSON
                </summary>
                <pre className="mt-2 p-3 bg-github-gray-900 border border-github-gray-600 rounded text-xs text-github-gray-300 overflow-x-auto">
{`{
  "defaultRefreshInterval": 7200,
  "repos": [
    {
      "url": "https://github.com/owner/repo",
      "name": "Mi Repo",
      "backgroundColor": "#ff6b6b",
      "refreshInterval": 3600
    }
  ]
}`}
                </pre>
              </details>

              {reposError && (
                <div className="mt-3 bg-red-900/30 border border-red-600 rounded-github p-3">
                  <p className="text-red-300 text-sm">{reposError}</p>
                </div>
              )}

              {reposSaved && (
                <div className="mt-3 bg-green-900/30 border border-green-600 rounded-github p-3">
                  <p className="text-green-300 text-sm">✅ Repositorios guardados. Reinicia la app para aplicar los cambios.</p>
                </div>
              )}

              <button
                onClick={handleSaveRepositories}
                disabled={!reposJSON.trim() || saving}
                className="mt-4 w-full px-4 py-2 bg-github-green border border-green-600 text-white rounded-github cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar Repositorios'}
              </button>
            </div>
          </div>

          {/* Información de almacenamiento */}
          <div className="bg-github-gray-900 border border-github-gray-600 rounded-github p-4">
            <h3 className="text-sm font-semibold text-github-gray-100 mb-2">📁 Almacenamiento</h3>
            <p className="text-xs text-github-gray-400">
              {process.env.NODE_ENV === 'development'
                ? '🔧 Desarrollo: La configuración se guarda en .env.local y config/repos.json'
                : '📦 Producción: La configuración se guarda en el directorio de datos de usuario'}
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
