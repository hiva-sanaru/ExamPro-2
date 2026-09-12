# ExamPro-2

SANARUのスタッフ昇給試験をオンラインで実施・採点・管理するためのWebアプリケーションです。

受験者向けの試験画面と、試験・ユーザー・提出物を管理する管理者画面を備えています。記述式答案については、Google Geminiを利用したAI採点を本部担当者・人事室によるレビューの補助として使用します。

## 主な機能

### 受験者向け

- 公開中の試験一覧の表示
- 社員番号・氏名・所属本部を入力して受験開始
- 記述式、穴埋め式、選択式、サブ問題への回答
- 試験全体および問題ごとの制限時間表示
- 入力した回答と残り時間のブラウザ内一時保存
- 提出前の回答確認・修正
- 筆記試験の提出
- 授業審査用YouTube URLの提出

### 管理者向け

- 試験の作成・編集・削除・公開状態の管理
- 問題文、問題形式、配点、模範解答、採点基準、制限時間の設定
- 本部・ユーザーの登録と管理
- 提出物の一覧、絞り込み、CSV出力
- Geminiによる記述式答案の一括採点
- AI採点結果の確認と手動修正
- 本部担当者による採点と人事室による最終確認
- 筆記試験および授業審査の合否管理
- 授業審査の日程・場所・動画URLの管理

## ユーザー区分

| ロール | 主な権限 |
| --- | --- |
| `system_administrator` | 試験、本部、ユーザー、提出物の管理と人事室レビュー |
| `hq_administrator` | 所属本部の提出物確認と本部採点 |
| `examinee` | データ上の受験者ロール。管理者画面にはログイン不可 |

受験者は管理者ログインを使用せず、トップページから試験を開始します。

## 採点フロー

```text
受験・答案提出
  → AI採点（任意の補助機能）
  → 本部担当者による採点
  → 人事室による確認
  → 筆記のみ: 合格 / 不合格
  → 筆記＋授業審査: 授業審査待ち → 最終合否
```

筆記試験が80点以上で、試験種別が「筆記＋授業審査」の場合は授業審査へ進みます。授業審査は、希望日時・場所を登録する方式と、YouTube URLを提出する方式に対応しています。

## 技術構成

- Next.js 15（App Router）
- React 18 / TypeScript
- Tailwind CSS
- shadcn/ui / Radix UI
- Firebase Firestore
- Google Genkit
- Google Gemini 2.0 Flash
- React Hook Form / Zod
- Playwright

## データ構成

クライアントはFirebaseプロジェクト `exampro-2-z3fpi` のFirestoreを使用します。

| コレクション | 内容 |
| --- | --- |
| `exams` | 試験、問題、配点、模範解答、採点基準 |
| `submissions` | 受験者の回答、採点結果、授業審査情報、最終結果 |
| `users` | 管理者・受験者、社員番号、所属本部、ロール |
| `headquarters` | 本部コードと本部名 |

## セットアップ

### 必要な環境

- Node.js 20系を推奨
- npm
- Firebaseプロジェクトへのアクセス権
- AI採点を使用する場合はGoogle AI APIキー

### インストール

```bash
git clone https://github.com/hiva-sanaru/ExamPro-2.git
cd ExamPro-2
npm install
```

### 環境変数

AI採点機能を使用する場合は、プロジェクト直下に `.env` を作成します。

```dotenv
GEMINI_API_KEY=your_google_ai_api_key
```

`.env` や `.env.local`、サービスアカウント鍵などの秘密情報はGitへコミットしないでください。

Firebase Web SDKの接続設定は `src/lib/firebase.ts`、Firebase CLIが参照する既定プロジェクトは `.firebaserc` に定義されています。別のFirebaseプロジェクトを使用する場合は、両方の設定とFirestore Security Rulesを環境に合わせてください。

### 開発サーバー

```bash
npm run dev
```

ブラウザで <http://localhost:3000> を開きます。

別のポートを使う場合は、例えば次のように指定できます。

```bash
npm run dev -- --port 9002
```

### Genkit開発ツール

```bash
npm run genkit:dev
```

ファイル変更を監視して起動する場合:

```bash
npm run genkit:watch
```

## 利用可能なコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Next.js開発サーバーを起動 |
| `npm run build` | 本番用ビルドを作成 |
| `npm start` | 本番用ビルドを起動 |
| `npm run typecheck` | TypeScriptの型チェック |
| `npm run lint` | ESLintを実行 |
| `npm run test:ui` | ChromiumでPlaywright UIテストを実行 |
| `npm run test:ui:update` | UIの画像スナップショットを更新 |
| `npm run genkit:dev` | Genkit開発ツールを起動 |
| `npm run genkit:watch` | Genkit開発ツールを監視モードで起動 |

## テスト

PlaywrightのUIテストは、テスト用に本番ビルドを作成し、ポート3000でアプリを起動します。

```bash
npm run typecheck
npm run test:ui
```

視覚回帰テストのスナップショットを更新する場合:

```bash
npm run test:ui:update
```

現在のUIテストはログイン画面を中心とした最小構成です。試験提出や採点フローを変更するときは、関連するPlaywrightテストの追加を推奨します。

## ディレクトリ構成

```text
src/
├─ app/          Next.jsのページとレイアウト
├─ components/   管理画面、試験画面、認証画面、共通UI
├─ services/     Firestoreの読み書き
├─ ai/           Genkit設定とAIフロー
├─ lib/          Firebase設定、型定義、共通処理
└─ hooks/        Reactカスタムフック
tests/ui/        Playwright UIテスト
docs/            設計資料
public/          画像などの静的ファイル
```

## 主要ページ

| パス | 内容 |
| --- | --- |
| `/` | 受験可能な試験一覧 |
| `/exam/[examId]/start` | 受験者情報の入力 |
| `/exam/[examId]` | 試験回答画面 |
| `/exam/[examId]/review` | 回答確認・提出 |
| `/submit-lesson` | 授業動画URLの提出 |
| `/login` | 管理者ログイン |
| `/admin/dashboard` | 試験管理 |
| `/admin/review` | 提出物管理・採点 |
| `/admin/users` | ユーザー管理 |
| `/admin/headquarters` | 本部管理 |
| `/admin/manual` | 管理者向け操作マニュアル |

## セキュリティ上の注意

現状の管理者認証は、Firestoreに保存されたユーザー情報をクライアント側で照合し、ログイン状態を `localStorage` に保存する構成です。また、Firestoreへのアクセスも主にブラウザから直接行います。

個人情報や人事評価を扱う本番環境で運用する前に、少なくとも次の対応を検討してください。

- Firebase Authenticationなどによる正式な認証
- サーバー側でのロール・所属本部の認可
- 十分に制限されたFirestore Security Rules
- 平文パスワードを保存・比較する方式の廃止
- AI採点結果に対する人間の最終確認
- 監査ログ、バックアップ、個人情報の保存期間の整備

また、現在の `next.config.ts` はTypeScriptおよびESLintのエラーがあっても本番ビルドを継続する設定です。品質確認では、ビルドとは別に `npm run typecheck` とLintを実行してください。

## デプロイ

`apphosting.yaml` が含まれており、Firebase App Hostingでの稼働を想定しています。デプロイ前に、対象プロジェクト、環境変数、Firestore Security Rules、利用するAPIの権限と課金設定を確認してください。

## 関連資料

- [`docs/blueprint.md`](docs/blueprint.md): 機能概要とデザイン方針
- [`AGENTS.md`](AGENTS.md): 開発時のリポジトリガイドライン
