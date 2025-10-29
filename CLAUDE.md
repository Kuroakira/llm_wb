# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

以下は、**テスト駆動開発（TDD；t-wada流の小さなサイクル・Outside-in を意識）**で進める前提の CLAUDE.md です。プロジェクト直下に保存して、以降はこのガイドを"唯一の仕様"として実装・リファクタリング・合意更新を回してください。

⸻

プロジェクト概要
	•	目的: Figma/Miro 風のホワイトボード Web アプリ。Canvas 上で「付箋」「テキスト」「矩形」を作成・編集し、付箋同士を線（コネクタ）で結べる。右上に LLM チャットを常設し、入力すると 300 文字以内の回答が 付箋として追加される。
	•	描画層: HTML5 Canvas（Konva / react-konva）
	•	状態管理: Zustand（Undo/Redo あり）
	•	LLM: LangChain (JS) + Claude (Anthropic)。API キーはサーバ側のみで保持。
	•	保存: MVP は localStorage のみ（将来サーバ永続化に差し替え可能）
	•	開発姿勢: TDD（Outside-in：E2E→コンポーネント→ユニット）。テスト先行、グリーン最小、リファクタ小刻み。**TCR（Test-Commit-Revert）**オプション推奨。

⸻

スコープ（MVP）
	1.	基本要素
	•	付箋（テキスト編集、ドラッグ、リサイズ、色変更）
	•	テキスト（単独テキスト要素）
	•	矩形（塗り/枠、ドラッグ、リサイズ）
	2.	コネクタ
	•	付箋⇄付箋の直線接続（要素移動に追従）
	•	アンカーは中心/四辺にスナップ（MVP は自動最短辺）
	3.	選択・編集
	•	単体選択／範囲選択（ドラッグラッソ）
	•	Delete で削除、Cmd/Ctrl+Z / Shift+Cmd/Ctrl+Z で Undo/Redo（20 ステップ）
	4.	LLM チャット
	•	右上チャット → /api/llm → 300 文字以内の回答を付箋として右上付近に配置
	•	サーバ側で プロンプト制約 + 強制トリム
	5.	永続化・エクスポート
	•	1 秒デバウンスで localStorage オートセーブ/復元
	•	JSON/PNG エクスポート

非目標（初期）: リアルタイム協調・画像貼付・オートルーティング・図形種類の大量追加

⸻

技術スタック
	•	Next.js 14+（App Router） / React 18 / TypeScript
	•	Konva / react-konva
	•	Zustand
	•	LangChain（JS） + @anthropic-ai/sdk
	•	Zod（API I/O 検証）
	•	テスト: Vitest（ユニット/コンポーネント）、Testing Library、Playwright（E2E）、MSW（API モック）、c8（カバレッジ）

# 推奨 Node 18+
npm i react react-dom next zustand konva react-konva zod
npm i @anthropic-ai/sdk langchain @langchain/anthropic
npm i -D typescript vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm i -D playwright msw c8 eslint prettier husky lint-staged

⸻

開発コマンド

# 開発サーバー起動
npm run dev

# テスト実行
npm run test                 # ユニット・コンポーネントテスト（一回実行）
npm run test:watch          # テストをwatchモードで実行
npm run test:e2e            # E2Eテスト（Playwright）
npm run test:cov            # カバレッジ付きテスト実行

# E2Eテスト関連
npm run e2e:codegen         # Playwrightでテストコード生成

# ビルド・起動
npm run build               # 本番ビルド
npm run start               # 本番サーバー起動

# テスト個別実行例
npx vitest geometry         # geometry関連テストのみ
npx playwright test --headed # E2EをブラウザUIで実行

⸻

ディレクトリ構成（実装済み）

