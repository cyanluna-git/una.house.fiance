/**
 * 모바일/태블릿 레이아웃 회귀 검사.
 * 2026-10-19 모바일 UI 점검에서 발견한 문제가 다시 생기지 않게 막는다.
 *
 * 검사 (화면 14개 × 뷰포트 4개):
 *  1. 화면 전체 가로 넘침 없음
 *  2. 이동 수단 존재 (사이드바 / 햄버거 / 하단 메뉴 중 하나가 보임)
 *  3. 고정 요소(저장 버튼, 하단 메뉴 등) 겹침 없음
 *  4. 폰·태블릿에서 16px 미만 입력칸 없음 (iOS 포커스 확대)
 *  5. 금액("1,234원")이 줄바꿈되지 않음
 *  6. 폰 상단 제목이 기본값("unahouse.finance")이 아님
 */
import { test, expect, type Page } from "@playwright/test";

const PAGES = [
  "/", "/transactions", "/manual", "/quick", "/cards", "/analytics", "/income",
  "/fixed-expenses", "/loans", "/trips", "/family", "/import", "/category-rules", "/assets",
];

const VIEWPORTS = [
  { name: "폰 360", width: 360, height: 780, mobile: true },
  { name: "폰 390", width: 390, height: 844, mobile: true },
  { name: "아이패드 세로 820", width: 820, height: 1180, mobile: true },
  { name: "폰 가로 844", width: 844, height: 390, mobile: true },
  { name: "데스크톱 1100", width: 1100, height: 800, mobile: false },
];

async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const inView = (el: Element | null) => {
      if (!el || !vis(el)) return false;
      const r = el.getBoundingClientRect();
      return r.right > 0 && r.left < vw;
    };
    const lineCount = (el: Element) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top / 4))).size;
    };

    const wrappedMoney: string[] = [];
    for (const el of document.querySelectorAll("button,a,span,p,td,th,dd,dt,strong,div")) {
      if (!vis(el) || [...el.childNodes].some((n) => n.nodeType === 1)) continue;
      const t = (el.textContent ?? "").trim();
      if (t.length < 3 || t.length > 22 || !/\d,\d{3}/.test(t) || !/원|%/.test(t)) continue;
      if (lineCount(el) > 1) wrappedMoney.push(t);
    }

    const smallInputs = [...document.querySelectorAll("input,select,textarea")]
      .filter((e) => vis(e) && !["checkbox", "radio", "hidden", "file"].includes((e as HTMLInputElement).type))
      .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => `${e.tagName.toLowerCase()}.${(e.className + "").slice(0, 40)}`);

    const fixed = [...document.querySelectorAll("body *")]
      .filter((e) => vis(e) && getComputedStyle(e).position === "fixed" && e.getBoundingClientRect().height < innerHeight * 0.5)
      .map((e) => ({ e, r: e.getBoundingClientRect() }));
    const overlaps: string[] = [];
    for (let i = 0; i < fixed.length; i++) {
      for (let j = i + 1; j < fixed.length; j++) {
        const a = fixed[i], b = fixed[j];
        if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
        if (a.r.top < b.r.bottom - 2 && b.r.top < a.r.bottom - 2 && a.r.left < b.r.right && b.r.left < a.r.right) {
          overlaps.push(`${a.e.tagName.toLowerCase()} × ${b.e.tagName.toLowerCase()}`);
        }
      }
    }

    const aside = document.querySelector("aside");
    const ham = document.querySelector("button[aria-label='사이드바 토글']");
    const bottomNav = document.querySelector("main ~ nav");
    const nav = inView(aside) ? "사이드바" : inView(ham) ? "햄버거" : inView(bottomNav) ? "하단메뉴" : "없음";
    const h1 = document.querySelector("header h1");

    return {
      pageOverflow: document.documentElement.scrollWidth - vw,
      nav,
      overlaps,
      smallInputs,
      wrappedMoney: [...new Set(wrappedMoney)],
      mobileTitle: h1 && vis(h1) ? (h1.textContent ?? "").trim() : null,
    };
  });
}

// page.request는 브라우저 컨텍스트와 쿠키를 공유한다 (request 픽스처는 공유하지 않음)
test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/auth/unlock", { data: { key: "layout-test-key" } });
  expect(res.ok()).toBeTruthy();
});

// 빈 DB(CI)에서도 금액 줄바꿈을 검사할 수 있게 큰 금액 거래를 넣는다. 이미 있으면 409로 넘어간다.
test.beforeAll(async ({ playwright, baseURL }) => {
  const req = await playwright.request.newContext({ baseURL });
  const unlock = await req.post("/api/auth/unlock", { data: { key: "layout-test-key" } });
  const cookie = (unlock.headers()["set-cookie"] ?? "").split(";")[0];
  expect(cookie, "로그인 쿠키").toContain("=");
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rows = [
    { date: `${ym}-01`, merchant: "레이아웃검사 아주 긴 가맹점 이름 주식회사 본점", amount: 8433986, categoryL1: "생활" },
    { date: `${ym}-02`, merchant: "레이아웃검사 마트", amount: 1234567, categoryL1: "식비" },
    { date: `${ym}-03`, merchant: "레이아웃검사 환불", amount: -98765, categoryL1: "기타" },
  ];
  for (const r of rows) {
    const res = await req.post("/api/transactions", { data: { ...r, paymentMethod: "카드" }, headers: { cookie } });
    expect([200, 201, 409]).toContain(res.status());
  }
  await req.dispose();
});

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });

    for (const path of PAGES) {
      test(`${path}`, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        expect(new URL(page.url()).pathname, "로그인 화면으로 튕기지 않음").toBe(path);
        await page.waitForTimeout(500);
        const m = await measure(page);

        expect.soft(m.pageOverflow, "화면 가로 넘침(px)").toBeLessThanOrEqual(0);
        expect.soft(m.nav, "이동 수단(사이드바/햄버거/하단메뉴)").not.toBe("없음");
        expect.soft(m.overlaps, "고정 요소 겹침").toEqual([]);
        expect.soft(m.wrappedMoney, "금액 줄바꿈").toEqual([]);
        if (vp.mobile) {
          expect.soft(m.smallInputs, "16px 미만 입력칸(iOS 확대)").toEqual([]);
        }
        if (vp.width < 768) {
          expect.soft(m.mobileTitle, "폰 상단 제목").not.toBe("unahouse.finance");
          expect.soft(m.mobileTitle, "폰 상단 제목 존재").toBeTruthy();
        }
      });
    }
  });
}
