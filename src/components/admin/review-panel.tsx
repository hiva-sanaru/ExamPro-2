
"use client";

import { useState, useMemo, useEffect } from "react";
import { gradeAnswer } from "@/ai/flows/grade-answer";
import { useToast } from "@/hooks/use-toast";
import type { Exam, Submission, QuestionGrade, User, Answer, Question, LessonReviewGrades, LessonReviewGradeValue } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Wand2, User as UserIcon, Check, Loader2, Building, ThumbsUp, ThumbsDown, Calendar as CalendarIcon, CheckCircle, Youtube } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { updateSubmission } from "@/services/submissionService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ja } from 'date-fns/locale';
import { useRouter } from "next/navigation";


interface ReviewPanelProps {
  exam: Exam | null;
  submission: Submission;
  reviewerRole: "本部" | "人事室";
  currentUser: User;
  onSubmissionUpdate: () => void;
  isLessonReview: boolean;
}

interface GradingResult {
  questionId: string;
  score: number;
  justification: string;
  isLoading: boolean;
}

interface ManualScores {
    [questionId: string]: number | undefined;
}

interface AiJustifications {
    [questionId: string]: string;
}

const LESSON_REVIEW_ITEMS: Record<string, string[]> = {
  'チューター初級': ['声・表情', 'けじめ', '丁寧', 'やる気アドバイス'],
  'チューター中級': ['スピーチ', '問題対処', 'リーダー性'],
};

