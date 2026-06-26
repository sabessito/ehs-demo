import React, { useState, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from "recharts";
import {
  AlertTriangle, Database, Search, Target, Map,
  Activity, ShieldCheck, TrendingUp, FileText, Layers, ArrowRight, CheckCircle2,
  GitBranch, QrCode, ExternalLink, Smartphone, Home, Compass, BarChart3
} from "lucide-react";

// ------------------------------------------------------------
// Sample data (illustrative — for interview walkthrough only)
// ------------------------------------------------------------

// ============================================================
// 두 개의 케이스(한국 / 해외)를 동일한 구조로 정의한다.
// 각 케이스: 큰그림 통계(bigPicture) + 재해유형 분포(hazardShare)
//   + 3대 오브젝트(cost / riskIndex / alarp)
//
// [한국] 고용노동부 「2024 산업재해현황」 사고사망자 재해유형 분포
//        + 「2023 산업재해현황분석」 전체 규모(재해자·사망자)
// [해외] 美 노동통계국 BLS 「CFOI 2023」 치명재해 event/exposure 분포
//        — 한국과 동일하게 '재해유형 비중'을 기준위험도로 환산
//
// 공통: Cost(예방투자)·Limit(운영기준선)은 사업장 내부 가상 데이터.
// ============================================================

const LEGAL_MIN_INDEX = 40; // 법적 최소 기준선 — 위험성평가·개선조치 의무 이행 증빙이 필요한 지수
const UNACCEPTABLE_INDEX = 75; // 허용불가 임계값 — 비용과 무관하게 즉시조치

// 연도별 항목별 투자비용(가상, 만원) — Risk Index 발생가능성 산출 기반
const ANNUAL_COST = [
  { area:"프레스·기계라인", type:"끼임",       y2021:700,  y2022:900,  y2023:1200, y2024:1400, y2025:1500 },
  { area:"고소작업장",     type:"떨어짐",       y2021:5000, y2022:6500, y2023:7500, y2024:8000, y2025:8500 },
  { area:"중량물 취급",   type:"깔림·뒤집힘",   y2021:500,  y2022:600,  y2023:700,  y2024:800,  y2025:900  },
  { area:"자재 적치구역", type:"물체에 맞음",    y2021:600,  y2022:700,  y2023:800,  y2024:900,  y2025:1000 },
  { area:"구내 운반",     type:"부딪힘",        y2021:1100, y2022:1300, y2023:1500, y2024:1700, y2025:1900 },
  { area:"화학·반응공정", type:"폭발·파열",      y2021:400,  y2022:500,  y2023:600,  y2024:700,  y2025:800  },
];
// 해외 연도별 투자
const ANNUAL_COST_US = [
  { area:"구내 운반·트럭", type:"운수사고",       y2021:4000, y2022:5500, y2023:7800, y2024:8200, y2025:8800 },
  { area:"고소작업장",     type:"떨어짐·미끄러짐", y2021:2000, y2022:2500, y2023:3000, y2024:3500, y2025:4000 },
  { area:"화학 취급구역",  type:"유해물질 노출",   y2021:1500, y2022:2000, y2023:2500, y2024:3000, y2025:3600 },
  { area:"보안·외곽",      type:"폭력·가해행위",   y2021:400,  y2022:500,  y2023:700,  y2024:900,  y2025:1100 },
  { area:"출하·야드",      type:"장비·물체 접촉",  y2021:800,  y2022:1000, y2023:1200, y2024:1500, y2025:1800 },
  { area:"도장·건조로",    type:"화재·폭발",       y2021:500,  y2022:700,  y2023:900,  y2024:1100, y2025:1300 },
];

const DATASETS = {
  korea: {
    key: "korea", label: "한국", flag: "🇰🇷",
    site: { name: "제조업 전체(실데이터)", workers: 0 },
    law: "중대재해처벌법",
    source: "KOSHA 산업재해 마이크로데이터 — 제조업 사망 4,374명(2017~2025) 실집계",
    bigPicture: {
      year: 2025, scopeLabel: "제조업 사망 (KOSHA 마이크로, 2017~2025)",
      injured: 2657, fatal: 4374, accidentFatal: 1717,
      note: "제조업 사망 4,374명 = 업무상질병 2,657명(60.7%) + 사고성 1,717명(39.3%). 9개 연도 실집계.",
    },
    // 기준위험도(baseRisk): 전체사고 대비 비중 %, 3년사고건수(실), 3년투자(가상 만원), Index 산출값
    riskItems: [
      { area:"프레스·기계라인", type:"끼임",       baseRisk:29.8, inc3y:138, cost3y:4100, baseNorm:100, occNorm:100, index:100 },
      { area:"중량물 취급",   type:"깔림·뒤집힘",   baseRisk:9.6,  inc3y:57,  cost3y:2400, baseNorm:32,  occNorm:71,  index:47  },
      { area:"고소작업장",    type:"떨어짐",        baseRisk:19.4, inc3y:100, cost3y:24000,baseNorm:65,  occNorm:12,  index:44  },
      { area:"자재 적치구역", type:"물체에 맞음",   baseRisk:9.5,  inc3y:55,  cost3y:2700, baseNorm:32,  occNorm:61,  index:43  },
      { area:"구내 운반",     type:"부딪힘",        baseRisk:7.9,  inc3y:48,  cost3y:5100, baseNorm:27,  occNorm:28,  index:27  },
      { area:"화학·반응공정", type:"폭발·파열",     baseRisk:6.2,  inc3y:31,  cost3y:2100, baseNorm:21,  occNorm:44,  index:30  },
    ],
    alarp: [
      { area:"프레스·기계라인", cost:4100,  index:100 },
      { area:"중량물 취급",    cost:2400,  index:47  },
      { area:"고소작업장",     cost:24000, index:44  },
      { area:"자재 적치구역", cost:2700,  index:43  },
      { area:"화학·반응공정", cost:2100,  index:30  },
      { area:"구내 운반",     cost:5100,  index:27  },
    ],
    topNote: "제조업 사고성 사망의 29.8%가 '끼임' — 전 산업 '떨어짐' 우세와 다름. 고소작업장은 투자 최다에도 Index 3위.",
    annualCost: ANNUAL_COST,
  },

  overseas: {
    key: "overseas", label: "해외 (미국)", flag: "🇺🇸",
    site: { name: "제조업 (美 BLS, 전체)", workers: 0 },
    law: "OSH Act / OSHA",
    source: "美 BLS Census of Fatal Occupational Injuries 2023",
    bigPicture: {
      year: 2023, scopeLabel: "미국 치명재해 (CFOI 2023)",
      injured: 2600000, fatal: 5283, accidentFatal: 5283,
      note: "치명재해 5,283명. 운수·폭력이 한국과 다른 분포를 보임.",
    },
    riskItems: [
      { area:"구내 운반·트럭", type:"운수사고",       baseRisk:36.8, inc3y:420, cost3y:24000, baseNorm:100, occNorm:100, index:100 },
      { area:"화학 취급구역",  type:"유해물질 노출",   baseRisk:15.5, inc3y:175, cost3y:9100,  baseNorm:42,  occNorm:110, index:69  },
      { area:"고소작업장",     type:"떨어짐·미끄러짐", baseRisk:16.8, inc3y:191, cost3y:10500, baseNorm:46,  occNorm:103, index:69  },
      { area:"보안·외곽",      type:"폭력·가해행위",   baseRisk:14.0, inc3y:159, cost3y:2700,  baseNorm:38,  occNorm:335, index:157 },
      { area:"출하·야드",      type:"장비·물체 접촉",  baseRisk:11.0, inc3y:125, cost3y:4500,  baseNorm:30,  occNorm:158, index:81  },
      { area:"도장·건조로",    type:"화재·폭발",       baseRisk:2.0,  inc3y:23,  cost3y:3000,  baseNorm:5,   occNorm:44,  index:21  },
    ],
    alarp: [
      { area:"보안·외곽",      cost:2700,  index:100 },
      { area:"구내 운반·트럭", cost:24000, index:65  },
      { area:"출하·야드",      cost:4500,  index:53  },
      { area:"고소작업장",     cost:10500, index:45  },
      { area:"화학 취급구역",  cost:9100,  index:45  },
      { area:"도장·건조로",    cost:3000,  index:14  },
    ],
    topNote: "미국은 '운수사고' 1위(36.8%). 보안·외곽의 '폭력행위'는 투자 최소인데 발생가능성이 최고 — 한국 표준에 없는 공백.",
    annualCost: ANNUAL_COST_US,
  },
};

const issuesByRegion = {
  korea: [
    {
      id: 1, color: "coral",
      title: "끼임이 1위 — 그러나 투자는 꼴찌 수준",
      sub: "Risk Index 100 · 3년 투자 0.41억",
      body: "제조업 사고사망의 29.8%가 '끼임'으로 1위입니다. 그런데 3년간 쏟은 투자비는 0.41억으로 전체 항목 중 최소입니다. 사고는 가장 많이 나는데 관리는 가장 덜 받고 있는 것입니다. 발생가능성 지수도 100으로 최고 — 즉시 집중 투자가 필요한 퀵윈 과제입니다.",
    },
    {
      id: 2, color: "amber",
      title: "고소작업장 — 투자 2.4억인데 사고가 줄지 않는다",
      sub: "3년 투자 2.4억(최다) · 3년 사고 100건",
      body: "고소작업장 떨어짐은 3년간 2.4억을 투자해 전체 항목 중 가장 많이 썼습니다. 그런데도 3년간 100건이 발생했고 Risk Index는 여전히 3위입니다. 투자금액이 아니라 투자 방향이 잘못된 것입니다. 안전난간·생명줄 위주에서 센서 기반 사전감지로 방향을 전환해야 합니다.",
    },
    {
      id: 3, color: "blue",
      title: "업무상질병이 사망의 60.7% — 사고 관리만으론 절반도 못 막는다",
      sub: "2,657명 질병 사망 · 60세 이상 1,670명",
      body: "제조업 전체 사망의 60.7%가 업무상질병입니다. 지금까지의 사고 중심 안전관리로는 이 절반 이상을 놓칩니다. 진폐·뇌심혈관 등 장기 누적형 질병이 주를 이루며, 60세 이상·5인 미만 소규모 사업장에 집중됩니다. 데이터로 고위험군을 사전에 식별하는 체계가 필요합니다.",
    },
  ],
  overseas: [
    {
      id: 1, color: "coral",
      title: "보안·외곽 '폭력행위' — 투자 최소, 발생가능성 최고",
      sub: "3년 투자 0.27억 · 발생가능성 Index 335",
      body: "한국 안전관리에는 없는 항목인 '폭력·가해행위'가 미국 사망의 14%입니다. 3년간 투자는 0.27억으로 전체 최소인데 발생가능성은 가장 높습니다. 해외사업장 표준에 이 항목이 빠져 있다면, 한국 기준을 그대로 적용한 것이 문제입니다.",
    },
    {
      id: 2, color: "amber",
      title: "구내 운반·트럭 — 투자 2.4억인데 Risk Index 여전히 1위",
      sub: "3년 투자 2.4억 · Risk Index 65",
      body: "구내 운반·트럭 운수사고는 가장 많이 투자(2.4억)했지만 Risk Index가 여전히 65입니다. 한국 고소작업장과 같은 패턴입니다 — 투자 방향을 속도제어·동선 분리·자동정지 시스템으로 전환해야 효과가 납니다.",
    },
    {
      id: 3, color: "blue",
      title: "유해물질 노출 15.5% — 한국보다 높고, 관리 기준이 다르다",
      sub: "OSHA HazCom · PSM 의무",
      body: "미국의 유해물질 노출 치명재해 비중은 15.5%로 한국보다 높습니다. 미국은 SDS·PEL·PSM 등 한국과 다른 기준 체계를 씁니다. 해외사업장 Risk Index에 이 현지 기준을 반영하지 않으면 정확한 우선순위를 낼 수 없습니다.",
    },
  ],
};

const strategyPillars = [
  { icon: Database, title: "데이터 통합 기반 구축", sub: "분산 데이터 → 단일 체계",
    body: "사고·설비·인사·법규 데이터를 하나의 체계로 묶어 Risk Index를 실시간 산출합니다. 근본원인 추적이 가능한 데이터 계보를 확보합니다." },
  { icon: Search, title: "선제 감지·예방", sub: "이상 신호 → 조치",
    body: "센서·IoT 데이터로 이상 신호를 사고 이전에 포착합니다. AI 예측 모델을 통해 사고 발생 패턴을 학습하고 선제 개입 시점을 앞당깁니다." },
  { icon: ShieldCheck, title: "법규 내재화", sub: "중대재해법 4대 의무 증빙",
    body: "위험성평가·관리체계·개선절차·재발방지 각 의무를 데이터 흐름에 1:1 매핑합니다. 경영책임자 보고 및 법적 증빙이 자동화됩니다." },
  { icon: TrendingUp, title: "관계사 확산", sub: "Pilot → 그룹 표준",
    body: "한 사업장에서 검증한 모델을 패키지화해 관계사로 전파합니다. 사업군별 특성에 맞게 기준위험도와 Limit을 조정해 적용합니다." },
];

// 핵심 과제 — 4M(Man/Machine/Material/Method) + 근본원인 → 해결 유형
const initiatives = [
  {
    rank: 1,
    title: "프레스·기계라인 협착 방호 즉시 강화",
    headline: "설비가 문제다 — Machine 관점 즉시 개선",
    root: "협착 방호 장치 설계 부재(Machine) + 방호 표준 미정립(Method)",
    solution: "설비(Machine): 라이트커튼·이중 방호 설치\nMethod: 작업 표준 SOP 재정립",
    type: "설비개조 + 프로세스",
    roi: "상", urgency: "상",
    period: "0~3개월",
    color: "coral",
  },
  {
    rank: 2,
    title: "고소작업장 감지 방식 전환 — 투자 방향 재설계",
    headline: "투자 방향이 잘못됐다 — 사후 장치 → 사전 감지",
    root: "추락방지 설계 치우침(Machine) + 동선·착용 점검 부재(Management)",
    solution: "Material: 스마트 안전모·동선 감지 센서 도입\nMan: 착용 의무화 교육·패널티 체계",
    type: "센싱 + 교육",
    roi: "상", urgency: "중",
    period: "3~6개월",
    color: "amber",
  },
  {
    rank: 3,
    title: "질병 고위험군 조기 식별 체계 구축",
    headline: "사고 너머 60%를 잡는다 — 질병 데이터 관리",
    root: "인사·건강검진 데이터 단절(Management) + 고령·소규모 모니터링 부재",
    solution: "Method: 연령·근무기간·질환이력 통합 스크리닝\nMan: 고위험군 정기 관리 프로세스",
    type: "프로세스 + 데이터",
    roi: "중", urgency: "중",
    period: "3~9개월",
    color: "blue",
  },
  {
    rank: 4,
    title: "AI 예측 플랫폼 구축 + 관계사 확산",
    headline: "데이터가 쌓이면, AI가 사고를 예측한다",
    root: "데이터 분산·연계 부재 → 패턴 학습 불가(전사 구조 문제)",
    solution: "Material: 센서·설비·사고 데이터 통합 플랫폼\nMethod: 시뮬레이션으로 사고 케이스 확장 → 예측 모델",
    type: "플랫폼 + AI",
    roi: "중", urgency: "하",
    period: "6~24개월",
    color: "purple",
  },
];

// 로드맵 — ROI × 시급성 2×2 매트릭스 기반 3단계
const roadmapMatrix = {
  q1: { label: "즉시 실행", axis: "시급성↑ · ROI↑", desc: "빠르게 효과를 내는 퀵윈", color: "coral",
    items: ["프레스·기계라인 라이트커튼 즉시 설치", "협착 방호 SOP 재정립", "고소작업장 감지 방식 전환 착수"] },
  q2: { label: "전략 과제", axis: "시급성↓ · ROI↑", desc: "길게 보고 단계적으로", color: "blue",
    items: ["센서 데이터 수집 인프라 구축", "사고 데이터 통합 플랫폼 개발", "시뮬레이션·AI 예측 모델 학습"] },
  q3: { label: "단기 보완", axis: "시급성↑ · ROI↓", desc: "법적 의무·리스크 완화", color: "amber",
    items: ["질병 고위험군 스크리닝 프로세스", "법규 의무 이행 증빙 체계", "업무상질병 모니터링 도입"] },
  q4: { label: "순차 검토", axis: "시급성↓ · ROI↓", desc: "리소스 여력 있을 때", color: "gray",
    items: ["기타 구역 ALARP 재산정", "관계사 전파 패키지 표준화"] },
};
const roadmapPhases = [
  { phase: "Phase 1 · 즉시(0~6개월)", title: "퀵윈 — 가장 급한 불 먼저",
    color: "coral", badge: "ROI 상 · 시급성 상",
    items: ["프레스·기계라인 라이트커튼 설치 및 SOP 재정립", "고소작업장 스마트 안전모 Pilot 도입", "질병 고위험군 스크리닝 프로세스 가동"] },
  { phase: "Phase 2 · 단기(6~18개월)", title: "기반 — 데이터를 모으고 연결한다",
    color: "amber", badge: "ROI 상 · 시급성 중",
    items: ["센서·설비·사고 데이터 통합 플랫폼 구축", "Risk Index 실시간 대시보드", "법규 의무 자동 증빙 체계 구축"] },
  { phase: "Phase 3 · 전략(18~36개월)", title: "AI 예측 + 관계사 확산",
    color: "blue", badge: "ROI 중 · 시급성 하 → 장기 ROI 최대",
    items: ["시뮬레이션으로 희소 사고 케이스 Scale-up", "AI 예측 모델 학습·정합성 고도화", "Pilot 결과 패키지화 → 관계사 순차 전파"] },
];

// ------------------------------------------------------------
// Style tokens
// ------------------------------------------------------------

const COLORS = {
  navy: "#0E2A38",
  navy2: "#16435A",
  teal: "#1D9E75",
  amber: "#BA7517",
  coral: "#D85A30",
  blue: "#378ADD",
  purple: "#7F77DD",
  bg: "#F6F5F1",
  card: "#FFFFFF",
  line: "#E2E0D8",
  textMuted: "#6B6A63",
};

const colorMap = {
  coral: { bg: "#FAECE7", fg: "#4A1B0C", border: "#F0997B" },
  amber: { bg: "#FAEEDA", fg: "#412402", border: "#EF9F27" },
  blue: { bg: "#E6F1FB", fg: "#042C53", border: "#85B7EB" },
  purple: { bg: "#EEEDFE", fg: "#26215C", border: "#AFA9EC" },
  gray: { bg: "#F1EFE8", fg: "#2C2C2A", border: "#B4B2A9" },
};

const STAGES = [
  { key: "profile", label: "자기소개", icon: FileText },
  { key: "intro", label: "소개", icon: Home },
  { key: "data", label: "데이터 분석", icon: Database },
  { key: "issue", label: "위험 인사이트", icon: AlertTriangle },
  { key: "strategy", label: "전략 방향", icon: Target },
  { key: "initiative", label: "핵심 과제", icon: Layers },
  { key: "roadmap", label: "추진 로드맵", icon: Map },
  { key: "detail", label: "데이터 상세", icon: GitBranch },
  { key: "qr", label: "접속·QR", icon: QrCode },
];

const APP_URL = "https://sabessito.github.io/ehs-demo/";
const ARCH_URL = "https://sabessito.github.io/ehs-demo/docs/data_architecture.html";
const REAL_URL = "https://sabessito.github.io/ehs-demo/docs/real_data.html";
const PROFILE_URL = "https://sabessito.github.io/ehs-demo/docs/intro_samsung.html";

// 통합 데이터셋의 전체 속성(요약 셋) — SourceBadge에서 "이 중 음영만 반영" 표현에 사용
const ATTR_ALL = [
  "victim_id","incident_id","root_cause_id","발생형태","현상","근본원인","6M","RiskIndex",
  "Cost","Limit","연도","종업종","규모","연령","지역","질병종류","센서","연결사건수",
];
// 한 행의 예시값(위 순서와 매칭)
const ATTR_SAMPLE = [
  "V00001","I-2301","RC-03","끼임","협착","협착방호 부재","Method","100",
  "4200","광전0.3초","2025","기계기구","10~19인","60세+","경남","—","라이트커튼","12",
];
function attrIdx(...names){ return names.map(n=>ATTR_ALL.indexOf(n)).filter(i=>i>=0); }

// ------------------------------------------------------------
// Glossary — 전문용어/줄임말/수식 풀이 (탭하면 설명 표시)
// ------------------------------------------------------------
const GLOSSARY = {
  "ALARP": "As Low As Reasonably Practicable. 위험을 '합리적으로 실행 가능한 수준까지' 낮추는 원칙. 추가 투자비가 위험감소 효과에 비해 과도하게 불균형하지 않은 한 줄여야 함.",
  "VPF": "Value of Preventing a Fatality. 통계적 사망 1건을 예방하는 화폐 가치. 위험감소 지불의사를 인구 전체로 합산해 산출(영국 약 £1~2M).",
  "VSL": "Value of Statistical Life. 통계적 생명가치. VPF와 사실상 같은 개념으로, 비용편익분석에서 위험감소의 편익을 화폐로 환산할 때 사용.",
  "HSE": "Health and Safety Executive. 영국 산업안전보건청. 위험 허용 기준(작업자 연 1/1,000 등)의 출처.",
  "Near-Miss": "아차사고. 사고로 이어질 뻔했으나 실제 피해는 없었던 사건. 사고의 선행 신호로 활용.",
  "Risk Index": "위험도 지수(0~100). 기준위험도(Hazard Master) + 발생추세 가중(Event)으로 산출하는 종합 위험 점수.",
  "Hazard Master": "유해·위험요인 기준정보. 재해유형 분포를 0~70으로 정규화한 구역별 기준위험도.",
  "RCA": "Root Cause Analysis. 근본원인 분석. 사건의 표면 현상이 아닌 근본 원인을 찾는 기법.",
  "Fishbone": "특성요인도(이시카와 다이어그램). 원인을 6M 등 범주로 나눠 시각화하는 RCA 기법.",
  "6M": "Man·Machine·Material·Method·Measurement·Environment. 근본원인을 분류하는 6개 범주.",
  "PSM": "Process Safety Management. 공정안전관리. 유해물질 취급 공정의 안전관리 체계(美 OSHA 1910.119).",
  "CBA": "Cost-Benefit Analysis. 비용편익분석. 대책의 비용과 위험감소 편익을 비교해 판단.",
  "EPD": "End Point Detection. 공정 종료점 검출. 반도체 식각공정 등에서 종료 시점을 자동 감지하는 기술.",
  "중대재해처벌법": "중대재해 발생 시 경영책임자의 안전보건 확보의무 위반을 처벌하는 법. 위험성평가·관리체계 구축 등을 요구.",
};

function Term({ children, k }) {
  const [open, setOpen] = useState(false);
  const key = k || (typeof children === "string" ? children : "");
  const def = GLOSSARY[key];
  if (!def) return <span>{children}</span>;
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer",
          color: COLORS.teal, fontWeight: 600,
          borderBottom: `1px dotted ${COLORS.teal}`,
        }}
      >
        {children}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100, background: "rgba(14,42,56,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 320, width: "100%", background: COLORS.navy, color: "#EAF3EF",
              borderRadius: 14, padding: "16px 18px", boxShadow: "0 12px 40px rgba(0,0,0,.35)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#9FCBB8", marginBottom: 6 }}>{key}</div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>{def}</div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 14, width: "100%", border: "none", borderRadius: 8, padding: "9px",
                background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Formula popover — 수식을 탭하면 의미 표시 (중앙 고정, 잘림 없음)
