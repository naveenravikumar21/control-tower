/**
 * REST API Client for Control Tower Backend
 *
 * This module replaces the Firebase SDK with REST API calls to the Moleculer backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('ct_token');
    }

    /**
     * Convert camelCase to kebab-case for URL paths
     * e.g., releaseNotes -> release-notes
     */
    toKebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Set or clear the auth token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('ct_token', token);
        } else {
            localStorage.removeItem('ct_token');
            localStorage.removeItem('ct_refresh_token');
        }
    }

    /**
     * Set refresh token
     */
    setRefreshToken(token) {
        if (token) {
            localStorage.setItem('ct_refresh_token', token);
        } else {
            localStorage.removeItem('ct_refresh_token');
        }
    }

    /**
     * Get stored refresh token
     */
    getRefreshToken() {
        return localStorage.getItem('ct_refresh_token');
    }

    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Try to refresh token
                const refreshed = await this.tryRefreshToken();
                if (refreshed) {
                    // Retry the request with new token
                    headers['Authorization'] = `Bearer ${this.token}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    if (!retryResponse.ok) {
                        const error = await retryResponse.json().catch(() => ({}));
                        throw new Error(error.message || 'Request failed after token refresh');
                    }
                    return retryResponse.json();
                } else {
                    // Clear tokens and redirect to login
                    this.setToken(null);
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                    throw new Error('Session expired. Please log in again.');
                }
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP Error: ${response.status}`);
            }

            // Handle empty responses
            const text = await response.text();
            return text ? JSON.parse(text) : null;

        } catch (err) {
            if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
                throw new Error('Unable to connect to server. Please check your connection.');
            }
            throw err;
        }
    }

    /**
     * Try to refresh the auth token
     */
    async tryRefreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) return false;

            const data = await response.json();
            if (data.token) {
                this.setToken(data.token);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    // ===== AUTH METHODS =====

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        this.setRefreshToken(data.refreshToken);
        return data;
    }

    async register(email, password, name) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
        this.setToken(data.token);
        return data;
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    logout() {
        this.setToken(null);
    }

    isAuthenticated() {
        return !!this.token;
    }

    // ===== GENERIC CRUD METHODS =====

    /**
     * List all items in a collection
     */
    async list(resource) {
        return await this.request(`/${this.toKebabCase(resource)}`);
    }

    /**
     * Get a single item by ID
     */
    async get(resource, id) {
        return await this.request(`/${this.toKebabCase(resource)}/${id}`);
    }

    /**
     * Create a new item
     */
    async create(resource, data) {
        return await this.request(`/${this.toKebabCase(resource)}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Update an existing item
     */
    async update(resource, id, data) {
        return await this.request(`/${this.toKebabCase(resource)}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Delete an item
     */
    async remove(resource, id) {
        return await this.request(`/${this.toKebabCase(resource)}/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== SPECIALIZED METHODS =====

    /**
     * Get checklists for a deployment
     */
    async getDeploymentChecklists(deploymentId) {
        return await this.request(`/deployments/${deploymentId}/checklists`);
    }

    /**
     * Toggle a checklist item
     */
    async toggleChecklist(id) {
        return await this.request(`/checklists/${id}/toggle`, {
            method: 'PUT'
        });
    }

    /**
     * Mark all checklists as complete
     */
    async markAllChecklistsComplete(deploymentId) {
        return await this.request(`/deployments/${deploymentId}/checklists/mark-all`, {
            method: 'PUT'
        });
    }

    /**
     * Reset all checklists
     */
    async resetAllChecklists(deploymentId) {
        return await this.request(`/deployments/${deploymentId}/checklists/reset`, {
            method: 'PUT'
        });
    }

    /**
     * Get release notes for a product
     */
    async getProductReleaseNotes(productId) {
        return await this.request(`/products/${productId}/release-notes`);
    }

    /**
     * Get config by key
     */
    async getConfig(key) {
        return await this.request(`/config/${key}`);
    }

    /**
     * Set config by key
     */
    async setConfig(key, value) {
        return await this.request(`/config/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ key, value })
        });
    }
}

// Export singleton instance
export const api = new ApiClient();

// ===== COMPATIBILITY LAYER =====
// These functions match the old firebase.js interface for easier migration

/**
 * Add a document to a collection
 * @param {string} collectionName - The collection name
 * @param {object} data - The data to add
 */
export const addDocument = async (collectionName, data) => {
    const result = await api.create(collectionName, data);
    return { id: result.id };
};

/**
 * Update a document in a collection
 * @param {string} collectionName - The collection name
 * @param {string} docId - The document ID
 * @param {object} data - The data to update
 */
export const updateDocument = async (collectionName, docId, data) => {
    return await api.update(collectionName, docId, data);
};

/**
 * Delete a document from a collection
 * @param {string} collectionName - The collection name
 * @param {string} docId - The document ID
 */
export const deleteDocument = async (collectionName, docId) => {
    return await api.remove(collectionName, docId);
};

// Export API base URL for debugging
export const API_URL = API_BASE;

export default api;
