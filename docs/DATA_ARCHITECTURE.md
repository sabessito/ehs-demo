# 데이터 아키텍처 — 원본 → 가공 → 최종 데이터셋

> 면접 시 "이 숫자 어디서 났냐"는 질문에 바로 답할 수 있도록, 원본 출처와
> 가공 로직을 추적 가능하게 정리. 공식 통계와 가상(내부) 데이터를 명확히 구분.

---

## 1. 원본 데이터셋 (Raw Sources)

> ★ 정정: raw의 최소 단위는 '비중(%)'이 아니라 **재해자/사건 레코드**다.
> 비중은 레코드를 GROUP BY 집계한 파생물이다. 정상 흐름:
> **사건/사람 레코드 → 집계(COUNT) → 비중(%) → 가공 → 최종셋**

### 한국 (🇰🇷)
| ID | 출처 | 최소 단위 | 형태 | 비고 |
|----|------|-----------|------|------|
| KR-0 | KOSHA 산업재해통계 마이크로데이터(2017~2023) | **재해자 1명 = 1행 (138,812행)** | XLSX | 공식·진짜 raw |
| KR-0b | KOSHA 재해사례/사고사망 게시판 API | **사건 1건 = 1레코드** | 오픈 API | 공식·사건 단위 |
| KR-1 | 고용노동부 2024 현황 (KR-0 집계 결과) | 유형별 비중(%) | 공표자료 | 파생물 |
| KR-2 | 고용노동부 2023 현황분석 | 재해자13.7만·사망2,016·사고사망812 | 책자 | 집계치 |

### 해외 / 미국 (🇺🇸)
| ID | 출처 | 최소 단위 | 형태 | 비고 |
|----|------|-----------|------|------|
| US-0 | BLS CFOI 2023 (case-level) | **사망사건 1건 = 1레코드** | 통계DB | 공식·raw |
| US-1/2 | BLS CFOI event별 집계 | event별 건수·비중 | 공표 표 | 파생물 |
| US-3 | OSHA 법규 (1910, General Duty, PSM) | 법조항 | 규정 | 매핑용 |

### 내부 / 가상 (사업장 운영 데이터 — 공개 불가 성격)
| ID | 내용 | 최소 단위 | 생성 방식 |
|----|------|-----------|-----------|
| IN-1 | 구역별 예방투자 비용(Cost) | 구역 | 가상값 |
| IN-2 | 발생추세 가중(Event) | 구역·기간 | 가상값(사건로그 파생 가정) |
| IN-3 | 운영기준선(Limit)·ALARP 임계값 | 구역 | 프레임워크 설정값 |

---

## 2. 가공 로직 (Transformation)

```
[STEP 0] 레코드 → 집계 (raw의 진짜 출발점)
  KR-0(13.8만 재해자 레코드) / US-0(5,283 사망사건)
  GROUP BY 발생형태 → COUNT → 비중(%) 산출
  SQL: SELECT 발생형태, COUNT(*)*100.0/SUM(COUNT(*)) OVER()
       FROM 재해레코드 WHERE 재해정도='사망' GROUP BY 발생형태

[STEP 1] 비중% → 기준위험도(Hazard Master)
  STEP0 결과 %를 0~70 스케일로 정규화
  예) 떨어짐 33.6% → master 70 (1위 유형 = 최고 기준위험도)

[STEP 2] 사업장 구역 매핑
  전국/전미 재해유형을 가상 사업장의 물리적 구역에 1:1 배정
  예) '떨어짐' → 고소작업장 / '운수사고' → 구내 운반·트럭

[STEP 3] Risk Index 산출
  Risk Index = Hazard Master(STEP1) + Event 가중(IN-2)
  → 0~100 종합 위험도 지수

[STEP 4] ALARP 좌표화 (Limit)
  x축 = Cost(IN-1), y축 = Risk Index(STEP3)
  영역 구분: Unacceptable(75↑) / ALARP(30~75) / Acceptable(30↓)
  법적 최소선(Index 40) 오버레이 → 둘 중 더 엄격한 값 = Effective Limit

[STEP 5] 이슈·과제·로드맵 도출
  Risk Index 상위 + 법규 매핑(KR/US 법조항) → 이슈
  이슈 → ROI·시급성 평가 → 핵심 과제 → 단계별 로드맵
```

---

## 3. 최종 데이터셋 구조 (앱에 탑재된 DATASETS 오브젝트)

```
DATASETS
 ├─ korea
 │   ├─ bigPicture   ← KR-2        (재해자/사망/사고사망)
 │   ├─ hazardShare  ← KR-1        (재해유형 6종 %)
 │   ├─ cost         ← IN-1        (가상)
 │   ├─ riskIndex    ← KR-1+IN-2   (master+event)
 │   ├─ alarp        ← cost×index  (가상+산출)
 │   └─ issues       ← riskIndex+법규(중대재해법)
 └─ overseas
     ├─ bigPicture   ← US-1
     ├─ hazardShare  ← US-2        (event/exposure 6종 %)
     ├─ cost         ← IN-1        (가상)
     ├─ riskIndex    ← US-2+IN-2
     ├─ alarp        ← cost×index
     └─ issues       ← riskIndex+법규(OSHA)
```

핵심: **공식 통계(분포·규모)는 출처 명시, 운영값(비용·추세·기준선)은 가상**.
이 분리가 "공개 가능 데이터와 내부 영업비밀을 구분할 줄 안다"는 신호.
