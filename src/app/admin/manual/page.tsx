
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function ManualPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">操作マニュアル</h1>
        <p className="text-muted-foreground">システムの基本的な使い方や機能について説明します。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            <span>コンテンツ</span>
          </CardTitle>
          <CardDescription>
            各セクションをクリックして詳細を確認してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">試験の作成方法</h3>
                <p className="text-muted-foreground mt-1">
                    新しい試験を作成し、問題を追加する手順について説明します。
                </p>
            </div>
             <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">AI採点機能の使い方</h3>
                <p className="text-muted-foreground mt-1">
                    AIによる自動採点機能の活用方法と、結果のレビュー手順を解説します。
                </p>
            </div>
             <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">ユーザー管理</h3>
                <p className="text-muted-foreground mt-1">
                    新しいユーザーの追加、役割の変更、削除方法について説明します。
                </p>
            </div>
             <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">よくある質問 (FAQ)</h3>
                <p className="text-muted-foreground mt-1">
                    システム利用時によくある質問とその回答をまとめています。
                </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
