# web-paint

브라우저에서 그림을 그리고 편집할 수 있는 Vite 기반 페인트 앱입니다.

## 개요

캔버스 위에 자유 그리기와 도형, 텍스트, 선택, 자르기, 불러오기/저장 등을 제공하는 개인용 그림 도구입니다.

주요 파일:
- `index.html`: UI 구조
- `src/main.js`: 앱 초기화와 입력 처리
- `src/tools.js`: 브러시/도형/선택 도구 로직
- `src/state.js`: 상태 관리
- `src/canvas.js`: 캔버스 관리

## 기능

- 브러시 / 지우개
- 직선 / 사각형 / 삼각형 / 타원
- 텍스트 입력
- 선택 영역과 자르기
- 색상 선택, 선 굵기, 폰트 설정
- Undo / Redo
- 줌과 캔버스 크기 조절

## 로컬 실행방법

```bash
npm install
npm run dev
```

배포용 빌드:

```bash
npm run build
```