function Formula({ expr, desc }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          border: `1px solid ${COLORS.line}`, background: "#F1EFE8", cursor: "pointer",
          fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11.5, color: "#1B1B18",
          padding: "2px 7px", borderRadius: 6,
        }}
      >
        {expr} ⓘ
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100, background: "rgba(14,42,56,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 320, width: "100%", background: COLORS.navy, color: "#EAF3EF",
              borderRadius: 14, padding: "16px 18px", boxShadow: "0 12px 40px rgba(0,0,0,.35)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9FCBB8", marginBottom: 6,
              fontFamily: "ui-monospace,Menlo,monospace" }}>{expr}</div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>{desc}</div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 14, width: "100%", border: "none", borderRadius: 8, padding: "9px",
                background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 데이터 출처 배지 — 우측 정렬, 작은 폰트. 탭하면 상세(출처/가정 + 샘플) 모달.
// real=true → "(실제)", false → "(가상)". sample: 표 형태 [[헤더...],[행...]] 또는 문자열.
function SourceBadge({ real, label, detail, sample, cols, active, rows }) {
  const [open, setOpen] = useState(false);
  const tag = real ? "실제" : "가상";
  const tagColor = real ? COLORS.teal : COLORS.amber;
  const activeSet = new Set(active || []);
  const hasMatrix = cols && rows;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          border: "none", background: "none", cursor: "pointer", padding: 0,
          fontSize: 9.5, color: COLORS.textMuted, textAlign: "right", lineHeight: 1.4,
          borderBottom: `1px dotted ${COLORS.textMuted}`,
        }}
      >
        <span style={{ color: tagColor, fontWeight: 700 }}>({tag})</span> {label} ⓘ
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100, background: "rgba(14,42,56,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 380, width: "100%", maxHeight: "82vh", overflowY: "auto",
              background: COLORS.navy, color: "#EAF3EF", borderRadius: 14, padding: "16px 18px",
              boxShadow: "0 12px 40px rgba(0,0,0,.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: tagColor,
                borderRadius: 6, padding: "2px 8px" }}>{tag} 데이터</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9FCBB8" }}>{label}</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
              {real ? "출처: " : "가정: "}{detail}
            </div>

            {hasMatrix && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9FCBB8", marginBottom: 5 }}>
                  데이터 속성 ({cols.length}개 중 <span style={{ color: "#FFD9A0" }}>음영 {activeSet.size}개</span>가 현재 반영)
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 10.5 }}>
                    <thead>
                      <tr>
                        {cols.map((c, ci) => {
                          const on = activeSet.has(ci);
                          return (
                            <th key={ci} style={{
                              border: "1px solid rgba(255,255,255,0.2)", padding: "4px 7px", textAlign: "left",
                              whiteSpace: "nowrap",
                              background: on ? "rgba(255,200,120,0.30)" : "transparent",
                              color: on ? "#FFE8C7" : "rgba(207,233,222,0.55)",
                              fontWeight: on ? 700 : 500,
                            }}>{c}</th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((val, ci) => {
                            const on = activeSet.has(ci);
                            return (
                              <td key={ci} style={{
                                border: "1px solid rgba(255,255,255,0.2)", padding: "4px 7px", whiteSpace: "nowrap",
                                background: on ? "rgba(255,200,120,0.16)" : "transparent",
                                color: on ? "#fff" : "rgba(207,233,222,0.5)",
                                fontWeight: on ? 600 : 400,
                              }}>{val === "" ? "—" : val}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(207,233,222,0.7)", marginTop: 6, lineHeight: 1.5 }}>
                  음영 = 이 화면/그래프에 실제 반영된 속성. 나머지는 통합 데이터셋에 함께
                  존재하지만 여기선 쓰지 않은 속성입니다.
                </div>
              </div>
            )}

            {!hasMatrix && sample && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9FCBB8", marginBottom: 5 }}>샘플 데이터</div>
                {Array.isArray(sample) ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
                      <tbody>
                        {sample.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              ri === 0
                                ? <th key={ci} style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "4px 6px", textAlign: "left", color: "#CFE9DE", whiteSpace: "nowrap" }}>{cell}</th>
                                : <td key={ci} style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "4px 6px", whiteSpace: "nowrap" }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: "#EAF3EF" }}>{sample}</div>
                )}
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 14, width: "100%", border: "none", borderRadius: 8, padding: "9px",
                background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 좌우 스와이프로 페이지 이동
function useSwipe(onLeft, onRight) {
  const start = useRef(null);
  return {
    onTouchStart: (e) => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; },
    onTouchEnd: (e) => {
      if (!start.current) return;
      const dx = e.changedTouches[0].clientX - start.current.x;
      const dy = e.changedTouches[0].clientY - start.current.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onLeft(); else onRight();
      }
      start.current = null;
    },
  };
}

