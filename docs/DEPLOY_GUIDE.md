# 배포 가이드 — 폰/서버 저장 + QR·주소로 공유

면접에서 폰으로 보여주고, 면접관에게 QR을 띄워 바로 접속하게 만드는 방법.
난이도 순으로 정리. **추천은 방법 B(Vercel)** — 무료·짧은주소·자동 QR 가능.

---

## 준비: 앱을 실행 가능한 형태로 만들기
지금 파일은 `SmartSafetyApp.jsx` (React 컴포넌트). 단독 실행하려면 React 프로젝트로 감싸야 함.

```bash
# 1) Vite로 React 프로젝트 생성
npm create vite@latest ehs-demo -- --template react
cd ehs-demo
npm install
npm install recharts lucide-react

# 2) SmartSafetyApp.jsx 를 src/ 에 복사하고 App.jsx에서 사용
#    src/App.jsx 내용:
#    import SmartSafetyApp from "./SmartSafetyApp";
#    export default function App(){ return <SmartSafetyApp/>; }

# 3) 로컬 확인
npm run dev      # http://localhost:5173

# 4) 빌드
npm run build    # dist/ 폴더 생성
```

---

## 방법 A. 가장 간단 — 폰에 파일로 저장(오프라인)
빌드된 `dist/` 폴더를 클라우드(구글드라이브/iCloud)에 올리고 폰에서 다운로드.
- 장점: 인터넷 없이도 동작, 서버 불필요
- 단점: 남에게 "주소/QR"로 보여주긴 불편
- 용도: 본인 폰 백업용

---

## 방법 B. 추천 — Vercel (무료·짧은주소·QR)
```bash
npm install -g vercel
cd ehs-demo
vercel          # 안내 따라 로그인 → 배포
# 완료되면 https://ehs-demo-xxx.vercel.app 같은 주소 발급
```
- 짧은 주소 원하면 Vercel 대시보드에서 프로젝트명 변경 → `https://hayoungwoo-ehs.vercel.app`
- **QR 생성**: 발급된 주소를 qr-code-generator.com 등에 붙여넣으면 즉시 QR 이미지.
  또는 폰 크롬에서 주소창 → 공유 → "QR 코드 만들기"(안드로이드/아이폰 기본 지원)
- 장점: 무료, HTTPS, 5분이면 끝, 주소·QR 둘 다
- 면접 현장에선 QR을 노트북 화면이나 출력물로 띄우면 면접관이 폰으로 즉시 접속

---

## 방법 C. GitHub Pages (무료, 약간 설정 필요)
```bash
# vite.config.js 에 base 경로 추가: base: "/ehs-demo/"
npm run build
# dist/ 를 gh-pages 브랜치로 push (또는 GitHub Actions)
# 주소: https://<아이디>.github.io/ehs-demo/
```
- 장점: 깃허브 쓰면 포트폴리오로도 활용
- 단점: 경로 설정·푸시 과정이 Vercel보다 번거로움

---

## 방법 D. 가상 서버(VPS) 직접 운영
AWS Lightsail / Oracle Cloud Free Tier 등에 nginx로 `dist/` 서빙.
- 장점: 완전한 통제, 사내망 배포 가능
- 단점: 가장 손이 많이 감. 면접 시연 목적엔 과함.

---

## QR 코드 만들기 (공통)
1. 배포 주소 확보 (방법 B/C)
2. 아래 중 택1
   - 폰 브라우저 주소창 공유 → QR 코드
   - 무료 사이트에 주소 입력 → PNG 다운로드
3. QR 이미지를 발표자료(PPT) 첫 장 또는 명함 뒤에 삽입

---

## 면접 활용 시나리오
1. "직접 보시겠어요?" → 노트북/출력물의 QR 제시
2. 면접관 폰으로 접속 → 한국/해외 토글하며 5단계 시연
3. "데이터 출처가 궁금하시면" → DATA_ARCHITECTURE 다이어그램 제시
4. 마무리: "공개 통계와 내부 가상값을 구분해 설계했다"

> 보안 팁: 가상 데이터임을 화면에 명시했으므로 공개 배포 무방.
> 단, 실제 사업장 데이터로 교체할 경우 절대 공개 서버에 올리지 말 것.
