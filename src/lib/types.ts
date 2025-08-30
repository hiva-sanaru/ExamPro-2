
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
  gradingCriteria?: string;
  subQuestions?: Question[];
  numberOfAnswers?: number; // For descriptive questions expecting multiple answers
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
  examineeId: string; // employeeId for unregistered users
  examineeName: string;
  examineeHeadquarters?: string;
  submittedAt: any; // Firestore Timestamp
  answers: Answer[];
  status: 'In Progress' | 'Submitted' | 'Grading' | 'Completed' | '本部採点中' | '人事確認中' | '合格' | '不合格' | '授業審査待ち';
  hqGrade?: Grade;
  poGrade?: Grade;
  finalScore?: number;
  finalOutcome?: 'Passed' | 'Failed';
  lessonReviewUrl?: string;
  lessonReviewDate1?: any; // Firestore Timestamp
  lessonReviewDate2?: any; // Firestore Timestamp
  resultCommunicated?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  duration: number; // in minutes
  totalPoints: number;
  status: 'Draft' | 'Published' | 'Archived';
  questions: Question[];
  type: 'WrittenOnly' | 'WrittenAndInterview' | 'Standard' | 'Promotion'; // Standard and Promotion are for backwards compatibility
  lessonReviewType?: 'DateSubmission' | 'UrlSubmission';
}


export interface Headquarters {
  code: string;
  name: string;
}

export interface ExamineeInfo {
  employeeId: string;
  name: string;
  headquarters: string;
}
