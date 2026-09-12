"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Exam, Question } from "@/lib/types";

interface ExamPrintPreviewProps {
  exam: Exam;
}

interface PrintFieldProps {
  label: string;
  value?: string | string[];
}

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function PrintField({ label, value }: PrintFieldProps) {
  const answers = Array.isArray(value) ? value : null;

  return (
    <div className="exam-print-field space-y-1.5">
      <h3 className="exam-print-field-title text-sm font-bold text-slate-700">
        {label}
      </h3>
      <div className="exam-print-field-content whitespace-pre-wrap break-words text-[11pt] leading-relaxed [overflow-wrap:anywhere]">
        {answers ? (
          answers.length > 0 ? (
            <ol className="list-decimal space-y-1 pl-6">
              {answers.map((answer, index) => (
                <li key={index}>{hasText(answer) ? answer : "未設定"}</li>
              ))}
            </ol>
          ) : (
            <p>未設定</p>
          )
        ) : (
          <p>{typeof value === "string" && hasText(value) ? value : "未設定"}</p>
        )}
      </div>
    </div>
  );
}

function QuestionFields({ question }: { question: Question }) {
  return (
    <div className="space-y-4">
      <PrintField label="問題文" value={question.text} />
      <PrintField label="模範解答" value={question.modelAnswer} />
      <PrintField label="採点基準" value={question.gradingCriteria} />
    </div>
  );
}

export function ExamPrintPreview({ exam }: ExamPrintPreviewProps) {
  return (
    <div className="exam-print-shell mx-auto max-w-5xl space-y-6">
      <div className="exam-print-actions flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            試験一覧へ戻る
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          印刷・PDF保存
        </Button>
      </div>

      <article className="exam-print-document mx-auto w-full bg-white px-8 py-10 text-slate-950 shadow-sm ring-1 ring-slate-200 print:p-0 print:shadow-none print:ring-0">
        <header className="exam-print-header border-b-2 border-slate-800 pb-4">
          <h1 className="break-words text-center text-2xl font-bold [overflow-wrap:anywhere]">
            {exam.title}
          </h1>
        </header>

        <div className="mt-8 space-y-8">
          {exam.questions.map((question, questionIndex) => (
            <section
              className="exam-print-question border-b border-slate-300 pb-8 last:border-b-0 last:pb-0"
              key={question.id ?? questionIndex}
            >
              <h2 className="exam-print-question-heading mb-4 text-lg font-bold">
                問題 {questionIndex + 1}
              </h2>
              <QuestionFields question={question} />

              {question.subQuestions && question.subQuestions.length > 0 && (
                <div className="mt-6 space-y-6 border-l-2 border-slate-300 pl-5">
                  {question.subQuestions.map((subQuestion, subQuestionIndex) => (
                    <section
                      className="exam-print-subquestion space-y-4"
                      key={subQuestion.id ?? subQuestionIndex}
                    >
                      <h3 className="exam-print-question-heading text-base font-bold">
                        サブ問題 {questionIndex + 1}-{subQuestionIndex + 1}
                      </h3>
                      <QuestionFields question={subQuestion} />
                    </section>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