// ------------------------------------------------------------
// Shared bits
// ------------------------------------------------------------

function ScreenShell({ children }) {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: "0 auto",
        background: COLORS.bg,
        minHeight: "100vh",
        fontFamily:
          "'Pretendard','-apple-system',BlinkMacSystemFont,'Segoe UI',sans-serif",
        color: "#1B1B18",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

function Header({ stageIndex, setStageIndex, region, setRegion }) {
  return (
    <div
      style={{
        background: COLORS.navy,
        color: "#fff",
        padding: "20px 20px 16px",
        borderRadius: "0 0 20px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#9FCBB8", fontWeight: 500 }}>
            SMART SAFETY STRATEGY · DEMO
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, marginTop: 4 }}>
            EHS 전략 기획 Full Process
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 9,
            padding: 3,
            flexShrink: 0,
          }}
        >
          {Object.values(DATASETS).map((d) => {
            const active = region === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setRegion(d.key)}
                aria-label={d.label}
                title={d.label}
                style={{
                  border: "none",
                  borderRadius: 7,
                  width: 34,
                  height: 30,
                  fontSize: 17,
                  lineHeight: 1,
                  cursor: "pointer",
                  background: active ? "#fff" : "transparent",
                  opacity: active ? 1 : 0.55,
                  transition: "all 0.15s",
                }}
              >
                {d.flag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab-name strip (scrollable, active = bold/solid) */}
      <div style={{ display: "flex", gap: 6, marginTop: 14, overflowX: "auto", paddingBottom: 4,
        WebkitOverflowScrolling: "touch" }}>
        {STAGES.map((s, i) => {
          const active = i === stageIndex;
          return (
            <button
              key={s.key}
              ref={(el) => { if (el && active) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }}
              onClick={() => setStageIndex(i)}
              style={{
                flexShrink: 0,
                border: "none",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: active ? 13 : 12,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: active ? "#fff" : "rgba(255,255,255,0.10)",
                color: active ? COLORS.navy : "rgba(255,255,255,0.6)",
                transition: "all 0.15s",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Footer({ stageIndex, setStageIndex }) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        background: COLORS.bg,
        borderTop: `1px solid ${COLORS.line}`,
        padding: "12px 16px 14px",
        display: "flex",
        gap: 6,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {STAGES.map((s, i) => (
        <button
          key={s.key}
          onClick={() => setStageIndex(i)}
          aria-label={s.label}
          style={{
            width: i === stageIndex ? 22 : 9,
            height: 9,
            borderRadius: 5,
            border: "none",
            background: i === stageIndex ? COLORS.navy : "#D5D2C7",
            cursor: "pointer",
            padding: 0,
            transition: "width .15s",
          }}
        />
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1,
        color: COLORS.textMuted,
        marginBottom: 6,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 14,
        border: `1px solid ${COLORS.line}`,
        padding: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// Stage 0: Intro / 소개
// ------------------------------------------------------------

function FlowStep({ n, label, icon: Icon, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff",
          border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={COLORS.navy} />
        </div>
        <div style={{ fontSize: 10, color: COLORS.textMuted, textAlign: "center", lineHeight: 1.2, width: 56 }}>{label}</div>
      </div>
      {!last && <ArrowRight size={14} color={COLORS.line} style={{ flexShrink: 0, marginBottom: 16 }} />}
    </div>
  );
}

function ProfileStage() {
  return (
    <div style={{ padding: "0 0 8px", display: "flex", flexDirection: "column" }}>
      {/* ===== Cover ===== */}
      <div style={{ background: COLORS.navy, padding: "44px 24px 40px", color: "#fff" }}>
        <div style={{ fontSize: 14, letterSpacing: 3, fontWeight: 800, color: "#9FCBB8" }}>
          SAMSUNG
        </div>
        <div style={{ fontSize: 15, color: "#CFE9DE", margin: "18px 0 26px", lineHeight: 1.6, fontWeight: 600 }}>
          EHS 스마트안전기술 기획 지원 · 하영우
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.3, letterSpacing: -1 }}>
          Biz.부터<br />Data까지,<br />
          <span style={{ color: "#5FD0A8" }}>제조 안전을 실행</span>하는<br />전략 기획자
        </div>
        <div style={{ marginTop: 30, fontSize: 17, color: "#CFE9DE", fontWeight: 700, lineHeight: 1.6 }}>
          데이터 → 전략 → 구축,<br />그 전 과정을 직접 잇습니다
        </div>
      </div>

      {/* ===== WHY ME — 경력 스파인 ===== */}
      <div style={{ background: "#fff", padding: "34px 24px", borderBottom: `1px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: COLORS.teal, marginBottom: 22 }}>
          WHY ME
        </div>
        <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.4, letterSpacing: -0.6, color: COLORS.navy }}>
          제조 DX/AX의 전략·기획·<br />구축·운영을 모두 경험
        </div>
        <div style={{ fontSize: 16, color: "#3A3933", lineHeight: 1.75, marginTop: 18 }}>
          가장 구체화된 <b style={{ color: COLORS.navy }}>Data Level</b> 이행이 가능한
          전략 기획자입니다. KAIST 기계공학 학사.
        </div>
        {/* 경력 타임라인 (최신순) */}
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { step: "전략 · 구축 (현재)", org: "한화에어로스페이스", role: "제조혁신담당 / 과장",
              desc: "전사 제조 시스템 구축 MP/PI, 해외 사업장 표준 프로세스 정의·관리", c: COLORS.teal },
            { step: "전략 · 컨설팅", org: "Kearney", role: "DT / Specialist Associate",
              desc: "대한전선·LG에너지솔루션 스마트팩토리 Master Plan·PI 컨설팅", c: COLORS.navy2 },
            { step: "현장 · DATA", org: "SK하이닉스", role: "Data Architecture / TL",
              desc: "Smart Factory 3대 핵심과제 Data 담당, Pipeline·Mart 구축, AI/ML 솔루션 개발", c: COLORS.blue },
          ].map((s, i, arr) => (
            <div key={i} style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: s.c, flexShrink: 0,
                  border: "3px solid #fff", boxShadow: `0 0 0 2px ${s.c}` }} />
                {i < arr.length - 1 && (
                  <div style={{ width: 3, flex: 1, background: COLORS.line, minHeight: 58 }} />
                )}
              </div>
              <div style={{ paddingBottom: i < arr.length - 1 ? 22 : 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: s.c }}>{s.step}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: COLORS.navy, marginTop: 4, lineHeight: 1.3 }}>
                  {s.org} <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.textMuted }}>· {s.role}</span>
                </div>
                <div style={{ fontSize: 14.5, color: "#4A4943", lineHeight: 1.65, marginTop: 6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 직무 적합성 — 안전기획 3 Skill Set ===== */}
      <div style={{ background: COLORS.bg, padding: "34px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: COLORS.teal, marginBottom: 10 }}>
          FIT
        </div>
        <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.4, letterSpacing: -0.6, color: COLORS.navy, marginBottom: 8 }}>
          안전기획에 필요한<br />3가지 역량 중 2가지 보유
        </div>
        <div style={{ fontSize: 15, color: "#4A4943", lineHeight: 1.65, marginBottom: 22 }}>
          스마트 안전기술 기획은 <b style={{ color: COLORS.navy }}>안전지식 · 컨설팅 · Data/IT</b> 세 역량이 핵심입니다.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { n: "01", t: "컨설팅 역량", d: "선진사 벤치마킹 기반 Master Plan·PI 컨설팅, RoI·시급성 기준 과제 우선순위·로드맵 수립", have: true },
            { n: "02", t: "Data / IT 지식", d: "공정·설비 Big Data Pipeline 구축, AI/ML 기반 품질 예측 — 안전 사고 예측과 직결되는 경험", have: true },
            { n: "03", t: "안전 지식", d: "QCD에서 안전으로 — 安全 Data부터 중대재해 0까지 체계를 만드는 영역으로 확장", have: false },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 18, padding: "20px 22px",
              border: `1px solid ${s.have ? COLORS.teal : COLORS.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: s.have ? COLORS.teal : "#C9C6BD", lineHeight: 1 }}>{s.n}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy }}>{s.t}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#fff",
                  background: s.have ? COLORS.teal : "#B7B4AC", borderRadius: 12, padding: "3px 10px" }}>
                  {s.have ? "보유" : "확장 중"}
                </span>
              </div>
              <div style={{ fontSize: 14.5, color: "#4A4943", lineHeight: 1.6, marginTop: 10 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 대표 프로젝트 ===== */}
      <div style={{ background: "#fff", padding: "34px 24px", borderTop: `1px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: COLORS.teal, marginBottom: 10 }}>
          PROJECTS
        </div>
        <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.4, letterSpacing: -0.6, color: COLORS.navy, marginBottom: 22 }}>
          전략부터 구축까지,<br />직접 이끈 경험
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Project 1 — 대한전선 MP */}
          <div style={{ background: COLORS.bg, borderRadius: 18, padding: "22px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.coral }}>PROJECT 1 · 공정/품질 Part Leader</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginTop: 6, lineHeight: 1.35 }}>
              대한전선 제조혁신 Master Plan
            </div>
            <div style={{ fontSize: 14.5, color: "#4A4943", lineHeight: 1.65, marginTop: 10 }}>
              As-is 분석·8대 이슈 도출 → To-be 설계 → 12개 과제를
              <b style={{ color: COLORS.navy }}> RoI·시급성·전략 방향</b>으로 우선순위화·로드맵 수립.
            </div>
            <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "10px 14px",
              fontSize: 14, fontWeight: 800, color: COLORS.navy }}>
              → MP 이후 <span style={{ color: COLORS.coral }}>350억 규모 PI 투자 승인</span>·이행 중
            </div>
          </div>
          {/* Project 2 — ETCH Data Pipeline (요청 추가) */}
          <div style={{ background: COLORS.bg, borderRadius: 18, padding: "22px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.blue }}>PROJECT 2 · PM · Data Engineer</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginTop: 6, lineHeight: 1.35 }}>
              ETCH Data Pipeline·분석 App 구축
            </div>
            <div style={{ fontSize: 14.5, color: "#4A4943", lineHeight: 1.65, marginTop: 10 }}>
              설비 변경점 후 첫 반제품 품질불량 해소를 위해 Airflow·PySpark·자체 Big Data SDK로
              <b style={{ color: COLORS.navy }}> Data Mart·분석 App</b>을 구축.
              <span style={{ color: COLORS.textMuted }}> (안전 사고 예측과 동일한 데이터 구조)</span>
            </div>
            <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "10px 14px",
              fontSize: 14, fontWeight: 800, color: COLORS.navy }}>
              → <span style={{ color: COLORS.blue }}>24억/년 비용 절감</span> · 제조기술 부사장상 수상
            </div>
          </div>
        </div>
      </div>

      {/* ===== Closing ===== */}
      <div style={{ background: COLORS.navy, padding: "40px 24px 46px", color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: "#9FCBB8", marginBottom: 18 }}>
          CLOSING
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.45, letterSpacing: -0.6 }}>
          "중대재해 0"을 향해,<br />
          <span style={{ color: "#5FD0A8" }}>데이터에서 구축까지</span><br />잇겠습니다
        </div>
        <div style={{ fontSize: 16, color: "#CFE9DE", lineHeight: 1.8, marginTop: 22 }}>
          제가 진행한 과제의 목적은 QCD였지만, 안전 또한 Data Level부터 체계를 만들어
          계열사에 전략 기획·컨설팅하는 업무를 충분히 소화하겠습니다.
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 24, color: "#fff" }}>— 하영우</div>
      </div>
    </div>
  );
}

function IntroStage({ go }) {
  const points = [
    { icon: Database, color: "blue", title: "현황을 데이터로 진단",
      body: "내부(센서·설비·인사)와 외부(법규·타사·해외) 데이터를 사건·사람·근본원인으로 통합." },
    { icon: Compass, color: "purple", title: "Top-down·Bottom-up 전략",
      body: "그룹 사업방향과 데이터가 가리키는 위험을 교차해 관계사별 Theme 전략 도출." },
    { icon: BarChart3, color: "coral", title: "과제·로드맵·KPI로 실행",
      body: "근본원인 제거 과제를 우선순위화하고 운영·재무 KPI로 관계사 확산까지 관리." },
  ];
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Hero — 임원 대상 결론 우선 */}
      <div style={{ background: COLORS.navy, borderRadius: 16, padding: "20px 18px", color: "#fff" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.2, color: "#9FCBB8", fontWeight: 700 }}>
          EHS × AX — 그룹 안전 데이터 전환
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, marginTop: 8, lineHeight: 1.35, letterSpacing: -0.4 }}>
          중대재해 0,<br />데이터로 먼저 찾아 막는다
        </div>
        <p style={{ fontSize: 13, color: "#CFE9DE", lineHeight: 1.7, margin: "12px 0 0" }}>
          흩어진 안전 데이터를 하나로 연결해 사고가 나기 전에 위험을 짚고,
          관계사별 전략·과제로 실행하는 체계입니다.
        </p>
      </div>

      {/* Flow */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          overflowX: "auto", paddingBottom: 4 }}>
          <FlowStep n={1} label="진단" icon={Database} />
          <FlowStep n={2} label="전략" icon={Compass} />
          <FlowStep n={3} label="과제" icon={Layers} />
          <FlowStep n={4} label="로드맵" icon={Map} />
          <FlowStep n={5} label="구축·확산" icon={CheckCircle2} last />
        </div>
      </Card>

      {/* 3 core points — 압축 */}
      {points.map((p, i) => {
        const c = colorMap[p.color];
        const Icon = p.icon;
        return (
          <Card key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: c.bg,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={19} color={c.fg} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1B1B18" }}>{p.title}</div>
              <p style={{ fontSize: 12.5, color: "#4A4943", lineHeight: 1.6, margin: "4px 0 0" }}>{p.body}</p>
            </div>
          </Card>
        );
      })}

      <button onClick={() => go(1)}
        style={{ border: "none", borderRadius: 12, padding: "14px", background: COLORS.navy, color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 6 }}>
        진단 결과 보기 <ArrowRight size={16} />
      </button>
      <div style={{ fontSize: 10.5, color: COLORS.textMuted, textAlign: "center", lineHeight: 1.5 }}>
        좌우로 넘기며 보세요 · 국기로 국내/해외 전환 · 밑줄 용어는 탭하면 설명
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Stage 1: Data
// ------------------------------------------------------------

function ObjectBadge({ children, color }) {
  const c = colorMap[color] || colorMap.blue;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10.5,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 6,
        background: c.bg,
        color: c.fg,
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

function StatTile({ value, label, sub, color }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#fff",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        padding: "10px 8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, color: color || COLORS.navy, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#1B1B18", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 9.5, color: COLORS.textMuted, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 10000).toLocaleString() + "만";
  if (n >= 10000) return (n / 10000).toFixed(1) + "만";
  return n.toLocaleString();
}

// 임원용 결론-우선 헤드라인: 큰 한 문장 + 얇은 보조선
function StageLede({ kicker, headline, sub }) {
  return (
    <div style={{ margin: "2px 0 4px" }}>
      {kicker && (
        <div style={{ fontSize: 10.5, letterSpacing: 1, fontWeight: 700, color: COLORS.teal, marginBottom: 6 }}>
          {kicker}
        </div>
      )}
      <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.navy, lineHeight: 1.35, letterSpacing: -0.3 }}>
        {headline}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.6, marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function DataStage({ ds }) {
  const bp = ds.bigPicture;
  const top2 = ds.riskItems.slice(0, 2);

  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
      <StageLede
        kicker="현황 진단"
        headline={ds.key === "korea"
          ? "끼임이 1위, 고소작업장은 투자 대비 효과가 없다"
          : "운수사고 1위, 폭력 리스크는 한국 표준에 없는 공백"}
        sub={`${ds.label} 제조업 사망 데이터로 Risk Index를 산출했습니다. 기준위험도 × 발생가능성 두 축으로 우선순위를 가립니다.`}
      />

      {/* 큰 그림 */}
      <Card>
        <ObjectBadge color="gray">큰 그림 — {bp.scopeLabel}</ObjectBadge>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <StatTile value={fmtNum(bp.accidentFatal)} label="사고성 사망" sub="명" color={COLORS.coral} />
          <StatTile value={fmtNum(bp.fatal)} label="전체 사망" sub="명" color="#8A2C12" />
          <StatTile value={ds.key === "korea" ? "60.7%" : "36.8%"}
            label={ds.key === "korea" ? "질병 비중" : "운수사고 비중"} sub="" color={COLORS.navy2} />
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>{bp.note}</p>
        <SourceBadge real={true}
          label={ds.key === "korea" ? "KOSHA 마이크로데이터" : "美 BLS CFOI 2023"}
          detail={ds.source}
          cols={ATTR_ALL} active={attrIdx("victim_id","발생형태","연도","종업종","규모","연령","질병종류")} rows={[ATTR_SAMPLE]} />
      </Card>

      {/* Risk Index 산출 로직 */}
      <Card>
        <ObjectBadge color="purple">Risk Index 산출 로직</ObjectBadge>
        <div style={{ background: COLORS.navy, borderRadius: 10, padding: "10px 14px", margin: "6px 0 10px" }}>
          <div style={{ fontSize: 11, color: "#9FCBB8", fontWeight: 700, marginBottom: 6 }}>산식</div>
          <div style={{ fontSize: 12, color: "#EAF3EF", lineHeight: 1.8, fontFamily: "ui-monospace,Menlo,monospace" }}>
            기준위험도 = 해당 항목 사고건수 / 전체 사고건수 × 100<br />
            발생가능성 = 3년 사고건수 / 3년 투자비용(억원)<br />
            <span style={{ color: "#FFD9A0", fontWeight: 700 }}>
              Risk Index = 기준위험도 × 0.6 + 발생가능성 × 0.4
            </span>
          </div>
        </div>
        <SectionLabel>항목별 Risk Index (높을수록 우선)</SectionLabel>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={[...ds.riskItems].sort((a,b)=>b.index-a.index)}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEBE3" vertical={false} />
              <XAxis dataKey="area" tick={{ fontSize: 9.5, fill: COLORS.textMuted }}
                interval={0} angle={-22} textAnchor="end" height={52} />
              <YAxis tick={{ fontSize: 10, fill: COLORS.textMuted }} domain={[0, 110]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v, n) => [v, n === "baseNorm" ? "기준위험도" : "발생가능성"]} />
              <Bar dataKey="baseNorm" stackId="r" fill={COLORS.navy2} />
              <Bar dataKey="occNorm" stackId="r" fill={COLORS.purple} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
          <Legend swatch={COLORS.navy2} label="기준위험도" />
          <Legend swatch={COLORS.purple} label="발생가능성" />
        </div>
        <SourceBadge real={false}
          label="Risk Index(기준위험도=실, 발생가능성=가상 투자비 기반)"
          detail="기준위험도: KOSHA 실집계 비중 기반. 발생가능성: 3년사고건수/3년투자비용(가상). 두 값 모두 0~100 정규화."
          cols={ATTR_ALL} active={attrIdx("발생형태","RiskIndex")} rows={[ATTR_SAMPLE]} />
      </Card>

      {/* 연도별 투자비용 */}
      <Card>
        <ObjectBadge color="blue">연도별 항목별 투자비용 (만원, 가상)</ObjectBadge>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={ds.annualCost.map(r=>({ area: r.area, ...Object.fromEntries([2021,2022,2023,2024,2025].map(y=>[y,r[`y${y}`]])) }))}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEBE3" vertical={false} />
              <XAxis dataKey="area" tick={{ fontSize: 9.5, fill: COLORS.textMuted }}
                interval={0} angle={-22} textAnchor="end" height={52} />
              <YAxis tick={{ fontSize: 10, fill: COLORS.textMuted }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v) => [`${v.toLocaleString()}만원`, "투자비용"]} />
              {[2021,2022,2023,2024,2025].map((y,i)=>(
                <Bar key={y} dataKey={y} fill={["#C5D8E8","#92B8D5","#5F97BF","#3075A8","#0E2A38"][i]}
                  stackId="y" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {[2021,2022,2023,2024,2025].map((y,i)=>(
            <Legend key={y} swatch={["#C5D8E8","#92B8D5","#5F97BF","#3075A8","#0E2A38"][i]} label={String(y)} />
          ))}
        </div>
        <SourceBadge real={false} label="연도별 투자비용(가상)"
          detail="사업장 내부 운영 데이터 성격. 시연용 가상 수치이며 실제 견적·자산대장으로 대체됩니다."
          cols={ATTR_ALL} active={attrIdx("Cost","연도")} rows={[ATTR_SAMPLE]} />
      </Card>

      {/* ALARP */}
      <Card>
        <ObjectBadge color="coral">Limit — Cost × Risk Index 교차 (ALARP)</ObjectBadge>
        <AlarpDiagram points={ds.alarp} />
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <ZoneRow color="coral" label="Unacceptable (Index 75↑)" desc="비용 불문 즉시 조치" />
          <ZoneRow color="amber" label="ALARP (30~75)" desc="비용 대비 효과 따져 합리적 수준까지" />
          <ZoneRow color="blue" label="Broadly Acceptable (30↓)" desc="현 수준 유지·모니터링" />
        </div>
        <SourceBadge real={false} label="ALARP 좌표(Cost×Index)"
          detail="ALARP 경계·법적 기준선은 HSE 학술 기준(실제). 구역별 좌표는 가상 투자비 기반."
          cols={ATTR_ALL} active={attrIdx("root_cause_id","RiskIndex","Cost","Limit")} rows={[ATTR_SAMPLE]} />
      </Card>

      {/* 종합 결론 */}
      <div style={{ background: COLORS.navy, borderRadius: 12, padding: "14px 16px", color: "#fff" }}>
        <div style={{ fontSize: 11, color: "#9FCBB8", fontWeight: 700, marginBottom: 8 }}>
          📌 진단 결론 — 최우선 2개 이슈
        </div>
        {top2.map((r, i) => (
          <div key={i} style={{ marginBottom: i < top2.length-1 ? 10 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {i+1}. {r.area} ({r.type}) — Index {r.index}
            </div>
            <div style={{ fontSize: 11.5, color: "#CFE9DE", marginTop: 3, lineHeight: 1.6 }}>
              {i === 0
                ? `사고 1위 유형(기준위험도 100)인데 3년 투자는 ${(r.cost3y/10000).toFixed(1)}억으로 최소 → 즉시 투자 필요`
                : `3년 투자 ${(r.cost3y/10000).toFixed(1)}억으로 최다지만 Index ${r.index} → 투자 방향 재검토 필요`}
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#9FCBB8", marginTop: 10, lineHeight: 1.6 }}>
          {ds.topNote}
        </div>
      </div>
    </div>
  );
}

function ZoneRow({ color, label, desc }) {
  const c = colorMap[color] || colorMap.blue;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: c.bg,
          border: `1px solid ${c.border}`,
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600, color: c.fg }}>{label}</span>
        <span style={{ color: COLORS.textMuted }}> — {desc}</span>
      </div>
    </div>
  );
}

// ALARP 영역을 음영으로 표시하고, 구역별 (Cost, Risk Index) 좌표를 점으로 표시
function AlarpDiagram({ points }) {
  const W = 320;
  const H = 270;
  const padL = 42;
  const padR = 14;
  const padT = 14;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxCost = 9000;
  const mapX = (cost) => padL + (cost / maxCost) * plotW;
  const mapY = (index) => padT + plotH - (index / 100) * plotH;

  const yUnacc = mapY(UNACCEPTABLE_INDEX);
  const yLegal = mapY(LEGAL_MIN_INDEX);
  const yBottom = mapY(0);
  const yTop = mapY(100);

  return (
    <div
      role="img"
      aria-label="ALARP 프레임워크: 가로축은 예방투자 비용, 세로축은 위험도 지수. Unacceptable, ALARP, Broadly Acceptable 3개 영역을 음영으로 구분하고, 6개 구역의 비용 대비 위험도 위치를 점으로 표시."
      style={{ width: "100%", overflowX: "auto" }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* Unacceptable zone */}
        <rect x={padL} y={yTop} width={plotW} height={yUnacc - yTop} fill="#FAECE7" />
        {/* ALARP zone */}
        <rect x={padL} y={yUnacc} width={plotW} height={yBottom - yUnacc} fill="#FAEEDA" />
        {/* re-tint broadly acceptable band below legal line within ALARP zone is same amber;
            broadly acceptable region starts at Index 30 which is yBottom here since
            band thresholds: Unacceptable 75-100, ALARP 30-75, Acceptable 0-30 */}
        <rect
          x={padL}
          y={mapY(30)}
          width={plotW}
          height={yBottom - mapY(30)}
          fill="#E6F1FB"
        />

        {/* zone labels */}
        <text x={padL + 6} y={yTop + 14} fontSize="9.5" fontWeight="600" fill="#4A1B0C">
          Unacceptable
        </text>
        <text x={padL + 6} y={yUnacc + 14} fontSize="9.5" fontWeight="600" fill="#412402">
          ALARP
        </text>
        <text x={padL + 6} y={mapY(30) + 14} fontSize="9.5" fontWeight="600" fill="#042C53">
          Broadly acceptable
        </text>

        {/* legal minimum dashed line */}
        <line
          x1={padL}
          y1={yLegal}
          x2={padL + plotW}
          y2={yLegal}
          stroke="#D85A30"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <text x={padL + plotW - 4} y={yLegal - 4} fontSize="9.5" fontWeight="600" fill="#4A1B0C" textAnchor="end">
          법적 최소 기준선 (Index {LEGAL_MIN_INDEX})
        </text>

        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#B7B5AC" strokeWidth="1" />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#B7B5AC" strokeWidth="1" />
        {[0, 25, 50, 75, 100].map((v) => (
          <text key={v} x={padL - 6} y={mapY(v) + 3} fontSize="9" fill={COLORS.textMuted} textAnchor="end">
            {v}
          </text>
        ))}
        {[0, 3000, 6000, 9000].map((v) => (
          <text key={v} x={mapX(v)} y={padT + plotH + 14} fontSize="9" fill={COLORS.textMuted} textAnchor="middle">
            {(v / 1000).toFixed(0)}k
          </text>
        ))}
        <text
          x={12}
          y={padT + plotH / 2}
          fontSize="9.5"
          fill={COLORS.textMuted}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${padT + plotH / 2})`}
        >
          Risk Index
        </text>
        <text x={padL + plotW / 2} y={H - 4} fontSize="9.5" fill={COLORS.textMuted} textAnchor="middle">
          예방투자 비용 (만원)
        </text>

        {/* data points */}
        {points.map((p) => (
          <g key={p.area}>
            <circle cx={mapX(p.cost)} cy={mapY(p.index)} r="5" fill={COLORS.navy} stroke="#fff" strokeWidth="1.5" />
            <text
              x={mapX(p.cost)}
              y={mapY(p.index) - 8}
              fontSize="9.5"
              fontWeight="500"
              fill="#1B1B18"
              textAnchor="middle"
            >
              {p.area}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMuted }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: swatch }} />
      {label}
    </div>
  );
}

// ------------------------------------------------------------
// Stage 2: Issues
// ------------------------------------------------------------

function IssueStage({ ds }) {
  const issues = issuesByRegion[ds.key];
  const top2 = ds.riskItems.slice(0,2);
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
      <StageLede
        kicker="위험 인사이트"
        headline={ds.key === "korea"
          ? "데이터가 가리키는 이슈는 명확하다"
          : "한국 표준으론 잡히지 않는 리스크가 있다"}
        sub="Risk Index 진단 결과를 두 가지 행동 관점으로 재정의합니다 — 즉시 투자 vs 방향 전환."
      />
      {issues.map((iss, i) => {
        const c = colorMap[iss.color];
        const ri = top2[i];
        return (
          <Card key={iss.id}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: c.border, lineHeight: 1, flexShrink: 0 }}>
                {iss.id}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{iss.title}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.fg, marginTop: 2 }}>{iss.sub}</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "#3A3933", lineHeight: 1.7, margin: "0 0 8px" }}>
              {iss.body}
            </p>
            {ri && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, background: c.bg, color: c.fg, borderRadius: 6,
                  padding: "3px 8px", fontWeight: 600 }}>Index {ri.index}</span>
                <span style={{ fontSize: 11, background: "#F1EFE8", color: COLORS.textMuted,
                  borderRadius: 6, padding: "3px 8px" }}>
                  3년 사고 {ri.inc3y}건 · 투자 {(ri.cost3y/10000).toFixed(1)}억
                </span>
              </div>
            )}
          </Card>
        );
      })}
      <div style={{ background: COLORS.navy, borderRadius: 12, padding: "12px 14px", color: "#EAF3EF",
        fontSize: 12, lineHeight: 1.7 }}>
        <b style={{ color: "#9FCBB8" }}>→ 다음 탭</b>에서 이 이슈들을 4M(Man·Machine·Material·Method) Framework으로
        근본원인을 규명하고 해결 방안을 도출합니다.
      </div>
    </div>
  );
}
// ------------------------------------------------------------
// Stage 3: Strategy
// ------------------------------------------------------------

