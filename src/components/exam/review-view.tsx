
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Exam, Answer, ExamineeInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { addSubmission } from "@/services/submissionService";

interface ReviewViewProps {
  exam: Exam;
}

export function ReviewView({ exam }: ReviewViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [examineeInfo, setExamineeInfo] = useState<ExamineeInfo | null>(null);

  useEffect(() => {
    const savedAnswers = localStorage.getItem(`exam-${exam.id}-answers`);
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
    
    const savedExamineeInfo = localStorage.getItem(`exam-examinee-info`);
    if (savedExamineeInfo) {
      setExamineeInfo(JSON.parse(savedExamineeInfo));
    } else {
        // This case should be handled by the page layout, but as a fallback:
        toast({
            title: "エラー",
            description: "受験者情報が見つかりません。最初のページからやり直してください。",
            variant: "destructive"
        });
        router.push('/');
    }
  }, [exam.id, router, toast]);

  const getAnswerForQuestion = (questionId: string): string => {
    const answer = answers.find(a => a.questionId === questionId);
    if (!answer) return "回答がありません。";
    
    if (answer.subAnswers && answer.subAnswers.length > 0) {
        return answer.subAnswers.map((sa, index) => 
            `(${index + 1}) ${sa.value || '未回答'}`
        ).join('\n');
    }

    if (Array.isArray(answer.value)) {
        if (answer.value.length === 0 || answer.value.every(v => v === '')) {
            return "回答がありません。";
        }
        return answer.value.map((v, i) => `(${i + 1}) ${v || '未回答'}`).join(' ');
    }

    if (typeof answer.value === 'string' && answer.value.trim()) {
        return answer.value;
    }

    return "回答がありません。";
  }

  const handleSubmit = async () => {
    if (!examineeInfo) {
        toast({
            title: "エラー",
            description: "受験者情報が見つかりません。最初のページからやり直してください。",
            variant: "destructive"
        });
        return;
    }
    setIsLoading(true);
    try {
        await addSubmission({
            examId: exam.id,
            examineeId: examineeInfo.employeeId,
            examineeName: examineeInfo.name,
            examineeHeadquarters: examineeInfo.headquarters,
            answers: answers,
        });

        toast({
            title: "提出完了！",
            description: "試験が採点のために提出されました。",
            variant: "default",
        });
        localStorage.removeItem(`exam-${exam.id}-answers`);
        localStorage.removeItem(`exam-examinee-info`);
        localStorage.removeItem(`exam-${exam.id}-endTime`);
        exam.questions.forEach(q => {
          if (q.id) {
            localStorage.removeItem(`exam-${exam.id}-question-${q.id}-endTime`);
          }
        });

        router.push("/"); // Redirect to portal home after submission
    } catch (error) {
        console.error("Failed to submit exam:", error);
        toast({
            title: "提出エラー",
            description: "試験の提出中にエラーが発生しました。",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{exam.title}</CardTitle>
          <CardDescription>各質問への回答を確認してください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {exam.questions.map((question, index) => (
            <div key={question.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="font-semibold text-card-foreground">問題 {index + 1}: {question.text}</p>
              {question.subQuestions && question.subQuestions.length > 0 ? (
                 <div className="mt-2 space-y-2">
                    {question.subQuestions.map((subQ, subIndex) => (
                        <div key={subQ.id}>
                            <p className="font-medium text-sm text-muted-foreground">({subIndex + 1}) {subQ.text}</p>
                            <p className="mt-1 text-card-foreground whitespace-pre-wrap bg-muted p-2 rounded-md text-sm">
                                {answers.find(a => a.questionId === question.id)?.subAnswers?.find(sa => sa.questionId === subQ.id)?.value || "回答がありません。"}
                            </p>
                        </div>
                    ))}
                 </div>
              ) : (
                <p className="mt-2 text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {getAnswerForQuestion(question.id!)}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-8">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻って編集
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} size="lg">
          {isLoading ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {isLoading ? "提出中..." : "最終回答を提出"}
        </Button>
      </div>
    </div>
  );
}
