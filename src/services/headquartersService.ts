
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, deleteDoc, setDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import type { Headquarters } from '@/lib/types';

const headquartersCollection = collection(db, 'headquarters');

export async function getHeadquarters(): Promise<Headquarters[]> {
    const q = query(headquartersCollection, orderBy("code"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), code: doc.id } as Headquarters));
}

export async function addHeadquarters(hq: Omit<Headquarters, 'id'>): Promise<void> {
    const docRef = doc(headquartersCollection, hq.code);
    await setDoc(docRef, { name: hq.name, code: hq.code });
}


export async function addHeadquartersBatch(newHqs: Omit<Headquarters, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    newHqs.forEach(hq => {
        const docRef = doc(headquartersCollection, hq.code);
        batch.set(docRef, { name: hq.name, code: hq.code });
    });
    await batch.commit();
}

export async function updateHeadquarters(code: string, hq: Partial<Omit<Headquarters, 'code'>>): Promise<void> {
    const docRef = doc(headquartersCollection, code);
    await updateDoc(docRef, hq);
}

export async function deleteHeadquarters(code: string): Promise<void> {
    const docRef = doc(db, 'headquarters', code);
    await deleteDoc(docRef);
}
