
'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";
import { getExams } from "@/services/examService";
import type { Exam } from "@/lib/types";
import { useEffect, useState } from "react";

function ExamineePortal() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const allExams = await getExams();
                setExams(allExams.filter(e => e.status === 'Published'));
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);


    return (
        <main className="flex min-h-screen flex-col items-center bg-muted/40 p-4 sm:p-8">
            <div className="w-full max-w-4xl space-y-8">
                <header className="space-y-2 text-center">
                    <h1 className="text-4xl font-bold font-headline">SANARUスタッフ昇給試験サイト</h1>
                    <p className="text-muted-foreground text-lg">
                        受験したい試験を選択して、指示に従ってください。
                    </p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>受験可能な試験</CardTitle>
                        <CardDescription>{exams.length} 件の試験が利用可能です。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : exams.length > 0 ? (
                            exams.map((exam) => (
                                <div key={exam.id} className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <h3 className="font-semibold">{exam.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            試験時間: {exam.duration}分 | 合計点: {exam.totalPoints}点
                                        </p>
                                    </div>
                                    <Button asChild>
                                        <Link href={`/exam/${exam.id}/start`}>
                                            受験する
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                現在、受験可能な試験はありません。
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <footer className="text-center text-sm text-muted-foreground pt-4">
                    © {new Date().getFullYear()} SANARUスタッフ昇給試験サイト. 無断複写・転載を禁じます。
                </footer>
            </div>
        </main>
    );
}

export default ExamineePortal;
