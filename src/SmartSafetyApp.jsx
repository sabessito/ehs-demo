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

const DATASETS = {
  korea: {
    key: "korea",
    label: "한국",
    flag: "🇰🇷",
    site: { name: "(샘플) 한빛정밀 화성2공장", workers: 540 },
    law: "중대재해처벌법",
    source: "고용노동부 2024 산업재해현황 + 2023 현황분석",
    // 큰 그림 — 전국 규모(2023, 산재보상 승인 기준)
    bigPicture: {
      year: 2023,
      scopeLabel: "전국 (산재보험 적용)",
      injured: 136796, // 재해자수(사고+질병)
      fatal: 2016, // 사망자수(사고+질병)
      accidentFatal: 812, // 업무상 사고사망자수
      note: "재해자 13.7만명 중 사망 2,016명(사고사망 812명). 산재보상 승인 기준.",
    },
    hazardShare: [
      { type: "떨어짐", share: 33.6 },
      { type: "끼임", share: 12.8 },
      { type: "부딪힘", share: 7.5 },
      { type: "깔림·뒤집힘", share: 6.8 },
      { type: "물체에 맞음", share: 6.2 },
      { type: "화재·폭발·파열", share: 4.5 },
    ],
    cost: [
      { area: "고소작업장", cost: 8500 },
      { area: "프레스라인", cost: 4200 },
      { area: "물류·지게차", cost: 3000 },
      { area: "중량물 야적장", cost: 1500 },
      { area: "자재 적치구역", cost: 1800 },
      { area: "도장·건조로", cost: 1200 },
    ],
    riskIndex: [
      { area: "고소작업장", hazard: "떨어짐", master: 70, event: 30 },
      { area: "프레스라인", hazard: "끼임", master: 40, event: 13 },
      { area: "물류·지게차", hazard: "부딪힘", master: 35, event: 10 },
      { area: "중량물 야적장", hazard: "깔림·뒤집힘", master: 38, event: 7 },
      { area: "자재 적치구역", hazard: "물체에 맞음", master: 30, event: 4 },
      { area: "도장·건조로", hazard: "화재·폭발·파열", master: 18, event: 3 },
    ],
    alarp: [
      { area: "고소작업장", cost: 8500, index: 100 },
      { area: "프레스라인", cost: 4200, index: 53 },
      { area: "물류·지게차", cost: 3000, index: 45 },
      { area: "중량물 야적장", cost: 1500, index: 45 },
      { area: "자재 적치구역", cost: 1800, index: 34 },
      { area: "도장·건조로", cost: 1200, index: 21 },
    ],
    topNote:
      "'떨어짐'이 전국 1위(33.6%) — 고소작업장이 최우선. 한국은 떨어짐·끼임 등 추락/협착형 비중이 큼.",
  },

  overseas: {
    key: "overseas",
    label: "해외 (미국)",
    flag: "🇺🇸",
    site: { name: "(샘플) Hanbit Precision GA Plant (미국 조지아)", workers: 480 },
    law: "OSH Act / OSHA (중대재해 시 형사책임 가능)",
    source: "美 BLS Census of Fatal Occupational Injuries 2023",
    bigPicture: {
      year: 2023,
      scopeLabel: "미국 전체 (치명재해 CFOI)",
      injured: 2600000, // 민간 비치명 부상·질환 추정(약 260만건)
      fatal: 5283, // 치명재해 총계
      accidentFatal: 5283,
      note: "치명재해 5,283명, 비치명 부상·질환 약 260만건. 운수·폭력 등 한국과 다른 분포.",
    },
    hazardShare: [
      { type: "운수사고(Transport)", share: 36.8 },
      { type: "유해물질 노출", share: 15.5 },
      { type: "폭력·가해행위", share: 14.0 },
      { type: "떨어짐·미끄러짐", share: 16.8 },
      { type: "장비·물체 접촉", share: 11.0 },
      { type: "화재·폭발", share: 2.0 },
    ],
    cost: [
      { area: "구내 운반·트럭", cost: 7800 },
      { area: "화학 취급구역", cost: 3600 },
      { area: "고소작업장", cost: 4000 },
      { area: "출하·야드", cost: 2400 },
      { area: "보안·외곽", cost: 1100 },
      { area: "도장·건조로", cost: 1300 },
    ],
    riskIndex: [
      { area: "구내 운반·트럭", hazard: "운수사고", master: 70, event: 28 },
      { area: "화학 취급구역", hazard: "유해물질 노출", master: 45, event: 12 },
      { area: "고소작업장", hazard: "떨어짐·미끄러짐", master: 48, event: 14 },
      { area: "보안·외곽", hazard: "폭력·가해행위", master: 42, event: 9 },
      { area: "출하·야드", hazard: "장비·물체 접촉", master: 33, event: 6 },
      { area: "도장·건조로", hazard: "화재·폭발", master: 16, event: 3 },
    ],
    alarp: [
      { area: "구내 운반·트럭", cost: 7800, index: 98 },
      { area: "고소작업장", cost: 4000, index: 62 },
      { area: "화학 취급구역", cost: 3600, index: 57 },
      { area: "보안·외곽", cost: 1100, index: 51 },
      { area: "출하·야드", cost: 2400, index: 39 },
      { area: "도장·건조로", cost: 1300, index: 19 },
    ],
    topNote:
      "미국은 '운수사고'가 1위(36.8%)·'폭력행위'(14%)가 큰 비중 — 한국에 없는 유형. 구내 운반/외곽 보안이 핵심 관리점.",
  },
};

