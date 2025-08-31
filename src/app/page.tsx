
'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Loader2, Clock3, FileText, Upload } from "lucide-react";
import { getExams } from "@/services/examService";
import { getSubmissions } from "@/services/submissionService"; // Import submission service
import type { Exam, Submission, ExamineeInfo } from "@/lib/types"; // Import submission type

function ExamineePortal() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [examineeInfo, setExamineeInfo] = useState<ExamineeInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const info = localStorage.getItem('exam-examinee-info');
        if (info) {
            setExamineeInfo(JSON.parse(info));
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [allExams, allSubmissions] = await Promise.all([
                    getExams(),
                    getSubmissions()
                ]);

                setExams(allExams.filter(e => e.status === 'Published'));
                setSubmissions(allSubmissions);

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    const userSubmissions = examineeInfo 
      ? submissions.filter(s => s.examineeId === examineeInfo.employeeId)
      : [];

    return (
        <main className="relative flex min-h-screen flex-col items-center bg-gradient-to-b from-primary/5 via-transparent to-transparent p-4 sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/.2),_transparent_60%)]" />
            <div className="w-full max-w-5xl space-y-8">
                <header className="space-y-3 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold font-headline tracking-tight">
                        SANARUスタッフ昇給試験サイト
                    </h1>
                    <p className="mx-auto max-w-2xl text-muted-foreground text-base sm:text-lg">
                        受験したい試験を選択して、指示に従ってください。
                    </p>
                </header>

                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>受験可能な試験</CardTitle>
                            <CardDescription>{exams.length} 件の試験が利用可能です。</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="rounded-lg border p-4">
                                        <Skeleton className="h-6 w-3/4 mb-3" />
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                        <Skeleton className="mt-4 h-9 w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : exams.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {exams.map((exam) => {
                                    const submissionForExam = userSubmissions.find(s => s.examId === exam.id);
                                    const needsUrlSubmission = submissionForExam?.status === '授業審査待ち' && exam.type === 'WrittenAndInterview' && exam.lessonReviewType === 'UrlSubmission';

                                    return (
                                        <div key={exam.id} className="flex flex-col gap-4 rounded-lg border p-4">
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-semibold leading-tight">{exam.title}</h3>
                                                    {exam.type && (
                                                        <Badge variant="outline" className="ml-2 whitespace-nowrap">{exam.type === 'WrittenAndInterview' ? '筆記＋授業審査' : '筆記のみ'}</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock3 className="h-4 w-4" />
                                                        {exam.duration}分
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <FileText className="h-4 w-4" />
                                                        合計{exam.totalPoints}点
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-auto">
                                                {needsUrlSubmission ? (
                                                     <Button asChild aria-label={`${exam.title} のURLを提出する`} className="bg-green-600 hover:bg-green-700">
                                                        <Link href={`/exam/${exam.id}/submit-lesson?submissionId=${submissionForExam.id}`}>
                                                            <Upload className="mr-2 h-4 w-4" />
                                                            授業動画URLを提出
                                                        </Link>
                                                    </Button>
                                                ) : (
                                                    <Button asChild aria-label={`${exam.title} を受験する`}>
                                                        <Link href={`/exam/${exam.id}/start`}>
                                                            受験する
                                                            <ArrowRight className="ml-2 h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                                <FileText className="mb-3 h-8 w-8" />
                                <p className="mb-1">現在、受験可能な試験はありません。</p>
                                <p className="text-xs">管理者にお問い合わせください。</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <footer className="text-center text-sm text-muted-foreground pt-2">
                    © {new Date().getFullYear()} SANARUスタッフ昇給試験サイト. 無断複写・転載を禁じます。
                </footer>
            </div>
        </main>
    );
}

export default ExamineePortal;
