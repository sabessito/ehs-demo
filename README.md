# EHS 데모 — GitHub Pages 배포 & 운영 가이드

이 폴더는 **그대로 깃허브에 올리면 자동 배포되는 완성 프로젝트**입니다.
Claude는 외부망 접속이 막혀 있어 대신 푸시할 수 없으므로, 아래 단계만 따라
하시면 됩니다. 처음 1회 세팅 후에는 `git push` 할 때마다 자동 재배포됩니다.

---

## 0. 사전 준비
- GitHub 계정 (기존 아이디 사용)
- 로컬에 git 설치, Node.js 18+ 설치 (https://nodejs.org)

---

## 1. 저장소 이름 정하기 (중요)
`vite.config.js`의 `base` 값이 **저장소 이름과 반드시 일치**해야 합니다.
- 기본값은 저장소 이름을 `ehs-demo`로 가정 → `base: "/ehs-demo/"`
- 다른 이름을 쓰려면 `vite.config.js`의 base를 `/그이름/` 으로 수정

배포 후 최종 주소: `https://<깃허브아이디>.github.io/ehs-demo/`

---

## 2. 깃허브에 새 저장소 만들기
1. github.com → 우상단 + → New repository
2. Repository name: `ehs-demo` (1번에서 정한 이름)
3. Public 선택 (Pages 무료는 public 권장)
4. "Create repository" — README 등은 추가하지 말 것(빈 저장소로)

---

## 3. 로컬에서 이 폴더를 푸시
이 폴더(ehs-demo) 위치에서 터미널 실행:
```bash
cd ehs-demo

# 빌드 확인(선택이지만 권장)
npm install
npm run build      # 에러 없이 dist/ 생성되면 정상

# git 초기화 & 푸시
git init
git add .
git commit -m "init: EHS 전략 데모"
git branch -M main
git remote add origin https://github.com/<깃허브아이디>/ehs-demo.git
git push -u origin main
```
> `<깃허브아이디>` 를 본인 것으로 교체.
> 비밀번호 대신 Personal Access Token을 물으면, GitHub Settings →
> Developer settings → Personal access tokens 에서 발급해 입력.

---

## 4. GitHub Pages 활성화 (1회만)
1. 저장소 → Settings → 좌측 **Pages**
2. "Build and deployment" → Source: **GitHub Actions** 선택
3. 끝. (별도 브랜치 지정 불필요 — 워크플로가 처리)

---

## 5. 자동 배포 확인
- push하면 저장소 **Actions** 탭에서 "Deploy to GitHub Pages" 워크플로가 실행됨
- 초록 체크가 뜨면 완료 → `https://<아이디>.github.io/ehs-demo/` 접속
- 보통 1~3분 소요

---

## 6. 운영 — 이후 수정/재배포
코드 고친 뒤:
```bash
git add .
git commit -m "update: 데이터 수정"
git push
```
push만 하면 Actions가 자동으로 다시 빌드·배포. 사람이 할 일 없음.

---

## 7. QR 코드 만들기 (방법 C 마무리)
1. 최종 주소 복사: `https://<아이디>.github.io/ehs-demo/`
2. 폰 브라우저 주소창 → 공유 → "QR 코드"  또는
   무료 QR 사이트(qr-code-generator.com 등)에 주소 입력 → PNG 저장
3. QR을 발표자료 첫 장 / 출력물에 삽입 → 면접관이 폰으로 즉시 접속

---

## 자주 나는 문제
| 증상 | 원인 | 해결 |
|------|------|------|
| 화면 하얗게 빈 페이지 | base 경로 불일치 | vite.config.js의 base를 저장소명과 일치시키고 재push |
| Actions 빨간 X | 빌드 에러 | 로컬에서 `npm run build`로 먼저 확인 |
| Pages 404 | Pages 미활성화 | 4번 단계 Source를 GitHub Actions로 |
| 폰트/차트 안 보임 | 의존성 누락 | package.json의 recharts·lucide-react 확인 |

---

## 보안 메모
현재 데이터는 전부 공개 통계 + 시연용 가상값이라 공개 배포 무방.
실제 사업장 데이터로 교체할 경우 저장소를 **Private**로 바꾸고
Pages 대신 사내망/인증 서버를 쓸 것.