/ (repo root)
├─ app/
│  ├─ api/
│  │  └─ llm/route.ts            # POST: {prompt, lang?} -> {text}（実装済み）
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx                   # 画面（Canvas + Toolbar + Chat）
├─ src/
│  ├─ canvas/
│  │  ├─ CanvasStage.tsx         # メインCanvas
│  │  ├─ StickyNoteEditor.tsx    # 付箋テキスト編集UI
│  │  ├─ hooks/                  # Canvas関連のカスタムフック
│  │  │  ├─ useCanvasEvents.ts   # Canvas操作イベント
│  │  │  ├─ useManualDrag.ts     # ドラッグ操作
│  │  │  └─ useViewport.ts       # ズーム・パン
│  │  ├─ tools/
│  │  │  ├─ Toolbar.tsx          # ツールバー
│  │  │  ├─ LeftChatPanel.tsx   # 左側LLMチャットパネル
│  │  │  ├─ ColorPicker.tsx      # 色選択
│  │  │  └─ ContextMenu.tsx      # 右クリックメニュー
│  │  ├─ shapes/
│  │  │  ├─ StickyNote.tsx       # 付箋コンポーネント
│  │  │  ├─ TextBox.tsx          # テキストボックス
│  │  │  ├─ RectShape.tsx        # 矩形
│  │  │  ├─ AnchorPoint.tsx      # 接続ポイント
│  │  │  ├─ ConnectionPoints.tsx # 接続点表示
│  │  │  ├─ ConnectionPreview.tsx # 接続プレビュー
│  │  │  ├─ EdgeInteraction.tsx  # エッジ操作
│  │  │  ├─ KonvaAnchorPoint.tsx # Konva用アンカー
│  │  │  ├─ ResizeHandle.tsx     # リサイズハンドル
│  │  │  └─ ResizePreview.tsx    # リサイズプレビュー
│  │  └─ edges/
│  │     └─ Connector.tsx        # 要素間の接続線
│  ├─ hooks/
│  │  └─ useGlobalZoomControl.ts # グローバルズーム制御
│  ├─ store/
│  │  ├─ boardStore.ts           # Zustand（要素/選択/履歴）
│  │  └─ boardStore.backup.ts    # ストアバックアップ
│  ├─ lib/
│  │  ├─ geometry.ts             # 当たり判定/アンカー/スナップ（純関数）
│  │  ├─ coordinates.ts          # 座標変換
│  │  ├─ cursor-utils.ts         # カーソル制御
│  │  ├─ environment.ts          # 環境設定
│  │  ├─ llm.ts                  # フロント→API クライアント
│  │  ├─ persistence.ts          # localStorage永続化
│  │  └─ snapUtils.ts            # スナップ機能
│  └─ types.ts                   # 型定義
├─ tests/
│  ├─ e2e/                       # Playwright E2Eテスト
│  │  ├─ board.spec.ts           # 基本操作
│  │  ├─ line-mode.spec.ts       # 線描画
│  │  ├─ llm-chat.spec.ts        # LLMチャット
│  │  ├─ persistence.spec.ts     # 永続化
│  │  ├─ text-input.spec.ts      # テキスト入力
│  │  ├─ undo-redo.spec.ts       # Undo/Redo
│  │  └─ zoom.spec.ts            # ズーム・パン
│  ├─ component/                 # React Testing Library
│  │  ├─ RectShape.test.tsx
│  │  ├─ StickyNote.test.tsx
│  │  └─ TextBox.test.tsx
│  ├─ unit/                      # Vitest ユニットテスト
│  │  ├─ geometry.test.ts
│  │  ├─ persistence.test.ts
│  │  └─ store.board.test.ts
│  ├─ mocks/
│  │  └─ boardStoreMock.ts       # テスト用モック
│  ├─ msw/
│  │  └─ handlers.ts             # MSWハンドラー
│  └─ setup.ts                   # テストセットアップ
├─ public/
├─ .env.local.example            # 環境変数テンプレート
├─ package.json
├─ tsconfig.json
├─ vitest.config.ts              # Vitestコンフィグ
├─ playwright.config.ts          # Playwrightコンフィグ
├─ next.config.js                # Next.jsコンフィグ
└─ CLAUDE.md


⸻

型定義（要点）

// src/types.ts
export type ElementID = string;

export type BaseElement = {
  id: ElementID;
  type: 'sticky' | 'text' | 'rect';
  x: number; y: number; width: number; height: number;
  rotation?: number; zIndex: number; locked?: boolean;
  createdAt: number; updatedAt: number;
};

export type StickyElement = BaseElement & {
  type: 'sticky'; text: string; color: string; // e.g., '#FFF2B2'
};

