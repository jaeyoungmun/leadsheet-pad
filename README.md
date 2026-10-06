# 리드시트 메모장

자주 쓰는 단어(키보드, 코러스, 건반, 기타 …)를 버튼으로 눌러 테두리 박스로 입력하는 리드시트용 메모장.
박스를 누르면 메모/색 수정, 단어마다 기본 색 지정, 곡 제목으로 HTML 저장.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 빌드
```

## GitHub에 올리기

```bash
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

## 배포 (택 1)

- **Vercel**: 저장소를 Import → Framework `Vite` 자동 인식 (Build `npm run build`, Output `dist`).
- **GitHub Pages**: `npm run build` 후 `dist/`를 `gh-pages` 브랜치 또는 Pages Actions로 배포. (`base: './'`라 하위 경로에서도 동작)

단어 목록과 색은 각자의 브라우저(localStorage)에 저장됩니다.
