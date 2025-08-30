
'use client';
import { useState, useEffect } from 'react';
import { SubmissionList } from "@/components/admin/submission-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExams } from '@/services/examService';
import { getSubmissions } from '@/services/submissionService';
import type { Submission, Exam } from '@/lib/types';
import { FileText } from "lucide-react";

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

  const handleExportSubmissions = () => {
        const headers = [
            "提出ID",
            "試験名",
            "受験者名",
            "社員番号",
            "受験者本部",
            "提出日時",
            "ステータス",
            "本部スコア",
            "人事室スコア",
            "最終スコア",
            "授業審査URL"
        ];
        
        const rows = submissions.map(submission => {
            const exam = exams.find(e => e.id === submission.examId);
            return [
                submission.id,
                exam?.title || "－",
                submission.examineeName || "－",
                submission.examineeId || "－",
                submission.examineeHeadquarters || "－",
                submission.submittedAt.toISOString(),
                submission.status,
                submission.hqGrade?.score ?? "－",
                submission.poGrade?.score ?? "－",
                submission.finalScore ?? "－",
                submission.lessonReviewUrl ?? "－"
            ].join(',');
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
          <SubmissionList submissions={submissions} exams={exams} />
        </CardContent>
      </Card>
    </div>
  );
}
