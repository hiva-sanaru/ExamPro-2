
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, AlertCircle, Wand2, Users, HelpCircle, ChevronDown } from "lucide-react";

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
          <Accordion type="multiple" className="w-full space-y-4">
            
            <AccordionItem value="item-1" className="border rounded-lg px-4 bg-muted/30">
              <div className="flex items-center justify-between w-full">
                <AccordionTrigger noChevron className="flex-1 text-left hover:no-underline p-0 py-3">
                    <div className="flex items-center gap-3">
                      <Wand2 className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-left">試験の作成方法</h3>
                        <p className="text-sm text-muted-foreground font-normal mt-1">
                          新しい試験を作成し、問題を追加する手順について説明します。
                        </p>
                      </div>
                    </div>
                </AccordionTrigger>
                <AccordionTrigger noChevron className="p-2">
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionTrigger>
              </div>
              <AccordionContent className="prose prose-sm max-w-none text-foreground pt-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong>試験管理画面へ移動:</strong> サイドメニューから「試験管理」をクリックします。</li>
                  <li><strong>試験作成ボタン:</strong> 画面右上にある「試験を作成」ボタンをクリックして、試験作成ページに移動します。</li>
                  <li><strong>試験詳細の入力:</strong> 試験タイトル、試験時間（分）、ステータス（下書き/公開）、試験タイプ（筆記のみ/筆記＋授業審査）を入力・選択します。</li>
                  <li><strong>問題の追加:</strong> 「問題を追加」ボタンをクリックして、新しい問題カードを追加します。</li>
                  <li><strong>問題内容の入力:</strong> 問題タイプ（記述式、穴埋め、選択式）、配点、制限時間、問題文、模範解答、採点基準をそれぞれ入力します。</li>
                  <li><strong>サブ問題の追加:</strong> 必要に応じて、「サブ問題を追加」ボタンから、問題に付随する小問を作成できます。</li>
                  <li><strong>保存:</strong> 「一時保存」または「試験を保存」ボタンをクリックして、内容を保存します。</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border rounded-lg px-4 bg-muted/30">
               <div className="flex items-center justify-between w-full">
                  <AccordionTrigger noChevron className="flex-1 text-left hover:no-underline p-0 py-3">
                     <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-left">AI採点機能の使い方</h3>
                        <p className="text-sm text-muted-foreground font-normal mt-1">
                          AIによる自動採点機能の活用方法と、結果のレビュー手順を解説します。
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionTrigger noChevron className="p-2">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </AccordionTrigger>
                </div>
              <AccordionContent className="prose prose-sm max-w-none text-foreground pt-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2">
                    <li><strong>提出物レビュー画面へ:</strong> サイドメニューから「提出物」をクリックし、採点したい提出物をリストから選択します。</li>
                    <li><strong>AI一括採点の実行:</strong> レビュー画面の上部にある「AIで一括採点」ボタンをクリックします。採点が完了するまで数秒お待ちください。</li>
                    <li><strong>AI採点結果の確認:</strong> 各問題カードに、AIが算出したスコアと採点根拠が表示されます。</li>
                    <li><strong>スコアの調整:</strong> AIの採点結果を参考に、必要に応じて手動でスコアを修正することができます。入力欄に新しいスコアを入力してください。</li>
                    <li><strong>全体フィードバックの入力:</strong> ページ下部のフィードバック欄に、受験者への全体的なコメントを記入します。</li>
                    <li><strong>レビューの送信:</strong> 全ての確認と修正が完了したら、「レビューを送信」ボタンをクリックして採点を完了します。</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border rounded-lg px-4 bg-muted/30">
              <div className="flex items-center justify-between w-full">
                <AccordionTrigger noChevron className="flex-1 text-left hover:no-underline p-0 py-3">
                   <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-left">ユーザー管理</h3>
                      <p className="text-sm text-muted-foreground font-normal mt-1">
                        新しいユーザーの追加、役割の変更、削除方法について説明します。
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionTrigger noChevron className="p-2">
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionTrigger>
              </div>
              <AccordionContent className="prose prose-sm max-w-none text-foreground pt-2 pb-4">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>ユーザーの追加:</strong> 「ユーザー管理」画面の右上にある「ユーザーを追加」ボタンをクリックし、表示されたフォームに名前、社員番号、パスワード、役割、本部を入力して作成します。</li>
                  <li><strong>ユーザーの編集:</strong> ユーザーリストの各行の右端にあるアクションメニュー（•••）から「編集」を選択します。パスワードは変更する場合のみ入力してください。社員番号は編集できません。</li>
                  <li><strong>ユーザーの削除:</strong> アクションメニューから「削除」を選択します。確認ダイアログが表示されるので、再度「削除」をクリックするとユーザーが完全に削除されます。この操作は元に戻せません。</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="border rounded-lg px-4 bg-muted/30">
              <div className="flex items-center justify-between w-full">
                <AccordionTrigger noChevron className="flex-1 text-left hover:no-underline p-0 py-3">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-left">よくある質問 (FAQ)</h3>
                      <p className="text-sm text-muted-foreground font-normal mt-1">
                        システム利用時によくある質問とその回答をまとめています。
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionTrigger noChevron className="p-2">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionTrigger>
              </div>
              <AccordionContent className="prose prose-sm max-w-none text-foreground pt-2 pb-4">
                <dl className="space-y-4">
                    <div>
                        <dt className="font-semibold">Q. AIの採点結果は100%正確ですか？</dt>
                        <dd className="pl-4 mt-1">A. AIの採点は非常に高精度ですが、最終的な判断は必ず人間が行うことを推奨します。AIはあくまで強力なアシスタントであり、採点基準や模範解答の質によって精度が変動する可能性があります。必ず内容を確認し、必要に応じてスコアを修正してください。</dd>
                    </div>
                    <div>
                        <dt className="font-semibold">Q. ユーザーのパスワードを忘れてしまいました。</dt>
                        <dd className="pl-4 mt-1">A. 「ユーザー管理」画面から対象ユーザーの「編集」を選択し、新しいパスワードを設定してください。セキュリティ上、現在のパスワードを確認することはできません。</dd>
                    </div>
                     <div>
                        <dt className="font-semibold">Q. 試験を一度「公開」にした後、「下書き」に戻せますか？</dt>
                        <dd className="pl-4 mt-1">A. はい、戻せます。「試験管理」画面から該当試験の編集ページに移動し、試験ステータスのドロップダウンから「下書き」を選択して保存してください。ただし、すでに受験者がいる場合はご注意ください。</dd>
                    </div>
                </dl>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