export type TextElement = BaseElement & {
  type: 'text'; text: string; fontSize: number; fontFamily: string;
};

export type RectElement = BaseElement & {
  type: 'rect'; fill: string; stroke: string; strokeWidth: number; radius?: number;
};

export type Connector = {
  id: ElementID; fromId: ElementID; toId: ElementID;
  fromAnchor?: AnchorPosition; toAnchor?: AnchorPosition; // 実装済み
  points: number[]; // [x1,y1,x2,y2]（描画時に再計算可）
  zIndex: number; createdAt: number; updatedAt: number;
};

// 追加の型定義（実装済み）
export type CanvasElement = StickyElement | TextElement | RectElement
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'
export type Viewport = { zoom: number; panX: number; panY: number }
export type Tool = 'select' | 'sticky' | 'text' | 'rect' | 'connector' | 'line'
export type Mode = 'idle' | 'select' | 'transform' | 'editingText' | 'placing' | 'panning'

export type BoardState = {
  elements: CanvasElement[];
  connectors: Connector[];
  selection: ElementID[]; // 現在は selectedIds として実装
  viewport: Viewport;     // ズーム・パン機能実装済み
  history: { past: any[]; future: any[] };
};


⸻

環境変数（.env.local）

# LLM API設定
ANTHROPIC_API_KEY=sk-sample
LLM_MODEL=claude-3-7-sonnet-20250219
MOCK_LLM=0


⸻

LLM API 仕様（/api/llm）実装済み
	•	POST: { prompt: string, mainTheme?: string }
	•	200: { text: string, summary: string }
	•	text: 3000文字以内の詳細なマークダウン形式の回答
	•	summary: 300文字以内の簡潔なサマリ
	•	使用モデル: Claude (Anthropic)
	•	モック対応: MOCK_LLM=1 で動作、テスト時に利用
	•	エラーハンドリング: タイムアウト（30秒）、ネットワークエラー対応
	•	Zodでスキーマ検証実装済み

プロンプトテンプレート（実装済み）:
あなたはホワイトボードアプリでのブレインストーミングをサポートするAIアシスタントです。
ユーザーの質問に簡潔かつ分かりやすく答えてください。
- 3000文字以内で詳細に回答
- マークダウン形式で見やすく整理
- 具体例を含めて説明
- 次のステップや関連する調査内容を提案



⸻

アーキテクチャ戦略（テスト容易性）
	•	純関数化: geometry.ts（アンカー/スナップ/バウンディング計算）・exporters.ts は副作用なし
	•	状態の外部化: すべての Canvas 操作は boardStore のアクション経由
	•	I/O の局所化: LLM 呼び出し、localStorage、PNG 生成は薄いアダプタに隔離
	•	描画最適化: Transformer/ハイライトは選択時のみマウント

⸻

TDD ポリシー（t-wada 流）
	1.	Outside-in でレッドを作る：まず E2E（Playwright） で最小の利用シナリオを失敗させる
例）「付箋ツールをクリック→キャンバスクリック→付箋が表示→ダブルクリック編集→テキスト反映」
	2.	つぎに コンポーネントテスト（Testing Library）で UI 振る舞いを具体化
	3.	依存を薄く保つため ユニットテスト（Vitest）でドメイン関数（ジオメトリ/ストア）を先にグリーンに
	4.	グリーン最小 → リファクタ小刻み（命名/分割/重複除去）。テストは常にグリーン。
	5.	TCR オプション：レッドのままコミット禁止。グリーンのみ自動コミット、失敗時は自動リバート。
	6.	テスト命名/記法: Given-When-Then、失敗時に原因が一読で分かるメッセージ。
	7.	契約テスト: /api/llm の入出力を Zod で検証し、MSW でフロント側からの契約を固定。

テストピラミッド
	•	E2E（少数・要件の背骨）: 作成/編集/接続/LLM 付箋生成/保存復元/エクスポート
	•	コンポーネント（中）: 付箋編集・Transformer リサイズ・コネクタ選択
	•	ユニット（多数）: アンカー計算、当たり判定、Undo/Redo 圧縮、テキスト 300 文字制約

⸻

