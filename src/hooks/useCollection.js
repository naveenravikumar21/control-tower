import { useState, useEffect } from 'react';
import { getCollectionRef, onSnapshot } from '../utils/firebase';
import { useAuth } from '../contexts';

export const useCollection = (collectionName) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !collectionName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = getCollectionRef(collectionName);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, collectionName]);

  return { data, loading, error };
};
