"use client";

import React, { useEffect, useMemo, useState } from 'react';
import type { Submission, Exam } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cva } from "class-variance-authority";
import { formatInTimeZone } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import Link from "next/link";
import { FilePen, Loader2, Trash2, Link as LinkIcon, ArrowUpDown, FileText, Video } from "lucide-react";
import {
  deleteSubmission,
  updateSubmission,
  updateSubmissionsHeadquartersVisibility,
} from "@/services/submissionService";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type SortableKeys = keyof Submission | 'examTitle' | 'statusName' | 'submissionType';
type SubmissionStatusName = '合格' | '不合格' | '本部採点中' | '人事確認中' | '授業審査待ち' | '完了' | '不明';

interface SubmissionListProps {
  submissions: Submission[];
  exams: Exam[];
  isSystemAdministrator: boolean;
  onSubmissionDeleted: (submissionId: string) => void;
  onSubmissionsVisibilityChanged: (submissionIds: string[], hiddenFromHeadquarters: boolean) => void;
  onSubmissionsRefresh: () => Promise<void>;
}

export function SubmissionList({
  submissions,
  exams,
  isSystemAdministrator,
  onSubmissionDeleted,
  onSubmissionsVisibilityChanged,
  onSubmissionsRefresh,
}: SubmissionListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisibilityUpdating, setIsVisibilityUpdating] = useState(false);
  const [localSubmissions, setLocalSubmissions] = useState(submissions);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({
    key: 'submittedAt',
    direction: 'descending',
  });
  const { toast } = useToast();

  useEffect(() => {
    setLocalSubmissions(submissions);
    setSelectedSubmissionIds((previous) => {
      const availableIds = new Set(submissions.map((submission) => submission.id));
      return new Set([...previous].filter((submissionId) => availableIds.has(submissionId)));
    });
  }, [submissions]);

  useEffect(() => {
    setIsLoading(false);
  }, [submissions, exams]);

  const examsMap = useMemo(() => {
    return exams.reduce((accumulator, exam) => {
      accumulator[exam.id] = exam;
      return accumulator;
    }, {} as Record<string, Exam>);
  }, [exams]);

  const getSubmissionType = (submission: Submission): '筆記' | '動画' => {
    const exam = examsMap[submission.examId];
    const examTitle = exam?.title || '';

    if (submission.lessonReviewUrl || examTitle === '授業動画提出' || submission.status === '授業審査待ち') {
      return '動画';
    }
    return '筆記';
  };

  const badgeVariants = cva('capitalize', {
    variants: {
      status: {
        合格: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40',
        不合格: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40',
        本部採点中: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40',
        人事確認中: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/40',
        授業審査待ち: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40',
        完了: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/40',
        不明: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/40',
      },
    },
  });

  const getStatusName = (submission: Submission): SubmissionStatusName => {
    if (!submission.status) return '本部採点中';

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

  const sortedSubmissions = useMemo(() => {
    const sortableItems = [...localSubmissions];
    if (!sortConfig) return sortableItems;

    sortableItems.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (sortConfig.key === 'examTitle') {
        aValue = a.examId === 'lesson-review-only' || a.status === '授業審査待ち' ? '授業動画提出' : examsMap[a.examId]?.title || '';
        bValue = b.examId === 'lesson-review-only' || b.status === '授業審査待ち' ? '授業動画提出' : examsMap[b.examId]?.title || '';
      } else if (sortConfig.key === 'statusName') {
        aValue = getStatusName(a);
        bValue = getStatusName(b);
      } else if (sortConfig.key === 'submissionType') {
        aValue = getSubmissionType(a);
        bValue = getSubmissionType(b);
      } else {
        aValue = a[sortConfig.key as keyof Submission];
        bValue = b[sortConfig.key as keyof Submission];
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'ascending'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortConfig.direction === 'ascending'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }

      const comparison = String(aValue ?? '').localeCompare(String(bValue ?? ''), 'ja');
      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });

    return sortableItems;
  }, [examsMap, localSubmissions, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    const direction = sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-3 w-3" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const handleResultCommunicatedChange = async (submission: Submission) => {
    const resultCommunicated = !submission.resultCommunicated;

    setLocalSubmissions((previous) => previous.map((item) =>
      item.id === submission.id ? { ...item, resultCommunicated } : item,
    ));

    try {
      await updateSubmission(submission.id, { resultCommunicated });
      toast({ title: 'ステータスが更新されました', description: '結果伝達ステータスが変更されました。' });
    } catch (error) {
      setLocalSubmissions((previous) => previous.map((item) =>
        item.id === submission.id ? { ...item, resultCommunicated: !resultCommunicated } : item,
      ));
      toast({ title: '更新エラー', description: 'ステータスの更新中にエラーが発生しました。', variant: 'destructive' });
      console.error('Failed to update submission status:', error);
    }
  };

  const handleHeadquartersVisibilityChange = async (submissionIds: string[], hiddenFromHeadquarters: boolean) => {
    if (submissionIds.length === 0) return;

    setIsVisibilityUpdating(true);
    try {
      await updateSubmissionsHeadquartersVisibility(submissionIds, hiddenFromHeadquarters);
      setLocalSubmissions((previous) => previous.map((submission) =>
        submissionIds.includes(submission.id)
          ? { ...submission, hiddenFromHeadquarters }
          : submission,
      ));
      onSubmissionsVisibilityChanged(submissionIds, hiddenFromHeadquarters);
      setSelectedSubmissionIds((previous) => {
        const next = new Set(previous);
        submissionIds.forEach((submissionId) => next.delete(submissionId));
        return next;
      });
      toast({
        title: hiddenFromHeadquarters ? '本部から非表示にしました' : '本部に再表示しました',
        description: `${submissionIds.length}件の提出結果を更新しました。`,
      });
    } catch (error) {
      try {
        await onSubmissionsRefresh();
      } catch (refreshError) {
        console.error('Failed to refresh submissions after visibility update error:', refreshError);
      }
      toast({
        title: '更新エラー',
        description: '本部表示設定を更新できませんでした。最新の状態を再読み込みしました。',
        variant: 'destructive',
      });
      console.error('Failed to update headquarters visibility:', error);
    } finally {
      setIsVisibilityUpdating(false);
    }
  };

  const handleDelete = async (submissionId: string) => {
    try {
      await deleteSubmission(submissionId);
      toast({ title: '提出物が削除されました' });
      onSubmissionDeleted(submissionId);
    } catch (error) {
      console.error(`Failed to delete submission ${submissionId}`, error);
      toast({ title: '削除エラー', description: '提出物の削除中にエラーが発生しました。', variant: 'destructive' });
    }
  };

  const toggleSelectedSubmission = (submissionId: string, checked: boolean) => {
    setSelectedSubmissionIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(submissionId);
      else next.delete(submissionId);
      return next;
    });
  };

  const allVisibleRowsSelected = sortedSubmissions.length > 0 && sortedSubmissions.every((submission) => selectedSubmissionIds.has(submission.id));
  const someVisibleRowsSelected = sortedSubmissions.some((submission) => selectedSubmissionIds.has(submission.id));
  const selectedIds = [...selectedSubmissionIds];
  const columnCount = isSystemAdministrator ? 11 : 9;

  return (
    <TooltipProvider>
      {isSystemAdministrator && selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selectedIds.length}件を選択中</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="secondary" disabled={isVisibilityUpdating}>本部から非表示</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本部から非表示にしますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  選択した{selectedIds.length}件の提出結果は本部管理者の一覧、CSV、詳細画面から見えなくなります。データは削除されず、後から再表示できます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleHeadquartersVisibilityChange(selectedIds, true)}>
                  非表示にする
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={isVisibilityUpdating}>本部に再表示</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本部に再表示しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  選択した{selectedIds.length}件の提出結果を、本部管理者が再び参照できる状態に戻します。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleHeadquartersVisibilityChange(selectedIds, false)}>
                  再表示する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary/90">
              {isSystemAdministrator && (
                <TableHead className="w-10 text-primary-foreground">
                  <Checkbox
                    checked={allVisibleRowsSelected || (someVisibleRowsSelected ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => {
                      setSelectedSubmissionIds(checked === true ? new Set(sortedSubmissions.map((submission) => submission.id)) : new Set());
                    }}
                    disabled={isVisibilityUpdating || sortedSubmissions.length === 0}
                    aria-label="表示中の提出物をすべて選択"
                  />
                </TableHead>
              )}
              <TableHead className="text-primary-foreground whitespace-nowrap">
                <Button variant="ghost" onClick={() => requestSort('examTitle')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  試験名 {getSortIndicator('examTitle')}
                </Button>
              </TableHead>
              <TableHead className="text-primary-foreground whitespace-nowrap">
                <Button variant="ghost" onClick={() => requestSort('submissionType')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  提出タイプ {getSortIndicator('submissionType')}
                </Button>
              </TableHead>
              <TableHead className="text-primary-foreground whitespace-nowrap">
                <Button variant="ghost" onClick={() => requestSort('examineeName')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  受験者名 {getSortIndicator('examineeName')}
                </Button>
              </TableHead>
              <TableHead className="text-primary-foreground whitespace-nowrap">
                <Button variant="ghost" onClick={() => requestSort('examineeHeadquarters')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  本部 {getSortIndicator('examineeHeadquarters')}
                </Button>
              </TableHead>
              <TableHead className="text-primary-foreground whitespace-nowrap text-center">
                <Button variant="ghost" onClick={() => requestSort('submittedAt')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  提出日時 {getSortIndicator('submittedAt')}
                </Button>
              </TableHead>
              <TableHead className="text-primary-foreground whitespace-nowrap text-center">
                <Button variant="ghost" onClick={() => requestSort('statusName')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  ステータス {getSortIndicator('statusName')}
                </Button>
              </TableHead>
              <TableHead className="text-primary-foreground whitespace-nowrap text-center">
                <Button variant="ghost" onClick={() => requestSort('lessonReviewUrl')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  URL {getSortIndicator('lessonReviewUrl')}
                </Button>
              </TableHead>
              <TableHead className="text-primary-foreground whitespace-nowrap text-center">
                <Button variant="ghost" onClick={() => requestSort('resultCommunicated')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                  結果伝達 {getSortIndicator('resultCommunicated')}
                </Button>
              </TableHead>
              {isSystemAdministrator && <TableHead className="text-center text-primary-foreground whitespace-nowrap">本部表示</TableHead>}
              <TableHead className="text-right text-primary-foreground whitespace-nowrap">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : sortedSubmissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">提出物はまだありません。</TableCell>
              </TableRow>
            ) : sortedSubmissions.map((submission) => {
              const exam = examsMap[submission.examId];
              const statusName = getStatusName(submission);
              const submissionType = getSubmissionType(submission);
              const examTitle = submissionType === '動画' ? '授業動画提出' : exam?.title || '－';
              const isHiddenFromHeadquarters = submission.hiddenFromHeadquarters === true;

              return (
                <TableRow key={submission.id} data-headquarters-visibility={isHiddenFromHeadquarters ? 'hidden' : 'visible'}>
                  {isSystemAdministrator && (
                    <TableCell>
                      <Checkbox
                        checked={selectedSubmissionIds.has(submission.id)}
                        onCheckedChange={(checked) => toggleSelectedSubmission(submission.id, checked === true)}
                        disabled={isVisibilityUpdating}
                        aria-label={`${submission.examineeName || '提出物'}を選択`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium whitespace-nowrap">{examTitle}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={submissionType === '動画' ? 'destructive' : 'secondary'} className="gap-1.5">
                      {submissionType === '動画' ? <Video className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      {submissionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{submission.examineeName || '－'}</TableCell>
                  <TableCell className="whitespace-nowrap">{submission.examineeHeadquarters?.replace('本部', '') || '－'}</TableCell>
                  <TableCell className="whitespace-nowrap text-center">{formatInTimeZone(submission.submittedAt, 'Asia/Tokyo', 'yy/MM/dd HH:mm', { locale: ja })}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <Badge variant="outline" className={badgeVariants({ status: statusName })}>{statusName}</Badge>
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {submission.lessonReviewUrl ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={submission.lessonReviewUrl} target="_blank" rel="noopener noreferrer">
                              <LinkIcon className="h-4 w-4 text-blue-500" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{submission.lessonReviewUrl}</p></TooltipContent>
                      </Tooltip>
                    ) : '－'}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <Checkbox
                      id={`comm-${submission.id}`}
                      checked={!!submission.resultCommunicated}
                      onCheckedChange={() => handleResultCommunicatedChange(submission)}
                      disabled={!isSystemAdministrator}
                      aria-label="結果伝達済み"
                    />
                  </TableCell>
                  {isSystemAdministrator && (
                    <TableCell className="text-center whitespace-nowrap">
                      <label className="inline-flex items-center gap-2">
                        <Checkbox
                          checked={!isHiddenFromHeadquarters}
                          onCheckedChange={(checked) => handleHeadquartersVisibilityChange([submission.id], checked !== true)}
                          disabled={isVisibilityUpdating}
                          aria-label={`${submission.examineeName || '提出物'}を本部に表示`}
                        />
                        <Badge variant={isHiddenFromHeadquarters ? 'secondary' : 'outline'}>
                          {isHiddenFromHeadquarters ? '非表示' : '表示中'}
                        </Badge>
                      </label>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/admin/review/${submission.id}`}>
                          <FilePen className="h-4 w-4" />
                          <span className="sr-only">採点</span>
                        </Link>
                      </Button>
                      {isSystemAdministrator && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">削除</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                              <AlertDialogDescription>
                                この操作は元に戻すことはできません。この提出物と関連するすべての採点データが完全に削除されます。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(submission.id)} className="bg-destructive hover:bg-destructive/90">
                                削除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