export function ReviewPanel({ exam, submission, reviewerRole, currentUser, onSubmissionUpdate, isLessonReview }: ReviewPanelProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [manualScores, setManualScores] = useState<ManualScores>({});
  const [aiJustifications, setAiJustifications] = useState<AiJustifications>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const isPersonnelOfficeView = reviewerRole === "人事室";

  const [finalScore, setFinalScore] = useState<number | undefined>(submission.finalScore);
  const [finalOutcome, setFinalOutcome] = useState<'Passed' | 'Failed' | undefined>(submission.finalOutcome);

  // State for lesson review date/time submission
  const [date1, setDate1] = useState<Date | undefined>(submission.lessonReviewDate1?.toDate());
  const [time1, setTime1] = useState(submission.lessonReviewDate1 ? format(submission.lessonReviewDate1.toDate(), 'HH:mm') : '09:00');
  const [date2, setDate2] = useState<Date | undefined>(submission.lessonReviewDate2?.toDate());
  const [time2, setTime2] = useState(submission.lessonReviewDate2 ? format(submission.lessonReviewDate2.toDate(), 'HH:mm') : '10:00');
  const [schoolName, setSchoolName] = useState(submission.lessonReviewSchoolName || '');
  const [classroomName, setClassroomName] = useState(submission.lessonReviewClassroomName || '');
  const [lessonReviewGrades, setLessonReviewGrades] = useState<LessonReviewGrades>({});

  const lessonReviewItems = useMemo(() => {
    const title = exam?.title;
    if (!title) return [];
    for (const key in LESSON_REVIEW_ITEMS) {
      if (title.includes(key)) {
        return LESSON_REVIEW_ITEMS[key];
      }
    }
    return [];
  }, [exam?.title]);


  const isActionDisabled = useMemo(() => {
    // System admin can always take action
    if (currentUser.role === 'system_administrator') {
        return false;
    }
    
    // PO can only be modified by system_admin, so disable for others
    if (isPersonnelOfficeView) {
        return true; 
    }
    
    // HQ view
    if(currentUser.role === 'hq_administrator'){
       if (isLessonReview) { // Video URL has been submitted
         return submission.status !== '授業審査待ち';
       }
       // HQ can review written exam if status is 'Submitted'
       return submission.status !== 'Submitted' && submission.status !== '本部採点中';
    }
    
    // Default to disabled for any other case
    return true;
  }, [currentUser, isPersonnelOfficeView, submission, isLessonReview]);


  const totalScore = useMemo(() => {
    if (!exam) return 0;
    return Object.values(manualScores).reduce((acc, score) => acc + (score || 0), 0);
  }, [manualScores, exam]);
  
  useEffect(() => {
    if (finalOutcome === undefined && isPersonnelOfficeView) {
      const threshold = 80;
      const score = finalScore ?? totalScore;
      setFinalOutcome(score >= threshold ? 'Passed' : 'Failed');
    }
  }, [totalScore, finalScore, finalOutcome, isPersonnelOfficeView]);

  useEffect(() => {
    const gradeData = reviewerRole === "人事室" ? submission.poGrade : submission.hqGrade;
    const initialScores: ManualScores = {};
    const initialJustifications: AiJustifications = {};

    if (gradeData?.questionGrades) {
        for (const qId in gradeData.questionGrades) {
            initialScores[qId] = gradeData.questionGrades[qId].score;
            if (gradeData.questionGrades[qId].justification) {
                initialJustifications[qId] = gradeData.questionGrades[qId].justification!;
            }
        }
    }
    
    if (reviewerRole === "人事室" && !submission.poGrade && submission.hqGrade?.questionGrades) {
         for (const qId in submission.hqGrade.questionGrades) {
            initialScores[qId] = submission.hqGrade.questionGrades[qId].score;
             if (submission.hqGrade.questionGrades[qId].justification) {
                initialJustifications[qId] = submission.hqGrade.questionGrades[qId].justification!;
            }
        }
    }

    setManualScores(initialScores);
    setAiJustifications(initialJustifications);
    setOverallFeedback(gradeData?.justification || submission.poGrade?.justification || (isPersonnelOfficeView ? submission.hqGrade?.justification : '') || '');
    setReviewerName(gradeData?.reviewerName || submission.poGrade?.reviewerName || (isPersonnelOfficeView ? submission.hqGrade?.reviewerName : '') || '');

    const initialLessonGrades: LessonReviewGrades = {};
    if (lessonReviewItems.length > 0) {
      lessonReviewItems.forEach(item => {
          const gradeValue = reviewerRole === '人事室' 
              ? (submission.poGrade?.lessonReviewGrades?.[item] || submission.hqGrade?.lessonReviewGrades?.[item] || 'NotSelected')
              : (submission.hqGrade?.lessonReviewGrades?.[item] || 'NotSelected');
          initialLessonGrades[item] = gradeValue;
      });
    }
    setLessonReviewGrades(initialLessonGrades);
    
    if (reviewerRole === "人事室") {
        setFinalScore(submission.finalScore ?? submission.hqGrade?.score);
        setFinalOutcome(submission.finalOutcome);
    } else {
        setSchoolName(submission.lessonReviewSchoolName || '');
        setClassroomName(submission.lessonReviewClassroomName || '');
    }

  }, [submission, reviewerRole, currentUser, lessonReviewItems]);


  const handleManualScoreChange = (questionId: string, score: string) => {
    if (!exam) return;
    const question = exam.questions.find(q => q.id === questionId);
    if (!question) return;

    let maxPoints = question.points;
    if (question.subQuestions && question.subQuestions.length > 0) {
        maxPoints = question.subQuestions.reduce((acc, sub) => acc + (sub.points || 0), 0);
    }

    if (score === '') {
        setManualScores(prev => ({...prev, [questionId]: undefined}));
    } else {
        const newScore = Number(score);
        if (!isNaN(newScore) && newScore <= maxPoints) {
            setManualScores(prev => ({...prev, [questionId]: newScore}));
        }
    }
  }

  const getAnswerForQuestion = (questionId: string): Answer | undefined => {
    return submission.answers.find(a => a.questionId === questionId);
  };
  
  const getSubAnswerForQuestion = (mainAnswer: Answer, subQuestionId: string): string[] => {
    if (!mainAnswer.subAnswers) return [];
    const subAnswer = mainAnswer.subAnswers.find(sa => sa.questionId === subQuestionId);
    if (!subAnswer || !subAnswer.value) return [];
    if (Array.isArray(subAnswer.value)) {
        return subAnswer.value.filter(v => typeof v === 'string');
    }
    if (typeof subAnswer.value === 'string') {
        return [subAnswer.value];
    }
    return [];
  };
  
 const getMainAnswerAsText = (mainAnswer: Answer | undefined, question: Question): string[] => {
    if (!mainAnswer || !mainAnswer.value) return [];
    const value = mainAnswer.value;

    if (Array.isArray(value) && value.length > 0) {
        return value.filter(v => typeof v === 'string' && v.trim() !== '');
    }
    if (typeof value === 'string' && value.trim() !== '') {
        return [value];
    }
    return [];
};


  const handleGradeAllQuestions = async () => {
      if (reviewerRole === "人事室" || !exam) return;
      setIsBulkGrading(true);
      toast({ title: "全問題のAI採点を開始しました...", description: "完了まで数秒お待ちください。" });

      const gradingPromises = exam.questions.map(question => {
        const mainAnswer = getAnswerForQuestion(question.id!);
        let mainAnswerTexts: string[] = getMainAnswerAsText(mainAnswer, question);

        let mainModelAnswers: (string | string[]) = question.modelAnswer || [];
        if (typeof mainModelAnswers === 'string') {
            mainModelAnswers = [mainModelAnswers];
        } else if (!Array.isArray(mainModelAnswers)) {
            mainModelAnswers = [];
        }


        const subQuestionsForApi = question.subQuestions?.map(subQ => {
            const subAnswerTexts = mainAnswer ? getSubAnswerForQuestion(mainAnswer, subQ.id!) : [];
            let subModelAnswers = subQ.modelAnswer || [];
            
             if (typeof subModelAnswers === 'string') {
                subModelAnswers = [subModelAnswers];
            } else if (!Array.isArray(subModelAnswers)) {
                subModelAnswers = [];
            }

            return {
                text: subQ.text,
                points: subQ.points,
                modelAnswers: Array.isArray(subModelAnswers) ? subModelAnswers.filter(t => t && t.trim() !== '') : [],
                gradingCriteria: subQ.gradingCriteria,
                answerTexts: subAnswerTexts,
            };
        });
        
        return gradeAnswer({
            questionText: question.text,
            modelAnswers: Array.isArray(mainModelAnswers) ? mainModelAnswers.filter(t => typeof t === 'string' && t.trim() !== '') as string[] : [],
            gradingCriteria: question.gradingCriteria,
            answerTexts: mainAnswerTexts,
            points: question.points,
            subQuestions: subQuestionsForApi,
        }).then(result => ({ questionId: question.id!, ...result }))
          .catch(error => ({ questionId: question.id!, error: error.message }));
      });

      const results = await Promise.all(gradingPromises);
      
      let hasNewGrading = false;
      const newManualScores: ManualScores = { ...manualScores };
      const newAiJustifications: AiJustifications = { ...aiJustifications };
      
      results.forEach(result => {
        if (result && !('error' in result)) {
            hasNewGrading = true;
            newManualScores[result.questionId] = result.score;
            newAiJustifications[result.questionId] = result.justification;
        } else if (result && 'error' in result) {
            console.error(`Grading failed for ${result.questionId}:`, result.error);
        }
      });
      
      setManualScores(newManualScores);
      setAiJustifications(newAiJustifications);

      if (hasNewGrading) {
        try {
            const questionGrades: { [key: string]: QuestionGrade } = {};
            for (const qId in newManualScores) {
                if (newManualScores[qId] !== undefined) {
                    const grade: QuestionGrade = { score: newManualScores[qId]! };
                    if (newAiJustifications[qId]) {
                        grade.justification = newAiJustifications[qId];
                    }
                    questionGrades[qId] = grade;
                }
            }
            
            await updateSubmission(submission.id, { 
              hqGrade: {
                score: Object.values(newManualScores).reduce((acc, score) => acc + (score || 0), 0),
                justification: overallFeedback,
                reviewer: 'AI Draft',
                reviewerName: reviewerName,
                questionGrades: questionGrades,
                lessonReviewGrades: lessonReviewGrades,
              }
            });

            toast({ title: "AI採点結果を下書き保存しました！", description: "各問題のスコアと評価を確認してください。" });
            onSubmissionUpdate();

        } catch (error) {
            console.error("Failed to save AI grading draft:", error);
            toast({ title: "下書き保存エラー", description: "AI採点結果の保存中にエラーが発生しました。", variant: "destructive" });
        }
      } else {
          toast({ title: "AI一括採点が完了しました", description: "採点対象となる新しい回答はありませんでした。回答が入力されているか確認してください。" });
      }

      setIsBulkGrading(false);
  }


  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    
    let dataToUpdate: Partial<Submission> = {};
    let newStatus: Submission['status'] = submission.status;

    const questionGrades: { [key: string]: QuestionGrade } = {};
    for (const qId in manualScores) {
        const grade: QuestionGrade = { score: manualScores[qId] ?? 0 };
        if (aiJustifications[qId]) {
          grade.justification = aiJustifications[qId];
        }
        questionGrades[qId] = grade;
    }

    if (reviewerRole === '本部') {
        dataToUpdate.hqGrade = {
            score: totalScore,
            justification: overallFeedback,
            reviewer: currentUser.id,
            reviewerName: reviewerName,
            questionGrades: isLessonReview ? undefined : questionGrades,
            lessonReviewGrades: isLessonReview ? lessonReviewGrades : undefined,
        };

        if (exam && !isLessonReview && totalScore >= 80 && exam.type === 'WrittenAndInterview' && exam.lessonReviewType === 'DateSubmission') {
            if (!date1 || !time1) {
                toast({ title: "入力エラー", description: "授業審査の第一希望日時を入力してください。", variant: "destructive"});
                setIsSubmitting(false);
                return;
            }
            const [h1, m1] = time1.split(':').map(Number);
            const lessonReviewDate1 = new Date(date1);
            lessonReviewDate1.setHours(h1, m1);
            dataToUpdate.lessonReviewDate1 = lessonReviewDate1;
            
            if (date2 && time2) {
                const [h2, m2] = time2.split(':').map(Number);
                const lessonReviewDate2 = new Date(date2);
                lessonReviewDate2.setHours(h2, m2);
                dataToUpdate.lessonReviewDate2 = lessonReviewDate2;
            }
            dataToUpdate.lessonReviewSchoolName = schoolName;
            dataToUpdate.lessonReviewClassroomName = classroomName;
        }
        
        newStatus = isLessonReview ? "人事確認中" : "人事確認中";

    } else { // Personnel Office
        const poQuestionGrades: { [key: string]: QuestionGrade } = {};
        for (const qId in manualScores) {
            const grade: QuestionGrade = { score: manualScores[qId] ?? 0 };
            if (aiJustifications[qId]) {
              grade.justification = aiJustifications[qId];
            }
            poQuestionGrades[qId] = grade;
        }

        dataToUpdate.poGrade = {
            score: totalScore,
            justification: overallFeedback,
            reviewer: currentUser.id,
            reviewerName: reviewerName,
            questionGrades: isLessonReview ? undefined : poQuestionGrades,
            lessonReviewGrades: isLessonReview ? lessonReviewGrades : undefined,
        };
        
        if (isLessonReview) {
            dataToUpdate.finalOutcome = finalOutcome;
            newStatus = finalOutcome === 'Passed' ? '合格' : '不合格';
        } else if (exam) {
            dataToUpdate.finalScore = totalScore;
            dataToUpdate.finalOutcome = finalOutcome;
            if (finalOutcome === 'Passed' && exam.type === 'WrittenAndInterview') {
                newStatus = '授業審査待ち';
            } else if (finalOutcome === 'Passed') {
                newStatus = '合格';
            } else {
                newStatus = '不合格';
            }
        }
    }
    
    dataToUpdate.status = newStatus;

    try {
        await updateSubmission(submission.id, dataToUpdate);
        toast({ title: `${reviewerRole}のレビューが正常に送信されました！` });
        onSubmissionUpdate();
        router.push('/admin/review');
    } catch(error) {
        console.error("Failed to submit review:", error);
        toast({ title: "送信エラー", description: "レビューの送信中にエラーが発生しました。", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const showLessonReviewForm = reviewerRole === '本部' && exam && totalScore >= 80 && exam.type === 'WrittenAndInterview' && exam.lessonReviewType === 'DateSubmission';
  const hasAiGradingData = Object.keys(aiJustifications).length > 0;
  
  const handleLessonGradeChange = (item: string, value: LessonReviewGradeValue) => {
    setLessonReviewGrades(prev => ({ ...prev, [item]: value }));
  };

  const GradeButton = ({ value, onClick, current }: { value: LessonReviewGradeValue, onClick: () => void, current: LessonReviewGradeValue }) => (
    <Button
      onClick={onClick}
      variant={current === value ? (value === 'Passed' ? 'default' : 'destructive') : 'outline'}
      className={cn("flex-1 text-xs px-2 h-8",
        current === value && value === 'Passed' && "bg-green-600 hover:bg-green-700",
        current === value && value === 'Failed' && "bg-red-600 hover:bg-red-600",
      )}
    >
      {value === 'Passed' ? '合' : '否'}
    </Button>
  );
  
  if (!exam) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>読み込みエラー</CardTitle>
            </CardHeader>
            <CardContent>
                <p>この提出に関連する試験データが見つかりませんでした。</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline">{reviewerRole}レビュー</CardTitle>
                <CardDescription>
                  {isPersonnelOfficeView 
                    ? "本部採点の結果を確認し、必要に応じてスコアを修正後、最終評価を承認してください。"
                    : "受験者の回答を確認し、AI採点機能を使用して、評価を入力してください。"
                  }
                </CardDescription>
            </div>
            {!isPersonnelOfficeView && !isLessonReview && (
                <Button onClick={handleGradeAllQuestions} disabled={isBulkGrading || isActionDisabled}>
                    {isBulkGrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isBulkGrading ? "採点中..." : (hasAiGradingData ? "AIで再採点" : "AIで一括採点")}
                </Button>
            )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isLessonReview ? (
            <>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Youtube className="w-4 h-4 text-muted-foreground" />提出されたURL</Label>
                    {submission.lessonReviewUrl ? (
                        <a href={submission.lessonReviewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block truncate">
                            {submission.lessonReviewUrl}
                        </a>
                    ) : (
                        <p className="text-muted-foreground p-3 bg-muted rounded-md text-center">動画URLはまだ提出されていません。</p>
                    )}
                </div>
                
                {lessonReviewItems.length > 0 && (
                    <div className="space-y-4 pt-6 border-t">
                        <h3 className="text-lg font-semibold">動画評価項目</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                            {lessonReviewItems.map(item => (
                                <div key={item} className="space-y-2">
                                    <Label htmlFor={`grade-${item}`} className="text-sm font-normal">{item}</Label>
                                    <div className="flex gap-2">
                                        <GradeButton value="Passed" onClick={() => handleLessonGradeChange(item, 'Passed')} current={lessonReviewGrades[item]} />
                                        <GradeButton value="Failed" onClick={() => handleLessonGradeChange(item, 'Failed')} current={lessonReviewGrades[item]} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
        ) : (
            <>
                {isPersonnelOfficeView && submission.hqGrade && (
                    <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-green-800 dark:text-green-300"><Building className="w-5 h-5" />本部採点結果</CardTitle>
                            <CardDescription>
                                本部担当者 ({submission.hqGrade.reviewerName || '未入力'}) による採点結果です。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between items-center text-xl font-bold">
                            <span>筆記スコア:</span>
                            <span>{submission.hqGrade.score} / {exam.totalPoints}</span>
                          </div>
                           <div className="space-y-1 pt-2">
                              <Label>特記事項</Label>
                              <p className="text-sm p-2 bg-background rounded-md">{submission.hqGrade.justification || "特記事項はありません。"}</p>
                          </div>
                            {submission.lessonReviewDate1 && (
                                <div className="space-y-2 pt-4 border-t mt-4">
                                   <Label>提案された授業審査日時・場所</Label>
                                   <div className="text-sm space-y-1">
                                     <p><strong>第一希望:</strong> {format(submission.lessonReviewDate1.toDate(), "PPP HH:mm", { locale: ja })}</p>
                                     {submission.lessonReviewDate2 && <p><strong>第二希望:</strong> {format(submission.lessonReviewDate2.toDate(), "PPP HH:mm", { locale: ja })}</p>}
                                     {submission.lessonReviewSchoolName && <p><strong>校舎名:</strong> {submission.lessonReviewSchoolName}</p>}
                                     {submission.lessonReviewClassroomName && <p><strong>教室名:</strong> {submission.lessonReviewClassroomName}</p>}
                                   </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
                
                {exam.questions.map((question, index) => {
                const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
                const justification = aiJustifications[question.id!];
                const mainAnswer = getAnswerForQuestion(question.id!)

                return (
                    <fieldset key={question.id} disabled={isActionDisabled} className="disabled:opacity-70">
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-primary/5 p-4 border-b">
                            <div className="flex justify-between w-full items-start">
                                <CardTitle className="text-base font-normal text-foreground">問題 {index + 1}: {question.text}</CardTitle>
                                <div className="flex items-center gap-2">
                                    {justification && <Badge variant="secondary">AI採点済み</Badge>}
                                    {isBulkGrading && !justification && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {!hasSubQuestions ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" />受験者の回答</Label>
                                        <p className="p-3 rounded-md bg-muted text-sm min-h-[100px] whitespace-pre-wrap">{getMainAnswerAsText(mainAnswer, question).join("\n") || '－'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-muted-foreground" />模範解答</Label>
                                        <p className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-sm min-h-[100px] whitespace-pre-wrap">{(Array.isArray(question.modelAnswer) ? question.modelAnswer.join(', ') : question.modelAnswer) || "－"}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 pt-4 border-t">
                                    <Label className="flex items-center gap-2"><Bot className="w-4 h-4 text-muted-foreground" />AI採点</Label>
                                    {justification ? (
                                        <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2 text-sm min-h-[100px] whitespace-pre-wrap">
                                            <p><strong>スコア:</strong> {manualScores[question.id!] ?? 'N/A'}/{question.points}</p>
                                            <p><strong>根拠:</strong> {justification}</p>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-md bg-muted/50 border border-dashed flex items-center justify-center min-h-[100px]">
                                            <p className="text-sm text-muted-foreground">{isPersonnelOfficeView ? "AI採点の根拠はありません。下のスコアを直接修正してください。" : "「AIで一括採点」ボタンを押してください"}</p>
                                        </div>
                                    )}
                                </div>
                            </>
                            ) : (
                            <div className="space-y-4">
                                {question.subQuestions?.map((subQ, subIndex) => (
                                <div key={subQ.id} className="pt-4 border-t first:border-t-0 first:pt-0">
                                    <p className="font-medium">({subIndex + 1}) {subQ.text}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-sm"><UserIcon className="w-4 h-4 text-muted-foreground" />受験者の回答</Label>
                                        <p className="p-2 rounded-md bg-muted text-sm min-h-[60px] whitespace-pre-wrap">{mainAnswer ? getSubAnswerForQuestion(mainAnswer, subQ.id!).join('\n') : '－'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-muted-foreground" />模範解答</Label>
                                        <p className="p-2 rounded-md bg-green-50 dark:bg-green-900/20 text-sm min-h-[60px] whitespace-pre-wrap">{subQ.modelAnswer || "－"}</p>
                                    </div>
                                    </div>
                                </div>
                                ))}
                                <div className="space-y-2 pt-4 border-t">
                                    <Label className="flex items-center gap-2"><Bot className="w-4 h-4 text-muted-foreground" />AI採点</Label>
                                    {justification ? (
                                        <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2 text-sm min-h-[100px] whitespace-pre-wrap">
                                            <p><strong>合計スコア:</strong> {manualScores[question.id!] ?? 'N/A'}/{question.points}</p>
                                            <p className="font-medium">根拠:</p>
                                            <p className="whitespace-pre-wrap">{justification}</p>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-md bg-muted/50 border border-dashed flex items-center justify-center min-h-[100px]">
                                            <p className="text-sm text-muted-foreground">{isPersonnelOfficeView ? "AI採点の根拠はありません。下のスコアを直接修正してください。" : "「AIで一括採点」ボタンを押してください"}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}

                            <div className="space-y-2 pt-4 border-t">
                                <Label htmlFor={`score-${question.id}`}>{isPersonnelOfficeView ? "最終スコア" : "あなたの評価"}</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        id={`score-${question.id}`} 
                                        type="number" 
                                        placeholder="スコア" 
                                        className="w-24" 
                                        max={hasSubQuestions ? question.subQuestions!.reduce((acc, sub) => acc + (sub.points || 0), 0) : question.points}
                                        min={0}
                                        value={manualScores[question.id!] ?? ''}
                                        onChange={(e) => handleManualScoreChange(question.id!, e.target.value)}
                                    />
                                    <span className="text-muted-foreground">/ {hasSubQuestions ? question.subQuestions!.reduce((acc, sub) => acc + (sub.points || 0), 0) : question.points} 点</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    </fieldset>
                );
                })}
            </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <fieldset disabled={isActionDisabled} className="disabled:opacity-70">
            <div className="border-t pt-4">
              {!isLessonReview && (
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-headline">最終評価（筆記）</h3>
                    <div className="text-2xl font-bold">
                        合計スコア: {totalScore} / {exam.totalPoints}
                    </div>
                </div>
              )}

                {isPersonnelOfficeView && (
                  <div className="space-y-4 my-4">
                    <Label>最終的な合否（{isLessonReview ? "授業審査" : "筆記"}）</Label>
                    <div className="flex gap-4">
                        <Button 
                            onClick={() => setFinalOutcome('Passed')}
                            variant={finalOutcome === 'Passed' ? 'default' : 'outline'}
                            className={cn("flex-1", finalOutcome === 'Passed' && "bg-green-600 hover:bg-green-700")}
                        >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            合格
                        </Button>
                        <Button 
                            onClick={() => setFinalOutcome('Failed')}
                            variant={finalOutcome === 'Failed' ? 'destructive' : 'outline'}
                             className="flex-1"
                        >
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            不合格
                        </Button>
                    </div>
                  </div>
                )}

                {showLessonReviewForm && !isLessonReview && (
                     <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 mt-4">
                        <CardHeader>
                             <CardTitle className="text-blue-800 dark:text-blue-300">高得点 - 授業審査へ</CardTitle>
                             <CardDescription>この受験者は80点以上を獲得しました。授業審査の希望日時と場所を入力してください。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="schoolName">校舎名</Label>
                                        <Input id="schoolName" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="例: 名古屋本部校" className="bg-white" />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="date1">第一希望日時</Label>
                                        <div className="flex gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white", !date1 && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date1 ? format(date1, "PPP", { locale: ja }) : <span>日付を選択</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar mode="single" selected={date1} onSelect={setDate1} initialFocus disabled={{ before: new Date() }}/>
                                                </PopoverContent>
                                            </Popover>
                                            <Input type="time" value={time1} onChange={e => setTime1(e.target.value)} className="w-32 bg-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="classroomName">教室名</Label>
                                        <Input id="classroomName" value={classroomName} onChange={e => setClassroomName(e.target.value)} placeholder="例: 301教室" className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date2">第二希望日時 (任意)</Label>
                                        <div className="flex gap-2">
                                             <Popover>
                                                <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white", !date2 && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date2 ? format(date2, "PPP", { locale: ja }) : <span>日付を選択</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar mode="single" selected={date2} onSelect={setDate2} disabled={{ before: new Date() }} />
                                                </PopoverContent>
                                            </Popover>
                                            <Input type="time" value={time2} onChange={e => setTime2(e.target.value)} className="w-32 bg-white"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isPersonnelOfficeView && !isLessonReview && exam && finalOutcome === 'Passed' && exam.type === 'WrittenAndInterview' && (
                     <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 mt-4">
                        <CardHeader>
                             <CardTitle className="text-green-800 dark:text-green-300">合格 - 授業審査へ</CardTitle>
                             <CardDescription>この受験者は筆記試験に合格しました。次のステップに進んでください。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {exam.lessonReviewType === 'UrlSubmission' ? (
                                <p>この試験は「YouTube URL提出」形式です。このまま承認すると、受験者はトップページから動画URLを提出できるようになります。</p>
                            ) : (
                               submission.lessonReviewDate1 ? (
                                 <div className="space-y-2">
                                   <Label>本部担当者が入力した希望日時・場所</Label>
                                    <div className="text-sm space-y-1">
                                      <p><strong>第一希望:</strong> {format(submission.lessonReviewDate1.toDate(), "PPP HH:mm", { locale: ja })}</p>
                                      {submission.lessonReviewDate2 && <p><strong>第二希望:</strong> {format(submission.lessonReviewDate2.toDate(), "PPP HH:mm", { locale: ja })}</p>}
                                      {submission.lessonReviewSchoolName && <p><strong>校舎名:</strong> {submission.lessonReviewSchoolName}</p>}
                                      {submission.lessonReviewClassroomName && <p><strong>教室名:</strong> {submission.lessonReviewClassroomName}</p>}
                                    </div>
                                 </div>
                               ) : (
                                <p className="text-destructive">本部担当者によって希望日時が入力されていません。本部担当者に確認してください。</p>
                               )
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="w-full space-y-2">
                        <Label htmlFor="overall-feedback">
                            {isPersonnelOfficeView ? "人事室からの特記事項 (最終承認)" : "特記事項"}
                        </Label>
                        <Textarea 
                            id="overall-feedback" 
                            placeholder="この提出物に関する特記事項を記入してください..." 
                            value={overallFeedback}
                            onChange={(e) => setOverallFeedback(e.target.value)}
                        />
                    </div>
                     <div className="w-full space-y-2">
                        <Label htmlFor="reviewer-name">
                           {isPersonnelOfficeView ? "承認者名" : "採点者名"}
                        </Label>
                        <Input 
                            id="reviewer-name" 
                            placeholder="採点者の氏名を入力してください"
                            value={reviewerName}
                            onChange={(e) => setReviewerName(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className="flex justify-end w-full">
                <Button onClick={handleSubmitReview} disabled={isSubmitting || isActionDisabled} size="lg">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check />}
                    {isSubmitting ? "送信中..." : isPersonnelOfficeView ? "最終承認して完了" : "レビューを送信"}
                </Button>
            </div>
        </fieldset>
      </CardFooter>
    </Card>
  );
}

    