const issuesByRegion = {
  korea: [
    {
      id: 1,
      title: "고소작업장 '떨어짐' 위험 — Cost 최다 투입에도 Unacceptable 잔존",
      legal: "중대재해처벌법 §4 위험성평가 이행 의무",
      detail:
        "전국 사고사망 1위 유형인 '떨어짐'(33.6%)이 집중되는 고소작업장은 예방투자(8,500만원)가 가장 많음에도 Risk Index 100으로 허용불가 영역에 머묾. 비용 투입과 실제 위험감소가 비례하지 않아, 투자의 '방향'이 잘못됐을 가능성 — 위험성평가 재설계 필요.",
      color: "coral",
    },
    {
      id: 2,
      title: "도장·건조로: 통계 지수는 낮지만 화재·폭발 심각도 특이점",
      legal: "중대재해처벌법 §4-1-3 유해·위험요인 확인·개선 절차",
      detail:
        "Risk Index상으로는 법적 기준선 아래(21)지만, '화재·폭발·파열'은 1건 발생 시 다수 사망으로 이어지는 고심각도 유형. 빈도가 낮아 우선순위에서 누락되기 쉬운 '저빈도-고심각도' 영역. (실제 2024 화성 일차전지 공장 화재로 23명 사망 — 빈도 낮아도 치명적)",
      color: "amber",
    },
    {
      id: 3,
      title: "Hazard 마스터·Event 로그·점검 데이터가 분리 운영",
      legal: "중대재해처벌법 §4-1-2 안전보건관리체계 구축 의무",
      detail:
        "위험성평가(Hazard), 현장 발생기록(Event), 정기 점검 결과가 각각 다른 시스템에 분산. 경영책임자 보고용 데이터와 현장 운영 데이터 간 연계가 없어 Risk Index의 실시간 산출과 사전 예측이 불가능한 구조.",
      color: "blue",
    },
    {
      id: 4,
      title: "Cost·Risk·Limit 교차 기준(ALARP) 부재 — 투자 의사결정 비효율",
      legal: "중대재해처벌법 §4-1-4 재발방지 대책 수립·이행",
      detail:
        "비용 최적점만 보면 법적 리스크에, 법적 최소선만 보면 비용 비효율에 노출됨. 두 기준을 동시에 추적하는 ALARP 기반 운영기준선(Limit)이 없어, 어느 구역에 얼마를 투자해야 하는지 정량적 근거가 부재.",
      color: "purple",
    },
  ],
  overseas: [
    {
      id: 1,
      title: "구내 운반·트럭 '운수사고' — 미국 1위 유형(36.8%)의 집중 구역",
      legal: "OSHA 1910 Powered Industrial Trucks (지게차 안전기준)",
      detail:
        "한국과 달리 미국은 '운수사고'가 전체 치명재해의 36.8%로 압도적 1위. 구내 트럭·지게차·보행자 동선 충돌이 핵심. Cost 최다 투입에도 Risk Index 98로 허용불가 — 동선 분리·속도제어 등 방향 재설계 필요.",
      color: "coral",
    },
    {
      id: 2,
      title: "보안·외곽: 한국엔 거의 없는 '폭력·가해행위' 리스크(14%)",
      legal: "OSHA General Duty Clause 5(a)(1) — 직장폭력 예방 의무",
      detail:
        "미국 치명재해의 14%가 폭력·가해행위(살인 포함). 한국 안전관리에는 없는 항목이라 해외사업장 표준에 반드시 추가해야 함. 외곽·야간 단독작업 구역의 출입통제·CCTV·비상알람이 관리점.",
      color: "amber",
    },
    {
      id: 3,
      title: "유해물질 노출 비중(15.5%)이 한국보다 높음 — 화학 취급 강화",
      legal: "OSHA Hazard Communication / PSM 1910.119",
      detail:
        "미국은 유해물질 노출이 15.5%로 한국(상대적으로 낮음)보다 큰 비중. 화학물질 목록(SDS)·노출기준·공정안전관리(PSM) 데이터를 Hazard 마스터에 별도 반영해야 Risk Index가 현실을 반영.",
      color: "blue",
    },
    {
      id: 4,
      title: "국가별 분포 차이를 무시한 '한국 표준 일괄적용'의 위험",
      legal: "현지법(OSH Act) vs 본사 표준 — 이중 기준 정합성",
      detail:
        "한국 기준(떨어짐·끼임 중심)을 해외에 그대로 적용하면 운수·폭력 리스크를 놓침. 국가별 재해유형 분포에 따라 Hazard 마스터 가중치를 다르게 설정하는 ALARP 모델이 계열사 글로벌 확산의 핵심.",
      color: "purple",
    },
  ],
};

