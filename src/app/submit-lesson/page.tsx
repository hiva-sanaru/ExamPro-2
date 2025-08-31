
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Youtube, Send, User, Hash, Building } from 'lucide-react';
import { addSubmission } from '@/services/submissionService';
import { getHeadquarters } from '@/services/headquartersService';
import type { Headquarters } from '@/lib/types';
import Image from 'next/image';


const lessonSubmissionSchema = z.object({
  employeeId: z.string().length(8, { message: "社員番号は8桁である必要があります。"}).regex(/^[0-9]+$/, { message: "社員番号は半角数字でなければなりません。"}),
  name: z.string().min(1, { message: "氏名は必須です。" }),
  headquarters: z.string({ required_error: "本部を選択してください。"}).min(1, { message: "本部を選択してください。"}),
  lessonReviewUrl: z.string().url({ message: "有効なURLを入力してください。" }).min(1, { message: "URLは必須です。" }),
});

type LessonSubmissionFormValues = z.infer<typeof lessonSubmissionSchema>;

export default function SubmitLessonPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [headquarters, setHeadquarters] = useState<Headquarters[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<LessonSubmissionFormValues>({
    resolver: zodResolver(lessonSubmissionSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      headquarters: '',
      lessonReviewUrl: '',
    },
  });

   useEffect(() => {
    const fetchHqs = async () => {
      try {
        const hqData = await getHeadquarters();
        setHeadquarters(hqData);
      } catch (error) {
        console.error("Failed to fetch headquarters", error);
        toast({ title: "エラー", description: "データの読み込みに失敗しました。", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    };
    fetchHqs();
  }, [toast]);

  const onSubmit = async (data: LessonSubmissionFormValues) => {
    setIsLoading(true);
    try {
      await addSubmission({
        examId: 'lesson-review-only', // Special ID for URL-only submissions
        examineeId: data.employeeId,
        examineeName: data.name,
        examineeHeadquarters: data.headquarters,
        lessonReviewUrl: data.lessonReviewUrl,
        answers: [], // No answers for this type of submission
        status: '授業審査待ち', // Set status directly to waiting for review
      });

      toast({
        title: "提出完了",
        description: "授業審査の動画URLを正常に提出しました。",
      });
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
  
  if (isLoading && headquarters.length === 0) {
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
            <Image src="/sanaru-ascend-logo.png" alt="SANARU ASCEND Logo" width={300} height={100} priority />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
