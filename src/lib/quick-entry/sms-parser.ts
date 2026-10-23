// 카드 승인 문자 / 카카오톡 결제 알림 텍스트 → 거래 후보 파서 (규칙 기반)

export interface ParsedEntry {
  raw: string;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  merchant: string | null;
  amount: number | null; // 취소는 음수
  cardCompany: string | null;
  cardLast4: string | null;
  paymentType: string; // 일시불 | 할부
  installmentMonths: number;
  isCancel: boolean;
  warnings: string[];
}

const CARD_PATTERNS: [string, RegExp][] = [
  ["현대카드", /현대카드|hyundai/i],
  ["국민카드", /KB\s?국민|국민카드|KB Pay|KB카드/i],
  ["신한카드", /신한/],
  ["하나카드", /하나카드|하나\s?머니|하나\(/],
  ["우리카드", /우리카드|우리\s?WON/],
  ["롯데카드", /롯데카드/],
  ["농협카드", /NH|농협/i],
  ["삼성카드", /삼성카드/],
  ["지역화폐", /지역화폐|아산페이|chak|착|지역사랑|지역상품권/i],
];

/** 여러 문자가 한 번에 붙여넣기 된 텍스트를 개별 메시지로 분리 */
export function splitMessages(input: string): string[] {
  const text = input.replace(/\r/g, "").trim();
  if (!text) return [];
  // [Web발신] 마커 기준 분리
  let parts = text.split(/(?=\[Web발신\])/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    // 빈 줄 기준 분리
    parts = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  }
  // 카카오톡 복사 포맷: "[오전 10:32] 이름 : ..." 형태는 줄 단위 분리
  if (parts.length <= 1 && /^\[(오전|오후)\s*\d{1,2}:\d{2}\]/m.test(text)) {
    parts = text.split(/\n(?=\[(?:오전|오후)\s*\d{1,2}:\d{2}\])/).map((s) => s.trim()).filter(Boolean);
  }
  // 한 줄에 한 건씩인 경우
  if (parts.length <= 1) {
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    const withAmount = lines.filter((l) => /[\d,]+\s*원/.test(l));
    if (lines.length > 1 && withAmount.length === lines.length) parts = lines;
  }
  return parts;
}

function detectCard(text: string): string | null {
  for (const [name, re] of CARD_PATTERNS) if (re.test(text)) return name;
  return null;
}

function pad(n: number | string) {
  return String(n).padStart(2, "0");
}

function inferDate(
  m: RegExpMatchArray | null,
  now: Date,
): string | null {
  if (!m) return null;
  if (m[1] && m[1].length === 4) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  const month = Number(m[2]);
  const day = Number(m[3]);
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  // 미래 날짜(1일 초과)면 작년으로 간주 (12월 문자를 1월에 붙여넣는 경우)
  if (candidate.getTime() - now.getTime() > 2 * 86400_000) year -= 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * 카드사 앱 푸시 알림 스크린샷(OCR) 정리.
 * - "Yesterday, 10:27 AM" 같은 알림 센터 상대시간 헤더 제거 (AM/PM이 가맹점에 섞이는 것 방지)
 * - "OOO 님," 이름 접두 제거
 * - "현대 M3 BOOST 승인" 처럼 카드명만 있고 "카드" 글자가 없는 현대카드 표기를 보정
 */
export function cleanPushText(raw: string): string {
  return raw
    .replace(/^\s*(Yesterday|Today|어제|오늘|\d+\s*(?:분|시간)\s*전|\d+\s*(?:m|h|min|hr)s?\s*ago)[^\n]*\n/gim, "")
    .replace(/\b(?:\d{1,2}:\d{2}\s*(?:AM|PM))\b/gi, " ")
    .replace(/[가-힣]{2,4}\s*님\s*,?/g, " ")
    .replace(/현대\s+(M\d?|X|ZERO|[A-Z0-9]+)\s*(BOOST|EDITION\d*|[A-Z0-9]*)?\s*승인/g, "현대카드 $1 $2 승인");
}

export function parseMessage(raw: string, now: Date = new Date()): ParsedEntry {
  const warnings: string[] = [];
  const text = cleanPushText(raw.replace(/\[Web발신\]/g, "")).replace(/\s+/g, " ").trim();

  const isCancel = /취소/.test(text);

  // 금액: 첫 번째 "n원" (누적/잔여/한도 앞의 값을 우선)
  let amount: number | null = null;
  const stripped = text.replace(/(누적|잔여|한도|잔액)\s*[\d,]+\s*원?/g, "");
  const am = stripped.match(/(-?[\d,]{1,12})\s*원/);
  if (am) {
    const n = Number(am[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n !== 0) amount = isCancel ? -Math.abs(n) : Math.abs(n);
  }

  // 날짜: YYYY-MM-DD / YYYY.MM.DD / MM/DD / MM월 DD일
  const dm =
    stripped.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/) ||
    stripped.match(/()(\d{1,2})\/(\d{1,2})(?!\d)/) ||
    stripped.match(/()(\d{1,2})월\s*(\d{1,2})일/);
  const date = inferDate(dm, now);

  const tm = stripped.match(/(?<![\d/])(\d{1,2}):(\d{2})(?![\d/])/);
  const time = tm ? `${pad(tm[1])}:${tm[2]}` : null;

  const im = stripped.match(/(\d{1,2})\s*개월/);
  const installmentMonths = im ? Number(im[1]) : 0;
  const paymentType = installmentMonths > 1 ? "할부" : "일시불";

  const cardCompany = detectCard(text);
  const l4 = text.match(/\(?\*?(\d{4})\)?\s*(?:승인|결제)/) || text.match(/카드\(?(\d{4})\)?/);
  const cardLast4 = l4 ? l4[1] : null;

  // 가맹점: 날짜/시간 뒤 ~ 누적/잔여/한도 앞. 없으면 "가맹점" 키워드.
  let merchant: string | null = null;
  const labeled = stripped.match(/(?:가맹점|사용처|이용처)\s*[:：]?\s*([^\d][^|]*?)(?=\s*(?:누적|잔여|한도|금액|결제금액|$))/);
  if (labeled) merchant = labeled[1].trim();
  if (!merchant) {
    const anchor = tm ? tm[0] : dm ? dm[0] : null;
    if (anchor) {
      const after = stripped.slice(stripped.indexOf(anchor) + anchor.length);
      // 가맹점 뒤에 "금액원 일시불/할부 누적 …"이 오는 형식이 많다 → 금액 앞에서 자른다
      const cut = after
        .split(/\s(?:누적|잔여|한도|잔액)/)[0]
        .split(/\s-?[\d,]{1,12}\s*원/)[0]
        .replace(/\s*(일시불|할부|\d{1,2}\s*개월)\s*$/, "")
        .trim();
      if (cut) merchant = cut;
    }
  }
  if (!merchant) {
    // 금액 뒤에 오는 텍스트 (일시불/할부 제외)
    const after = am ? stripped.slice(stripped.indexOf(am[0]) + am[0].length) : "";
    const cleaned = after
      .replace(/\(?일시불\)?|\d{1,2}\s*개월|할부/g, "")
      .replace(/(20\d{2}[-./])?\d{1,2}[/.-]\d{1,2}|\d{1,2}:\d{2}/g, "")
      .split(/\s(?:누적|잔여|한도|잔액)/)[0]
      .trim();
    if (cleaned) merchant = cleaned;
  }
  if (merchant) {
    merchant = merchant
      .replace(/^[\]\s:：\-]+/, "")
      .replace(/(승인|결제|취소|완료)$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!merchant) merchant = null;
  }

  if (amount === null) warnings.push("금액을 찾지 못했습니다");
  if (!date) warnings.push("날짜를 찾지 못했습니다");
  if (!merchant) warnings.push("가맹점을 찾지 못했습니다");
  if (!cardCompany) warnings.push("카드사를 판별하지 못했습니다");

  return {
    raw, date, time, merchant, amount, cardCompany, cardLast4,
    paymentType, installmentMonths, isCancel, warnings,
  };
}

export function parseMessages(input: string, now: Date = new Date()): ParsedEntry[] {
  return splitMessages(input).map((m) => parseMessage(m, now));
}