受け入れ基準（Executable Specification）
	1.	付箋/テキスト/矩形は クリックで作成、ダブルクリックで編集、ハンドルでリサイズ できる
	•	テキストは IME を阻害しない（日本語入力可）
	2.	付箋⇄付箋のコネクタは 移動に追従 し、最短辺にスナップ する
	3.	チャットへ入力すると 3 秒以内に付箋が自動追加（モック時 100ms）
	4.	LLM 付箋の内容は 常に 300 文字以内（サーバ強制トリムで担保）
	5.	リロード後、直前のキャンバスが自動復元される
	6.	JSON/PNG のエクスポートが成功する（PNG は最低 1000×700 相当の解像度）

⸻

初期シナリオ（E2E；Playwright）

// tests/e2e/board.spec.ts（擬似）
test('付箋の作成と編集、LLM 付箋生成', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sticky' }).click();
  await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } });
  const note = page.getByTestId('sticky').first();
  await note.dblclick();
  await page.keyboard.type('最初のメモ');
  await page.keyboard.press('Enter');
  await expect(note).toContainText('最初のメモ');

  // MSW で /api/llm をモック（300 文字以内）
  await page.getByPlaceholder('アイデアを入力...').fill('課題を3点に整理して');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByTestId('sticky')).toContainText('1) ');
});


⸻

代表ユニットテスト（例）

// tests/unit/geometry.test.ts
import { anchorForConnection } from '@/src/lib/geometry';
import { expect, test } from 'vitest';

test('最短辺へスナップする', () => {
  const from = { x: 0, y: 0, width: 100, height: 100 };
  const to   = { x: 300, y: 20, width: 120, height: 80 };
  const { fromPoint, toPoint } = anchorForConnection(from, to);
  // x2 は to の左辺近傍であるはず
  expect(toPoint.x).toBeCloseTo(300, 1);
});

// tests/unit/store.board.test.ts
import { createBoardStore } from '@/src/store/boardStore';
import { describe, it, expect } from 'vitest';

describe('board store', () => {
  it('付箋作成 → 移動 → Undo/Redo', () => {
    const store = createBoardStore();
    const id = store.addSticky({ x: 10, y: 10, text: 'A' });
    store.moveElement(id, { x: 200, y: 150 });
    expect(store.getState().elements.find(e => e.id === id)?.x).toBe(200);
    store.undo();
    expect(store.getState().elements.find(e => e.id === id)?.x).toBe(10);
    store.redo();
    expect(store.getState().elements.find(e => e.id === id)?.x).toBe(200);
  });
});


⸻

API ルート概略（Claude使用版）

// app/api/llm/route.ts（実装済み）
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ChatAnthropic } from '@langchain/anthropic';

const Req = z.object({
  prompt: z.string().min(1),
  mainTheme: z.string().optional().default('')
});
const Res = z.object({
  text: z.string().describe("3000文字以内の詳細な回答"),
  summary: z.string().describe("300文字以内のサマリ")
});

export async function POST(req: NextRequest) {
  const body = Req.parse(await req.json());

  if (process.env.MOCK_LLM === '1') {
    const text = '（モック）要点を3つに整理：1) 背景 2) 課題 3) 次の一手';
    const summary = '要点の整理';
    return NextResponse.json(Res.parse({ text, summary }));
  }

  // Claudeで全文とサマリを生成
  const claude = new ChatAnthropic({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    modelName: process.env.LLM_MODEL || 'claude-3-5-haiku-20241022',
    maxTokens: 6000,
    temperature: 0.5,
  });

  const response = await claude.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: body.prompt }
  ]);

  return NextResponse.json(Res.parse(response));
}


⸻

実装マイルストーン（TDD 手順付き）

M0: 雛形 & テスト基盤
	•	[E2E] / にアクセスしてツールバーとキャンバスが見える
	•	[Unit] geometry.ts にダミー関数を置き、失敗するテストを先に記述
	•	ゴール: CI で赤→緑の最小循環が回る

先に Playwright/MSW の配線を完成させる（Outside-in のレール作り）