const strategyPillars = [
  {
    icon: Database,
    title: "Data 통합",
    sub: "분산 데이터 단일 체계화",
    body: "Near-Miss, 정기점검, 설비 센서, 작업환경측정 데이터를 단일 Data Mart로 통합. SK하이닉스 SPC/VM 구축 경험과 동일한 Pipeline 설계 적용.",
  },
  {
    icon: Search,
    title: "위험 예지",
    sub: "패턴 기반 사전 알람",
    body: "공정·구역별 Near-Miss 빈도×심각도 매트릭스로 우선관리 구역 도출. 반복 패턴 발생 시 자동 알람 체계 구축.",
  },
  {
    icon: ShieldCheck,
    title: "법규 연계",
    sub: "중대재해처벌법 4대 의무 매핑",
    body: "위험성평가-안전보건관리체계-개선절차-재발방지 각 의무 항목을 데이터 흐름과 1:1 매핑하여 경영책임자 보고 체계 자동화.",
  },
  {
    icon: TrendingUp,
    title: "확산·표준화",
    sub: "계열사 Rollout 모델",
    body: "Pilot 적용 후 표준 프로세스·대시보드 템플릿화하여 관계사 전파. 선진사 벤치마킹 기반 고도화 로드맵 제시.",
  },
];

const initiatives = [
  {
    rank: 1,
    title: "고소작업장 '떨어짐' 방지 IoT 알람 Pilot",
    scope: "고소작업장 / 프레스라인",
    roi: "상",
    urgency: "상",
    period: "3개월",
    desc: "안전대 미체결·위험구역 진입 감지 센서 부착, 임계치 초과 시 실시간 알람. ETCH 공정 EPD(End Point Detection) 설계 경험 적용. Cost 대비 Risk Index 감소폭이 가장 큰 구역 우선.",
  },
  {
    rank: 2,
    title: "저빈도·고심각도 구역 우선관리 스코어링 모델",
    scope: "도장·건조로 / 자재 적치구역",
    roi: "상",
    urgency: "상",
    period: "2개월",
    desc: "빈도뿐 아니라 심각도·법적 가중치를 반영한 우선순위 스코어링 모델 개발. 화재·폭발 등 저빈도 특이점을 ALARP 판정에 자동 반영, 점검 주기 차등화 제안.",
  },
  {
    rank: 3,
    title: "Hazard·Event 통합 Data Mart 및 법규 의무 대시보드",
    scope: "전사",
    roi: "중",
    urgency: "중",
    period: "4개월",
    desc: "분산된 3개 오브젝트(Hazard/Event/Cost) 통합 Pipeline 구축 (Airflow/PySpark). Risk Index 실시간 산출 + 경영책임자용 중대재해법 의무 이행 대시보드 자동화.",
  },
  {
    rank: 4,
    title: "ALARP 기반 투자 의사결정 모델 및 표준 Rollout 패키지",
    scope: "Pilot 사업장 → 계열사 확산",
    roi: "중",
    urgency: "하",
    period: "3개월",
    desc: "Cost×Risk×Limit 교차 최적화 모델 고도화. Pilot 결과 기반 표준 프로세스·대시보드 템플릿 패키지화하여 관계사 전파 — 채용사 본연의 '계열사 컨설팅·확산' 역할과 직결.",
  },
];

