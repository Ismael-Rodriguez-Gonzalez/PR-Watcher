import React, { useState } from 'react';

interface TokenSetupModalProps {
  onTokenSaved: (token: string) => void;
}

export const TokenSetupModal: React.FC<TokenSetupModalProps> = ({ onTokenSaved }) => {
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Por favor, introduce un token válido');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Guardar configuración con el nuevo token
      await window.electronAPI.saveConfig({
        githubToken: token.trim(),
        refreshInterval: 60 // valor por defecto
      });

      // Notificar que el token fue guardado
      onTokenSaved(token.trim());
    } catch (err) {
      console.error('Error saving token:', err);
      setError(`Error al guardar el token: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-github-gray-800 rounded-github border border-github-gray-600 p-8 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Configuración Inicial</h2>

        <div className="mb-6">
          <p className="text-github-gray-100 mb-4">
            Para utilizar GitHub PR Watcher necesitas configurar un token de acceso personal de GitHub.
          </p>

          <div className="bg-github-gray-900 border border-github-gray-600 rounded-github p-4 mb-4">
            <h3 className="text-blue-400 font-semibold mb-2">¿Cómo obtener un token?</h3>
            <ol className="list-decimal pl-5 text-github-gray-100 space-y-2 text-sm">
              <li>Ve a <strong className="text-white">GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</strong></li>
              <li>Haz clic en <strong className="text-white">"Generate new token"</strong></li>
              <li>Selecciona los permisos: <strong className="text-white">repo</strong> (acceso completo a repositorios)</li>
              <li>Copia el token generado y pégalo aquí</li>
            </ol>
            <p className="mt-3 text-xs text-github-gray-400">
              💡 Si trabajas con organizaciones que usan SAML SSO, deberás autorizar el token después de crearlo.
            </p>
            <p className="mt-2 text-xs text-green-400">
              🔒 El token se guardará en <code className="bg-github-gray-800 px-1 rounded">.env.local</code> (no se sube a git)
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="github-token" className="block text-github-gray-100 mb-2 font-medium">
              Token de GitHub
            </label>
            <input
              id="github-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2 bg-github-gray-900 border border-github-gray-600 rounded-github text-github-gray-100 focus:outline-none focus:border-blue-500"
              disabled={saving}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-600 rounded-github p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !token.trim()}
            className="px-6 py-2 bg-github-green border border-green-600 text-white rounded-github cursor-pointer font-medium transition-all duration-200 hover:bg-green-600 hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar y Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};
