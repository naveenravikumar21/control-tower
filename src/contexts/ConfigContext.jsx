import { createContext, useContext, useState, useEffect } from 'react';
import { getCollectionRef, getDocRef, onSnapshot, updateDoc, serverTimestamp, doc, setDoc } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { DOC_TYPES } from '../constants';

const ConfigContext = createContext(null);

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
  const { user } = useAuth();
  const [docTypes, setDocTypes] = useState(DOC_TYPES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Listen to the config collection for docTypes
    const ref = getCollectionRef('config');

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const configDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const docTypesConfig = configDocs.find(c => c.id === 'docTypes');

        if (docTypesConfig?.types?.length > 0) {
          // Sort by order if available
          const sortedTypes = [...docTypesConfig.types].sort((a, b) =>
            (a.order || 0) - (b.order || 0)
          );
          setDocTypes(sortedTypes);
        } else {
          // Fallback to default DOC_TYPES
          setDocTypes(DOC_TYPES);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching config:', err);
        setDocTypes(DOC_TYPES);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const saveDocTypes = async (types) => {
    if (!user) return;

    try {
      const typesWithOrder = types.map((t, index) => ({ ...t, order: index }));
      const ref = getDocRef('config', 'docTypes');

      await setDoc(ref, {
        types: typesWithOrder,
        updatedAt: serverTimestamp()
      }, { merge: true });

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

  return (
    <ConfigContext.Provider value={{
      docTypes,
      loading,
      saveDocTypes,
      addDocType,
      removeDocType,
      updateDocType
    }}>
      {children}
    </ConfigContext.Provider>
  );
};
