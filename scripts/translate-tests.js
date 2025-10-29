#!/usr/bin/env node

/**
 * Script to translate Japanese text in test files to English
 * Handles test descriptions, comments, and test data strings
 */

const fs = require('fs');
const path = require('path');

// Translation mappings for common test phrases
const translations = {
  // Test structure
  'テスト': 'test',
  '機能': 'functionality',
  '全テストケースで認証バイパスを設定': 'Set up authentication bypass for all test cases',

  // UI Elements
  'ツールバー': 'toolbar',
  'キャンバス': 'canvas',
  '付箋': 'sticky note',
  '矩形': 'rectangle',
  'テキスト': 'text',
  'テキストボックス': 'text box',
  '編集モード': 'edit mode',
  '選択': 'selection',
  'ドラッグ&ドロップ': 'drag and drop',
  'リサイズ': 'resize',
  'コネクタ': 'connector',
  '接続': 'connection',
  'アンカーポイント': 'anchor point',
  '接続ポイント': 'connection point',

  // Actions
  'が表示される': 'is displayed',
  'をクリック': 'click',
  'をダブルクリック': 'double-click',
  '作成': 'create',
  '編集': 'edit',
  '削除': 'delete',
  '保存': 'save',
  '復元': 'restore',
  '移動': 'move',
  '追従': 'follow',

  // Test data
  '最初のメモ': 'First memo',
  '2行目': 'Second line',
  '3行目': 'Third line',
  'サンプルテキスト': 'Sample text',
  '2行目のテキスト': 'Second line text',
  'テキストを入力...': 'Enter text...',
  '永続化テスト': 'Persistence test',
  '追加テキスト': 'Additional text',
  'ズームテスト': 'Zoom test',

  // LLM/Chat
  'チャットパネル': 'chat panel',
  'チャット入力欄': 'chat input',
  '質問を入力': 'enter question',
  '送信ボタン': 'send button',
  '生成中...': 'Generating...',
  'プレビュー付箋': 'preview sticky',
  'ドラッグしてキャンバスに配置': 'Drag to place on canvas',
  '整理のポイント': 'Key organization points',
  '考慮すべき点': 'Points to consider',
  '課題を3つに整理してください': 'Please organize issues into 3 points',
  'アイデアを入力...': 'Enter your idea...',
  '使い方:': 'How to use:',
  'AI アシスタント': 'AI Assistant',
  'クリア': 'Clear',

  // States
  '初期状態': 'initial state',
  '有効': 'enabled',
  '無効': 'disabled',
  '可視': 'visible',
  '非表示': 'hidden',

  // Directions
  '右': 'right',
  '左': 'left',
  '上': 'top',
  '下': 'bottom',
  '右上': 'top right',
  '左上': 'top left',
  '右下': 'bottom right',
  '左下': 'bottom left',

  // Data persistence
  'データの永続化': 'Data persistence',
  'リロードで復元される': 'restored after reload',
  'オートセーブ': 'auto-save',

  // Undo/Redo
  'Undo/Redo機能': 'Undo/Redo functionality',
  'Undoできる': 'can be undone',
  'Redoできる': 'can be redone',
  'Undoボタン': 'Undo button',
  'Redoボタン': 'Redo button',
  '履歴が空': 'history is empty',

  // Line mode
  '線モード': 'line mode',
  '線ツール': 'line tool',

  // Resize
  'リサイズ機能': 'resize functionality',
  'リサイズハンドル': 'resize handle',
  'アスペクト比を維持': 'maintain aspect ratio',
  '最小サイズ制約': 'minimum size constraint',

  // Common phrases
  'ホームページにアクセス': 'access homepage',
  '十分な距離': 'sufficient distance',
  '閾値を超える': 'exceed threshold',
  '記録': 'record',
  '確認': 'verify',
  '変更される': 'is changed',
  '存在する': 'exists',
  '残る': 'remains',

  // Comments/Instructions
  'Given:': 'Given:',
  'When:': 'When:',
  'Then:': 'Then:',
  'And:': 'And:',
  '待つ': 'wait',
  '完了': 'complete'
};

// Function to translate text while preserving test structure
function translateText(text) {
  let translated = text;

  // Sort by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);

  for (const japanese of sortedKeys) {
    const english = translations[japanese];
    // Use word boundaries where appropriate
    const regex = new RegExp(japanese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    translated = translated.replace(regex, english);
  }

  return translated;
}

// Function to process a single file
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const translated = translateText(content);

    if (content !== translated) {
      fs.writeFileSync(filePath, translated, 'utf8');
      console.log(`✓ Translated: ${filePath}`);
      return true;
    } else {
      console.log(`  No changes: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Function to recursively find test files
function findTestFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTestFiles(filePath, fileList);
    } else if (file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main execution
function main() {
  const testsDir = path.join(__dirname, '..', 'tests');

  if (!fs.existsSync(testsDir)) {
    console.error('Tests directory not found');
    process.exit(1);
  }

  console.log('Finding test files...\n');
  const testFiles = findTestFiles(testsDir);

  console.log(`Found ${testFiles.length} test files\n`);

  let translatedCount = 0;

  testFiles.forEach(file => {
    if (processFile(file)) {
      translatedCount++;
    }
  });

  console.log(`\n✓ Complete! Translated ${translatedCount} files out of ${testFiles.length} total files.`);
}

if (require.main === module) {
  main();
}

module.exports = { translateText, processFile };
