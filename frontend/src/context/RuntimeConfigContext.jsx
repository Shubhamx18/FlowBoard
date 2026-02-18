/**
 * RuntimeConfig Context
 *
 * Fetches ALL runtime configuration from the backend at app startup.
 * This means the pre-built Docker image NEVER needs to be rebuilt
 * when EC2 IP or Agora credentials change — just update .env and
 * restart the containers: `docker compose restart`
 *
 * Usage:
 *   const { agoraAppId, socketUrl } = useRuntimeConfig();
 */
import { createContext, useContext, useEffect, useState } from 'react';

// Resolve the base URL for the very first fetch (before we know runtime config).
// In production (nginx): same origin. In dev: VITE_BACKEND_URL or localhost.
function getInitialBackendUrl() {
    if (import.meta.env.PROD) return window.location.origin;
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
}

const RuntimeConfigContext = createContext({
    agoraAppId: '',
    backendUrl: '',
    socketUrl: '',
    loaded: false,
});

export function RuntimeConfigProvider({ children }) {
    const [config, setConfig] = useState({
        agoraAppId: import.meta.env.VITE_AGORA_APP_ID || '',
        backendUrl: getInitialBackendUrl(),
        socketUrl: import.meta.env.VITE_SOCKET_URL || getInitialBackendUrl(),
        loaded: false,
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const base = getInitialBackendUrl();
                const res = await fetch(`${base}/api/config/runtime`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                setConfig({
                    // Runtime values from backend take priority;
                    // fall back to build-time VITE_ vars if backend returns empty string
                    agoraAppId: data.agoraAppId || import.meta.env.VITE_AGORA_APP_ID || '',
                    backendUrl: data.backendUrl || getInitialBackendUrl(),
                    socketUrl: data.socketUrl || import.meta.env.VITE_SOCKET_URL || getInitialBackendUrl(),
                    loaded: true,
                });
            } catch (e) {
                console.warn('[RuntimeConfig] Could not fetch /api/config/runtime, using build-time defaults:', e.message);
                // Graceful fallback — app still works with VITE_ vars
                setConfig(prev => ({ ...prev, loaded: true }));
            }
        };

        fetchConfig();
    }, []);

    return (
        <RuntimeConfigContext.Provider value={config}>
            {children}
        </RuntimeConfigContext.Provider>
    );
}

export function useRuntimeConfig() {
    return useContext(RuntimeConfigContext);
}
