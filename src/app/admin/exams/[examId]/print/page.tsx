"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

import { ExamPrintPreview } from "@/components/admin/exam-print-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Exam } from "@/lib/types";
import { getExam } from "@/services/examService";
import { findUserByEmployeeId } from "@/services/userService";

type PageState =
  | { status: "loading" }
  | { status: "ready"; exam: Exam }
  | { status: "not-found" }
  | { status: "empty"; exam: Exam }
  | { status: "forbidden" }
  | { status: "error" };

function StatusCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground">{description}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            試験一覧へ戻る
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ExamPrintPage() {
  const params = useParams<{ examId: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadExam() {
      const employeeId = localStorage.getItem("loggedInUserEmployeeId");

      if (!employeeId) {
        if (isMounted) setState({ status: "forbidden" });
        return;
      }

      try {
        const user = await findUserByEmployeeId(employeeId);

        if (!user || user.role !== "system_administrator") {
          if (isMounted) setState({ status: "forbidden" });
          return;
        }

        const exam = await getExam(params.examId);
        if (!isMounted) return;

        if (!exam) {
          setState({ status: "not-found" });
        } else if (exam.questions.length === 0) {
          setState({ status: "empty", exam });
        } else {
          setState({ status: "ready", exam });
        }
      } catch (error) {
        console.error("Failed to load exam for printing", error);
        if (isMounted) setState({ status: "error" });
      }
    }

    loadExam();

    return () => {
      isMounted = false;
    };
  }, [params.examId]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-64 items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="sr-only">試験データを読み込んでいます</span>
      </div>
    );
  }

  if (state.status === "forbidden") {
    return (
      <StatusCard
        title="このページを表示できません"
        description="問題の出力はシステム管理者のみ利用できます。"
      />
    );
  }

  if (state.status === "not-found") {
    return (
      <StatusCard
        title="試験が見つかりません"
        description="指定された試験は削除されたか、存在しない可能性があります。"
      />
    );
  }

  if (state.status === "error") {
    return (
      <StatusCard
        title="試験を読み込めませんでした"
        description="通信状況を確認してから、もう一度お試しください。"
      />
    );
  }

  if (state.status === "empty") {
    return (
      <StatusCard
        title={state.exam.title}
        description="この試験には出力できる問題が登録されていません。"
      />
    );
  }

  return <ExamPrintPreview exam={state.exam} />;
}