function StrategyStage() {
  const themes = [
    { theme: "해외 신규 구축군", focus: "공사안전(추락·중장비)", members: "베트남·인도 신공장 등", color: "coral" },
    { theme: "노후 양산설비군", focus: "협착·화재(예지보전)", members: "국내 가동 10년+ 라인", color: "amber" },
    { theme: "신규 가동 양산군", focus: "미숙련 인력(교육·동선)", members: "신설 양산 관계사", color: "blue" },
  ];
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
      <StageLede
        kicker="전략 방향"
        headline="그룹 방향과 데이터, 두 축이 만나는 곳에 전략이 있다"
        sub="Top-down(사업방향) × Bottom-up(데이터 위험)으로 관계사별 Theme 전략을 도출합니다."
      />
      <Card>
        <SectionLabel>전략 수립 Framework — 양방향 접근</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <div style={{ flex: 1, background: "#EEEDFE", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#26215C" }}>↓ Top-down</div>
            <div style={{ fontSize: 11, color: "#443", lineHeight: 1.6, marginTop: 4 }}>
              삼성 그룹 <b>사업 분류 체계</b> + 각 사업의 <b>현 전략적 방향성</b>을
              기준으로 안전 전략의 상위 방향을 정렬
            </div>
          </div>
          <div style={{ flex: 1, background: "#FAECE7", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4A1B0C" }}>↑ Bottom-up</div>
            <div style={{ fontSize: 11, color: "#632", lineHeight: 1.6, marginTop: 4 }}>
              데이터 현황 진단으로 <b>예측되는 중대재해 분류</b>에 의해 영향받는
              관계사를 식별·군집화
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 11.5, color: COLORS.teal, fontWeight: 700, margin: "10px 0 2px" }}>
          ↘ 교차점 ↙ — Theme별 전략 · 투자 우선순위 도출
        </div>
      </Card>

      <Card>
        <SectionLabel>교차 결과 — 관계사 군집 → Theme 전략</SectionLabel>
        {themes.map((t, i) => {
          const c = colorMap[t.color];
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start",
              padding: "10px 0", borderTop: i ? `1px solid ${COLORS.line}` : "none" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.border, marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t.theme}</div>
                <div style={{ fontSize: 11.5, color: c.fg, fontWeight: 600, marginTop: 1 }}>→ {t.focus}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{t.members}</div>
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
          동일 사업 국면·중대재해 분류를 가진 관계사를 군집화하면 전략·과제를 표준화·확산하기 용이합니다.
        </p>
      </Card>

      <p style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.6, margin: "2px 0 0" }}>
        각 군집에 4대 공통 전략 축을 적용합니다 — <b>위험성평가 → 사전예측 → 법규 대응 → 관계사 확산</b>.
      </p>
      {strategyPillars.map((p, i) => {
        const Icon = p.icon;
        return (
          <Card key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: COLORS.navy,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} color="#9FCBB8" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
              <div style={{ fontSize: 11.5, color: COLORS.teal, fontWeight: 600, marginTop: 1 }}>
                {p.sub}
              </div>
              <p style={{ fontSize: 12.5, color: "#4A4943", lineHeight: 1.6, margin: "6px 0 0" }}>
                {p.body}
              </p>
            </div>
          </Card>
        );
      })}

      <Card style={{ background: COLORS.navy, border: "none" }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: "#9FCBB8", fontWeight: 600, marginBottom: 4 }}>
          전략 한 줄 요약
        </div>
        <div style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.7 }}>
          "흩어진 안전 데이터를 하나의 흐름으로 연결해, <b>사고가 나기 전에 발견하고</b>,
          법이 요구하는 책임을 <b>증명 가능한 체계</b>로 만든다."
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
// Stage 4: Initiatives
// ------------------------------------------------------------

