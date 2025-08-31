
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Exam, Question } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const examsCollection = collection(db, 'exams');

// Fetch all exams
export async function getExams(): Promise<Exam[]> {
    const snapshot = await getDocs(examsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
}

// Fetch a single exam by ID
export async function getExam(id: string): Promise<Exam | null> {
    const docRef = doc(db, 'exams', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const examData = docSnap.data() as Exam;
        // Ensure questions array exists
        if (!examData.questions) {
            examData.questions = [];
        }
        
        // Backwards compatibility for old exam types
        if ((examData.type as any) === 'Standard') {
          examData.type = 'WrittenOnly';
        } else if ((examData.type as any) === 'Promotion') {
          examData.type = 'WrittenAndInterview';
        } else if (!examData.type) {
           examData.type = 'WrittenOnly';
        }

        return { id: docSnap.id, ...examData };
    }
    return null;
}

// Add a new exam
export async function addExam(examData: Omit<Exam, 'id'>): Promise<string> {
    const questionsWithIds = examData.questions.map(q => ({
        ...q,
        id: q.id || uuidv4(),
        subQuestions: q.subQuestions?.map(subQ => ({ ...subQ, id: subQ.id || uuidv4() }))
    }));
    const docRef = await addDoc(examsCollection, { ...examData, questions: questionsWithIds });
    return docRef.id;
}

// Update an existing exam
export async function updateExam(examId: string, examData: Partial<Omit<Exam, 'id'>>): Promise<void> {
    const docRef = doc(db, 'exams', examId);
    
    // Create a mutable copy
    let dataToUpdate: Partial<Exam> = { ...examData };

    if (dataToUpdate.questions) {
        const questionsWithIds = dataToUpdate.questions.map(q => ({
            ...q,
            id: q.id || uuidv4(),
            subQuestions: q.subQuestions?.map(subQ => ({ ...subQ, id: subQ.id || uuidv4() }))
        }));
        dataToUpdate.questions = questionsWithIds;
    }
    
    // Firestore does not support 'undefined' values. We need to clean the object.
    Object.keys(dataToUpdate).forEach(key => {
        if ((dataToUpdate as any)[key] === undefined) {
            delete (dataToUpdate as any)[key];
        }
    });

    await updateDoc(docRef, dataToUpdate);
}


// Delete an exam
export async function deleteExam(examId: string): Promise<void> {
    const docRef = doc(db, 'exams', examId);
    await deleteDoc(docRef);
}
