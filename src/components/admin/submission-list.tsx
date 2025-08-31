
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { User, Submission, Exam } from "@/lib/types";
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
import { FilePen, Loader2, Trash2, Link as LinkIcon, ArrowUpDown } from "lucide-react";
import { updateSubmission, deleteSubmission } from "@/services/submissionService";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { findUserByEmployeeId } from '@/services/userService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type SortableKeys = keyof Submission | 'examTitle' | 'statusName';

interface SubmissionListProps {
    submissions: Submission[];
    exams: Exam[];
    onSubmissionDeleted: (submissionId: string) => void;
}

export function SubmissionList({ submissions, exams, onSubmissionDeleted }: SubmissionListProps) {
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [localSubmissions, setLocalSubmissions] = useState(submissions);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'submittedAt', direction: 'descending' });

    useEffect(() => {
        const fetchLoggedInUser = async () => {
            const employeeId = localStorage.getItem('loggedInUserEmployeeId');
            if (employeeId) {
                try {
                    const user = await findUserByEmployeeId(employeeId);
                    setCurrentUser(user);
                } catch (error) {
                    console.error("Failed to fetch user", error)
                }
            }
        };
        fetchLoggedInUser();
    }, []);

    useEffect(() => {
        setLocalSubmissions(submissions);
    }, [submissions]);

    useEffect(() => {
        if (submissions.length > 0 && exams.length > 0) {
            setIsLoading(false);
        }
        if (submissions.length === 0 && exams.length >= 0) {
            setIsLoading(false);
        }
    }, [submissions, exams]);
    
    const examsMap = useMemo(() => {
        return exams.reduce((acc, exam) => {
            acc[exam.id] = exam;
            return acc;
        }, {} as Record<string, Exam>);
    }, [exams]);
    
    const getStatusName = (submission: Submission): keyof typeof badgeVariants.propTypes.status => {
        switch (submission.status) {
            case 'Submitted': return '本部採点中';
            case '人事確認中': return '人事確認中';
            case '授業審査待ち': return '授業審査待ち';
            case '合格': return '合格';
            case '不合格': return '不合格';
            case 'Completed': return '完了';
            default: return '不明';
        }
    }

    const sortedSubmissions = useMemo(() => {
        let sortableItems = [...localSubmissions];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'examTitle') {
                    aValue = examsMap[a.examId]?.title || '';
                    bValue = examsMap[b.examId]?.title || '';
                } else if (sortConfig.key === 'statusName') {
                    aValue = getStatusName(a);
                    bValue = getStatusName(b);
                } else {
                    aValue = a[sortConfig.key as keyof Submission];
                    bValue = b[sortConfig.key as keyof Submission];
                }

                if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
                
                if (aValue instanceof Date && bValue instanceof Date) {
                    if (aValue.getTime() < bValue.getTime()) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue.getTime() > bValue.getTime()) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [localSubmissions, sortConfig, examsMap]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-3 w-3" />;
        }
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };


    const handleCheckboxChange = async (submission: Submission) => {
        const updatedStatus = !submission.resultCommunicated;

        setLocalSubmissions(prev => 
            prev.map(s => 
                s.id === submission.id ? { ...s, resultCommunicated: updatedStatus } : s
            )
        );

        try {
            await updateSubmission(submission.id, { resultCommunicated: updatedStatus });
            toast({
                title: "ステータスが更新されました",
                description: `結果伝達ステータスが変更されました。`,
            });
        } catch (error) {
            setLocalSubmissions(prev => 
                prev.map(s => 
                    s.id === submission.id ? { ...s, resultCommunicated: !updatedStatus } : s
                )
            );
            toast({
                title: "更新エラー",
                description: "ステータスの更新中にエラーが発生しました。",
                variant: "destructive",
            });
            console.error("Failed to update submission status:", error);
        }
    };

    const handleDelete = async (submissionId: string) => {
        try {
            await deleteSubmission(submissionId);
            toast({
                title: "提出物が削除されました",
            });
            onSubmissionDeleted(submissionId);
        } catch (error) {
            console.error(`Failed to delete submission ${submissionId}`, error);
            toast({
                title: "削除エラー",
                description: "提出物の削除中にエラーが発生しました。",
                variant: "destructive"
            });
        }
    }


    const badgeVariants = cva(
        "capitalize",
        {
          variants: {
            status: {
              合格: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40",
              不合格: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40",
              本部採点中: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40",
              人事確認中: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/40",
              授業審査待ち: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40",
              完了: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/40",
              "不明": "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/40",
            },
          },
        }
    )

  return (
    <TooltipProvider>
        <div className="rounded-lg border">
        <Table>
            <TableHeader>
            <TableRow className="bg-primary hover:bg-primary/90">
                <TableHead className="text-primary-foreground whitespace-nowrap">
                    <Button variant="ghost" onClick={() => requestSort('examTitle')} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground p-2">
                        試験名 {getSortIndicator('examTitle')}
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
                <TableHead className="text-right text-primary-foreground whitespace-nowrap">アクション</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            ) : sortedSubmissions.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        提出物はまだありません。
                    </TableCell>
                </TableRow>
            ) : (
                sortedSubmissions.map((submission) => {
                    const exam = examsMap[submission.examId];
                    const statusName = getStatusName(submission);
                    return (
                        <TableRow key={submission.id}>
                            <TableCell className="font-medium whitespace-nowrap">{exam?.title || '－'}</TableCell>
                            <TableCell className="whitespace-nowrap">{submission.examineeName || '－'}</TableCell>
                            <TableCell className="whitespace-nowrap">{submission.examineeHeadquarters?.replace('本部', '') || '－'}</TableCell>
                            <TableCell className="whitespace-nowrap text-center">{formatInTimeZone(submission.submittedAt, 'Asia/Tokyo', "yy/MM/dd HH:mm", { locale: ja })}</TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                                <Badge variant="outline" className={badgeVariants({ status: statusName })}>
                                    {statusName}
                                </Badge>
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
                                    <TooltipContent>
                                        <p>{submission.lessonReviewUrl}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                '－'
                            )}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                                <Checkbox 
                                    id={`comm-${submission.id}`}
                                    checked={!!submission.resultCommunicated}
                                    onCheckedChange={() => handleCheckboxChange(submission)}
                                    disabled={currentUser?.role !== 'system_administrator'}
                                    aria-label="結果伝達済み"
                                />
                            </TableCell>
                            <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                                <Button variant="outline" size="icon" asChild>
                                <Link href={`/admin/review/${submission.id}`}>
                                    <FilePen className="h-4 w-4" />
                                    <span className="sr-only">採点</span>
                                </Link>
                                </Button>
                                {currentUser?.role === 'system_administrator' && (
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
                                        <AlertDialogAction
                                        onClick={() => handleDelete(submission.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                        >
                                        削除
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                )}
                            </div>
                            </TableCell>
                        </TableRow>
                    )
                })
            )}
            </TableBody>
        </Table>
        </div>
    </TooltipProvider>
  );
}

    