const roadmap = [
  { phase: "1단계 (1-2개월)", title: "데이터 진단 및 통합", items: ["Hazard·Event·Cost 데이터 소스 인벤토리", "3개 오브젝트 연계 설계 및 Risk Index 산식 정의", "ALARP 기준선 초안 작성"] },
  { phase: "2단계 (3-4개월)", title: "Pilot 구축", items: ["고위험 2개 구역 IoT 알람 Pilot", "우선관리 스코어링 모델 적용", "법규 의무 매핑 대시보드 v1"] },
  { phase: "3단계 (5-7개월)", title: "검증 및 고도화", items: ["Pilot 효과 검증 (Near-Miss 감소율)", "예측 모델 정교화", "현장 피드백 반영 개선"] },
  { phase: "4단계 (8-10개월)", title: "표준화 및 확산", items: ["표준 프로세스·템플릿 패키지화", "관계사 대상 기술 컨설팅", "단계적 Rollout 및 운영 이관"] },
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
    <span style={{ position: "relative", display: "inline" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{
          border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer",
          color: COLORS.teal, fontWeight: 600,
          borderBottom: `1px dotted ${COLORS.teal}`,
        }}
      >
        {children}
      </button>
      {open && (
        <>
          <span onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <span style={{
            position: "absolute", left: 0, top: "100%", marginTop: 6, zIndex: 41,
            width: 240, background: COLORS.navy, color: "#EAF3EF", fontSize: 11.5, fontWeight: 400,
            lineHeight: 1.6, padding: "10px 12px", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,.25)",
            display: "block", whiteSpace: "normal",
          }}>
            <b style={{ color: "#9FCBB8" }}>{key}</b><br />{def}
          </span>
        </>
      )}
    </span>
  );
}

// Formula popover — 수식을 탭하면 의미 표시
function Formula({ expr, desc }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{
          border: `1px solid ${COLORS.line}`, background: "#F1EFE8", cursor: "pointer",
          fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11.5, color: "#1B1B18",
          padding: "2px 7px", borderRadius: 6,
        }}
      >
        {expr} ⓘ
      </button>
      {open && (
        <>
          <span onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <span style={{
            position: "absolute", left: 0, top: "100%", marginTop: 6, zIndex: 41, width: 250,
            background: COLORS.navy, color: "#EAF3EF", fontSize: 11.5, lineHeight: 1.6,
            padding: "10px 12px", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,.25)", whiteSpace: "normal",
          }}>{desc}</span>
        </>
      )}
    </span>
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

