import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts';

/**
 * Hook to fetch and manage collection data from the REST API
 *
 * This replaces the Firebase real-time listener with REST API polling.
 * Since real-time updates are not needed, data is fetched once on mount
 * and can be manually refreshed using the refetch function.
 *
 * @param {string} collectionName - The name of the collection to fetch
 * @returns {object} - { data, loading, error, refetch }
 */
export const useCollection = (collectionName) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    const fetchData = useCallback(async () => {
        if (!user || !collectionName) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await api.list(collectionName);
            setData(Array.isArray(result) ? result : []);

        } catch (err) {
            console.error(`Error fetching ${collectionName}:`, err);
            setError(err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [user, collectionName]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Manually refetch the data
     */
    const refetch = useCallback(() => {
        return fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch };
};

export default useCollection;
