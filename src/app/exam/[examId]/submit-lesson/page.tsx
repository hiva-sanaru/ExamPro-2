
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams, notFound } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Youtube, Send } from 'lucide-react';
import { getSubmission, updateSubmission } from '@/services/submissionService';
import type { Submission } from '@/lib/types';

const urlSubmissionSchema = z.object({
  lessonReviewUrl: z.string().url({ message: "有効なURLを入力してください。" }).min(1, { message: "URLは必須です。" }),
});

type UrlSubmissionFormValues = z.infer<typeof urlSubmissionSchema>;

export default function SubmitLessonUrlPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<UrlSubmissionFormValues>({
    resolver: zodResolver(urlSubmissionSchema),
    defaultValues: {
      lessonReviewUrl: '',
    },
  });

   useEffect(() => {
    const fetchSubmission = async () => {
      const submissionId = searchParams.get('submissionId');

      if (!submissionId) {
        toast({ title: "エラー", description: "対象の提出情報が見つかりません。", variant: "destructive"});
        router.push('/');
        return;
      }

      try {
        const sub = await getSubmission(submissionId);
        if (!sub || sub.status !== '授業審査待ち') {
           toast({ title: "不正なアクセス", description: "この試験はURL提出の対象外か、既に提出済みです。", variant: "destructive"});
           router.push('/');
           return;
        }
        setSubmission(sub);
      } catch (error) {
        console.error("Failed to fetch submission", error);
        toast({ title: "エラー", description: "提出情報の読み込みに失敗しました。", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmission();
  }, [router, searchParams, toast]);

  const onSubmit = async (data: UrlSubmissionFormValues) => {
    if (!submission) return;
    setIsLoading(true);
    try {
      await updateSubmission(submission.id, { 
        lessonReviewUrl: data.lessonReviewUrl,
        status: '人事確認中'
      });
      toast({
        title: "提出完了",
        description: "授業審査の動画URLを正常に提出しました。",
      });
      // Clear examinee info to prevent accidental resubmission under same identity
      localStorage.removeItem('exam-examinee-info');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error("Failed to submit URL", error);
      toast({
        title: "エラー",
        description: "URLの提出中にエラーが発生しました。",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl sm:text-3xl leading-tight">授業動画URLの提出</CardTitle>
          <CardDescription>
            録画した授業のYouTube URLを提出してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isLoading ? "提出中..." : "URLを提出する"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
