
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { Submission } from '@/lib/types';

const submissionsCollection = collection(db, 'submissions');

export async function getSubmissions(): Promise<Submission[]> {
    const snapshot = await getDocs(submissionsCollection);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt.toDate(),
        } as Submission;
    });
}

export async function getSubmission(id: string): Promise<Submission | null> {
    const docRef = doc(db, 'submissions', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            submittedAt: data.submittedAt.toDate(),
        } as Submission;
    }
    return null;
}

export async function addSubmission(submissionData: Omit<Submission, 'id' | 'submittedAt' | 'status'>): Promise<string> {
    const dataWithTimestamp = {
        ...submissionData,
        submittedAt: serverTimestamp(),
        status: 'Submitted',
    };
    const docRef = await addDoc(submissionsCollection, dataWithTimestamp);
    return docRef.id;
}


export async function updateSubmission(submissionId: string, submissionData: Partial<Omit<Submission, 'id'>>): Promise<void> {
    const docRef = doc(db, 'submissions', submissionId);
    
    // Convert Date objects to Firestore Timestamps before updating
    const dataToUpdate: { [key: string]: any } = { ...submissionData };

    if (submissionData.lessonReviewDate1 instanceof Date) {
        dataToUpdate.lessonReviewDate1 = Timestamp.fromDate(submissionData.lessonReviewDate1);
    }
     if (submissionData.lessonReviewDate2 instanceof Date) {
        dataToUpdate.lessonReviewDate2 = Timestamp.fromDate(submissionData.lessonReviewDate2);
    }
    
    await updateDoc(docRef, dataToUpdate);
}

// Delete a submission
export async function deleteSubmission(submissionId: string): Promise<void> {
    const docRef = doc(db, 'submissions', submissionId);
    await deleteDoc(docRef);
}
