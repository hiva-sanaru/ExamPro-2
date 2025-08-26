
"use client";

import { useState, useEffect, useCallback, Suspense, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Loader2, Save, CornerDownLeft, ChevronDown, Wand2 } from 'lucide-react';
import type { Question, Exam } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addExam, getExam, updateExam } from '@/services/examService';
import { v4 as uuidv4 } from 'uuid';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { suggestTimeLimits } from '@/ai/flows/suggest-time-limits';


function CreateExamPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [examId, setExamId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<Exam['status']>('Draft');
  const [examType, setExamType] = useState<Exam['type']>('WrittenOnly');
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTempSaving, setIsTempSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuggestingTime, setIsSuggestingTime] = useState(false);


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
            setExamType(examData.type || 'WrittenOnly');
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
    const newQuestion: Partial<Question> = { id: uuidv4(), text: '', type: 'descriptive', points: 10, timeLimit: 300, modelAnswer: '', gradingCriteria: '', options: [], subQuestions: [], numberOfAnswers: 1 };
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
        gradingCriteria: '',
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

    if (field === 'modelAnswer' && (question.type === 'fill-in-the-blank' || (question.type === 'descriptive' && (question.numberOfAnswers || 1) > 1)) && typeof value === 'object' && value.index !== undefined) {
        const answers = Array.isArray(question.modelAnswer) ? [...question.modelAnswer] : [];
        answers[value.index] = value.value;
        question.modelAnswer = answers;
    } else if (field === 'options') {
        question[field] = value.split('\n');
    } else {
        (question as any)[field] = value;
    }

    // Reset modelAnswer if question type changes or numberOfAnswers changes for descriptive
    if (field === 'type') {
      question.modelAnswer = value === 'fill-in-the-blank' ? [] : '';
      if (value === 'descriptive') question.numberOfAnswers = 1;
    }
    if (field === 'numberOfAnswers' && question.type === 'descriptive') {
      question.modelAnswer = Array(Number(value) || 1).fill('');
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
  
  const handleSaveExam = async (redirect: boolean = true) => {
      if (!title) {
        toast({
            title: "保存エラー",
            description: "試験タイトルは必須です。",
            variant: "destructive"
        });
        return;
      }

      if (redirect) {
        setIsSaving(true);
      } else {
        setIsTempSaving(true);
      }
      
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
        type: examType,
      };

      try {
        if(examId) {
          await updateExam(examId, examData);
          toast({ title: '試験が正常に更新されました！' });
        } else {
          const newExamId = await addExam(examData as Omit<Exam, 'id'>);
          setExamId(newExamId);
          // Update URL without full page reload
          router.replace(`/admin/create-exam?examId=${newExamId}`, { scroll: false });
          toast({ title: '試験が正常に作成されました！' });
        }
        if (redirect) {
          router.push('/admin/dashboard');
        }
      } catch(error) {
        console.error("Failed to save exam", error);
        toast({ title: "保存エラー", description: "試験の保存中にエラーが発生しました。", variant: "destructive" });
      } finally {
        if (redirect) {
          setIsSaving(false);
        } else {
          setIsTempSaving(false);
        }
      }
  }

  const handleSuggestTimeLimits = async () => {
    if (questions.length === 0) {
      toast({ title: "エラー", description: "時間を配分する問題がありません。", variant: "destructive" });
      return;
    }
    setIsSuggestingTime(true);
    try {
      const questionInfo = questions.map(q => ({
        text: q.text || '',
        type: q.type || 'descriptive',
        points: q.points || 0,
      }));
      
      const result = await suggestTimeLimits({
        totalDurationInMinutes: duration,
        questions: questionInfo,
      });
      
      const { suggestedTimesInSeconds } = result;

      if (suggestedTimesInSeconds && suggestedTimesInSeconds.length === questions.length) {
        const newQuestions = questions.map((q, index) => ({
          ...q,
          timeLimit: suggestedTimesInSeconds[index],
        }));
        setQuestions(newQuestions);
        toast({ title: "成功", description: "AIが各問題の制限時間を提案しました。" });
      } else {
        throw new Error("AIからの提案の形式が正しくありません。");
      }
    } catch (error) {
      console.error("Failed to suggest time limits", error);
      toast({ title: "AI提案エラー", description: "AIによる時間配分の提案中にエラーが発生しました。", variant: "destructive" });
    } finally {
      setIsSuggestingTime(false);
    }
  };

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
                <div className="space-y-2">
                    <Label htmlFor="exam-title">試験タイトル</Label>
                    <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 2024年下期 昇進試験" className="bg-white dark:bg-gray-950" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end">
                     <div className="space-y-2">
                        <Label htmlFor="exam-type">試験タイプ</Label>
                        <Select value={examType} onValueChange={(value: Exam['type']) => setExamType(value)}>
                            <SelectTrigger id="exam-type" className="w-full bg-white dark:bg-gray-950">
                                <SelectValue placeholder="タイプを選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="WrittenOnly">筆記のみ</SelectItem>
                                <SelectItem value="WrittenAndInterview">筆記＋授業審査</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-4 col-span-1 md:col-span-2">
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="exam-status">試験ステータス</Label>
                            <Select value={status} onValueChange={(value: Exam['status']) => setStatus(value)}>
                                <SelectTrigger id="exam-status" className="w-full bg-white dark:bg-gray-950">
                                    <SelectValue placeholder="ステータスを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">下書き</SelectItem>
                                    <SelectItem value="Published">公開</SelectItem>
                                    <SelectItem value="Archived">アーカイブ済み</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="exam-duration">試験時間（分）</Label>
                            <div className="flex items-center gap-2">
                                <Input id="exam-duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-white dark:bg-gray-950" />
                                <Button variant="outline" onClick={handleSuggestTimeLimits} disabled={isSuggestingTime}>
                                  {isSuggestingTime ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                  AIで配分
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">「筆記＋授業審査」を選ぶと、合格後に授業審査ステップに進みます。</p>
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
                       const numAnswers = q.type === 'descriptive' ? (q.numberOfAnswers || 1) : 1;
                       return (
                        <Fragment key={q.id || index}>
                            <AccordionItem value={`item-${index}`} className="border bg-muted/30 rounded-md px-4">
                                <div className="flex items-center justify-between w-full">
                                    <AccordionTrigger noChevron className="flex-1 text-left hover:no-underline p-0">
                                        <span className="py-4 truncate">問題 {index + 1}: {q.text?.substring(0, 33) || "新しい問題"}...</span>
                                    </AccordionTrigger>
                                    <div className="flex items-center">
                                        <AccordionTrigger noChevron className="p-0">
                                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                        </AccordionTrigger>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(index)} className="ml-2">
                                            <Trash2 className="h-5 w-5 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                                <AccordionContent className="pt-4">
                                   <div className="flex-grow space-y-4 pr-4">
                                        <div className="space-y-4 p-4 border rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex-1 min-w-[150px] space-y-2">
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
                                                {q.type === 'descriptive' && (
                                                    <div className="flex-1 min-w-[120px] space-y-2">
                                                        <Label htmlFor={`q-num-answers-${index}`}>解答欄の数</Label>
                                                        <Input id={`q-num-answers-${index}`} type="number" min={1} value={q.numberOfAnswers || 1} onChange={(e) => handleQuestionChange(index, 'numberOfAnswers', Number(e.target.value))} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-[120px] space-y-2">
                                                    <Label htmlFor={`q-points-${index}`}>配点</Label>
                                                    <Input id={`q-points-${index}`} type="number" value={q.points} onChange={(e) => handleQuestionChange(index, 'points', Number(e.target.value))} placeholder="例: 10" />
                                                </div>
                                                <div className="flex-1 min-w-[120px] space-y-2">
                                                    <Label htmlFor={`q-time-${index}`}>制限時間(秒)</Label>
                                                    <Input id={`q-time-${index}`} type="number" value={q.timeLimit} onChange={(e) => handleQuestionChange(index, 'timeLimit', Number(e.target.value))} placeholder="例: 300" />
                                                </div>
                                            </div>
                                        </div>
                                       <div className="space-y-2">
                                           <Label htmlFor={`q-text-${index}`}>問題文 {index + 1}</Label>
                                           <Textarea id={`q-text-${index}`} value={q.text} onChange={(e) => handleQuestionChange(index, 'text', e.target.value)} placeholder={`問題 ${index + 1} の内容を記述...`} className="bg-white dark:bg-gray-950" />
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
                                                  className="bg-white dark:bg-gray-950"
                                              />
                                          </div>
                                        )}
                                        {(!q.subQuestions || q.subQuestions.length === 0) && (
                                            <>
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
                                                            className="bg-white dark:bg-gray-950"
                                                        />
                                                        </div>
                                                    ))}
                                                    {blankCount === 0 && <p className="text-xs text-muted-foreground">問題文に「___」（アンダースコア3つ）を追加して空欄を作成してください。</p>}
                                                    </div>
                                                ) : q.type === 'descriptive' && numAnswers > 1 ? (
                                                    <div className="space-y-2 pl-4 border-l-2">
                                                        {Array.from({ length: numAnswers }).map((_, i) => (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <Label htmlFor={`q-model-answer-${index}-${i}`} className="w-16">解答 {i + 1}</Label>
                                                                <Textarea
                                                                    id={`q-model-answer-${index}-${i}`}
                                                                    value={Array.isArray(q.modelAnswer) ? (q.modelAnswer[i] || '') : ''}
                                                                    onChange={(e) => handleQuestionChange(index, 'modelAnswer', { index: i, value: e.target.value })}
                                                                    placeholder={`模範解答 ${i + 1}`}
                                                                    rows={2}
                                                                    className="bg-white dark:bg-gray-950"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Textarea id={`q-model-answer-${index}`} value={typeof q.modelAnswer === 'string' ? q.modelAnswer : ''} onChange={(e) => handleQuestionChange(index, 'modelAnswer', e.target.value)} placeholder={`問題 ${index + 1} の模範解答を記述...`} rows={3} className="bg-white dark:bg-gray-950" />
                                                )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`q-criteria-${index}`}>採点基準</Label>
                                                    <Textarea 
                                                        id={`q-criteria-${index}`}
                                                        value={q.gradingCriteria || ''} 
                                                        onChange={(e) => handleQuestionChange(index, 'gradingCriteria', e.target.value)} 
                                                        placeholder="AIが採点するための基準を入力します。例：・〇〇のキーワードが含まれているか(10点) ・具体的な数値を交えて説明できているか(5点)" 
                                                        rows={3}
                                                        className="bg-white dark:bg-gray-950"
                                                    />
                                                </div>
                                            </>
                                        )}

                                       {/* Sub Questions */}
                                       {q.subQuestions && q.subQuestions.length > 0 && (
                                           <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                                               {q.subQuestions.map((subQ, subIndex) => (
                                                   <Card key={subQ.id || subIndex} className="p-4 bg-background">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-grow space-y-4 pr-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor={`subq-text-${index}-${subIndex}`}>サブ問題文 {subIndex + 1}</Label>
                                                                    <Textarea id={`subq-text-${index}-${subIndex}`} value={subQ.text} onChange={(e) => handleSubQuestionChange(index, subIndex, 'text', e.target.value)} placeholder={`サブ問題 ${subIndex + 1} の内容...`} className="bg-white dark:bg-gray-950" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor={`subq-model-answer-${index}-${subIndex}`}>模範解答</Label>
                                                                    <Textarea id={`subq-model-answer-${index}-${subIndex}`} value={typeof subQ.modelAnswer === 'string' ? subQ.modelAnswer : ''} onChange={(e) => handleSubQuestionChange(index, subIndex, 'modelAnswer', e.target.value)} placeholder={`サブ問題 ${subIndex + 1} の模範解答...`} rows={2} className="bg-white dark:bg-gray-950" />
                                                                </div>
                                                                 <div className="space-y-2">
                                                                    <Label htmlFor={`subq-criteria-${index}-${subIndex}`}>採点基準</Label>
                                                                    <Textarea 
                                                                        id={`subq-criteria-${index}-${subIndex}`}
                                                                        value={subQ.gradingCriteria || ''}
                                                                        onChange={(e) => handleSubQuestionChange(index, subIndex, 'gradingCriteria', e.target.value)}
                                                                        placeholder="サブ問題の採点基準..." 
                                                                        rows={2}
                                                                        className="bg-white dark:bg-gray-950"
                                                                    />
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
                                       <div className="flex justify-center">
                                            <Button variant="outline" size="sm" onClick={() => handleAddSubQuestion(index)}>
                                                <CornerDownLeft className="mr-2 h-4 w-4" />
                                                サブ問題を追加
                                            </Button>
                                       </div>
                                   </div>
                                </AccordionContent>
                            </AccordionItem>
                             {index === questions.length - 1 && <AddQuestionButton index={index + 1} />}
                        </Fragment>
                       )
                    })}
                </Accordion>
            </CardContent>
        </Card>
      </div>

       <div className="flex justify-center mt-6 gap-4">
            <Button variant="default" size="lg" onClick={() => handleSaveExam(false)} disabled={isTempSaving || isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isTempSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isTempSaving ? "保存中..." : "一時保存"}
            </Button>
            <Button size="lg" onClick={() => handleSaveExam(true)} disabled={isSaving || isTempSaving}>
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
