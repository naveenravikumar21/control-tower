import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check for existing token on mount
    useEffect(() => {
        const initAuth = async () => {
            if (api.isAuthenticated()) {
                try {
                    const currentUser = await api.getCurrentUser();
                    setUser(currentUser);
                } catch (err) {
                    console.error('Failed to verify token:', err);
                    api.logout();
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();

        // Listen for logout events (e.g., from token expiry)
        const handleLogout = () => {
            setUser(null);
        };
        window.addEventListener('auth:logout', handleLogout);

        return () => {
            window.removeEventListener('auth:logout', handleLogout);
        };
    }, []);

    /**
     * Login with email and password
     */
    const login = useCallback(async (email, password) => {
        setError(null);
        try {
            const data = await api.login(email, password);
            setUser(data.user);
            return data.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Register a new user
     */
    const register = useCallback(async (email, password, name) => {
        setError(null);
        try {
            const data = await api.register(email, password, name);
            setUser(data.user);
            return data.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Logout
     */
    const logout = useCallback(() => {
        api.logout();
        setUser(null);
        setError(null);
    }, []);

    /**
     * Clear error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