function IntroStage({ go }) {
  const points = [
    { icon: Database, color: "blue", title: "1. 데이터로 현황 진단",
      body: "내부(센서·설비·장비·인사)와 외부(중대재해 법규·타사/해외 사례)를 모두 활용. 내·외부 데이터를 사건·사람·근본원인 관점으로 묶어 데이터화하고 분석합니다." },
    { icon: Compass, color: "purple", title: "2. Top-down·Bottom-up 전략 Framework",
      body: "Top-down은 삼성 그룹 사업 분류와 각 사업의 전략적 방향성을 기준으로, Bottom-up은 데이터 진단으로 예측되는 중대재해 분류의 영향 관계사를 묶어 구성합니다. 두 축의 교차점에서 Theme별 전략과 우선순위를 도출합니다." },
    { icon: BarChart3, color: "coral", title: "3. 과제 기획 → 구축 → 운영",
      body: "전략을 과제로 기획하고 로드맵으로 방향을 조망합니다. 운영 지표·재무 지표를 KPI로 관리해 각 관계사에 기획·구축까지 이어집니다." },
  ];
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Hero */}
      <div style={{ background: COLORS.navy, borderRadius: 16, padding: "18px 16px", color: "#fff" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.2, color: "#9FCBB8", fontWeight: 600 }}>
          SMART SAFETY STRATEGY · DEMO
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, lineHeight: 1.4 }}>
          데이터로 진단하고, 전략을 세우고,<br />관계사에 기획·구축까지
        </div>
        <p style={{ fontSize: 12.5, color: "#CFE9DE", lineHeight: 1.7, margin: "10px 0 0" }}>
          삼성EHS전략연구소에서 일한다면 <Term k="중대재해처벌법">중대재해</Term> 0을 향해
          어떻게 일할지를 담은 샘플입니다. 현황 진단 → 전략 → 과제 기획 → 로드맵 → 관계사
          기획·구축까지 <b>업무 전체 흐름</b>을 보여줍니다.
        </p>
      </div>

      {/* Flow */}
      <Card>
        <SectionLabel>업무 전체 흐름</SectionLabel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginTop: 6, overflowX: "auto", paddingBottom: 4 }}>
          <FlowStep n={1} label="데이터 진단" icon={Database} />
          <FlowStep n={2} label="전략 방향" icon={Compass} />
          <FlowStep n={3} label="과제 기획" icon={Layers} />
          <FlowStep n={4} label="로드맵" icon={Map} />
          <FlowStep n={5} label="기획·구축" icon={CheckCircle2} last />
        </div>
      </Card>

      {/* 3 core points */}
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
              <p style={{ fontSize: 12.5, color: "#4A4943", lineHeight: 1.6, margin: "5px 0 0" }}>{p.body}</p>
            </div>
          </Card>
        );
      })}

      {/* How to use */}
      <Card style={{ background: "#E1F5EE", border: "none" }}>
        <SectionLabel>보는 방법</SectionLabel>
        <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.8, color: "#04342C" }}>
          <li>화면을 <b>좌우로 스와이프</b>하거나 상단 <b>탭 이름</b>을 눌러 이동</li>
          <li>상단 우측 <b>국기</b>로 🇰🇷국내 / 🇺🇸해외 데이터 전환</li>
          <li><span style={{ color: COLORS.teal, fontWeight: 600, borderBottom: `1px dotted ${COLORS.teal}` }}>밑줄 친 용어</span>나 수식을 누르면 뜻이 나옵니다</li>
          <li>데이터 출처·계보는 <b>데이터 상세</b> 탭에서 확인</li>
        </ul>
      </Card>

      <button onClick={() => go(1)}
        style={{ border: "none", borderRadius: 12, padding: "14px", background: COLORS.navy, color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 6 }}>
        데이터 분석부터 시작하기 <ArrowRight size={16} />
      </button>
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

