# 폰으로만 GitHub 배포하기 (데스크탑 없이)

> 제약: 모든 개발은 폰으로만 한다(G1). 아래는 노트북 없이 폰에서
> 코드 업로드·자동배포·QR까지 끝내는 방법. 난이도 순 3가지.

---

## 방법 1. GitHub 웹 + Actions (가장 쉬움, 추천)
앱은 **GitHub Actions가 클라우드에서 빌드**하므로, 폰에선 파일만 올리면 됨.
폰에 Node 설치 불필요.

### 1) 저장소 만들기 (폰 브라우저)
1. 폰 크롬/사파리에서 github.com 로그인
2. 우상단 + → New repository
3. 이름 `ehs-demo`, Public, 빈 저장소로 Create

### 2) 파일 올리기 (드래그 대신 업로드)
폰에선 폴더째 못 올리니 zip을 풀어 올리거나, 아래 깃 앱(방법 2)이 편함.
웹으로 할 경우:
1. 저장소 → Add file → Upload files
2. 폰에 내려받은 프로젝트 파일들을 선택해 업로드
   (단, `.github/workflows/deploy.yml` 경로 유지가 중요 — 웹 업로드는
    폴더 구조 유지가 까다로워 **방법 2(깃 앱) 권장**)
3. Commit

### 3) Pages 켜기
저장소 → Settings → Pages → Source: **GitHub Actions** 선택

### 4) 끝
Actions 탭에 초록 체크 → `https://<아이디>.github.io/ehs-demo/`

---

## 방법 2. 폰 Git 앱 사용 (폴더구조 유지, 실전 추천)
폴더 구조를 그대로 올릴 수 있어 가장 안정적.

### 앱 선택
- **iOS**: Working Copy (가장 강력, 무료로 충분)
- **Android**: MGit 또는 Termux(아래 방법 3)

### Working Copy 기준 절차
1. App Store에서 Working Copy 설치
2. 우상단 + → Clone repository → github 로그인 연결
   (또는 빈 저장소를 먼저 github 웹에서 만들고 Clone)
3. 받은 `ehs-demo.zip`을 파일 앱에 저장 → 압축 해제
4. Working Copy에서 저장소 열기 → 우측 … → Import files →
   압축 푼 폴더의 파일들을 구조 그대로 가져오기
5. 커밋 메시지 입력 → Commit → Push
6. github 웹에서 Settings → Pages → Source: GitHub Actions

> Working Copy는 폴더(.github/workflows)도 그대로 유지되어 자동배포가 바로 작동.

---

## 방법 3. Termux (안드로이드, 진짜 폰에서 git CLI)
폰에서 명령어를 직접 쓰고 싶을 때.
```bash
# Termux 설치(F-Droid 권장) 후
pkg install git
git config --global user.name "이름"
git config --global user.email "메일"

# 받은 zip을 ~/storage/downloads 에 두고 압축 해제
pkg install unzip
unzip ~/storage/downloads/ehs-demo.zip
cd ehs-demo

git init
git add .
git commit -m "init: EHS 데모"
git branch -M main
git remote add origin https://github.com/<아이디>/ehs-demo.git
git push -u origin main
# 비밀번호 자리에 GitHub Personal Access Token 입력
```
이후 Settings → Pages → Source: GitHub Actions.

---

## 공통: 이후 수정도 폰으로
- 방법 2(Working Copy): 파일 편집 → Commit → Push (앱 안에서 끝)
- 방법 3(Termux): `git add . && git commit -m "수정" && git push`
- push만 하면 Actions가 자동 재배포. 데스크탑 불필요.

## 공통: QR 만들기 (폰에서)
1. 배포 주소 복사: `https://<아이디>.github.io/ehs-demo/`
2. 폰 브라우저 주소창 → 공유 → "QR 코드" (안드로이드/아이폰 기본)
3. QR 저장 → 발표자료/명함에 삽입

---

## 폰 작업 시 팁
- Personal Access Token(PAT)은 한 번 만들어 비번관리 앱에 저장해두면 재입력 편함
- 저장소 이름을 ehs-demo가 아닌 다른 걸로 하면 vite.config.js의 base도 동일하게 수정
- 빌드 에러가 걱정되면, github 웹의 Actions 로그를 폰에서 그대로 확인 가능
