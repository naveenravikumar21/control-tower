import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { DOC_TYPES, DEPLOYMENT_DOC_TYPES } from '../constants';

const ConfigContext = createContext(null);

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
    const { user } = useAuth();
    const [docTypes, setDocTypes] = useState(DOC_TYPES);
    const [deploymentDocTypes, setDeploymentDocTypes] = useState(DEPLOYMENT_DOC_TYPES);
    const [loading, setLoading] = useState(true);

    // Fetch config from API on mount
    const fetchConfig = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const [docTypesConfig, deploymentDocTypesConfig] = await Promise.all([
                api.getConfig('docTypes').catch(() => null),
                api.getConfig('deploymentDocTypes').catch(() => null)
            ]);

            if (docTypesConfig?.value?.types?.length > 0) {
                const sortedTypes = [...docTypesConfig.value.types].sort((a, b) =>
                    (a.order || 0) - (b.order || 0)
                );
                setDocTypes(sortedTypes);
            } else {
                setDocTypes(DOC_TYPES);
            }

            if (deploymentDocTypesConfig?.value?.types?.length > 0) {
                const sortedTypes = [...deploymentDocTypesConfig.value.types].sort((a, b) =>
                    (a.order || 0) - (b.order || 0)
                );
                setDeploymentDocTypes(sortedTypes);
            } else {
                setDeploymentDocTypes(DEPLOYMENT_DOC_TYPES);
            }
        } catch (err) {
            console.error('Error fetching config:', err);
            setDocTypes(DOC_TYPES);
            setDeploymentDocTypes(DEPLOYMENT_DOC_TYPES);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // Product doc types CRUD
    const saveDocTypes = async (types) => {
        if (!user) return;

        try {
            const typesWithOrder = types.map((t, index) => ({ ...t, order: index }));
            await api.setConfig('docTypes', { types: typesWithOrder });
            setDocTypes(typesWithOrder);
            return true;
        } catch (err) {
            console.error('Error saving doc types:', err);
            throw err;
        }
    };

    const addDocType = async (key, label) => {
        const newType = { key, label, order: docTypes.length };
        const updatedTypes = [...docTypes, newType];
        await saveDocTypes(updatedTypes);
    };

    const removeDocType = async (key) => {
        const updatedTypes = docTypes.filter(t => t.key !== key);
        await saveDocTypes(updatedTypes);
    };

    const updateDocType = async (key, newLabel) => {
        const updatedTypes = docTypes.map(t =>
            t.key === key ? { ...t, label: newLabel } : t
        );
        await saveDocTypes(updatedTypes);
    };

    // Deployment doc types CRUD
    const saveDeploymentDocTypes = async (types) => {
        if (!user) return;

        try {
            const typesWithOrder = types.map((t, index) => ({ ...t, order: index }));
            await api.setConfig('deploymentDocTypes', { types: typesWithOrder });
            setDeploymentDocTypes(typesWithOrder);
            return true;
        } catch (err) {
            console.error('Error saving deployment doc types:', err);
            throw err;
        }
    };

    const addDeploymentDocType = async (key, label) => {
        const newType = { key, label, order: deploymentDocTypes.length };
        const updatedTypes = [...deploymentDocTypes, newType];
        await saveDeploymentDocTypes(updatedTypes);
    };

    const removeDeploymentDocType = async (key) => {
        const updatedTypes = deploymentDocTypes.filter(t => t.key !== key);
        await saveDeploymentDocTypes(updatedTypes);
    };

    const updateDeploymentDocType = async (key, newLabel) => {
        const updatedTypes = deploymentDocTypes.map(t =>
            t.key === key ? { ...t, label: newLabel } : t
        );
        await saveDeploymentDocTypes(updatedTypes);
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
            refetch: fetchConfig
        }}>
            {children}
        </ConfigContext.Provider>
    );
};
