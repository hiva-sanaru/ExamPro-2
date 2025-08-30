
'use client';

import React from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { ReviewView } from '@/components/exam/review-view';
import { getExam } from '@/services/examService';
import type { Exam } from '@/lib/types';
import { Loader2 } from 'lucide-react';

function ReviewPageContent() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const [exam, setExam] = React.useState<Exam | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!examId) return;

    const examineeInfo = localStorage.getItem(`exam-examinee-info`);
    if (!examineeInfo) {
      router.replace(`/exam/${examId}/start`);
      return;
    }

    getExam(examId)
      .then((examData) => {
        if (!examData) {
          notFound();
        } else {
          setExam(examData);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch exam', err);
        notFound();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [examId, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!exam) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="space-y-4 text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">回答の確認</h1>
        <p className="text-muted-foreground text-lg">
          提出前に回答を注意深く確認してください。
        </p>
      </div>
      <ReviewView exam={exam} />
    </div>
  );
}

export default function ReviewPage() {
  return <ReviewPageContent />;
}
