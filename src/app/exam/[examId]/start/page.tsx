
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Hash, Building, Play, Clock3, FileText, ListChecks } from 'lucide-react';
import { getHeadquarters } from '@/services/headquartersService';
import { getExam } from '@/services/examService';
import type { Headquarters, Exam } from '@/lib/types';

const examineeInfoSchema = z.object({
  employeeId: z.string().length(8, { message: "社員番号は8桁である必要があります。"}).regex(/^[0-9]+$/, { message: "社員番号は半角数字でなければなりません。"}),
  name: z.string().min(1, { message: "氏名は必須です。" }),
  headquarters: z.string({ required_error: "本部を選択してください。"}).min(1, { message: "本部を選択してください。"}),
});

type ExamineeInfoFormValues = z.infer<typeof examineeInfoSchema>;

export default function StartExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const { toast } = useToast();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [headquarters, setHeadquarters] = useState<Headquarters[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ExamineeInfoFormValues>({
    resolver: zodResolver(examineeInfoSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      headquarters: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [examData, hqData] = await Promise.all([
          getExam(examId),
          getHeadquarters()
        ]);
        
        if (!examData || examData.status !== 'Published') {
          notFound();
          return;
        }

        setExam(examData);
        setHeadquarters(hqData);

      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast({
          title: "エラー",
          description: "試験情報の読み込みに失敗しました。",
          variant: "destructive"
        });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [examId, router, toast]);

  const onSubmit = (data: ExamineeInfoFormValues) => {
    try {
      localStorage.setItem('exam-examinee-info', JSON.stringify(data));
      // Clear any previous exam data for this new session
      localStorage.removeItem(`exam-${examId}-answers`);
      localStorage.removeItem(`exam-${examId}-endTime`);
      exam?.questions.forEach(q => localStorage.removeItem(`exam-${examId}-question-${q.id}-endTime`))

      router.push(`/exam/${examId}`);
    } catch (error) {
      toast({
        title: "エラー",
        description: "試験の開始準備中にエラーが発生しました。ストレージの空き容量を確認してください。",
        variant: "destructive"
      });
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
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/.2),_transparent_60%)]" />
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl sm:text-3xl leading-tight">{exam?.title}</CardTitle>
          <CardDescription>
            試験を開始するには、以下の情報を入力してください。
          </CardDescription>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{exam?.duration}分</span>
            <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4" />合計{exam?.totalPoints}点</span>
            <span className="inline-flex items-center gap-1"><ListChecks className="h-4 w-4" />全{exam?.questions?.length ?? 0}問</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>注意事項</AlertTitle>
            <AlertDescription>
              開始ボタンを押すと制限時間のカウントが始まります。受験中はページの再読み込みや戻る操作を避けてください。
            </AlertDescription>
          </Alert>
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
              <Button type="submit" className="w-full" size="lg">
                <Play className="mr-2 h-4 w-4" />
                試験を開始する
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
