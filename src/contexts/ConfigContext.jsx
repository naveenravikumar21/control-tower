import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DOC_TYPES, DEPLOYMENT_DOC_TYPES } from '../constants';

const ConfigContext = createContext(null);

export const useConfig = () => useContext(ConfigContext);

const STORAGE_KEY_DOC_TYPES = 'controlTower_docTypes';
const STORAGE_KEY_DEPLOYMENT_DOC_TYPES = 'controlTower_deploymentDocTypes';

export const ConfigProvider = ({ children }) => {
    const [docTypes, setDocTypes] = useState(DOC_TYPES);
    const [deploymentDocTypes, setDeploymentDocTypes] = useState(DEPLOYMENT_DOC_TYPES);
    const [loading, setLoading] = useState(true);

    // Load config from localStorage on mount
    const loadConfig = useCallback(() => {
        try {
            const savedDocTypes = localStorage.getItem(STORAGE_KEY_DOC_TYPES);
            if (savedDocTypes) {
                const parsed = JSON.parse(savedDocTypes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setDocTypes(parsed);
                }
            }

            const savedDeploymentDocTypes = localStorage.getItem(STORAGE_KEY_DEPLOYMENT_DOC_TYPES);
            if (savedDeploymentDocTypes) {
                const parsed = JSON.parse(savedDeploymentDocTypes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setDeploymentDocTypes(parsed);
                }
            }
        } catch (err) {
            console.error('Error loading config from localStorage:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // Product doc types CRUD
    const saveDocTypes = (types) => {
        try {
            const typesWithOrder = types.map((t, index) => ({ ...t, order: index }));
            localStorage.setItem(STORAGE_KEY_DOC_TYPES, JSON.stringify(typesWithOrder));
            setDocTypes(typesWithOrder);
            return true;
        } catch (err) {
            console.error('Error saving doc types:', err);
            throw err;
        }
    };

    const addDocType = (key, label) => {
        const newType = { key, label, order: docTypes.length };
        const updatedTypes = [...docTypes, newType];
        saveDocTypes(updatedTypes);
    };

    const removeDocType = (key) => {
        const updatedTypes = docTypes.filter(t => t.key !== key);
        saveDocTypes(updatedTypes);
    };

    const updateDocType = (key, newLabel) => {
        const updatedTypes = docTypes.map(t =>
            t.key === key ? { ...t, label: newLabel } : t
        );
        saveDocTypes(updatedTypes);
    };

    // Deployment doc types CRUD
    const saveDeploymentDocTypes = (types) => {
        try {
            const typesWithOrder = types.map((t, index) => ({ ...t, order: index }));
            localStorage.setItem(STORAGE_KEY_DEPLOYMENT_DOC_TYPES, JSON.stringify(typesWithOrder));
            setDeploymentDocTypes(typesWithOrder);
            return true;
        } catch (err) {
            console.error('Error saving deployment doc types:', err);
            throw err;
        }
    };

    const addDeploymentDocType = (key, label) => {
        const newType = { key, label, order: deploymentDocTypes.length };
        const updatedTypes = [...deploymentDocTypes, newType];
        saveDeploymentDocTypes(updatedTypes);
    };

    const removeDeploymentDocType = (key) => {
        const updatedTypes = deploymentDocTypes.filter(t => t.key !== key);
        saveDeploymentDocTypes(updatedTypes);
    };

    const updateDeploymentDocType = (key, newLabel) => {
        const updatedTypes = deploymentDocTypes.map(t =>
            t.key === key ? { ...t, label: newLabel } : t
        );
        saveDeploymentDocTypes(updatedTypes);
    };

    return (
        <ConfigContext.Provider value={{
            docTypes,
            deploymentDocTypes,
            loading,
            saveDocTypes,
            addDocType,
            removeDocType,
            updateDocType,
            saveDeploymentDocTypes,
            addDeploymentDocType,
            removeDeploymentDocType,
            updateDeploymentDocType,
            refetch: loadConfig
        }}>
            {children}
        </ConfigContext.Provider>
    );
};
