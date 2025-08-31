
'use client';

import { ExamView } from "@/components/exam/exam-view";
import { getExam } from "@/services/examService";
import { notFound, useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Exam } from "@/lib/types";

function ExamPageContent() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;
    const examineeInfo = localStorage.getItem(`exam-examinee-info`);
    if (!examineeInfo) {
      router.replace(`/exam/${examId}/start`);
      return;
    }

    const fetchExam = async () => {
      try {
        const examData = await getExam(examId);
        if (!examData) {
          notFound();
        } else {
          setExam(examData);
        }
      } catch (error) {
        console.error("Failed to fetch exam:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId, router]);


  if (loading || !exam) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <ExamView exam={exam} />;
}


export default function ExamPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ExamPageContent />
    </Suspense>
  );
}
