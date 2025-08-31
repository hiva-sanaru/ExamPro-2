
"use client";

import * as React from "react";
import type { Question, Answer } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ArrowRight, BookCheck } from "lucide-react";
import { Button } from "../ui/button";

interface QuestionCardProps {
    question: Question;
    index: number;
    answer: Answer | undefined;
    onAnswerChange: (questionId: string, value: string | string[] | Answer[]) => void;
    isLastQuestion: boolean;
    onNext: () => void;
    onReview: () => void;
}

const renderFillInTheBlankInputs = (
  text: string,
  value: string[],
  onChange: (index: number, value: string) => void
) => {
  const blankCount = (text.match(/___/g) || []).length;
  if (blankCount === 0) return null;

  return (
    <div className="space-y-3">
        {Array.from({ length: blankCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
                <Label htmlFor={`blank-${i}`} className="w-12 text-center text-muted-foreground">({i + 1})</Label>
                <Input 
                    id={`blank-${i}`}
                    value={value[i] || ''}
                    onChange={(e) => onChange(i, e.target.value)}
                    placeholder={`空欄 ${i + 1} の答え`}
                />
            </div>
        ))}
    </div>
  );
};


export const QuestionCard = ({ question, index, answer, onAnswerChange, isLastQuestion, onNext, onReview }: QuestionCardProps) => {
    
    const handleSubAnswerChange = (subQuestionId: string, value: string) => {
        const currentSubAnswers = answer?.subAnswers || [];
        const existingAnswerIndex = currentSubAnswers.findIndex(a => a.questionId === subQuestionId);

        let newSubAnswers;
        if (existingAnswerIndex > -1) {
            newSubAnswers = currentSubAnswers.map((a, i) => 
                i === existingAnswerIndex ? { ...a, value } : a
            );
        } else {
            newSubAnswers = [...currentSubAnswers, { questionId: subQuestionId, value, subAnswers: [] }];
        }
        onAnswerChange(question.id!, newSubAnswers);
    }

    const getSubAnswerValue = (subQuestionId: string) => {
        return answer?.subAnswers?.find(a => a.questionId === subQuestionId)?.value || '';
    }

    const handleFillInTheBlankChange = (index: number, value: string) => {
        const newValues = Array.isArray(answer?.value) ? [...answer.value] : [];
        newValues[index] = value;
        onAnswerChange(question.id!, newValues);
    };

    const handleDescriptiveChange = (index: number, value: string) => {
        const newValues = Array.isArray(answer?.value) ? [...answer.value] : [];
        newValues[index] = value;
        onAnswerChange(question.id!, newValues);
    };
    
    const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
    const isMultiDescriptive = question.type === 'descriptive' && (question.numberOfAnswers || 1) > 1;

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="font-headline text-xl">問題 {index + 1}</CardTitle>
                    <p className="text-muted-foreground">{question.points} 点</p>
                </div>
                {question.timeLimit && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold">制限時間: {Math.floor(question.timeLimit / 60)}分</span>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                 <div className="text-lg whitespace-pre-wrap">{question.text}</div>
                
                {!hasSubQuestions && (
                    <div className="space-y-4 mt-4">
                        {question.type === 'descriptive' && !isMultiDescriptive && (
                            <Textarea 
                                placeholder="あなたの答え..." 
                                rows={8}
                                value={typeof answer?.value === 'string' ? answer.value : ''}
                                onChange={(e) => onAnswerChange(question.id!, e.target.value)}
                            />
                        )}
                        {isMultiDescriptive && (
                            <div className="space-y-4">
                                {Array.from({ length: question.numberOfAnswers! }).map((_, i) => (
                                    <div key={i}>
                                        <Label htmlFor={`answer-${question.id}-${i}`}>解答 {i + 1}</Label>
                                        <Textarea
                                            id={`answer-${question.id}-${i}`}
                                            placeholder={`答え ${i + 1} を入力...`}
                                            rows={3}
                                            value={Array.isArray(answer?.value) ? (answer.value[i] || '') : ''}
                                            onChange={(e) => handleDescriptiveChange(i, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        {question.type === 'fill-in-the-blank' && (
                           renderFillInTheBlankInputs(question.text, Array.isArray(answer?.value) ? answer.value : [], handleFillInTheBlankChange)
                        )}
                        {question.type === 'selection' && question.options && (
                            <RadioGroup value={typeof answer?.value === 'string' ? answer.value : ''} onValueChange={(value) => onAnswerChange(question.id!, value)}>
                                {question.options.map((option, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                                        <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}
                    </div>
                )}


                {hasSubQuestions && (
                    <div className="space-y-4 border-l-2 border-primary/20 pl-4 ml-2">
                        {question.subQuestions?.map((subQ, subIndex) => (
                             <div key={subQ.id}>
                                <p className="font-medium">({subIndex + 1}) {subQ.text} ({subQ.points} 点)</p>
                                 <Textarea 
                                    rows={3}
                                    className="mt-2"
                                    value={getSubAnswerValue(subQ.id!)}
                                    onChange={(e) => handleSubAnswerChange(subQ.id!, e.target.value)}
                                    placeholder="答えを入力..."
                                />
                             </div>
                        ))}
                    </div>
                )}
            </CardContent>
             <CardFooter className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">問題タイプ: {question.type === 'descriptive' ? '記述式' : question.type === 'fill-in-the-blank' ? '穴埋め' : '選択式'}</p>
                <div className="flex justify-end">
                    {!isLastQuestion ? (
                        <Button onClick={onNext} size="lg">
                            次の問題へ
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={onReview} size="lg" className="bg-accent hover:bg-accent/90">
                            確認して提出
                            <BookCheck className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    )
}

    