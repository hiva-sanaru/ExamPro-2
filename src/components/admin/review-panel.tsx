
"use client";

import { useState, useMemo, useEffect } from "react";
import { formatInTimeZone } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import { gradeAnswer } from "@/ai/flows/grade-answer";
import { useToast } from "@/hooks/use-toast";
import type { Exam, Submission, Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Wand2, User, Check, GitCommitHorizontal, Loader2, Calendar as CalendarIcon, Shield, Building, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { format, setHours, setMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { updateSubmission } from "@/services/submissionService";
import { useRouter } from "next/navigation";


interface ReviewPanelProps {
  exam: Exam;
  submission: Submission;
  reviewerRole: "本部" | "人事室";
}

interface GradingResult {
  questionId: string;
  score: number;
  justification: string;
  isLoading: boolean;
}

interface ManualScore {
    [questionId: string]: number;
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = ['00', '15', '30', '45'];

export function ReviewPanel({ exam, submission, reviewerRole }: ReviewPanelProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [manualScores, setManualScores] = useState<ManualScore>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  
  const [lessonReviewDate1, setLessonReviewDate1] = useState<Date | undefined>(submission.lessonReviewDate1);
  const [lessonReviewEndDate1, setLessonReviewEndDate1] = useState<Date | undefined>(submission.lessonReviewEndDate1);
  const [lessonReviewDate2, setLessonReviewDate2] = useState<Date | undefined>(submission.lessonReviewDate2);
  const [lessonReviewEndDate2, setLessonReviewEndDate2] = useState<Date | undefined>(submission.lessonReviewEndDate2);

  const [finalScore, setFinalScore] = useState<number | undefined>(submission.finalScore);

  const isPersonnelOfficeView = reviewerRole === "人事室";

  const totalScore = useMemo(() => {
    return Object.values(manualScores).reduce((acc, score) => acc + (score || 0), 0);
  }, [manualScores]);
  
  const [finalOutcome, setFinalOutcome] = useState<'Passed' | 'Failed' | undefined>(submission.finalOutcome);

  useEffect(() => {
    // Set initial outcome based on score if it's not already set
    if (finalOutcome === undefined && isPersonnelOfficeView) {
      const threshold = 80;
      const score = finalScore ?? totalScore;
      setFinalOutcome(score >= threshold ? 'Passed' : 'Failed');
    }
  }, [totalScore, finalScore, finalOutcome, isPersonnelOfficeView]);

  useEffect(() => {
    // Initialize scores and feedback based on role and existing data
    if (reviewerRole === "人事室" && submission.hqGrade) {
        setManualScores(submission.poGrade?.scores || submission.hqGrade.scores || {});
        setOverallFeedback(submission.poGrade?.justification || '');
        setFinalScore(submission.finalScore ?? submission.hqGrade.score);
        setFinalOutcome(submission.finalOutcome)
    } else {
        setManualScores(submission.hqGrade?.scores || {});
        setOverallFeedback(submission.hqGrade?.justification || '');
    }
  }, [submission, reviewerRole]);


  const handleManualScoreChange = (questionId: string, score: string) => {
    const newScore = Number(score);
    const question = exam.questions.find(q => q.id === questionId);
    if (!question || newScore > question.points) return;
    setManualScores(prev => ({...prev, [questionId]: newScore}));
  }

  const getAnswerForQuestion = (questionId: string) => {
    const answer = submission.answers.find((a) => a.questionId === questionId);
    if (!answer) return "－";
    if (Array.isArray(answer.value)) {
        return answer.value;
    }
    return answer.value || "－";
  };
  
  const handleGradeAllQuestions = async () => {
    if (reviewerRole === "人事室") return;
    setIsBulkGrading(true);
    toast({ title: "全問題のAI採点を開始しました...", description: "完了まで数秒お待ちください。" });

    const gradingPromises = exam.questions.map(question => {
        const answerValue = getAnswerForQuestion(question.id!);
        const answerTexts = Array.isArray(answerValue) ? answerValue.filter(t => t.trim() !== '') : [answerValue.toString()];

        if (answerTexts.length === 0 || answerTexts[0] === "－" || !question.modelAnswer) {
            return Promise.resolve({ questionId: question.id, error: "回答または模範解答がありません" });
        }
        
        const modelAnswers = Array.isArray(question.modelAnswer) ? question.modelAnswer : [question.modelAnswer];

        return gradeAnswer({
            questionText: question.text,
            modelAnswers: modelAnswers.filter(t => t.trim() !== ''),
            answerTexts: answerTexts,
            points: question.points,
        }).then(result => ({ questionId: question.id!, ...result }))
          .catch(error => ({ questionId: question.id!, error: error.message }));
    });

    const results = await Promise.all(gradingPromises);
    
    const newGradingResults: GradingResult[] = [];
    const newManualScores: ManualScore = { ...manualScores };
    
    results.forEach(result => {
        if ('error' in result) {
            console.error(`AI採点エラー (Q${result.questionId}):`, result.error);
        } else {
            newGradingResults.push({
                questionId: result.questionId,
                score: result.score,
                justification: result.justification,
                isLoading: false,
            });
            newManualScores[result.questionId] = result.score;
        }
    });
    
    setGradingResults(newGradingResults);
    setManualScores(newManualScores);

    setIsBulkGrading(false);
    toast({ title: "AI一括採点が完了しました！", description: "各問題のスコアと評価を確認してください。" });
  }

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    
    // This should be replaced with actual logged-in user data
    const mockReviewerName = reviewerRole === '本部' ? '山田 花子' : 'システム管理者';

    let dataToUpdate: Partial<Submission> = {};
    let newStatus: Submission['status'] = submission.status;

    if (reviewerRole === '本部') {
        dataToUpdate.hqGrade = {
            score: totalScore,
            justification: overallFeedback,
            reviewer: mockReviewerName,
            scores: manualScores
        };
        newStatus = "人事確認中";
    } else { // Personnel Office
        dataToUpdate.poGrade = {
            score: totalScore,
            justification: overallFeedback,
            reviewer: mockReviewerName,
            scores: manualScores
        };
        dataToUpdate.finalScore = totalScore;
        dataToUpdate.finalOutcome = finalOutcome;
        newStatus = finalOutcome === 'Passed' ? '合格' : '不合格';
    }
    
    if (finalOutcome === 'Passed' && exam.type === 'WrittenAndInterview') {
        dataToUpdate.lessonReviewDate1 = lessonReviewDate1;
        dataToUpdate.lessonReviewEndDate1 = lessonReviewEndDate1;
        dataToUpdate.lessonReviewDate2 = lessonReviewDate2;
        dataToUpdate.lessonReviewEndDate2 = lessonReviewEndDate2;
    }
    
    dataToUpdate.status = newStatus;

    try {
        await updateSubmission(submission.id, dataToUpdate);
        toast({ title: `${reviewerRole}のレビューが正常に送信されました！` });
        router.push('/admin/review');
    } catch(error) {
        console.error("Failed to submit review:", error);
        toast({ title: "送信エラー", description: "レビューの送信中にエラーが発生しました。", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleTimeChange = (
    date: Date | undefined, 
    setDate: (d: Date | undefined) => void,
    type: 'hour' | 'minute', 
    value: string
  ) => {
      if (!date) return;
      const newDate = type === 'hour' 
          ? setHours(date, parseInt(value))
          : setMinutes(date, parseInt(value));
      setDate(newDate);
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
            {!isPersonnelOfficeView && (
                <Button onClick={handleGradeAllQuestions} disabled={isBulkGrading}>
                    {isBulkGrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isBulkGrading ? "採点中..." : "AIで一括採点"}
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isPersonnelOfficeView && submission.hqGrade && (
            <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-green-800 dark:text-green-300"><Building className="w-5 h-5" />本部採点結果</CardTitle>
                    <CardDescription>
                        本部担当者 ({submission.hqGrade.reviewer}) による採点結果です。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span>当初の合計スコア:</span>
                        <span>{submission.hqGrade.score} / {exam.totalPoints}</span>
                    </div>
                     <div className="space-y-1 pt-2">
                        <Label>当初の全体フィードバック</Label>
                        <p className="text-sm p-2 bg-background rounded-md">{submission.hqGrade.justification || "フィードバックはありません。"}</p>
                    </div>
                </CardContent>
            </Card>
        )}

        {exam.questions.map((question, index) => {
          const result = gradingResults.find((r) => r.questionId === question.id);
          const hqScore = submission.hqGrade?.scores?.[question.id!];
          const answerValue = getAnswerForQuestion(question.id!);
          const answerDisplay = Array.isArray(answerValue) ? answerValue.map((a, i) => `(${i+1}) ${a}`).join('\n') : answerValue.toString();

          return (
            <Card key={question.id} className="overflow-hidden">
                <CardHeader className="bg-primary/90 text-primary-foreground p-4">
                    <div className="flex justify-between w-full items-center">
                        <CardTitle className="text-lg font-semibold text-left text-primary-foreground">問題 {index + 1}: {question.text} ({question.points}点)</CardTitle>
                        <div className="flex items-center gap-2">
                            {manualScores[question.id!] !== undefined && <Badge variant="secondary">{manualScores[question.id!]}点</Badge>}
                            {result && !result.isLoading && <Badge variant="secondary">AI採点済み</Badge>}
                            {isBulkGrading && <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" />受験者の回答</Label>
                            <p className="p-3 rounded-md bg-muted text-sm min-h-[100px] whitespace-pre-wrap">{answerDisplay}</p>
                        </div>
                         <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Bot className="w-4 h-4 text-muted-foreground" />AI採点</Label>
                            {result && !result.isLoading ? (
                                <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2 text-sm min-h-[100px]">
                                    <p><strong>スコア:</strong> {result.score}/{question.points}</p>
                                    <p><strong>根拠:</strong> {result.justification}</p>
                                </div>
                            ) : (
                                <div className="p-3 rounded-md bg-muted/50 border border-dashed flex items-center justify-center min-h-[100px]">
                                    <p className="text-sm text-muted-foreground">{isPersonnelOfficeView ? "必要に応じて、下のスコアを直接修正してください。" : "「AIで一括採点」ボタンを押してください"}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor={`score-${question.id}`}>{isPersonnelOfficeView ? "最終スコア" : "あなたの評価"}</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                id={`score-${question.id}`} 
                                type="number" 
                                placeholder="スコア" 
                                className="w-24" 
                                max={question.points}
                                min={0}
                                value={manualScores[question.id!] || ''}
                                onChange={(e) => handleManualScoreChange(question.id!, e.target.value)}
                            />
                            <span className="text-muted-foreground">/ {question.points} 点</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
          );
        })}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-headline">最終評価</h3>
                <div className="text-2xl font-bold">
                    合計スコア: {totalScore} / {exam.totalPoints}
                </div>
            </div>

            {isPersonnelOfficeView && (
              <div className="space-y-4 my-4">
                <Label>最終的な合否</Label>
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

            {finalOutcome === 'Passed' && exam.type === 'WrittenAndInterview' && (
                 <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 mt-4">
                    <CardHeader>
                         <CardTitle className="text-green-800 dark:text-green-300">合格 - 授業審査へ</CardTitle>
                         <CardDescription>この試験は筆記と授業審査の両方が対象です。授業審査の希望日時と時間を選択してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* --- First Choice --- */}
                        <div className="space-y-2">
                            <Label>第一希望日時</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:items-end">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("justify-start text-left font-normal", !lessonReviewDate1 && "text-muted-foreground")}
                                            disabled={isPersonnelOfficeView}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {lessonReviewDate1 ? format(lessonReviewDate1, "PPP", { locale: ja }) : <span>日付を選択</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={lessonReviewDate1} onSelect={setLessonReviewDate1} initialFocus /></PopoverContent>
                                </Popover>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">開始</Label>
                                        <div className="flex gap-1">
                                            <Select onValueChange={(val) => handleTimeChange(lessonReviewDate1, setLessonReviewDate1, 'hour', val)} value={lessonReviewDate1?.getHours().toString().padStart(2, '0')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Select onValueChange={(val) => handleTimeChange(lessonReviewDate1, setLessonReviewDate1, 'minute', val)} value={lessonReviewDate1?.getMinutes().toString().padStart(2, '0')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">終了</Label>
                                        <div className="flex gap-1">
                                             <Select onValueChange={(val) => handleTimeChange(lessonReviewEndDate1, setLessonReviewEndDate1, 'hour', val)} value={lessonReviewEndDate1?.getHours().toString().padStart(2, '0')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Select onValueChange={(val) => handleTimeChange(lessonReviewEndDate1, setLessonReviewEndDate1, 'minute', val)} value={lessonReviewEndDate1?.getMinutes().toString().padStart(2, '0')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- Second Choice --- */}
                        <div className="space-y-2">
                            <Label>第二希望日時</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:items-end">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("justify-start text-left font-normal", !lessonReviewDate2 && "text-muted-foreground")}
                                            disabled={isPersonnelOfficeView}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {lessonReviewDate2 ? format(lessonReviewDate2, "PPP", { locale: ja }) : <span>日付を選択</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={lessonReviewDate2} onSelect={setLessonReviewDate2} initialFocus /></PopoverContent>
                                </Popover>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">開始</Label>
                                        <div className="flex gap-1">
                                            <Select onValueChange={(val) => handleTimeChange(lessonReviewDate2, setLessonReviewDate2, 'hour', val)} value={lessonReviewDate2?.getHours().toString().padStart(2, '0')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Select onValueChange={(val) => handleTimeChange(lessonReviewDate2, setLessonReviewDate2, 'minute', val)} value={lessonReviewDate2?.getMinutes().toString().padStart(2, '0')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">終了</Label>
                                        <div className="flex gap-1">
                                             <Select onValueChange={(val) => handleTimeChange(lessonReviewEndDate2, setLessonReviewEndDate2, 'hour', val)} value={lessonReviewEndDate2?.getHours().toString().padStart(2, '0 }^{\prime')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Select onValueChange={(val) => handleTimeChange(lessonReviewEndDate2, setLessonReviewEndDate2, 'minute', val)} value={lessonReviewEndDate2?.getMinutes().toString().padStart(2, '0')} disabled={isPersonnelOfficeView}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            )}

            <div className="w-full space-y-2 mt-4">
                <Label htmlFor="overall-feedback">
                    {isPersonnelOfficeView ? "人事室フィードバック (最終承認)" : "全体的なフィードバック"}
                </Label>
                <Textarea 
                    id="overall-feedback" 
                    placeholder="この提出物に関する最終コメントを記入してください..." 
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                />
            </div>
        </div>
        <div className="flex justify-end w-full">
            <Button onClick={handleSubmitReview} disabled={isSubmitting} size="lg">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check />}
                {isSubmitting ? "送信中..." : isPersonnelOfficeView ? "最終承認して完了" : "レビューを送信"}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

    