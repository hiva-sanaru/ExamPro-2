
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp, serverTimestamp, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { Submission } from '@/lib/types';

const submissionsCollection = collection(db, 'submissions');

export async function getSubmissions(): Promise<Submission[]> {
    const q = query(submissionsCollection, orderBy("submittedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure submittedAt is converted to Date, handling potential undefined
        const submittedAt = data.submittedAt ? data.submittedAt.toDate() : new Date(0); // Fallback to epoch
        return {
            id: doc.id,
            ...data,
            submittedAt,
        } as Submission;
    });
}

export async function getSubmission(id: string): Promise<Submission | null> {
    const docRef = doc(db, 'submissions', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const submittedAt = data.submittedAt ? data.submittedAt.toDate() : new Date();
        return {
            id: docSnap.id,
            ...data,
            submittedAt,
        } as Submission;
    }
    return null;
}

export async function addSubmission(submissionData: Omit<Submission, 'id' | 'submittedAt'>): Promise<string> {
    const dataWithTimestamp = {
        ...submissionData,
        submittedAt: serverTimestamp(),
    };
    const docRef = await addDoc(submissionsCollection, dataWithTimestamp);
    return docRef.id;
}


export async function updateSubmission(submissionId: string, submissionData: Partial<Omit<Submission, 'id'>>): Promise<void> {
    const docRef = doc(db, 'submissions', submissionId);
    
    const dataToUpdate: { [key: string]: any } = { ...submissionData };

    if (submissionData.lessonReviewDate1 instanceof Date) {
        dataToUpdate.lessonReviewDate1 = Timestamp.fromDate(submissionData.lessonReviewDate1);
    }
     if (submissionData.lessonReviewDate2 instanceof Date) {
        dataToUpdate.lessonReviewDate2 = Timestamp.fromDate(submissionData.lessonReviewDate2);
    }
    
    await updateDoc(docRef, dataToUpdate);
}

export async function deleteSubmission(submissionId: string): Promise<void> {
    const docRef = doc(db, 'submissions', submissionId);
    await deleteDoc(docRef);
}

    