function InitiativeStage() {
  const m4 = [
    { m: "Man", label: "사람·교육", color: "blue", desc: "교육 부족, 숙련도, 절차 미준수" },
    { m: "Machine", label: "설비·장비", color: "coral", desc: "방호 설계, 노후화, 정비 부재" },
    { m: "Material", label: "자재·도구", color: "purple", desc: "안전 장비, 소재, 보호구 적합성" },
    { m: "Method", label: "프로세스", color: "amber", desc: "작업 표준, SOP, 관리 체계" },
  ];
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
      <StageLede
        kicker="핵심 과제"
        headline="근본원인을 규명하고, 해결 유형을 고른다"
        sub="4M(Man·Machine·Material·Method)으로 원인을 분류하고 어떤 수단으로 해결할지 정합니다."
      />

      {/* 4M Framework */}
      <Card>
        <SectionLabel>4M Framework — 근본원인 분류 체계</SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {m4.map((m) => {
            const c = colorMap[m.color];
            return (
              <div key={m.m} style={{ flex: "1 1 42%", background: c.bg, borderRadius: 10,
                padding: "8px 10px", border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.fg }}>{m.m}</div>
                <div style={{ fontSize: 10.5, color: c.fg, opacity: 0.8, marginTop: 1 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 과제 카드 */}
      {initiatives.map((it) => {
        const c = colorMap[it.color];
        return (
          <Card key={it.rank}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: c.border, lineHeight: 1, flexShrink: 0 }}>
                {it.rank}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{it.headline}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{it.title}</div>
              </div>
            </div>
            <div style={{ margin: "10px 0 6px", padding: "8px 10px", background: "#F1EFE8",
              borderRadius: 8, fontSize: 11.5, lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: COLORS.navy2, marginBottom: 3 }}>근본원인</div>
              <div style={{ color: "#3A3933" }}>{it.root}</div>
            </div>
            <div style={{ padding: "8px 10px", background: c.bg, borderRadius: 8,
              fontSize: 11.5, lineHeight: 1.7, border: `1px solid ${c.border}` }}>
              <div style={{ fontWeight: 700, color: c.fg, marginBottom: 3 }}>
                해결 방안 — {it.type}
              </div>
              <div style={{ color: c.fg, whiteSpace: "pre-line" }}>{it.solution}</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10.5, background: "#E1F5EE", color: "#04342C",
                borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>ROI {it.roi}</span>
              <span style={{ fontSize: 10.5, background: COLORS.navy, color: "#fff",
                borderRadius: 6, padding: "2px 8px" }}>{it.period}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Tag({ label }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: 6,
        background: "#F0EEE8",
        color: COLORS.textMuted,
      }}
    >
      {label}
    </span>
  );
}

// ------------------------------------------------------------
// Stage 5: Roadmap
// ------------------------------------------------------------

function RoadmapStage() {
  const qColors = { q1:"coral", q2:"blue", q3:"amber", q4:"gray" };
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
      <StageLede
        kicker="추진 로드맵"
        headline="ROI × 시급성으로 과제를 배치하고, 3단계로 실행한다"
        sub="즉시 해야 할 퀵윈, 기반을 쌓는 중기, AI·플랫폼으로 가는 전략 과제를 구분합니다."
      />

      {/* 2×2 매트릭스 */}
      <Card>
        <SectionLabel>ROI × 시급성 매트릭스</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
          {Object.entries(roadmapMatrix).map(([key, q]) => {
            const c = colorMap[qColors[key]];
            return (
              <div key={key} style={{ background: c.bg, borderRadius: 10, padding: "10px 10px",
                border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.fg }}>{q.label}</div>
                <div style={{ fontSize: 9.5, color: c.fg, opacity: 0.7, marginTop: 1 }}>{q.axis}</div>
                <div style={{ marginTop: 6 }}>
                  {q.items.map((it, i) => (
                    <div key={i} style={{ fontSize: 10.5, color: c.fg, lineHeight: 1.6,
                      paddingLeft: 8, borderLeft: `2px solid ${c.border}`, marginBottom: 3 }}>
                      {it}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3단계 */}
      {roadmapPhases.map((ph, i) => {
        const c = colorMap[ph.color];
        return (
          <Card key={i}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: c.bg,
                border: `1px solid ${c.border}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 800, fontSize: 14, color: c.fg, flexShrink: 0 }}>
                {i+1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color: c.fg, fontWeight: 700 }}>{ph.phase}</div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginTop: 2 }}>{ph.title}</div>
                <span style={{ fontSize: 10, background: c.bg, color: c.fg, borderRadius: 5,
                  padding: "2px 7px", fontWeight: 600, display: "inline-block", marginTop: 4 }}>
                  {ph.badge}
                </span>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {ph.items.map((it, j) => (
                    <li key={j} style={{ fontSize: 12.5, color: "#4A4943", lineHeight: 1.7 }}>{it}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        );
      })}

      {/* KPI */}
      <Card>
        <SectionLabel>KPI — 운영 지표 · 재무 지표</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.navy2, marginBottom: 4 }}>운영</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, lineHeight: 1.7, color: "#4A4943" }}>
              <li>중대재해 건수 (목표 0)</li>
              <li>Near-Miss→사고 전환율</li>
              <li>근본원인 해소율</li>
              <li>법규 이행률</li>
            </ul>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.navy2, marginBottom: 4 }}>재무</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, lineHeight: 1.7, color: "#4A4943" }}>
              <li>예방투자 대비 위험감소액</li>
              <li>사고 손실비용 절감</li>
              <li>CBA 순편익</li>
              <li>관계사 확산 ROI</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
// Stage 6: Detail (Cost·Limit + 데이터 계보 통합)
// ------------------------------------------------------------

function DetailStage() {
  const [sub, setSub] = useState("lineage");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, padding: "14px 16px 0" }}>
        {[["lineage", "데이터 계보"], ["costlimit", "센서·Cost·Limit"]].map(([k, label]) => {
          const active = sub === k;
          return (
            <button key={k} onClick={() => setSub(k)}
              style={{ flex: 1, border: `1px solid ${active ? COLORS.navy : COLORS.line}`,
                borderRadius: 10, padding: "8px 10px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: active ? COLORS.navy : "#fff", color: active ? "#fff" : COLORS.textMuted }}>
              {label}
            </button>
          );
        })}
      </div>
      {sub === "costlimit" ? <CostLimitStage /> : <ArchitectureStage />}
    </div>
  );
}

// ------------------------------------------------------------
// Stage 6a: Cost & Limit (정량 산출 + 현실화 로직)
// ------------------------------------------------------------

// 시연용 추정 단가표 (실제 견적 시 교체) — 단위: 만원
const UNIT_PRICES = [
  { item: "고정형 CCTV (AI 동선분석)", unit: 120, per: "개소" },
  { item: "스마트 안전모 (센서·알람)", unit: 35, per: "인원" },
  { item: "추락방지 안전난간/생명줄", unit: 8, per: "m" },
  { item: "협착 방호 라이트커튼", unit: 90, per: "개소" },
  { item: "가스·열 감지 IoT 센서", unit: 25, per: "개소" },
  { item: "안전교육 VR 키트", unit: 60, per: "세트" },
];

// 근본원인별 대책 = 장비 조합 → 정량 Cost
const COST_BREAKDOWN = [
  { rc: "RC-01 추락방지 설계 누락", items: [
      { name: "추락방지 안전난간/생명줄", qty: 300, unit: 8, per: "m" },
      { name: "스마트 안전모", qty: 120, unit: 35, per: "인원" },
      { name: "고정형 CCTV", qty: 12, unit: 120, per: "개소" },
    ] },
  { rc: "RC-03 협착 방호 표준 부재", items: [
      { name: "협착 방호 라이트커튼", qty: 28, unit: 90, per: "개소" },
      { name: "고정형 CCTV", qty: 8, unit: 120, per: "개소" },
    ] },
];

// Limit 현실화 전략 케이스 — 6M 가중치
const LIMIT_CASES = [
  { id: "overseas", name: "해외 다발 구축", focus: "공사안전(추락·중장비)",
    weights: { Man: 1.0, Machine: 1.3, Material: 1.0, Method: 1.2, Measurement: 1.0, Environment: 1.4 },
    note: "신규 공사현장 다수 → 추락·중장비 사고 가중. 공사단계 Limit을 보수적으로." },
  { id: "aging", name: "노후 설비 운영", focus: "협착·화재",
    weights: { Man: 1.0, Machine: 1.5, Material: 1.2, Method: 1.1, Measurement: 1.3, Environment: 1.0 },
    note: "설비 노후 → 협착·화재 가중. 예지보전 데이터와 연계해 Limit 동적 조정." },
  { id: "rampup", name: "신규 양산 가동", focus: "미숙련 인력",
    weights: { Man: 1.5, Machine: 1.1, Material: 1.0, Method: 1.3, Measurement: 1.0, Environment: 1.1 },
    note: "신규 인력 대량 투입 → Man 리스크 가중. 교육·동선관리 Limit 강화." },
];

function fmtMan(v) { return v.toLocaleString() + "만원"; }

// 센서 → 근본원인 → Limit 도출 (가상 설비/헬멧/환경 센서)
// 각 센서의 정상범위·관측값으로 이상을 감지하고, 그 패턴이 근본원인을 가리키며,
// 거기서 우리가 '관리해야 할 Limit(운영 한계선)'이 정해진다.
const SENSOR_ROWS = [
  { sensor: "프레스 광전센서(라이트커튼) 차단시간", normal: "≤ 0.2초", obs: "0.8초", status: "이상",
    rc: "협착 방호 응답 지연(Method/Machine)", limit: "차단응답 0.3초 초과 시 정지·점검" },
  { sensor: "기계라인 진동(가속도) RMS", normal: "≤ 4.5 mm/s", obs: "7.2 mm/s", status: "이상",
    rc: "베어링 마모·정비주기 미준수(Machine)", limit: "진동 6.0 mm/s 초과 시 예지보전 알람" },
  { sensor: "스마트 안전모 — 고소 추락충격 g", normal: "충격 없음", obs: "3.1 g 감지", status: "경고",
    rc: "추락방지대 미체결·동선 미분리(Man/Environment)", limit: "2.0 g 이상 충격 시 즉시 알람·구조" },
  { sensor: "작업장 가스(VOC) 농도", normal: "≤ 50 ppm", obs: "180 ppm", status: "이상",
    rc: "국소배기 부족·밀폐공간 환기 미흡(Environment)", limit: "100 ppm 초과 시 작업중지·환기" },
  { sensor: "설비 표면온도(열화상)", normal: "≤ 70℃", obs: "112℃", status: "이상",
    rc: "과부하·윤활 불량(Machine/Measurement)", limit: "90℃ 초과 시 부하차단·점검" },
  { sensor: "스마트 안전모 — 무동작(낙상 의심) 시간", normal: "-", obs: "45초 무동작", status: "경고",
    rc: "단독작업 중 의식상실 가능(Man)", limit: "30초 무동작 시 관리자 호출" },
];

function CostLimitStage() {
  const [caseId, setCaseId] = useState("overseas");
  const activeCase = LIMIT_CASES.find((c) => c.id === caseId);

  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        데이터 플랫폼에 센서가 연결되고 사고 케이스가 쌓이면, 지금의 가상 Limit이
        실제 운영 기준선으로 바뀝니다. 아래는 그 구조의 샘플입니다.
      </p>

      {/* 센서 → 근본원인 → Limit */}
      <Card>
        <ObjectBadge color="purple">센서 → 근본원인 → Limit 도출</ObjectBadge>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          fontSize: 11, color: COLORS.navy2, fontWeight: 700, margin: "6px 0 10px" }}>
          <span>설비·헬멧·환경 센서</span><span>→</span><span>이상 감지</span><span>→</span>
          <span>근본원인</span><span>→</span><span style={{ color: COLORS.coral }}>관리 Limit</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SENSOR_ROWS.map((s, i) => {
            const danger = s.status === "이상";
            const badge = danger ? COLORS.coral : COLORS.amber;
            return (
              <div key={i} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px",
                background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity size={15} color={COLORS.navy2} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>{s.sensor}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: badge,
                    borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>{s.status}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: COLORS.textMuted, margin: "6px 0 0" }}>
                  <span>정상 <b style={{ color: "#1B1B18" }}>{s.normal}</b></span>
                  <span>관측 <b style={{ color: badge }}>{s.obs}</b></span>
                </div>
                <div style={{ fontSize: 11.5, color: "#3A3933", marginTop: 6, lineHeight: 1.6 }}>
                  <span style={{ color: COLORS.purple, fontWeight: 700 }}>근본원인</span> {s.rc}
                </div>
                <div style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.6,
                  background: "#FAECE7", color: "#4A1B0C", borderRadius: 6, padding: "6px 8px" }}>
                  <span style={{ fontWeight: 700 }}>관리 Limit</span> {s.limit}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "10px 0 0", lineHeight: 1.6 }}>
          센서 관측값이 정상범위를 벗어나는 패턴이 근본원인을 가리키고, 그 지점이 곧
          '관리해야 할 Limit'이 됩니다. 사고 후가 아니라 <b>이상 신호 단계에서 선제 차단</b>하는 구조.
        </p>
        <SourceBadge
          real={false}
          label="설비·헬멧·환경 센서"
          detail="시연용 가상 센서 데이터. 실제 연동 시 임계치는 설비 사양서·작업환경측정·법규 기준으로 교체."
          cols={ATTR_ALL}
          active={attrIdx("근본원인","6M","Limit","센서")}
          rows={[ATTR_SAMPLE]}
        />
      </Card>

      {/* COST — 정량 산출 */}
      <Card>
        <ObjectBadge color="blue">Cost — 근본원인별 정량 산출</ObjectBadge>
        {COST_BREAKDOWN.map((b, bi) => {
          const total = b.items.reduce((s, it) => s + it.qty * it.unit, 0);
          return (
            <div key={bi} style={{ marginTop: bi === 0 ? 6 : 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{b.rc}</div>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr>
                    {["장비/조치", "수량", "단가", "금액"].map((h, i) => (
                      <th key={i} style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", background: "#F1EFE8", textAlign: i === 0 ? "left" : "right", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                  {b.items.map((it, ii) => (
                    <tr key={ii}>
                      <td style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px" }}>{it.name}</td>
                      <td style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{it.qty}{it.per}</td>
                      <td style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{it.unit}만</td>
                      <td style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{(it.qty * it.unit).toLocaleString()}만</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", textAlign: "right", fontWeight: 700, background: "#E6F1FB" }}>대책 합계</td>
                    <td style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", textAlign: "right", fontWeight: 700, background: "#E6F1FB", whiteSpace: "nowrap" }}>{total.toLocaleString()}만</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
        <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "10px 0 0", lineHeight: 1.6 }}>
          단가는 시연용 추정치(실제 견적 시 교체). 산식: Σ(단가 × 수량/개소).
        </p>
      </Card>

      {/* LIMIT — 학술 근거 */}
      <Card>
        <ObjectBadge color="purple">Limit — 학술적 근거</ObjectBadge>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "#3A3933" }}>
          <li><b>위험 상한선(Unacceptable)</b>: 英 <Term k="HSE">HSE</Term> 최대 허용 위험 — 작업자 연 1/1,000,
            일반인 연 1/10,000. 이 선을 넘으면 비용 불문 즉시 조치.</li>
          <li><b><Term k="ALARP">ALARP</Term> 비용편익</b>: <Term k="VPF">VPF</Term>/<Term k="VSL">VSL</Term>(통계적 생명가치, 英 약 £1~2M) 기반 <Term k="CBA">CBA</Term>로
            <Formula expr="순편익 = 위험감소액 − 대책비용" desc="순편익 = (예방되는 사망·부상의 VPF 환산 가치) − (대책 투자비). 양수면 투자 타당, ALARP 영역에서 판단." />를 비교.</li>
          <li><b>실무 적용</b>: 정밀 정량분석 필수 아님 — 전문가 판단 + 조잡한 <Term k="CBA">CBA</Term>로 충분(HSE 정책).</li>
        </ul>
        <div style={{ background: "#FAEEDA", color: "#412402", borderRadius: 8, padding: "8px 10px", marginTop: 10, fontSize: 11, lineHeight: 1.6 }}>
          현실화 과제: 위 기준은 영국 데이터. 한국은 VPF 합의값이 미정립 →
          아래 전략 케이스별로 6M 가중치를 달리해 Limit을 단계적으로 현실화.
        </div>
      </Card>

      {/* LIMIT — 전략 케이스 토글 */}
      <Card>
        <ObjectBadge color="coral">Limit 현실화 — 전략 케이스</ObjectBadge>
        <div style={{ display: "flex", gap: 6, margin: "6px 0 12px", flexWrap: "wrap" }}>
          {LIMIT_CASES.map((c) => {
            const active = c.id === caseId;
            return (
              <button key={c.id} onClick={() => setCaseId(c.id)}
                style={{ border: `1px solid ${active ? COLORS.coral : COLORS.line}`, borderRadius: 8,
                  padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  background: active ? "#FAECE7" : "#fff", color: active ? "#4A1B0C" : COLORS.textMuted }}>
                {c.name}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12.5, color: "#1B1B18", fontWeight: 600 }}>
          포커싱: {activeCase.focus}
        </div>
        <p style={{ fontSize: 12, color: "#4A4943", lineHeight: 1.6, margin: "4px 0 10px" }}>{activeCase.note}</p>
        <SectionLabel>6M 가중치 (1.0 = 기본, ↑ = Limit 강화)</SectionLabel>
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={Object.entries(activeCase.weights).map(([k, v]) => ({ m: k, w: v }))}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEBE3" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 9.5, fill: COLORS.textMuted }} interval={0} angle={-20} textAnchor="end" height={44} />
              <YAxis domain={[0, 1.6]} tick={{ fontSize: 10, fill: COLORS.textMuted }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [v + "×", "가중치"]} />
              <Bar dataKey="w" radius={[4, 4, 0, 0]}>
                {Object.entries(activeCase.weights).map(([k, v], i) => (
                  <Cell key={i} fill={v >= 1.3 ? COLORS.coral : v > 1.0 ? COLORS.amber : COLORS.navy2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
          같은 사건이라도 케이스별 가중치에 따라 근본원인의 Risk Index·Limit이 달라집니다.
          예: 해외 다발 구축에서는 Environment·Machine 가중 → 추락·중장비 근본원인의 Limit이 보수적으로.
        </p>
      </Card>

      <div style={{ background: "#E1F5EE", color: "#04342C", borderRadius: 10, padding: "10px 12px", fontSize: 11.5, lineHeight: 1.6 }}>
        Limit은 고정값이 아니라 산업·사업 국면에 따라 움직이는 변수입니다. 학술 기준 위에
        사업별 6M 가중을 적용해, 같은 위험도 현실에 맞게 운영기준선을 조정합니다.
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Stage 7: Data Architecture
// ------------------------------------------------------------

// 통합 데이터셋 — 원본(16) + 분석추가(6) + 조인/산출(6) = 28 속성
// 주요 속성(10)은 왼쪽 고정, 그 외(18)는 오른쪽 스크롤. 조인 미완 칸은 빈칸.
const DATASET_COLS = {
  major: [ // 주요 10 (왼쪽 고정 영역)
    "victim_id","incident_id","root_cause_id","발생형태","현상",
    "근본원인","6M분류","RiskIndex","대책Cost(만원)","Limit기준",
  ],
  rest: [ // 그 외 18 (오른쪽 스크롤)
    "통계기준년월","연도","대업종","종업종","규모","성별","연령","근무기간",
    "재해정도","지역","지방관서","건설공사금액","질병종류","세부질병종류",
    "연결사건수","센서출처","확산대상사","비고",
  ],
};
// 샘플 6행 (원본 실데이터 기반 + 분석/조인 속성, 빈칸은 조인 미완)
const DATASET_ROWS = [
  {victim_id:"V00001",incident_id:"I-2301",root_cause_id:"RC-03",발생형태:"끼임",현상:"협착",근본원인:"협착 방호 표준 부재",
   "6M분류":"Method",RiskIndex:100,"대책Cost(만원)":4200,Limit기준:"광전센서 0.3초",통계기준년월:202512,연도:2025,대업종:"제조업",
   종업종:"기계기구·금속",규모:"10~19인",성별:"남",연령:"60세 이상",근무기간:"6개월미만",재해정도:"사망자",지역:"경남",지방관서:"창원",
   건설공사금액:"해당없음",질병종류:"",세부질병종류:"",연결사건수:12,센서출처:"라이트커튼",확산대상사:"A사·C사",비고:""},
  {victim_id:"V00002",incident_id:"I-2301",root_cause_id:"RC-03",발생형태:"끼임",현상:"협착",근본원인:"협착 방호 표준 부재",
   "6M분류":"Method",RiskIndex:100,"대책Cost(만원)":4200,Limit기준:"광전센서 0.3초",통계기준년월:202512,연도:2025,대업종:"제조업",
   종업종:"기계기구·금속",규모:"10~19인",성별:"남",연령:"50~54세",근무기간:"1~3년",재해정도:"사망자",지역:"경남",지방관서:"창원",
   건설공사금액:"해당없음",질병종류:"",세부질병종류:"",연결사건수:12,센서출처:"라이트커튼",확산대상사:"A사·C사",비고:""},
  {victim_id:"V00003",incident_id:"I-2305",root_cause_id:"RC-01",발생형태:"떨어짐",현상:"추락",근본원인:"추락방지 설계 누락",
   "6M분류":"Machine",RiskIndex:62,"대책Cost(만원)":8500,Limit기준:"충격 2.0g",통계기준년월:202412,연도:2024,대업종:"제조업",
   종업종:"선박건조·수리",규모:"1,000인 이상",성별:"남",연령:"55~59세",근무기간:"10년 이상",재해정도:"사망자",지역:"울산",지방관서:"울산",
   건설공사금액:"해당없음",질병종류:"",세부질병종류:"",연결사건수:8,센서출처:"스마트헬멧",확산대상사:"B사",비고:""},
  {victim_id:"V00004",incident_id:"",root_cause_id:"",발생형태:"업무상질병",현상:"진폐",근본원인:"",
   "6M분류":"",RiskIndex:"","대책Cost(만원)":"",Limit기준:"",통계기준년월:202312,연도:2023,대업종:"제조업",
   종업종:"화학·고무",규모:"5인 미만",성별:"남",연령:"60세 이상",근무기간:"10년 이상",재해정도:"사망자",지역:"경기",지방관서:"안산",
   건설공사금액:"해당없음",질병종류:"진폐증",세부질병종류:"진폐증",연결사건수:"",센서출처:"",확산대상사:"",비고:"질병=RCA 미적용"},
  {victim_id:"V00005",incident_id:"I-2410",root_cause_id:"RC-07",발생형태:"폭발파열",현상:"폭발",근본원인:"반응공정 압력관리 미흡",
   "6M분류":"Measurement",RiskIndex:20,"대책Cost(만원)":1200,Limit기준:"표면온도 90℃",통계기준년월:202512,연도:2025,대업종:"제조업",
   종업종:"화학·고무",규모:"100~299인",성별:"남",연령:"45~49세",근무기간:"3~5년",재해정도:"사망자",지역:"전남",지방관서:"여수",
   건설공사금액:"해당없음",질병종류:"",세부질병종류:"",연결사건수:3,센서출처:"열화상",확산대상사:"",비고:""},
  {victim_id:"V00006",incident_id:"",root_cause_id:"",발생형태:"업무상질병",현상:"뇌심혈관",근본원인:"",
   "6M분류":"",RiskIndex:"","대책Cost(만원)":"",Limit기준:"",통계기준년월:202412,연도:2024,대업종:"제조업",
   종업종:"식료품",규모:"5~9인",성별:"여",연령:"55~59세",근무기간:"5~10년",재해정도:"사망자",지역:"충북",지방관서:"청주",
   건설공사금액:"해당없음",질병종류:"뇌심혈관질환",세부질병종류:"심근경색",연결사건수:"",센서출처:"",확산대상사:"",비고:"질병=RCA 미적용"},
];

const ARCH_NODES = {
  raw: [
    { id: "RAW-1", color: "gray", title: "원본 ① KOSHA 마이크로데이터", sub: "138,812행 · 불변(절대 미수정)",
      rows: [["재해자ID","발생형태","업종","재해정도"],["2023-0001","떨어짐","건설","사망"],["2023-0002","끼임","제조","요양"]] },
    { id: "RAW-2", color: "gray", title: "원본 ② 사고사례 API", sub: "사건 단위 서술 · 불변",
      rows: [["사례번호","사고개요","형태"],["C-23-1187","프레스 끼임","끼임"],["C-23-1188","비계 추락","떨어짐"]] },
    { id: "RAW-3", color: "gray", title: "원본 ③ 美 BLS CFOI", sub: "case-level · 불변",
      rows: [["case_id","event","연도"],["US-9001","운수","2023"],["US-9002","폭력","2023"]] },
  ],
  phase1: [
    { id: "P1", color: "blue", title: "Phase 1 — 사건·사람 관점 정렬", sub: "원본 복제본을 incident/victim 축으로 정렬",
      rows: [["incident_id","victim_id","발생형태","재해정도"],["I-2301","V-1001","끼임","사망"],["I-2301","V-1002","끼임","중상"],["I-2305","V-1003","떨어짐","사망"]] },
  ],
  phase2: [
    { id: "P2", color: "purple", title: "Phase 2 — 근본원인·현상 속성 추가", sub: "사건에 현상→직접원인→근본원인(6M) 컬럼 추가",
      rows: [["incident_id","현상","직접원인","근본원인(6M)"],["I-2301","끼임","방호 미작동","협착표준 부재(Method)"],["I-2305","떨어짐","안전대 미체결","추락설계 누락(Machine)"]] },
  ],
  phase3: [
    { id: "P3", color: "coral", title: "Phase 3 — 통합(Integration)", sub: "Phase1·2 가공본 + 내부 Cost/Event 통합 → 분석 기반",
      rows: [["root_cause_id","연결사건","피해자","Cost(만원)","Index"],["RC-01","8","9","8,500","100"],["RC-03","12","13","4,200","53"]] },
  ],
};

function ArchNode({ node, open, onToggle }) {
  const c = colorMap[node.color] || colorMap.blue;
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12,
          padding: "11px 13px", cursor: "pointer", font: "inherit",
          borderBottomLeftRadius: open ? 0 : 12, borderBottomRightRadius: open ? 0 : 12,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 3, background: c.border, flexShrink: 0 }} />
        <span style={{ flex: 1 }}>
          <b style={{ fontSize: 13, color: c.fg, display: "block" }}>{node.id} · {node.title}</b>
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>{node.sub}</span>
        </span>
        <span style={{ fontSize: 13, color: COLORS.textMuted, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span>
      </button>
      {open && (
        <div style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderTop: "none",
          borderRadius: "0 0 12px 12px", padding: 12, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
            <tbody>
              {node.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    ri === 0
                      ? <th key={ci} style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", background: "#F1EFE8", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{cell}</th>
                      : <td key={ci} style={{ border: `1px solid ${COLORS.line}`, padding: "4px 6px", whiteSpace: "nowrap" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IntegratedDataView() {
  const [open, setOpen] = useState(false);
  const total = DATASET_COLS.major.length + DATASET_COLS.rest.length;
  const majorN = DATASET_COLS.major.length;
  const restN = DATASET_COLS.rest.length;
  const cell = { border: `1px solid ${COLORS.line}`, padding: "5px 7px", whiteSpace: "nowrap", fontSize: 11 };
  const th = { ...cell, background: "#F1EFE8", fontWeight: 700, position: "sticky", top: 0, zIndex: 2 };
  const majBg = "#E6F1FB";
  return (
    <Card>
      <ObjectBadge color="blue">통합 데이터셋 — 전체 속성 한눈에</ObjectBadge>
      <p style={{ fontSize: 12, color: "#3A3933", lineHeight: 1.6, margin: "6px 0 8px" }}>
        여러 원본을 엮어 만든 통합 데이터셋입니다. 일부 컬럼만 추출한 게 아니라
        <b> 전체 {total}개 속성</b>을 모두 검토했고, 그 중 <b>주요 {majorN}개</b>를 앞에,
        나머지 <b>{restN}개</b>를 뒤에 두었습니다.
      </p>
      <div style={{ display: "flex", gap: 6, margin: "0 0 10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#042C53", background: majBg, borderRadius: 6, padding: "3px 8px" }}>전체 {total} 속성</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#085041", background: "#E1F5EE", borderRadius: 6, padding: "3px 8px" }}>주요 {majorN}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textMuted, background: "#F1EFE8", borderRadius: 6, padding: "3px 8px" }}>그 외 {restN}</span>
      </div>
      <button
        onClick={() => setOpen(true)}
        style={{ width: "100%", border: "none", borderRadius: 10, padding: "11px",
          background: COLORS.navy, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        전체 데이터셋 표 보기 ({total}속성 × {DATASET_ROWS.length}행) →
      </button>
      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
        표는 팝업으로 열립니다. 팝업 안에서 좌우로 스크롤하면 화면 전환 없이 나머지 속성을 볼 수 있습니다.
      </p>
      <SourceBadge
        real={false}
        label="통합 데이터셋(원본 실 + 분석·조인)"
        detail={`원본 16속성은 KOSHA 실데이터, 분석 6 + 조인/산출 6은 데이터 모델에 따라 추가한 가공값. 전체 ${total} = 주요 ${majorN} + 그 외 ${restN}.`}
        cols={["원본(실)","분석추가","조인/산출","계"]}
        active={[0]}
        rows={[["16","6","6","28"]]}
      />

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(14,42,56,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 680,
              maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}
          >
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.line}`,
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy }}>통합 데이터셋 전체 보기</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  전체 {total} · 주요 {majorN}(파란 영역, 좌측 고정) · 그 외 {restN}
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ border: "none", background: "#F1EFE8", borderRadius: 8, width: 30, height: 30,
                  fontSize: 16, cursor: "pointer", color: COLORS.navy, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {DATASET_COLS.major.map((c, i) => (
                      <th key={c} style={{ ...th, background: majBg, color: "#042C53",
                        position: "sticky", left: i === 0 ? 0 : undefined, zIndex: i === 0 ? 4 : 3 }}>{c}</th>
                    ))}
                    {DATASET_COLS.rest.map((c) => (<th key={c} style={th}>{c}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {DATASET_ROWS.map((row, ri) => (
                    <tr key={ri}>
                      {DATASET_COLS.major.map((c, i) => (
                        <td key={c} style={{ ...cell, background: majBg,
                          position: i === 0 ? "sticky" : undefined, left: i === 0 ? 0 : undefined, zIndex: i === 0 ? 1 : undefined,
                          fontWeight: i === 0 ? 700 : 400 }}>
                          {row[c] === "" || row[c] === undefined ? <span style={{ color: "#C9C6BD" }}>—</span> : row[c]}
                        </td>
                      ))}
                      {DATASET_COLS.rest.map((c) => (
                        <td key={c} style={cell}>
                          {row[c] === "" || row[c] === undefined ? <span style={{ color: "#C9C6BD" }}>—</span> : row[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${COLORS.line}`,
              fontSize: 11, color: COLORS.textMuted, lineHeight: 1.6 }}>
              파란 영역(주요 {majorN})은 좌우 스크롤해도 왼쪽 고정. '—'는 조인 미완 칸 —
              업무상질병 행은 사건 RCA 미적용으로 분석 속성이 비어 있음.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ArchitectureStage() {
  const [open, setOpen] = useState(null);
  const toggle = (id) => setOpen(open === id ? null : id);
  const groups = [
    { label: "원본 (Raw) — 절대 수정하지 않음 · 불변", items: ARCH_NODES.raw },
    { label: "Phase 1 — 사건·사람 관점 정렬", items: ARCH_NODES.phase1 },
    { label: "Phase 2 — 근본원인·현상 속성 추가", items: ARCH_NODES.phase2 },
    { label: "Phase 3 — 통합(Integration)", items: ARCH_NODES.phase3 },
  ];
  return (
    <div style={{ padding: "16px 16px 8px" }}>
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: "0 0 6px" }}>
        <b>원본은 절대 수정하지 않습니다.</b> 원본을 복제해 ① 사건·사람 관점으로 정렬(Phase 1),
        ② <Term k="RCA">근본원인</Term>·현상 속성 추가(Phase 2), ③ 통합(Phase 3)의 단계로만
        가공합니다.
      </p>

      <div style={{ background: COLORS.navy, borderRadius: 12, padding: "12px 14px", margin: "10px 0 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9FCBB8", marginBottom: 8, letterSpacing: .5 }}>KEY 계층</div>
        <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: "#CFE9DE", fontFamily: "ui-monospace,Menlo,monospace", whiteSpace: "pre-wrap" }}>{`root_cause_id   (근본원인 1)
   └─ incident_id   (사건 N)
        └─ victim_id   (피해자 M, 보상 단위)`}</pre>
      </div>

      <IntegratedDataView />

      <p style={{ fontSize: 11.5, color: COLORS.teal, fontWeight: 600, margin: "16px 0 14px" }}>
        ▸ 아래 각 단계를 탭하면 그 단계의 데이터 샘플이 펼쳐집니다
      </p>
      {groups.map((g, gi) => (
        <div key={gi}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, color: COLORS.navy2, margin: "14px 0 8px" }}>
            {g.label}
          </div>
          {g.items.map((n) => (
            <ArchNode key={n.id} node={n} open={open === n.id} onToggle={() => toggle(n.id)} />
          ))}
          {gi < groups.length - 1 && (
            <div style={{ textAlign: "center", color: COLORS.navy2, fontSize: 16, margin: "2px 0" }}>↓ (원본 복제 → 가공)</div>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 14, margin: "16px 0 0", fontSize: 11, color: COLORS.textMuted }}>
        <Legend swatch={colorMap.gray.border} label="원본(불변)" />
        <Legend swatch={colorMap.blue.border} label="정렬" />
        <Legend swatch={colorMap.purple.border} label="속성추가" />
        <Legend swatch={colorMap.coral.border} label="통합" />
      </div>
      <div style={{ background: "#E1F5EE", color: "#04342C", borderRadius: 10, padding: "10px 12px",
        fontSize: 11.5, lineHeight: 1.6, marginTop: 12 }}>
        핵심: 원본은 손대지 않고 Phase별 복제·변환만 수행 → 계보 추적이 가능하고,
        통합 결과(Phase 3)가 분석·Cost·Limit 산출의 기반이 됩니다.
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Stage 7: Access / QR
// ------------------------------------------------------------

const QR_SIZE = 29;
const QR_ROWS = [[0,1,2,3,4,5,6,11,12,13,14,15,16,19,22,23,24,25,26,27,28],[0,6,9,10,12,13,14,15,17,18,22,28],[0,2,3,4,6,9,11,12,14,15,17,22,24,25,26,28],[0,2,3,4,6,10,11,13,18,22,24,25,26,28],[0,2,3,4,6,9,10,14,15,16,18,22,24,25,26,28],[0,6,8,10,11,12,15,16,17,19,20,22,28],[0,1,2,3,4,5,6,8,10,12,14,16,18,20,22,23,24,25,26,27,28],[9,12,13,15,17,20],[0,3,5,6,8,9,10,11,14,15,16,18,20,21,23],[4,5,7,9,11,12,13,16,20,22,25,28],[3,6,7,8,9,11,12,13,14,16,17,19,23,24,25,26,27],[0,1,2,3,5,8,10,13,15,16,19,20,22,23,26,27],[0,4,6,11,14,16,17,19,20,21,22,25,27,28],[1,4,5,8,9,12,13,14,19,20],[1,2,6,7,13,14,16,17,18,20,22,23,25,26,27,28],[1,4,5,9,11,12,15,16,17,18,20,22,23,25,27],[3,4,5,6,7,8,10,11,12,13,17,19,20,21,27],[1,2,5,7,8,11,12,13,14,16,17,21,22,23,25,28],[0,5,6,8,9,14,17,20,23,24,27,28],[2,5,7,14,15,17,18,19,20,22,23,27,28],[0,3,4,6,11,12,15,16,18,19,20,21,22,23,24,26],[8,9,11,14,19,20,24,26,27,28],[0,1,2,3,4,5,6,10,12,16,17,20,22,24,27],[0,6,8,10,12,14,18,19,20,24,25,26],[0,2,3,4,6,9,11,12,17,20,21,22,23,24,27,28],[0,2,3,4,6,8,9,10,12,17,19,20,22,23,24,25,26,27],[0,2,3,4,6,11,12,14,16,17,19,20,21,24,25,26,28],[0,6,11,12,14,15,17,18,19,20,24,27],[0,1,2,3,4,5,6,8,9,10,11,13,14,15,17,20,24,27]];

function QRStage() {
  const cell = 7, border = 3;
  const dim = (QR_SIZE + border * 2) * cell;
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 22 }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} shapeRendering="crispEdges"
          style={{ maxWidth: 240, width: "100%", height: "auto" }}>
          <rect width={dim} height={dim} fill="#fff" />
          {QR_ROWS.map((cols, r) =>
            cols.map((c) => (
              <rect key={`${r}-${c}`} x={(c + border) * cell} y={(r + border) * cell}
                width={cell} height={cell} fill={COLORS.navy} />
            ))
          )}
        </svg>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 12 }}>스캔하면 앱으로 이동</div>
      </Card>

      <LinkRow icon={Smartphone} label="메인 앱" url={APP_URL} />
    </div>
  );
}

function LinkRow({ icon: Icon, label, url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
        background: "#F6F5F1", borderRadius: 10, padding: "10px 12px" }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.navy,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color="#9FCBB8" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1B1B18", display: "block" }}>{label}</span>
        <span style={{ fontSize: 10.5, color: COLORS.teal, wordBreak: "break-all" }}>{url}</span>
      </span>
      <ExternalLink size={15} color={COLORS.textMuted} style={{ flexShrink: 0 }} />
    </a>
  );
}

// ------------------------------------------------------------
// Main App
// ------------------------------------------------------------

export default function SmartSafetyApp() {
  const [stageIndex, setStageIndex] = useState(0);
  const [region, setRegion] = useState("korea");
  const ds = DATASETS[region];

  const goNext = () => setStageIndex((i) => Math.min(STAGES.length - 1, i + 1));
  const goPrev = () => setStageIndex((i) => Math.max(0, i - 1));
  const swipe = useSwipe(goNext, goPrev);

  const stages = {
    profile: <ProfileStage />,
    intro: <IntroStage go={setStageIndex} />,
    data: <DataStage ds={ds} />,
    issue: <IssueStage ds={ds} />,
    strategy: <StrategyStage />,
    initiative: <InitiativeStage />,
    roadmap: <RoadmapStage />,
    detail: <DetailStage />,
    qr: <QRStage />,
  };

  return (
    <ScreenShell>
      <Header stageIndex={stageIndex} setStageIndex={setStageIndex} region={region} setRegion={setRegion} />
      <div style={{ flex: 1, overflowY: "auto" }} {...swipe}>
        {stages[STAGES[stageIndex].key]}
        <div style={{ textAlign: "center", fontSize: 11, color: COLORS.textMuted, padding: "6px 0 14px" }}>
          ← 좌우로 스와이프해 페이지 이동 →
        </div>
      </div>
      <Footer stageIndex={stageIndex} setStageIndex={setStageIndex} />
    </ScreenShell>
  );
}
