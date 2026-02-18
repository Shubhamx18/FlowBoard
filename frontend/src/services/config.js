/**
 * getBackendUrl — resolves the backend base URL at runtime.
 *
 * In production (Docker + nginx):
 *   The frontend is served by nginx on port 80.
 *   nginx proxies /api/* and /socket.io/* to the backend container.
 *   So we use window.location.origin (same host, port 80) — zero CORS.
 *
 * In development:
 *   Falls back to VITE_BACKEND_URL env var, then localhost:5000.
 */
export function getBackendUrl() {
    if (import.meta.env.PROD) {
        return window.location.origin;
    }
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
}

/**
 * getSocketUrl — resolves the Socket.IO server URL at runtime.
 *
 * In production: same as backend (nginx proxies /socket.io/).
 * In development: falls back to VITE_SOCKET_URL or localhost:5000.
 */
export function getSocketUrl() {
    if (import.meta.env.PROD) {
        return window.location.origin;
    }
    return import.meta.env.VITE_SOCKET_URL
        || import.meta.env.VITE_BACKEND_URL
        || 'http://localhost:5000';
}

/**
 * getApiUrl — resolves the REST API base URL.
 *
 * In production: /api (relative, proxied by nginx).
 * In development: falls back to VITE_API_URL or localhost:5000/api.
 */
export function getApiUrl() {
    if (import.meta.env.PROD) {
        return `${window.location.origin}/api`;
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
}
