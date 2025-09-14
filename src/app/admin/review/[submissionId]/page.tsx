
'use client';
import { ReviewPanel } from "@/components/admin/review-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notFound, useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User as UserIcon, Calendar, CheckCircle, AlertTriangle, ShieldCheck, Loader2, Building, Hash, Link as LinkIcon, Youtube } from "lucide-react";
import { formatInTimeZone } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect, useCallback } from "react";
import { getSubmission, updateSubmission } from "@/services/submissionService";
import { getExam } from "@/services/examService";
import { findUserByEmployeeId } from "@/services/userService";
import type { Submission, Exam, User } from "@/lib/types";


const getStatusInJapanese = (status: Submission['status']): string => {
    switch (status) {
      case 'Submitted':
        return '本部採点中';
      case '人事確認中':
        return '人事確認中';
      case '授業審査待ち':
        return '授業審査待ち';
      case '合格':
        return '合格';
      case '不合格':
        return '不合格';
      case 'Completed':
         return '完了';
      default:
        return status;
    }
  };


export default function AdminReviewPage() {
    const router = useRouter();
    const params = useParams();
    const submissionId = params.submissionId as string;

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [exam, setExam] = useState<Exam | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSubmissionData = useCallback(async () => {
        setIsLoading(true);
        try {
            const sub = await getSubmission(submissionId);
            if (!sub) {
                setError("Submission not found.");
                setIsLoading(false);
                return;
            }

            let ex: Exam | null = null;
            if (sub.examId) {
                ex = await getExam(sub.examId);
            }
            
            const employeeId = localStorage.getItem('loggedInUserEmployeeId');
            if (employeeId) {
                const user = await findUserByEmployeeId(employeeId);
                setCurrentUser(user);
            } else {
                router.push('/login');
                return;
            }

            setSubmission(sub);
            setExam(ex);
        } catch (e) {
            console.error(e);
            setError("Failed to load submission data.");
        } finally {
            setIsLoading(false);
        }
    }, [submissionId, router]);

    useEffect(() => {
        if (submissionId) {
            fetchSubmissionData();
        }
    }, [submissionId, fetchSubmissionData]);
    
    const handleSubmissionUpdate = () => {
        fetchSubmissionData();
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">エラー</h1>
                    <p className="text-muted-foreground">データの読み込み中にエラーが発生しました。</p>
                </div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>読み込みエラー</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <button onClick={() => router.back()}>戻る</button>
            </div>
        );
    }
    
    if (!submission || !currentUser) {
        notFound();
    }
    
    // 動画審査とみなす条件を広げる: 授業審査待ち / lesson-review-only / URL提出済み
    const isLessonReview =
        submission.status === '授業審査待ち' ||
        !!submission.lessonReviewUrl ||
        submission.examId === 'lesson-review-only';

    // 本部名の表記ゆれ対応（例: 「浜松本部」「浜松」「浜松採点」など）
    const normalizeHq = (s?: string) => (s || '').replace('採点', '').trim();
    const hasAccess = currentUser.role === 'system_administrator' || 
                      (currentUser.role === 'hq_administrator' && normalizeHq(currentUser.headquarters) === normalizeHq(submission.examineeHeadquarters));

    if (!hasAccess) {
        return (
             <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">アクセスが拒否されました</h1>
                    <p className="text-muted-foreground">この提出物を閲覧する権限がありません。</p>
                </div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>権限エラー</AlertTitle>
                    <AlertDescription>
                        あなたはこの提出物を閲覧する権限がありません。
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const pageTitle = isLessonReview ? '授業審査レビュー' : '提出物のレビュー';
    const pageDescription = `試験の採点: "${exam?.title}"`;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">{pageTitle}</h1>
                <p className="text-muted-foreground">{pageDescription}</p>
            </div>

             {currentUser.role === 'system_administrator' && (
                 <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle>システム管理者ビュー</AlertTitle>
                    <AlertDescription>
                        あなたはシステム管理者として、すべての提出物を閲覧・管理する権限を持っています。
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm pt-6">
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                        <strong>受験者:</strong> <span>{submission.examineeName}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <strong>社員番号:</strong> <span>{submission.examineeId}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <strong>本部:</strong> <span>{submission.examineeHeadquarters}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <strong>提出日時:</strong> <span>{formatInTimeZone(submission.submittedAt, 'Asia/Tokyo', "PPP", { locale: ja })}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                        <strong>ステータス:</strong> <span>{getStatusInJapanese(submission.status)}</span>
                    </div>
                     {submission.lessonReviewUrl && (
                        <div className="flex items-center gap-2">
                            <Youtube className="w-4 h-4 text-muted-foreground" />
                            <strong>動画URL:</strong> 
                            <a href={submission.lessonReviewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                                リンクを開く
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="hq" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="hq" className="font-headline">
                        本部レビュー
                    </TabsTrigger>
                    <TabsTrigger value="po" className="font-headline">
                        人事室レビュー
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="hq">
                   <ReviewPanel
                        exam={exam}
                        submission={submission}
                        reviewerRole="本部"
                        currentUser={currentUser}
                        onSubmissionUpdate={handleSubmissionUpdate}
                        isLessonReview={isLessonReview}
                    />
                </TabsContent>
                <TabsContent value="po">
                    <ReviewPanel
                        exam={exam}
                        submission={submission}
                        reviewerRole="人事室"
                        currentUser={currentUser}
                        onSubmissionUpdate={handleSubmissionUpdate}
                        isLessonReview={isLessonReview}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
