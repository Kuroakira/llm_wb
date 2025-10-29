#!/bin/bash
# Comprehensive Japanese to English translation script
# This script translates all remaining Japanese comments and strings

set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting comprehensive Japanese to English translation...${NC}"

# Function to translate a file
translate_file() {
    local file=$1
    echo -e "${YELLOW}Translating: $file${NC}"

    # Create backup
    cp "$file" "$file.backup"

    # Perform translations using sed
    # Note: This is a simplified version. Manual review is recommended.
    sed -i.tmp '
        # Common Japanese comments
        s/\/\/ 現在の/\/\/ Current/g
        s/\/\/ 最小/\/\/ Minimum/g
        s/\/\/ 最大/\/\/ Maximum/g
        s/\/\/ 画面/\/\/ Screen/g
        s/\/\/ アスペクト比/\/\/ Aspect ratio/g
        s/\/\/ 幅が最大値を超える場合/\/\/ If width exceeds maximum/g
        s/\/\/ 高さが最大値を超える場合/\/\/ If height exceeds maximum/g
        s/\/\/ 最小サイズの保証/\/\/ Ensure minimum size/g
        s/\/\/ 過去5回の/\/\/ Last 5/g
        s/\/\/ 過去の会話/\/\/ Past conversation/g
        s/\/\/ アンカーポイントの座標を計算/\/\/ Calculate anchor point coordinates/g
        s/\/\/ 自由線の追加/\/\/ Add free connector/g
        s/\/\/ 両端未接続/\/\/ Both ends unconnected/g
        s/\/\/ フラグ:/\/\/ Flag:/g
        s/\/\/ コネクタ端点ドラッグ中/\/\/ Dragging connector endpoint/g
        s/\/\/ 履歴/\/\/ History/g
        s/\/\/ 全削除/\/\/ Clear all/g
        s/\/\/ ドラッグ開始時に一度だけ履歴を積む/\/\/ Push history snapshot once at drag start/g
        s/\/\/ 永続化/\/\/ Persistence/g
        s/\/\/ ヘルパー/\/\/ Helper/g
        s/\/\/ チャット関連/\/\/ Chat related/g
        s/\/\/ メインテーマ関連/\/\/ Main theme related/g

        # Error messages and strings
        s/質問を入力してください/Please enter a question/g
        s/質問は3000文字以内で入力してください/Please enter question within 3000 characters/g
    ' "$file"

    # Remove temporary file
    rm -f "$file.tmp"

    echo -e "${GREEN}✓ Translated: $file${NC}"
}

# List of files to translate (add all relevant files here)
FILES_TO_TRANSLATE=(
    "src/lib/llm.ts"
    "src/lib/persistence.ts"
    "src/lib/cursor-utils.ts"
    "src/lib/snapUtils.ts"
    "src/lib/textMeasurement.ts"
    "src/lib/geometry.ts"
    "src/lib/environment.ts"
    "src/lib/coordinates.ts"
)

# Translate each file
for file in "${FILES_TO_TRANSLATE[@]}"; do
    if [ -f "$file" ]; then
        translate_file "$file"
    else
        echo -e "${YELLOW}Warning: File not found: $file${NC}"
    fi
done

echo -e "${GREEN}Translation complete!${NC}"
echo -e "${YELLOW}Please review the changes and run tests.${NC}"
