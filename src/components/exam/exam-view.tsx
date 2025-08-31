
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Exam, Answer } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "../ui/carousel";
import { Loader2 } from "lucide-react";
import { ExamHeader } from "./exam-header";
import { QuestionCard } from "./question-card";
import { useToast } from "@/hooks/use-toast";

interface ExamViewProps {
  exam: Exam | null;
}

const isSubAnswerArray = (value: any): value is Answer[] => {
    return Array.isArray(value) && (value.length === 0 || (value[0] && typeof value[0].questionId !== 'undefined'));
}

export function ExamView({ exam }: ExamViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize questions to ensure each has a stable ID
  const questions = useMemo(() => {
    if (!exam) return [] as Exam["questions"];
    return exam.questions.map((q, qi) => ({
      ...q,
      id: q.id ?? `q-${qi}`,
      subQuestions: q.subQuestions?.map((sq, si) => ({
        ...sq,
        id: sq.id ?? `q-${qi}-s-${si}`,
      })),
    }));
  }, [exam]);

  // Overall exam timer
  const [examTimeLeft, setExamTimeLeft] = useState(exam?.duration ? exam.duration * 60 : 0);

  // Per-question timer
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [questionEndTime, setQuestionEndTime] = useState<number | null>(null);

  // Load answers and initialize timer from localStorage on mount
  useEffect(() => {
    if (!exam) return;
    try {
        const savedAnswers = localStorage.getItem(`exam-${exam.id}-answers`);
        if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers));
        }

        const examEndTime = localStorage.getItem(`exam-${exam.id}-endTime`);
        const now = Date.now();
        if (examEndTime) {
            const endTime = parseInt(examEndTime, 10);
            const remaining = Math.floor((endTime - now) / 1000);
            if (remaining > 0) {
                setExamTimeLeft(remaining);
            } else {
                // If time expired while window was closed, set to 0 and let other effects handle it.
                setExamTimeLeft(0);
            }
        } else {
            const newEndTime = now + exam.duration * 60 * 1000;
            localStorage.setItem(`exam-${exam.id}-endTime`, newEndTime.toString());
            setExamTimeLeft(exam.duration * 60);
        }

    } catch (error) {
        console.error("Failed to parse state from localStorage", error);
        // Clear broken data
        localStorage.removeItem(`exam-${exam.id}-answers`);
        localStorage.removeItem(`exam-${exam.id}-endTime`);
    } finally {
        setIsLoading(false);
    }
  }, [exam]);
  
  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (!exam || isLoading) return;
    localStorage.setItem(`exam-${exam.id}-answers`, JSON.stringify(answers));
  }, [answers, exam, isLoading]);

  const handleNext = useCallback(() => {
    if (api) {
        api.scrollNext();
    }
  }, [api])

  const handleReview = useCallback(() => {
    if (!exam) return;
    router.push(`/exam/${exam.id}/review`);
  }, [exam, router]);

  useEffect(() => {
    if (!api) return
    
    const newCount = api.scrollSnapList().length;
    setCount(newCount);
    setCurrent(api.selectedScrollSnap() + 1)

    const onSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      setCurrent(selectedIndex + 1)
    }

    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    }
  }, [api])

  useEffect(() => {
    if (count === 0) return;
    const answeredCount = answers.filter(a => {
        if (Array.isArray(a.subAnswers) && a.subAnswers.length > 0) {
            return a.subAnswers.some(sa => sa.value && sa.value.toString().trim() !== '');
        }
        if (Array.isArray(a.value)) {
            return a.value.some(v => v && v.trim() !== '');
        }
        return a.value && a.value.toString().trim() !== '';
    }).length;
    setProgress((answeredCount / count) * 100);
  }, [answers, count]);

  const handleAnswerChange = (questionId: string, value: string | string[] | Answer[]) => {
    setAnswers((prev) => {
        const newAnswers = [...prev];
        const existingAnswerIndex = newAnswers.findIndex((a) => a.questionId === questionId);

        if (existingAnswerIndex > -1) {
            const existingAnswer = { ...newAnswers[existingAnswerIndex] };
            if (isSubAnswerArray(value)) {
                existingAnswer.subAnswers = value;
            } else {
                existingAnswer.value = value;
            }
            newAnswers[existingAnswerIndex] = existingAnswer;
        } else {
            if (isSubAnswerArray(value)) {
                newAnswers.push({ questionId, value: '', subAnswers: value });
            } else {
                newAnswers.push({ questionId, value: value as string | string[], subAnswers: [] });
            }
        }
        return newAnswers;
    });
};

  
  const handleTimeUp = useCallback(() => {
    // Time is up for the whole exam, force review and submission
    toast({
        title: "時間切れ！",
        description: "試験時間が終了しました。回答の確認ページに移動します。",
        variant: "destructive"
    });
    handleReview();
  }, [handleReview, toast]);

  // Exam-wide countdown timer logic
  useEffect(() => {
    if (isLoading) return; // Don't start timer until everything is loaded

    const timer = setInterval(() => {
      setExamTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  // Effect to handle time up action
  useEffect(() => {
    if (examTimeLeft === 0 && !isLoading) {
      handleTimeUp();
    }
  }, [examTimeLeft, isLoading, handleTimeUp]);

  // Per-question countdown timer logic
  useEffect(() => {
    if (isLoading || current <= 0 || !exam) return;
    const qIndex = current - 1;
    if (qIndex >= questions.length) return;
    
    const question = questions[qIndex];
    if (!question || !question.timeLimit) {
      setQuestionEndTime(null);
      setQuestionTimeLeft(null);
      return;
    }
    const key = `exam-${exam.id}-question-${question.id}-endTime`;
    try {
      const stored = localStorage.getItem(key);
      const now = Date.now();
      let endTime: number;
      if (stored) {
        const parsed = parseInt(stored, 10);
        const remaining = Math.floor((parsed - now) / 1000);
        if (remaining > 0) {
          endTime = parsed;
        } else {
          endTime = now + question.timeLimit * 1000;
          localStorage.setItem(key, endTime.toString());
        }
      } else {
        endTime = now + question.timeLimit * 1000;
        localStorage.setItem(key, endTime.toString());
      }
      setQuestionEndTime(endTime);
    } catch (error) {
      console.error("Failed to parse question end time from localStorage", error);
      localStorage.removeItem(key);
      const newEndTime = Date.now() + question.timeLimit * 1000;
      localStorage.setItem(key, newEndTime.toString());
      setQuestionEndTime(newEndTime);
    }
  }, [current, isLoading, exam, questions]);

  useEffect(() => {
    if (isLoading || questionEndTime == null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((questionEndTime - Date.now()) / 1000));
      setQuestionTimeLeft(remaining);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [questionEndTime, isLoading]);

  const handleQuestionTimeUp = useCallback(() => {
    toast({
      title: "時間切れ！",
      description: "この小問の制限時間が終了しました。次の問題に移動します。",
      variant: "destructive",
    });
    handleNext();
  }, [toast, handleNext]);

  useEffect(() => {
    if (questionTimeLeft === 0 && !isLoading && questionEndTime != null) {
      handleQuestionTimeUp();
    }
  }, [questionTimeLeft, isLoading, questionEndTime, handleQuestionTimeUp]);


  if (isLoading || !exam) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
      <ExamHeader
        title={exam.title}
        timeLeft={examTimeLeft}
        questionTimeLeft={questionTimeLeft}
      />
      <div className="container mx-auto max-w-4xl py-8">
        <div className="space-y-6">
            <div>
                <Progress value={progress} className="h-2" />
                <p className="text-right text-sm text-muted-foreground mt-2">
                    {count > 0 ? `${count} 問中 ${current} 問目` : ''}
                </p>
            </div>
          
            <Carousel setApi={setApi} className="w-full" opts={{
                watchDrag: false,
                watchKeys: false,
            }}>
                <CarouselContent>
                    {questions.map((question, index) => (
                        <CarouselItem key={question.id}>
                            <QuestionCard 
                                question={question}
                                index={index}
                                isLastQuestion={index === count - 1}
                                answer={answers.find(a => a.questionId === question.id)}
                                onAnswerChange={handleAnswerChange}
                                onNext={handleNext}
                                onReview={handleReview}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>
      </div>
    </>
  );
}
