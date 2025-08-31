
'use client';
import { useState, useEffect } from 'react';
import { SubmissionList } from "@/components/admin/submission-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExams } from '@/services/examService';
import { getSubmissions } from '@/services/submissionService';
import type { Submission, Exam } from '@/lib/types';
import { FileText } from "lucide-react";
import { formatInTimeZone } from 'date-fns-tz';
import { ja } from 'date-fns/locale';

export default function ReviewListPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    async function fetchData() {
        try {
            const [fetchedExams, fetchedSubmissions] = await Promise.all([
                getExams(),
                getSubmissions()
            ]);
            setExams(fetchedExams);
            setSubmissions(fetchedSubmissions);
        } catch (error) {
            console.error("Failed to fetch data for export", error);
        }
    }
    fetchData();
  }, []);
  
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


  const handleExportSubmissions = () => {
        const headers = [
            "試験名",
            "受験者名",
            "社員番号",
            "受験者本部",
            "提出日時",
            "ステータス",
            "本部スコア",
            "人事室スコア",
            "最終スコア",
            "授業審査URL",
            "授業審査希望日時1",
            "授業審査希望日時2",
            "授業審査校舎名",
            "授業審査教室名",
        ];
        
        const rows = submissions.map(submission => {
            const exam = exams.find(e => e.id === submission.examId);
            const formatDate = (date: any) => {
                if (!date) return "－";
                const dateObj = date.toDate ? date.toDate() : new Date(date);
                return formatInTimeZone(dateObj, 'Asia/Tokyo', "yyyy-MM-dd HH:mm", { locale: ja });
            }

            return [
                exam?.title || "－",
                submission.examineeName || "－",
                `="${submission.examineeId || "－"}"`,
                submission.examineeHeadquarters || "－",
                formatDate(submission.submittedAt),
                getStatusInJapanese(submission.status),
                submission.hqGrade?.score ?? "－",
                submission.poGrade?.score ?? "－",
                submission.finalScore ?? "－",
                submission.lessonReviewUrl ?? "－",
                submission.lessonReviewDate1 ? formatDate(submission.lessonReviewDate1) : "－",
                submission.lessonReviewDate2 ? formatDate(submission.lessonReviewDate2) : "－",
                submission.lessonReviewSchoolName ?? "－",
                submission.lessonReviewClassroomName ?? "－",
            ].map(value => {
                const str = String(value).replace(/"/g, '""'); // Escape double quotes
                if (String(value).includes(',')) {
                    return `"${str}"`;
                }
                return value; // Return value directly for non-comma values
            }).join(',');
        });

        const csvString = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: "text/csv;charset=utf-8;" }); // BOM for Excel compatibility
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sanaru_submissions_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    const handleSubmissionDeleted = (submissionId: string) => {
        setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">提出物のレビュー</h1>
        <p className="text-muted-foreground">採点またはレビューが必要な提出物の一覧です。</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>提出物リスト</CardTitle>
            <CardDescription>提出物を選択してレビューを開始してください。</CardDescription>
          </div>
          <Button onClick={handleExportSubmissions} className="bg-chart-1 hover:bg-chart-1/90">
              <FileText className="mr-2 h-4 w-4" />
              提出物をエクスポート
          </Button>
        </CardHeader>
        <CardContent>
          <SubmissionList 
            submissions={submissions} 
            exams={exams} 
            onSubmissionDeleted={handleSubmissionDeleted}
          />
        </CardContent>
      </Card>
    </div>
  );
}