function DataStage({ ds }) {
  const totalCost = ds.cost.reduce((s, d) => s + d.cost, 0);
  const bp = ds.bigPicture;

  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        목표는 <b>중대재해 0</b>입니다. 사고는 대개 조치가 있었음에도 발생하는 것이 아니라,
        지켜야 할 법규·기준이 누락되거나 조치 자체가 없을 때 발생합니다. 따라서 무엇을
        놓치고 있는지 데이터로 먼저 찾아 선제적으로 개선해야 합니다. 이를 위해
        <b>① <Term k="Risk Index">Risk Index</Term>(위험도 지수) · ② Cost(개선투자) · ③
        Limit(운영기준선·<Term k="ALARP">ALARP</Term>)</b> 3가지 관점으로 분석합니다.
      </p>

      <div
        style={{
          background: "#E1F5EE",
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 11.5,
          color: "#04342C",
          lineHeight: 1.6,
        }}
      >
        <b>분석 대상</b> {ds.site.name} · 상시근로자 {ds.site.workers}명<br />
        <b>적용 법규</b> {ds.law}<br />
        <b>기준 데이터</b> {ds.source} (Cost·Limit은 내부 가상 데이터)
      </div>

      {/* 내부·외부 데이터 관점 (K1) */}
      <Card>
        <SectionLabel>데이터 관점 — 외부 + 내부를 하나로</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: "#E6F1FB", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#042C53" }}>외부 데이터</div>
            <div style={{ fontSize: 11, color: "#345", lineHeight: 1.6, marginTop: 4 }}>
              중대재해 법규 · 타사 사례 · 해외 사례 리서치
            </div>
          </div>
          <div style={{ flex: 1, background: "#EEEDFE", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#26215C" }}>내부 데이터</div>
            <div style={{ fontSize: 11, color: "#443", lineHeight: 1.6, marginTop: 4 }}>
              센서 · 설비 · 장비 · 인사정보 등 수집 가능한 데이터
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "10px 0 0", lineHeight: 1.6 }}>
          두 데이터를 <b>사건·사람·근본원인</b> 관점으로 묶어 데이터화합니다(계보는 '데이터 상세' 탭).
          아래는 그 분석을 <Term k="Risk Index">Risk Index</Term>·Cost·Limit 3관점으로 본 결과입니다.
        </p>
      </Card>

      {/* 큰 그림 — 전체 규모 통계 */}
      <Card>
        <ObjectBadge color="gray">큰 그림 — {bp.scopeLabel} · {bp.year}</ObjectBadge>
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <StatTile value={fmtNum(bp.injured)} label="재해자(부상 등)" sub="명" color={COLORS.navy2} />
          <StatTile value={fmtNum(bp.accidentFatal)} label="사고 사망" sub="명" color={COLORS.coral} />
          <StatTile value={fmtNum(bp.fatal)} label="전체 사망" sub="명" color="#8A2C12" />
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "10px 0 0", lineHeight: 1.6 }}>
          {bp.note}
        </p>
      </Card>

      {/* 재해유형 분포 — Hazard Master 근거 */}
      <Card>
        <ObjectBadge color="gray">기준 — {ds.label} 재해유형 분포</ObjectBadge>
        <SectionLabel>치명재해 유형별 비중 (%)</SectionLabel>
        <div style={{ width: "100%", height: 190 }}>
          <ResponsiveContainer>
            <BarChart
              data={ds.hazardShare}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEBE3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: COLORS.textMuted }} domain={[0, 40]} unit="%" />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ fontSize: 10, fill: "#1B1B18" }}
                width={92}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, "비중"]} />
              <Bar dataKey="share" fill={COLORS.navy2} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
          {ds.topNote}
        </p>
      </Card>

      {/* ① Cost */}
      <Card>
        <ObjectBadge color="blue">오브젝트 ① Cost — 예방투자 비용</ObjectBadge>
        <SectionLabel>구역별 예방투자 비용 (만원)</SectionLabel>
        <div style={{ width: "100%", height: 190 }}>
          <ResponsiveContainer>
            <BarChart data={ds.cost} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEBE3" vertical={false} />
              <XAxis
                dataKey="area"
                tick={{ fontSize: 10, fill: COLORS.textMuted }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 10, fill: COLORS.textMuted }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v) => [`${v.toLocaleString()}만원`, "투자비용"]}
              />
              <Bar dataKey="cost" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            marginTop: 8,
            background: "#E6F1FB",
            borderRadius: 10,
            padding: "8px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#042C53", fontWeight: 500 }}>전체 예방투자 합계</span>
          <span style={{ fontSize: 15, color: "#042C53", fontWeight: 700 }}>
            {totalCost.toLocaleString()}만원
          </span>
        </div>
      </Card>

      {/* ② Risk Index */}
      <Card>
        <ObjectBadge color="purple">오브젝트 ② Risk Index — 위험도 지수</ObjectBadge>
        <SectionLabel>Hazard(기준위험도) + Event(발생추세) = 종합 위험도 지수</SectionLabel>
        <div style={{ width: "100%", height: 190 }}>
          <ResponsiveContainer>
            <BarChart data={ds.riskIndex} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEBE3" vertical={false} />
              <XAxis
                dataKey="area"
                tick={{ fontSize: 10, fill: COLORS.textMuted }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 10, fill: COLORS.textMuted }} domain={[0, 110]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v, n) => [v, n === "master" ? "기준위험도(Master)" : "발생추세 가중(Event)"]}
              />
              <Bar dataKey="master" stackId="idx" fill={COLORS.navy2} radius={[0, 0, 0, 0]} />
              <Bar dataKey="event" stackId="idx" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
          <Legend swatch={COLORS.navy2} label="기준위험도 (Hazard Master)" />
          <Legend swatch={COLORS.purple} label="발생추세 가중 (Event Log)" />
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "8px 0 0" }}>
          {ds.riskIndex[0].area}은(는) '{ds.riskIndex[0].hazard}'({ds.label} 1위 유형) 기준위험도가
          높고, 최근 발생추세 가중까지 더해져 종합 지수 1위 — ②에서 ④까지 일관된 패턴.
        </p>
      </Card>

      {/* ③ Limit / ALARP */}
      <Card>
        <ObjectBadge color="coral">오브젝트 ③ Limit — 운영기준선 (ALARP 검증)</ObjectBadge>
        <SectionLabel>Cost × Risk Index 교차분석 — 어디까지 투자해야 안전한가</SectionLabel>
        <AlarpDiagram points={ds.alarp} />
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <ZoneRow color="coral" label="Unacceptable (Index 75↑)" desc="비용과 무관하게 즉시 조치" />
          <ZoneRow color="amber" label="ALARP (Index 30~75)" desc="비용 대비 효과를 따져 합리적 수준까지 개선" />
          <ZoneRow color="blue" label="Broadly Acceptable (Index 30↓)" desc="현 수준 유지·모니터링" />
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "10px 0 0", lineHeight: 1.6 }}>
          점선은 <b>법적 최소 기준선(Index {LEGAL_MIN_INDEX})</b> — {ds.law} 체계에서는 "비용이
          과도하다"는 이유만으로 조치를 면제하지 않으므로, 실제 Limit은 통계적 ALARP 기준과
          법적 최소 기준 중 <b>더 엄격한 값</b>으로 설정합니다. 도장·건조로는 Index상
          기준선 아래지만 화재·폭발 심각도 특이점으로 별도 관리 대상입니다.
        </p>
      </Card>
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
  const introLaw = ds.key === "korea" ? "중대재해처벌법 의무 항목" : "OSHA / 현지 안전법규";
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        {ds.flag} {ds.label} 데이터 분석 결과를 <b>{introLaw}</b>과 연결하여, 단순 통계가 아닌
        법적·경영 리스크 관점의 이슈로 재정의합니다.
      </p>
      {issues.map((iss) => {
        const c = colorMap[iss.color];
        return (
          <Card key={iss.id}>
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: c.bg,
                  color: c.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {iss.id}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{iss.title}</div>
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: c.bg,
                    color: c.fg,
                  }}
                >
                  {iss.legal}
                </div>
                <p style={{ fontSize: 12.5, color: "#4A4943", lineHeight: 1.6, margin: "8px 0 0" }}>
                  {iss.detail}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
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
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        전략은 <b>Top-down</b>과 <b>Bottom-up</b>을 동시에 고려해 수립합니다. 하향식으로
        그룹 차원의 방향성을 정렬하고, 상향식으로 데이터가 가리키는 실제 위험을 반영해,
        두 축이 만나는 지점에서 Theme별 전략과 우선순위를 도출합니다.
      </p>

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
  const radarData = initiatives.map((it) => ({
    subject: `과제 ${it.rank}`,
    ROI: it.roi === "상" ? 3 : it.roi === "중" ? 2 : 1,
    긴급도: it.urgency === "상" ? 3 : it.urgency === "중" ? 2 : 1,
  }));

  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        전략을 실행 가능한 과제로 기획합니다. 방법론은 <b>근본원인 → 대책 → 기대효과</b>를
        한 장으로 정의(과제기획서)하고, <b>ROI · 시급성</b> 기준으로 우선순위를 부여하는 방식입니다.
      </p>

      <Card>
        <SectionLabel>과제별 ROI · 긴급도 비교</SectionLabel>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#EEEBE3" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: COLORS.textMuted }} />
              <PolarRadiusAxis domain={[0, 3]} tick={false} axisLine={false} />
              <Radar name="ROI" dataKey="ROI" stroke={COLORS.navy2} fill={COLORS.navy2} fillOpacity={0.25} />
              <Radar name="긴급도" dataKey="긴급도" stroke={COLORS.coral} fill={COLORS.coral} fillOpacity={0.2} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
          <Legend swatch={COLORS.navy2} label="ROI" />
          <Legend swatch={COLORS.coral} label="긴급도" />
        </div>
      </Card>

      {initiatives.map((it) => (
        <Card key={it.rank}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: it.rank === 1 ? COLORS.teal : "#EFEDE5",
                  color: it.rank === 1 ? "#fff" : COLORS.navy,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                }}
              >
                {it.rank}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{it.title}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, marginLeft: 36, flexWrap: "wrap" }}>
            <Tag label={`적용범위: ${it.scope}`} />
            <Tag label={`ROI ${it.roi}`} />
            <Tag label={`시급성 ${it.urgency}`} />
            <Tag label={`기간 ${it.period}`} />
          </div>
          <p style={{ fontSize: 12.5, color: "#4A4943", lineHeight: 1.6, margin: "8px 0 0 36px" }}>
            {it.desc}
          </p>
        </Card>
      ))}
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
  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        Pilot → 검증 → 표준화·확산의 단계로, <b>계열사 전파가 가능한 구조</b>로 설계합니다.
      </p>

      {roadmap.map((r, i) => (
        <Card key={i}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: COLORS.navy,
                  color: "#9FCBB8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              {i < roadmap.length - 1 && (
                <div style={{ width: 2, flex: 1, background: COLORS.line, marginTop: 4, minHeight: 30 }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: i < roadmap.length - 1 ? 4 : 0 }}>
              <div style={{ fontSize: 11.5, color: COLORS.teal, fontWeight: 600 }}>{r.phase}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{r.title}</div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {r.items.map((it, j) => (
                  <li key={j} style={{ fontSize: 12.5, color: "#4A4943", lineHeight: 1.7 }}>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <SectionLabel>KPI — 운영 지표 · 재무 지표로 관리</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.navy2, marginBottom: 4 }}>운영 지표</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, lineHeight: 1.7, color: "#4A4943" }}>
              <li>중대재해 건수(목표 0)</li>
              <li>Near-Miss→사고 전환율</li>
              <li>근본원인 해소율(%)</li>
              <li>법규 의무 이행률(%)</li>
            </ul>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.navy2, marginBottom: 4 }}>재무 지표</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, lineHeight: 1.7, color: "#4A4943" }}>
              <li>예방투자 대비 위험감소액</li>
              <li>사고 손실비용 절감</li>
              <li>근본원인당 <Term k="CBA">CBA</Term> 순편익</li>
              <li>관계사 확산 ROI</li>
            </ul>
          </div>
        </div>
        <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "10px 0 0", lineHeight: 1.6 }}>
          운영 지표로 '안전이 실제 좋아지는가'를, 재무 지표로 '투자가 합리적인가'를 동시에 관리합니다.
        </p>
      </Card>

      <Card style={{ background: "#E1F5EE", border: "none" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <CheckCircle2 size={18} color="#085041" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: "#04342C", lineHeight: 1.7, margin: 0 }}>
            <b>기대 효과</b>: Pilot 구역 Near-Miss → 사고 전환율 30% 이상 감소,
            중대재해처벌법 4대 의무 이행 데이터의 상시 증빙 체계 확보, 계열사 표준 템플릿
            기반 단계적 확산.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
