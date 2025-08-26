
export type UserRole = 'system_administrator' | 'hq_administrator' | 'examinee';

export interface User {
  id: string;
  name: string;
  employeeId: string;
  role: UserRole;
  avatarUrl: string;
  headquarters?: string;
  password?: string;
}

export type QuestionType = 'descriptive' | 'fill-in-the-blank' | 'selection';

export interface Question {
  id?: string; // Optional for new questions
  text: string;
  type: QuestionType;
  points: number;
  timeLimit?: number; // in seconds
  options?: string[]; // for selection
  modelAnswer?: string | string[]; // for grading
  subQuestions?: Question[];
}

export interface Answer {
  questionId: string;
  value: string | string[];
  subAnswers?: Answer[];
}

export interface Grade {
    score: number;
    justification: string;
    reviewer: string;
    scores?: { [questionId: string]: number }; // Individual question scores
}

export interface Submission {
  id: string;
  examId: string;
  examineeId: string;
  examineeHeadquarters?: string;
  submittedAt: any; // Firestore Timestamp
  answers: Answer[];
  status: 'In Progress' | 'Submitted' | 'Grading' | 'Completed';
  hqGrade?: Grade;
  poGrade?: Grade;
  finalScore?: number;
  finalOutcome?: 'Passed' | 'Failed';
  lessonReviewDate1?: any; // Firestore Timestamp
  lessonReviewEndDate1?: any; // Firestore Timestamp
  lessonReviewDate2?: any; // Firestore Timestamp
  lessonReviewEndDate2?: any; // Firestore Timestamp
  resultCommunicated?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  duration: number; // in minutes
  totalPoints: number;
  status: 'Draft' | 'Published' | 'Archived';
  questions: Question[];
  type: 'Standard' | 'Promotion';
}


export interface Headquarters {
  code: string;
  name: string;
}
