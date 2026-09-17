'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SubmissionList } from "@/components/admin/submission-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExams } from '@/services/examService';
import { getSubmissions } from '@/services/submissionService';
import type { Submission, Exam, User } from '@/lib/types';
import { FileText, Loader2 } from "lucide-react";
import { formatInTimeZone } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import { findUserByEmployeeId } from '@/services/userService';

const normalizeHeadquarters = (headquarters?: string) =>
  (headquarters || '').replace('採点', '').trim();

export default function ReviewListPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshSubmissions = useCallback(async () => {
    const fetchedSubmissions = await getSubmissions();
    setSubmissions(fetchedSubmissions);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const employeeId = localStorage.getItem('loggedInUserEmployeeId');
        if (!employeeId) {
          throw new Error('ログイン情報が見つかりません。');
        }

        const [fetchedExams, fetchedSubmissions, user] = await Promise.all([
          getExams(),
          getSubmissions(),
          findUserByEmployeeId(employeeId),
        ]);

        if (!user) {
          throw new Error('ログインユーザーを確認できません。');
        }

        setExams(fetchedExams);
        setSubmissions(fetchedSubmissions);
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch review data', error);
        setLoadError('提出物を読み込めませんでした。ログイン状態を確認して、もう一度お試しください。');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const visibleSubmissions = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === 'hq_administrator') {
      const currentHeadquarters = normalizeHeadquarters(currentUser.headquarters);
      return submissions.filter((submission) =>
        normalizeHeadquarters(submission.examineeHeadquarters) === currentHeadquarters &&
        submission.hiddenFromHeadquarters !== true,
      );
    }

    return submissions;
  }, [currentUser, submissions]);

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
    if (!currentUser) return;

    const headers = [
      '試験名',
      '受験者名',
      '社員番号',
      '受験者本部',
      '提出日時',
      'ステータス',
      '本部スコア',
      '人事室スコア',
      '最終スコア',
      '授業審査URL',
      '授業審査希望日時1',
      '授業審査希望日時2',
      '授業審査校舎名',
      '授業審査教室名',
    ];

    if (currentUser.role === 'system_administrator') {
      headers.push('本部表示');
    }

    const rows = visibleSubmissions.map((submission) => {
      const exam = exams.find((item) => item.id === submission.examId);
      const formatDate = (date: unknown) => {
        if (!date) return '－';
        const dateValue = date as { toDate?: () => Date };
        const dateObj = dateValue.toDate ? dateValue.toDate() : new Date(date as string | number | Date);
        return formatInTimeZone(dateObj, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm', { locale: ja });
      };

      const values = [
        exam?.title || '－',
        submission.examineeName || '－',
        `="${submission.examineeId || '－'}"`,
        submission.examineeHeadquarters || '－',
        formatDate(submission.submittedAt),
        getStatusInJapanese(submission.status),
        submission.hqGrade?.score ?? '－',
        submission.poGrade?.score ?? '－',
        submission.finalScore ?? '－',
        submission.lessonReviewUrl ?? '－',
        submission.lessonReviewDate1 ? formatDate(submission.lessonReviewDate1) : '－',
        submission.lessonReviewDate2 ? formatDate(submission.lessonReviewDate2) : '－',
        submission.lessonReviewSchoolName ?? '－',
        submission.lessonReviewClassroomName ?? '－',
      ];

      if (currentUser.role === 'system_administrator') {
        values.push(submission.hiddenFromHeadquarters ? '非表示' : '表示中');
      }

      return values.map((value) => {
        const stringValue = String(value).replace(/"/g, '""');
        return /[,"]/.test(stringValue) ? `"${stringValue}"` : stringValue;
      }).join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sanaru_submissions_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmissionDeleted = (submissionId: string) => {
    setSubmissions((previous) => previous.filter((submission) => submission.id !== submissionId));
  };

  const handleSubmissionsVisibilityChanged = (submissionIds: string[], hiddenFromHeadquarters: boolean) => {
    const updatedIds = new Set(submissionIds);
    setSubmissions((previous) => previous.map((submission) =>
      updatedIds.has(submission.id)
        ? { ...submission, hiddenFromHeadquarters }
        : submission,
    ));
  };

  const isSystemAdministrator = currentUser?.role === 'system_administrator';

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
          <Button
            onClick={handleExportSubmissions}
            className="bg-chart-1 hover:bg-chart-1/90"
            disabled={isLoading || !!loadError || !currentUser}
          >
            <FileText className="mr-2 h-4 w-4" />
            提出物をエクスポート
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center justify-center" role="status">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <p className="py-8 text-center text-destructive">{loadError}</p>
          ) : currentUser ? (
            <SubmissionList
              submissions={visibleSubmissions}
              exams={exams}
              isSystemAdministrator={isSystemAdministrator}
              onSubmissionDeleted={handleSubmissionDeleted}
              onSubmissionsVisibilityChanged={handleSubmissionsVisibilityChanged}
              onSubmissionsRefresh={refreshSubmissions}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