// Stage 6: Detail (Cost·Limit + 데이터 계보 통합)
// ------------------------------------------------------------

function DetailStage() {
  const [sub, setSub] = useState("costlimit");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, padding: "14px 16px 0" }}>
        {[["costlimit", "Cost·Limit"], ["lineage", "데이터 계보"]].map(([k, label]) => {
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

function CostLimitStage() {
  const [caseId, setCaseId] = useState("overseas");
  const activeCase = LIMIT_CASES.find((c) => c.id === caseId);

  return (
    <div style={{ padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        Cost는 <b>근본원인 제거 대책을 장비 단위로 분해</b>해 정량 산출하고, Limit은
        <b>학술 근거(<Term k="HSE">HSE</Term>·<Term k="VPF">VPF</Term>) 위에 산업·전략 특성을 반영</b>해 현실화합니다.
      </p>

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
        면접 포인트: "Limit은 고정값이 아니라 산업·사업 전략에 따라 움직이는 변수다.
        학술 기준을 토대로, 사업 국면별 6M 가중으로 현실화하는 로직을 설계했다."
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Stage 7: Data Architecture
// ------------------------------------------------------------

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

      <p style={{ fontSize: 11.5, color: COLORS.teal, fontWeight: 600, margin: "0 0 14px" }}>
        ▸ 각 항목을 탭하면 실제 데이터셋 샘플이 펼쳐집니다
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
      <p style={{ fontSize: 13.5, color: "#3A3933", lineHeight: 1.6, margin: 0 }}>
        면접관이 폰으로 바로 접속할 수 있는 QR과 주소입니다. 발표자료에 이 화면을
        그대로 띄워도 됩니다.
      </p>

      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 18 }}>
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
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 10 }}>스캔하면 메인 앱으로 이동</div>
      </Card>

      <Card>
        <SectionLabel>접속 주소</SectionLabel>
        <LinkRow icon={Smartphone} label="메인 앱" url={APP_URL} />
        <div style={{ height: 8 }} />
        <LinkRow icon={GitBranch} label="데이터 아키텍처(웹)" url={ARCH_URL} />
      </Card>

      <div style={{ background: "#E1F5EE", color: "#04342C", borderRadius: 10, padding: "10px 12px",
        fontSize: 11.5, lineHeight: 1.6 }}>
        팁: 발표자료 첫 장에 이 QR을 넣고 "직접 보시겠어요?"로 자연스럽게 시연을 유도하세요.
        코드를 수정해 push하면 1~3분 뒤 같은 주소에 자동 반영됩니다.
      </div>
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
