
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Eye, Loader2 } from "lucide-react";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { getExams, deleteExam } from '@/services/examService';
import type { Exam } from '@/lib/types';

interface ExamListProps {
  isAdmin: boolean;
}

export function ExamList({ isAdmin }: ExamListProps) {
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedExams = await getExams();
      // Map legacy types for backward compatibility
      const mappedExams = fetchedExams.map(exam => {
        if ((exam.type as any) === 'Standard') {
          return { ...exam, type: 'WrittenOnly' };
        }
        if ((exam.type as any) === 'Promotion') {
          return { ...exam, type: 'WrittenAndInterview' };
        }
        return exam;
      });
      setExams(mappedExams);
    } catch (error) {
      console.error("Failed to fetch exams", error);
      toast({ title: "Error", description: "Failed to load exams.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const badgeVariants = cva(
      "capitalize",
      {
        variants: {
          status: {
            Published: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40",
            Draft: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40",
            Archived: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/40",
          },
        },
      }
    )
  
  const handleDelete = async (examId: string, examTitle: string) => {
    try {
      await deleteExam(examId);
      toast({
        title: "試験が削除されました",
        description: `「${examTitle}」は正常に削除されました。`,
      });
      fetchExams(); // Refresh the list
    } catch (error) {
      console.error(`Failed to delete exam ${examId}`, error);
      toast({
        title: "削除エラー",
        description: "試験の削除中にエラーが発生しました。",
        variant: "destructive"
      });
    }
  }

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary/90">
            <TableHead className="text-primary-foreground whitespace-nowrap text-center">タイトル</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap text-center">ステータス</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap text-center">タイプ</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap text-center">問題数</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap text-center">合計点</TableHead>
            <TableHead className="text-primary-foreground whitespace-nowrap text-center">時間</TableHead>
            <TableHead className="text-right text-primary-foreground whitespace-nowrap text-center">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => (
            <TableRow key={exam.id}>
              <TableCell className="font-medium">{exam.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className={badgeVariants({ status: exam.status })}>
                  {exam.status === 'Published' ? '公開' : exam.status === 'Draft' ? '下書き' : 'アーカイブ済み'}
                </Badge>
              </TableCell>
              <TableCell>
                 <Badge variant={exam.type === 'WrittenAndInterview' ? "destructive" : "secondary"}>
                    {exam.type === 'WrittenAndInterview' ? '筆記＋授業審査' : '筆記のみ'}
                 </Badge>
              </TableCell>
              <TableCell>{exam.questions.length} 問</TableCell>
              <TableCell>{exam.totalPoints} 点</TableCell>
              <TableCell>{exam.duration} 分</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center gap-2">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={`/exam/${exam.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">表示</span>
                        </Link>
                    </Button>
                    {isAdmin && (
                        <>
                            <Button variant="outline" size="icon" asChild>
                                <Link href={`/admin/create-exam?examId=${exam.id}`}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">編集</span>
                                </Link>
                            </Button>
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
                                            この操作は元に戻すことはできません。試験「{exam.title}」と関連するすべてのデータが完全に削除されます。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(exam.id, exam.title)} className="bg-destructive hover:bg-destructive/90">削除</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
