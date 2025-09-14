
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Youtube, Send, User, Hash, Building, FileText } from 'lucide-react';
import { addSubmission } from '@/services/submissionService';
import { getHeadquarters } from '@/services/headquartersService';
import { getExam, getExams } from '@/services/examService';
import type { Headquarters, Exam } from '@/lib/types';
import Image from 'next/image';

const lessonSubmissionSchema = z.object({
  examId: z.string({ required_error: "試験を選択してください。"}).min(1, { message: "試験を選択してください。" }),
  employeeId: z.string().length(8, { message: "社員番号は8桁である必要があります。"}).regex(/^[0-9]+$/, { message: "社員番号は半角数字でなければなりません。"}),
  name: z.string().min(1, { message: "氏名は必須です。" }),
  headquarters: z.string({ required_error: "本部を選択してください。"}).min(1, { message: "本部を選択してください。"}),
  lessonReviewUrl: z.string().url({ message: "有効なURLを入力してください。" }).min(1, { message: "URLは必須です。" }),
});

type LessonSubmissionFormValues = z.infer<typeof lessonSubmissionSchema>;

function SubmitLessonPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [headquarters, setHeadquarters] = useState<Headquarters[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<LessonSubmissionFormValues>({
    resolver: zodResolver(lessonSubmissionSchema),
    defaultValues: {
      examId: '',
      employeeId: '',
      name: '',
      headquarters: '',
      lessonReviewUrl: '',
    },
  });

   useEffect(() => {
    const examIdFromUrl = searchParams.get('examId');
    if (examIdFromUrl) {
      setSelectedExamId(examIdFromUrl);
      form.setValue('examId', examIdFromUrl);
    }

    const fetchData = async () => {
      try {
        const [hqData, examData] = await Promise.all([
            getHeadquarters(),
            getExams()
        ]);
        setHeadquarters(hqData);
        setExams(examData.filter(e => 
            e.status === 'Published' && 
            e.type === 'WrittenAndInterview' && 
            e.lessonReviewType === 'UrlSubmission'
        ));
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast({ title: "エラー", description: "データの読み込みに失敗しました。", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [searchParams, toast, form]);

  const onSubmit = async (data: LessonSubmissionFormValues) => {
    setIsSubmitting(true);
    try {
      await addSubmission({
        examId: data.examId,
        examineeId: data.employeeId,
        examineeName: data.name,
        examineeHeadquarters: data.headquarters,
        lessonReviewUrl: data.lessonReviewUrl,
        answers: [], // This is a lesson review submission, so no answers are needed.
        status: '授業審査待ち' // Set status directly to '授業審査待ち'
      });

      toast({
        title: "提出完了",
        description: "授業審査の動画URLを正常に提出しました。",
      });
      router.push('/');
    } catch (error) {
      console.error("Failed to submit URL", error);
      toast({
        title: "エラー",
        description: "URLの提出中にエラーが発生しました。",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen text-muted-foreground">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            読み込み中...
        </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-transparent to-transparent p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center flex flex-col items-center">
            <Image src="/sanaru-ascend-logo.png" alt="SANARU ASCEND Logo" width={300} height={100} priority data-ai-hint="logo" />
            <CardTitle className="font-headline text-2xl">授業動画URLの提出</CardTitle>
            <CardDescription>情報を入力し、提出する授業動画のURLを送信してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                control={form.control}
                name="examId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>試験名</FormLabel>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="提出先の試験を選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {exams.map(exam => (
                            <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
                          ))}
                           {exams.length === 0 && (
                            <SelectItem value="no-exam" disabled>
                              URL提出可能な試験がありません
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>社員番号</FormLabel>
                     <div className="relative">
                       <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="12345678" inputMode="numeric" autoComplete="off" {...field} className="pl-10" />
                        </FormControl>
                      </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>氏名</FormLabel>
                     <div className="relative">
                       <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="山田 太郎" autoComplete="name" {...field} className="pl-10" />
                        </FormControl>
                      </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="headquarters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>本部</FormLabel>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="所属する本部を選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {headquarters.map(hq => (
                            <SelectItem key={hq.code} value={hq.name}>{hq.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonReviewUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                     <div className="relative">
                       <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="https://www.youtube.com/watch?v=..." {...field} className="pl-10" />
                        </FormControl>
                      </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || isLoading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSubmitting ? "提出中..." : "URLを提出する"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SubmitLessonPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen text-muted-foreground"><Loader2 className="mr-2 h-6 w-6 animate-spin" />読み込み中...</div>}>
            <SubmitLessonPageContent />
        </Suspense>
    )
}
