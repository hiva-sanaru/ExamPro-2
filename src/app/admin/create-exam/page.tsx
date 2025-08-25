
"use client";

import { useState, useEffect, useCallback, Suspense, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Loader2, Save, CornerDownLeft } from 'lucide-react';
import type { Question, Exam } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addExam, getExam, updateExam } from '@/services/examService';
import { v4 as uuidv4 } from 'uuid';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


function CreateExamPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [examId, setExamId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<Exam['status']>('Draft');
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = searchParams.get('examId');
    if (id) {
      setExamId(id);
      const fetchExamData = async () => {
        try {
          const examData = await getExam(id);
          if (examData) {
            setTitle(examData.title);
            setDuration(examData.duration);
            setStatus(examData.status);
            // Ensure questions have unique IDs for the form key
            const questionsWithIds = examData.questions.map(q => ({...q, id: q.id || uuidv4()}));
            setQuestions(questionsWithIds);
          } else {
            toast({ title: "エラー", description: "試験が見つかりませんでした。", variant: "destructive" });
            router.push('/admin/dashboard');
          }
        } catch (error) {
          console.error("Failed to fetch exam", error);
          toast({ title: "エラー", description: "試験データの読み込みに失敗しました。", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchExamData();
    } else {
      setIsLoading(false);
    }
  }, [searchParams, router, toast]);

  const handleAddQuestion = (index?: number) => {
    const newQuestion: Partial<Question> = { id: uuidv4(), text: '', type: 'descriptive', points: 10, timeLimit: 300, modelAnswer: '', options: [], subQuestions: [] };
    const newQuestions = [...questions];
    if (index !== undefined) {
      newQuestions.splice(index, 0, newQuestion);
    } else {
      newQuestions.push(newQuestion);
    }
    setQuestions(newQuestions);
  };
  
  const handleAddSubQuestion = (parentIndex: number) => {
    const newQuestions = [...questions];
    const parentQuestion = newQuestions[parentIndex];
    if (!parentQuestion.subQuestions) {
        parentQuestion.subQuestions = [];
    }
    parentQuestion.subQuestions.push({
        id: uuidv4(),
        text: '',
        type: 'descriptive',
        points: 5,
        modelAnswer: '',
    });
    setQuestions(newQuestions);
  }


  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };
  
  const handleRemoveSubQuestion = (parentIndex: number, subIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[parentIndex].subQuestions?.splice(subIndex, 1);
    setQuestions(newQuestions);
  }

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    const question = newQuestions[index] as Question;

    // Special handling for fill-in-the-blank model answers
    if (field === 'modelAnswer' && question.type === 'fill-in-the-blank' && typeof value === 'object' && value.index !== undefined) {
        const answers = Array.isArray(question.modelAnswer) ? [...question.modelAnswer] : [];
        answers[value.index] = value.value;
        question.modelAnswer = answers;
    } else if (field === 'options') {
        question[field] = value.split('\n');
    } else {
        (question as any)[field] = value;
    }

    // Reset modelAnswer if question type changes
    if (field === 'type') {
      question.modelAnswer = value === 'fill-in-the-blank' ? [] : '';
    }

    setQuestions(newQuestions);
  };
  
  const handleSubQuestionChange = (parentIndex: number, subIndex: number, field: keyof Question, value: any) => {
      const newQuestions = [...questions];
      const subQuestion = newQuestions[parentIndex].subQuestions?.[subIndex] as Question;
      if (subQuestion) {
          (subQuestion as any)[field] = value;
          setQuestions(newQuestions);
      }
  }
  
  const handleSaveExam = async () => {
      if (!title) {
        toast({
            title: "保存エラー",
            description: "試験タイトルは必須です。",
            variant: "destructive"
        });
        return;
      }
      setIsSaving(true);
      const totalPoints = questions.reduce((acc, q) => {
        const mainPoints = q.points || 0;
        const subPoints = q.subQuestions?.reduce((subAcc, subQ) => subAcc + (subQ.points || 0), 0) || 0;
        return acc + mainPoints + subPoints;
    }, 0);
      
      const examData: Partial<Exam> = {
        title,
        duration,
        questions: questions as Question[],
        totalPoints,
        status,
      };

      try {
        if(examId) {
          await updateExam(examId, examData);
          toast({ title: '試験が正常に更新されました！' });
        } else {
          await addExam(examData as Omit<Exam, 'id'>);
          toast({ title: '試験が正常に作成されました！' });
        }
        router.push('/admin/dashboard');
      } catch(error) {
        console.error("Failed to save exam", error);
        toast({ title: "保存エラー", description: "試験の保存中にエラーが発生しました。", variant: "destructive" });
        setIsSaving(false);
      }
  }

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const AddQuestionButton = ({ index }: { index?: number }) => (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-dashed" />
      </div>
      <div className="relative flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-background rounded-full"
          onClick={() => handleAddQuestion(index)}
        >
          <PlusCircle className="h-5 w-5" />
          <span className="sr-only">問題を追加</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">{examId ? '試験を編集' : '新しい試験を作成'}</h1>
        <p className="text-muted-foreground">試験の詳細を入力し、問題を追加してください。</p>
      </div>

      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>試験詳細</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="exam-title">試験タイトル</Label>
                        <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 2024年下期 昇進試験" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="exam-duration">試験時間（分）</Label>
                        <Input id="exam-duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="exam-status">試験ステータス</Label>
                    <Select value={status} onValueChange={(value: Exam['status']) => setStatus(value)}>
                        <SelectTrigger id="exam-status" className="w-[200px]">
                            <SelectValue placeholder="ステータスを選択" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Draft">下書き</SelectItem>
                            <SelectItem value="Published">公開済み</SelectItem>
                            <SelectItem value="Archived">アーカイブ済み</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">「公開済み」に設定すると、受験者が試験を受けられるようになります。</p>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>問題リスト</CardTitle>
                <CardDescription>試験問題を作成・編集します。</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    {questions.length === 0 && <AddQuestionButton index={0} />}
                    {questions.map((q, index) => {
                       const blankCount = q.type === 'fill-in-the-blank' ? (q.text?.match(/___/g) || []).length : 0;
                       return (
                        <Fragment key={q.id || index}>
                            <AccordionItem value={`item-${index}`} className="border bg-muted/30 rounded-md px-4">
                                <div className="flex items-center">
                                    <AccordionTrigger className="flex-1 text-left hover:no-underline">
                                        <span className="font-semibold text-lg">問題 {index + 1}: {q.text?.substring(0, 30) || "新しい問題"}...</span>
                                    </AccordionTrigger>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(index)} className="ml-2">
                                        <Trash2 className="h-5 w-5 text-destructive" />
                                    </Button>
                                </div>
                                <AccordionContent className="pt-4">
                                   <div className="flex-grow space-y-4 pr-4">
                                        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                                            <div className="flex gap-4">
                                                    <div className="w-1/3 space-y-2">
                                                    <Label htmlFor={`q-type-${index}`}>問題タイプ</Label>
                                                    <Select value={q.type} onValueChange={(value) => handleQuestionChange(index, 'type', value)}>
                                                            <SelectTrigger id={`q-type-${index}`}>
                                                                <SelectValue placeholder="タイプを選択" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="descriptive">記述式</SelectItem>
                                                                <SelectItem value="fill-in-the-blank">穴埋め</SelectItem>
                                                                <SelectItem value="selection">選択式</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                </div>
                                                <div className="w-1/3 space-y-2">
                                                    <Label htmlFor={`q-points-${index}`}>配点</Label>
                                                    <Input id={`q-points-${index}`} type="number" value={q.points} onChange={(e) => handleQuestionChange(index, 'points', Number(e.target.value))} placeholder="例: 10" />
                                                </div>
                                                <div className="w-1/3 space-y-2">
                                                    <Label htmlFor={`q-time-${index}`}>制限時間(秒)</Label>
                                                    <Input id={`q-time-${index}`} type="number" value={q.timeLimit} onChange={(e) => handleQuestionChange(index, 'timeLimit', Number(e.target.value))} placeholder="例: 300" />
                                                </div>
                                            </div>
                                        </div>
                                       <div className="space-y-2">
                                           <Label htmlFor={`q-text-${index}`}>問題文 {index + 1}</Label>
                                           <Textarea id={`q-text-${index}`} value={q.text} onChange={(e) => handleQuestionChange(index, 'text', e.target.value)} placeholder={`問題 ${index + 1} の内容を記述...`} />
                                       </div>
                                        {q.type === 'selection' && (
                                          <div className="space-y-2">
                                              <Label htmlFor={`q-options-${index}`}>選択肢 (改行で区切る)</Label>
                                              <Textarea 
                                                  id={`q-options-${index}`} 
                                                  value={Array.isArray(q.options) ? q.options.join('\n') : ''} 
                                                  onChange={(e) => handleQuestionChange(index, 'options', e.target.value)} 
                                                  placeholder={'選択肢A\n選択肢B\n選択肢C'}
                                                  rows={4}
                                              />
                                          </div>
                                        )}
                                        <div className="space-y-2">
                                           <Label>模範解答</Label>
                                           {q.type === 'fill-in-the-blank' ? (
                                             <div className="space-y-2 pl-4 border-l-2">
                                               {Array.from({ length: blankCount }).map((_, i) => (
                                                 <div key={i} className="flex items-center gap-2">
                                                   <Label htmlFor={`q-model-answer-${index}-${i}`} className="w-16">空欄 {i + 1}</Label>
                                                   <Input
                                                     id={`q-model-answer-${index}-${i}`}
                                                     value={Array.isArray(q.modelAnswer) ? (q.modelAnswer[i] || '') : ''}
                                                     onChange={(e) => handleQuestionChange(index, 'modelAnswer', { index: i, value: e.target.value })}
                                                     placeholder={`空欄 ${i + 1} の答え`}
                                                   />
                                                 </div>
                                               ))}
                                               {blankCount === 0 && <p className="text-xs text-muted-foreground">問題文に「___」（アンダースコア3つ）を追加して空欄を作成してください。</p>}
                                             </div>
                                           ) : (
                                             <Textarea id={`q-model-answer-${index}`} value={typeof q.modelAnswer === 'string' ? q.modelAnswer : ''} onChange={(e) => handleQuestionChange(index, 'modelAnswer', e.target.value)} placeholder={`問題 ${index + 1} の模範解答を記述...`} rows={3} />
                                           )}
                                       </div>

                                       {/* Sub Questions */}
                                       {q.subQuestions && q.subQuestions.length > 0 && (
                                           <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                                               <h4 className="font-bold text-md text-muted-foreground pt-2">サブ問題</h4>
                                               {q.subQuestions.map((subQ, subIndex) => (
                                                   <Card key={subQ.id || subIndex} className="p-4 bg-background">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-grow space-y-4 pr-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor={`subq-text-${index}-${subIndex}`}>サブ問題文 {subIndex + 1}</Label>
                                                                    <Textarea id={`subq-text-${index}-${subIndex}`} value={subQ.text} onChange={(e) => handleSubQuestionChange(index, subIndex, 'text', e.target.value)} placeholder={`サブ問題 ${subIndex + 1} の内容...`} />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor={`subq-model-answer-${index}-${subIndex}`}>模範解答</Label>
                                                                    <Textarea id={`subq-model-answer-${index}-${subIndex}`} value={typeof subQ.modelAnswer === 'string' ? subQ.modelAnswer : ''} onChange={(e) => handleSubQuestionChange(index, subIndex, 'modelAnswer', e.target.value)} placeholder={`サブ問題 ${subIndex + 1} の模範解答...`} rows={2} />
                                                                </div>
                                                                <div className="flex gap-4">
                                                                    <div className="w-1/2 space-y-2">
                                                                        <Label htmlFor={`subq-type-${index}-${subIndex}`}>問題タイプ</Label>
                                                                        <Select value={subQ.type} onValueChange={(value) => handleSubQuestionChange(index, subIndex, 'type', value)}>
                                                                            <SelectTrigger id={`subq-type-${index}-${subIndex}`}>
                                                                                <SelectValue placeholder="タイプを選択" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="descriptive">記述式</SelectItem>
                                                                                <SelectItem value="fill-in-the-blank">穴埋め</SelectItem>
                                                                                <SelectItem value="selection">選択式</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="w-1/2 space-y-2">
                                                                        <Label htmlFor={`subq-points-${index}-${subIndex}`}>配点</Label>
                                                                        <Input id={`subq-points-${index}-${subIndex}`} type="number" value={subQ.points} onChange={(e) => handleSubQuestionChange(index, subIndex, 'points', Number(e.target.value))} placeholder="例: 5" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSubQuestion(index, subIndex)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </Card>
                                               ))}
                                           </div>
                                       )}
                                       <Button variant="outline" size="sm" onClick={() => handleAddSubQuestion(index)}>
                                           <CornerDownLeft className="mr-2 h-4 w-4" />
                                           サブ問題を追加
                                       </Button>
                                   </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AddQuestionButton index={index + 1} />
                        </Fragment>
                       )
                    })}
                </Accordion>
                <Button variant="outline" onClick={() => handleAddQuestion()} className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    問題を追加
                </Button>
            </CardContent>
        </Card>
      </div>

       <div className="flex justify-end mt-6">
            <Button size="lg" onClick={handleSaveExam} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? "保存中..." : "試験を保存"}
            </Button>
        </div>
    </div>
  );
}

export default function CreateExamPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CreateExamPageContent />
    </Suspense>
  )
}

    

    