
'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Film, Loader2, Send } from "lucide-react";
import { getExams } from "@/services/examService";
import { getSubmissions, updateSubmission } from "@/services/submissionService";
import { findUserByEmployeeId } from "@/services/userService";
import type { Exam, Submission, User } from "@/lib/types";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

function ExamineeDashboard() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmittingUrl, setIsSubmittingUrl] = useState<Record<string, boolean>>({});
    const [youtubeUrl, setYoutubeUrl] = useState<Record<string, string>>({});
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const employeeId = localStorage.getItem('loggedInUserEmployeeId');
                if (!employeeId) {
                    // Redirect or handle not logged in case
                    setIsLoading(false);
                    return;
                }
                const user = await findUserByEmployeeId(employeeId);
                setCurrentUser(user);

                const [allExams, allSubmissions] = await Promise.all([
                    getExams(),
                    getSubmissions()
                ]);

                setExams(allExams);
                if (user) {
                    setSubmissions(allSubmissions.filter(s => s.examineeId === user.id));
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleUrlSubmit = async (submissionId: string) => {
        const url = youtubeUrl[submissionId];
        if (!url || !url.includes("youtube.com")) {
            toast({
                title: "無効なURLです",
                description: "有効なYouTubeのURLを入力してください。",
                variant: "destructive"
            });
            return;
        }

        setIsSubmittingUrl(prev => ({...prev, [submissionId]: true}));
        try {
            await updateSubmission(submissionId, { lessonReviewUrl: url, status: '授業審査待ち' });
            toast({
                title: "URLが正常に提出されました！",
                description: "授業審査の結果をお待ちください。",
            });
            // Refresh submissions
            const updatedSubmissions = submissions.map(s => s.id === submissionId ? {...s, lessonReviewUrl: url, status: '授業審査待ち'} : s);
            setSubmissions(updatedSubmissions);
        } catch (error) {
            console.error("Failed to submit URL:", error);
            toast({
                title: "提出エラー",
                description: "URLの提出中にエラーが発生しました。",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingUrl(prev => ({...prev, [submissionId]: false}));
        }
    }

    const availableExams = exams.filter(e => e.status === 'Published' && !submissions.some(s => s.examId === e.id));
    
    const examsAwaitingLessonReview = submissions
        .filter(s => s.finalOutcome === 'Passed' && exams.find(e => e.id === s.examId)?.type === 'WrittenAndInterview' && !s.lessonReviewUrl);


    return (
        <main className="flex min-h-screen flex-col items-center bg-muted/40 p-4 sm:p-8">
            <div className="w-full max-w-4xl space-y-8">
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold font-headline">マイページ</h1>
                    <p className="text-muted-foreground text-lg">
                        {isLoading ? <span className="h-6 w-32 bg-muted-foreground/20 animate-pulse rounded-md inline-block" /> : <span>ようこそ、{currentUser?.name}さん！</span>}
                    </p>
                </header>

                {examsAwaitingLessonReview.length > 0 && (
                    <Card className="border-accent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Film className="text-accent" />要対応：授業審査の提出</CardTitle>
                            <CardDescription>筆記試験に合格しました。授業審査のため、授業動画のYouTube URLを提出してください。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {examsAwaitingLessonReview.map(submission => {
                                const exam = exams.find(e => e.id === submission.examId);
                                return (
                                    <div key={submission.id} className="rounded-lg border bg-background p-4 space-y-3">
                                        <h3 className="font-semibold">{exam?.title}</h3>
                                        <div className="flex gap-2">
                                            <Input 
                                                type="url" 
                                                placeholder="https://www.youtube.com/watch?v=..." 
                                                value={youtubeUrl[submission.id] || ''}
                                                onChange={(e) => setYoutubeUrl(prev => ({...prev, [submission.id]: e.target.value}))}
                                                disabled={isSubmittingUrl[submission.id]}
                                            />
                                            <Button onClick={() => handleUrlSubmit(submission.id)} disabled={isSubmittingUrl[submission.id]}>
                                                {isSubmittingUrl[submission.id] ? <Loader2 className="animate-spin" /> : <Send />}
                                                提出
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>受験可能な筆記試験</CardTitle>
                        <CardDescription>{availableExams.length} 件の試験が利用可能です。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : availableExams.length > 0 ? (
                            availableExams.map((exam) => (
                                <div key={exam.id} className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <h3 className="font-semibold">{exam.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            試験時間: {exam.duration}分 | 合計点: {exam.totalPoints}点
                                        </p>
                                    </div>
                                    <Button asChild>
                                        <Link href={`/exam/${exam.id}`}>
                                            試験を開始
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                現在、受験可能な試験はありません。
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <footer className="text-center text-sm text-muted-foreground pt-4">
                    © {new Date().getFullYear()} SANARUスタッフ昇給試験サイト. 無断複写・転載を禁じます。
                </footer>
            </div>
        </main>
    );
}

export default ExamineeDashboard;
