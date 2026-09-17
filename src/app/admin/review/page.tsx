'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SubmissionList } from "@/components/admin/submission-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExams } from '@/services/examService';
import { getSubmissions } from '@/services/submissionService';
import type { Submission, Exam, User } from '@/lib/types';
import { FileText, Loader2, RotateCcw, Search } from "lucide-react";
import { formatInTimeZone } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import { findUserByEmployeeId } from '@/services/userService';

const normalizeHeadquarters = (headquarters?: string) =>
  (headquarters || '').replace('採点', '').trim();

const normalizeSearchText = (value?: string) =>
  (value || '').normalize('NFKC').replace(/\s/g, '').toLocaleLowerCase('ja-JP');

type SubmissionType = '筆記' | '動画';
type SubmissionStatusName = '合格' | '不合格' | '本部採点中' | '人事確認中' | '授業審査待ち' | '完了' | '不明';

const statusOptions: SubmissionStatusName[] = [
  '本部採点中',
  '人事確認中',
  '授業審査待ち',
  '合格',
  '不合格',
  '完了',
  '不明',
];

export default function ReviewListPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState<'all' | SubmissionType>('all');
  const [headquartersFilter, setHeadquartersFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatusName>('all');

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

  const examsMap = useMemo(() => exams.reduce((accumulator, exam) => {
    accumulator[exam.id] = exam;
    return accumulator;
  }, {} as Record<string, Exam>), [exams]);

  const getSubmissionType = (submission: Submission): SubmissionType => {
    const exam = examsMap[submission.examId];
    if (submission.lessonReviewUrl || exam?.title === '授業動画提出' || submission.status === '授業審査待ち') {
      return '動画';
    }
    return '筆記';
  };

  const getSubmissionStatusName = (submission: Submission): SubmissionStatusName => {
    switch (submission.status) {
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
        return '不明';
    }
  };

  const headquartersOptions = useMemo(() => [...new Set(
    visibleSubmissions
      .map((submission) => submission.examineeHeadquarters)
      .filter((headquarters): headquarters is string => Boolean(headquarters)),
  )].sort((a, b) => a.localeCompare(b, 'ja')), [visibleSubmissions]);

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    return visibleSubmissions.filter((submission) => {
      const matchesSearch = !normalizedQuery || [
        examsMap[submission.examId]?.title,
        submission.examineeName,
        submission.examineeHeadquarters,
      ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
      const matchesType = submissionTypeFilter === 'all' || getSubmissionType(submission) === submissionTypeFilter;
      const matchesHeadquarters = headquartersFilter === 'all' || submission.examineeHeadquarters === headquartersFilter;
      const matchesStatus = statusFilter === 'all' || getSubmissionStatusName(submission) === statusFilter;

      return matchesSearch && matchesType && matchesHeadquarters && matchesStatus;
    });
  }, [examsMap, headquartersFilter, searchQuery, statusFilter, submissionTypeFilter, visibleSubmissions]);

  const hasActiveFilters = searchQuery.length > 0 || submissionTypeFilter !== 'all' || headquartersFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSubmissionTypeFilter('all');
    setHeadquartersFilter('all');
    setStatusFilter('all');
  };

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

    const rows = filteredSubmissions.map((submission) => {
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
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="min-w-60 flex-1">
                  <Label htmlFor="submission-search">検索</Label>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="submission-search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="試験名・受験者名・本部名で検索"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-36">
                  <Label htmlFor="submission-type-filter">提出タイプ</Label>
                  <Select value={submissionTypeFilter} onValueChange={(value: 'all' | SubmissionType) => setSubmissionTypeFilter(value)}>
                    <SelectTrigger id="submission-type-filter" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="筆記">筆記</SelectItem>
                      <SelectItem value="動画">動画</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isSystemAdministrator && (
                  <div className="w-full sm:w-44">
                    <Label htmlFor="submission-headquarters-filter">本部</Label>
                    <Select value={headquartersFilter} onValueChange={setHeadquartersFilter}>
                      <SelectTrigger id="submission-headquarters-filter" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        {headquartersOptions.map((headquarters) => (
                          <SelectItem key={headquarters} value={headquarters}>{headquarters}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="w-full sm:w-40">
                  <Label htmlFor="submission-status-filter">ステータス</Label>
                  <Select value={statusFilter} onValueChange={(value: 'all' | SubmissionStatusName) => setStatusFilter(value)}>
                    <SelectTrigger id="submission-status-filter" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  条件をクリア
                </Button>
              </div>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                表示件数: {filteredSubmissions.length}件 / {visibleSubmissions.length}件
              </p>
              <SubmissionList
                submissions={filteredSubmissions}
                exams={exams}
                isSystemAdministrator={isSystemAdministrator}
                hasActiveFilters={hasActiveFilters}
                onSubmissionDeleted={handleSubmissionDeleted}
                onSubmissionsVisibilityChanged={handleSubmissionsVisibilityChanged}
                onSubmissionsRefresh={refreshSubmissions}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