M1: 付箋の作成/編集/移動
	•	[E2E] 付箋ツール→クリックで作成→ダブルクリック編集→保存
	•	[Comp] <StickyNote> の編集/フォーカス/IME
	•	[Unit] boardStore.addSticky/updateText/moveElement
	•	ゴール: 付箋が基本操作を満たす

M2: 矩形・テキスト要素
	•	[E2E] 矩形作成→リサイズ、テキスト作成→編集
	•	[Comp] <RectShape> <TextBox> + Transformer
	•	[Unit] 最小サイズ維持、ヒットテスト

M3: コネクタ（直線・追従）
	•	[E2E] 2 つの付箋を接続→移動で追従
	•	[Unit] anchorForConnection、recalcConnectorPoints
	•	ゴール: 最短辺スナップ

M4: Undo/Redo & オートセーブ
	•	[E2E] 連続操作→Undo/Redo→復元→リロード復元
	•	[Unit] 履歴圧縮（ドラッグ連続操作のまとめ）

M5: LLM チャット→付箋生成
	•	[E2E] 入力→モック応答→付箋生成
	•	[Contract] /api/llm Zod 検証・300 文字制約
	•	ゴール: 実キーなしで通る（MOCK_LLM=1）

M6: エクスポート
	•	[E2E] JSON/PNG エクスポート
	•	[Unit] JSON スキーマ検証

⸻

コーディング規約（抜粋）
	•	小さなコミット：レッド→最小グリーン→即コミット→小リファクタ
	•	命名：UI は “動詞+名詞”（addSticky）、計算は “名詞+動詞”（anchorForConnection）
	•	UI テキストは定数化（テストで参照しやすくする）
	•	コンポーネントは受動的：ロジックは store/純関数へ

⸻

CI & フック（推奨）

// package.json scripts（例）
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:cov": "vitest --coverage",
    "e2e:codegen": "playwright codegen"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "vitest related --run -u"]
  }
}

	•	Husky で pre-commit に lint-staged、pre-push に vitest + playwright（短縮スイート）
	•	CI: test → test:e2e → build の順

⸻

性能/拡張メモ
	•	大量要素での再描画を避けるため、選択中以外は Transformer を外す
	•	Stage リサイズは ResizeObserver。ズーム/パンは将来追加
	•	将来: 画像貼付、矢印、クラウド保存、コラボ（WS/Sockets）、コネクタのオートルーティング

⸻

セキュリティ/運用
	•	API キーはサーバのみ（クライアントへ露出禁止）
	•	LLM への入力はログしない（MVP）
	•	レート制限（将来）：IP 単位 1 req/sec 程度
	•	プロンプト注入対策：system メッセージ固定 + プレーンテキスト強制

⸻

アーキテクチャの重要な実装パターン


# ホットキー・キーボードショートカット
	•	Delete キー: 選択中要素の削除（実装済み）
	•	Cmd/Ctrl + Z: Undo（実装済み）
	•	Cmd/Ctrl + Shift + Z: Redo（実装済み）
	•	スペースキー: 一時的にパンモードへ切り替え（実装済み）
	•	マウスホイール: ズームイン/アウト（実装済み）

# 状態管理の特徴
	•	Zustand + Immer を使用した不変性の保持
	•	デバウンス付きの localStorage 自動保存（実装済み）
	•	選択状態とモードの明確な分離
	•	コネクタの自動再計算（要素移動時）

# テスト戦略の実装状況
	•	E2E テスト: 7 つのシナリオで基本操作をカバー
	•	コンポーネントテスト: 主要 3 つの Shape コンポーネント
	•	ユニットテスト: 純関数とストアロジック
	•	MSW によるAPI モック対応

# Canvas描画の最適化
	•	選択中の要素のみ Transformer 表示
	•	ズーム・パン時のパフォーマンス考慮
	•	大量要素でのレイヤー管理（zIndex）

⸻

既知の課題（TODO）
	•	IME 編集オーバーレイの最適化（Konva＋contentEditable のズレ対策）
	•	範囲選択ラッソのパフォーマンス
	•	Undo/Redo 圧縮（ドラッグのバースト抑制）
	•	PNG エクスポートのスケール調整（解像度指定）
	•	コネクタ端点のユーザ指定（中心/辺の固定）

⸻

