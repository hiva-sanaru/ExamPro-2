
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Eye, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { updateSubmission, deleteSubmission } from "@/services/submissionService";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { findUserByEmployeeId } from '@/services/userService';


interface SubmissionListProps {
    submissions: Submission[];
    exams: Exam[];
    users: User[];
}

export function SubmissionList({ submissions, exams, users }: SubmissionListProps) {
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Use a local state to manage submissions to reflect checkbox changes instantly
    const [localSubmissions, setLocalSubmissions] = useState(submissions);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

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
        if (submissions.length > 0 && exams.length > 0 && users.length > 0) {
            setIsLoading(false);
        }
        // Handle case where there are no submissions
        if (submissions.length === 0) {
            setIsLoading(false);
        }
    }, [submissions, exams, users]);


    const usersMap = useMemo(() => {
        return users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {} as Record<string, User>);
    }, [users]);
    
    const examsMap = useMemo(() => {
        return exams.reduce((acc, exam) => {
            acc[exam.id] = exam;
            return acc;
        }, {} as Record<string, Exam>);
    }, [exams]);

    const handleCheckboxChange = async (submission: Submission) => {
        const updatedStatus = !submission.resultCommunicated;

        // Optimistically update the UI
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
            // Revert on error
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
            // Refresh the list by filtering out the deleted submission
            setLocalSubmissions(prev => prev.filter(s => s.id !== submissionId));
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
              Completed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40",
              Submitted: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40",
              Grading: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40",
              "In Progress": "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/40",
              "不明": "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/40",
            },
          },
        }
    )

    const getStatusName = (status: Submission['status']) => {
        switch(status) {
            case 'Completed': return '完了';
            case 'Submitted': return '提出済み';
            case 'Grading': return '採点中';
            case 'In Progress': return '進行中';
            default: return '不明';
        }
    }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary/90">
            <TableHead className="text-primary-foreground whitespace-nowrap">試験名</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap">受験者名</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap">本部</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap">提出日時</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap">ステータス</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap">結果伝達</TableHead>
            <TableHead className="text-right text-primary-foreground whitespace-nowrap">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
            </TableRow>
          ) : localSubmissions.length === 0 ? (
             <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                    提出物はまだありません。
                </TableCell>
            </TableRow>
          ) : (
            localSubmissions.map((submission) => {
                const exam = examsMap[submission.examId];
                const examinee = usersMap[submission.examineeId];
                const statusName = getStatusName(submission.status);
                return (
                    <TableRow key={submission.id}>
                        <TableCell className="font-medium whitespace-nowrap">{exam?.title || '－'}</TableCell>
                        <TableCell className="whitespace-nowrap">{examinee?.name || '－'}</TableCell>
                        <TableCell className="whitespace-nowrap">{submission.examineeHeadquarters?.replace('本部', '') || '－'}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatInTimeZone(submission.submittedAt, 'Asia/Tokyo', "yy/MM/dd", { locale: ja })}</TableCell>
                        <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className={badgeVariants({ status: statusName as any })}>
                                {statusName}
                            </Badge>
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
                        <TableCell className="text-right whitespace-nowrap">
                             <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">アクション</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                           <Link href={`/admin/review/${submission.id}`}><Eye className="mr-2 h-4 w-4"/>採点</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className="text-destructive hover:!text-destructive focus:!text-destructive" onSelect={(e) => e.preventDefault()}>
                                                <Trash2 className="mr-2 h-4 w-4"/>削除
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            この操作は元に戻すことはできません。この提出物と関連するすべての採点データが完全に削除されます。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(submission.id)} className="bg-destructive hover:bg-destructive/90">削除</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                )
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
