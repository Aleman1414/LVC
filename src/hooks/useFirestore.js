import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

export function useFirestore(collectionName) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const results = [];
            snapshot.forEach((doc) => {
                results.push({ id: doc.id, ...doc.data() });
            });
            setData(results);
            setLoading(false);
        }, (err) => {
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName]);

    const addData = async (newData) => {
        return await addDoc(collection(db, collectionName), newData);
    };

    const updateData = async (id, updatedData) => {
        const docRef = doc(db, collectionName, id);
        return await updateDoc(docRef, updatedData);
    };

    const deleteData = async (id) => {
        const docRef = doc(db, collectionName, id);
        return await deleteDoc(docRef);
    };

    const uploadFile = async (file, path) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    return { data, loading, error, addData, updateData, deleteData, uploadFile };
}
