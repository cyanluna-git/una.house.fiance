import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface SalaryItem {
  type: "payment" | "deduction";
  name: string;
  amount: number;
}

export interface ParsedSalaryStatement {
  payDate: string; // YYYY-MM-DD
  employeeName: string;
  employeeId: string;
  position: string;
  department: string;
  companyName: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  items: SalaryItem[];
}

function extractPdfText(buffer: Buffer, password: string): string {
  const ts = Date.now();
  const tmpInput = join(tmpdir(), `salary_in_${ts}.pdf`);
  const tmpDecrypted = join(tmpdir(), `salary_dec_${ts}.pdf`);

  try {
    writeFileSync(tmpInput, buffer);

    // Try decrypting with password first
    try {
      execSync(
        `qpdf --password=${password} --decrypt "${tmpInput}" "${tmpDecrypted}"`,
        { stdio: "pipe" }
      );
    } catch {
      // If decryption fails, the PDF might not be encrypted
      execSync(`cp "${tmpInput}" "${tmpDecrypted}"`, { stdio: "pipe" });
    }

    const text = execSync(`pdftotext -layout "${tmpDecrypted}" -`, {
      stdio: "pipe",
      encoding: "utf-8",
    });

    return text;
  } finally {
    try { unlinkSync(tmpInput); } catch {}
    try { unlinkSync(tmpDecrypted); } catch {}
  }
}

function parseNumber(str: string): number {
  return parseInt(str.replace(/,/g, ""), 10) || 0;
}

function parseSalaryText(text: string): ParsedSalaryStatement {
  const lines = text.split("\n");

  // Extract pay date
  let payDate = "";
  const dateMatch = text.match(/지급일자\s+([\d.]+)/);
  if (dateMatch) {
    const parts = dateMatch[1].split(".");
    if (parts.length >= 3) {
      payDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else if (parts.length === 2) {
      payDate = `${parts[0]}-${parts[1].padStart(2, "0")}-01`;
    }
  }

  // Extract employee info
  let employeeName = "";
  let employeeId = "";
  let position = "";
  let department = "";

  const nameMatch = text.match(/성\s*명\s+([\S]+)/);
  if (nameMatch) employeeName = nameMatch[1];

  const idMatch = text.match(/사\s*번\s+([\S]+)/);
  if (idMatch) employeeId = idMatch[1];

  const posMatch = text.match(/직\s*급\s+([\S]+)/);
  if (posMatch) position = posMatch[1];

  const deptMatch = text.match(/부\s*서\s+(.+?)(?:\s{2,}|$)/m);
  if (deptMatch) department = deptMatch[1].trim();

  // Extract company name
  let companyName = "";
  const companyMatch = text.match(/([\S]+\s*(?:주식회사|㈜))/);
  if (companyMatch) companyName = companyMatch[1].trim();
  if (!companyName) {
    const companyMatch2 = text.match(/(?:주식회사|㈜)\s*([\S]+)/);
    if (companyMatch2) companyName = companyMatch2[0].trim();
  }

  // Parse payment and deduction items
  const items: SalaryItem[] = [];

  // Find the section between 지급내역/공제내역 and 지급합계/공제합계
  let inItemsSection = false;
  for (const line of lines) {
    if (line.includes("지급내역") && line.includes("공제내역")) {
      inItemsSection = true;
      continue;
    }
    if (line.includes("지급내역") && !line.includes("공제내역")) {
      inItemsSection = true;
      continue;
    }
    if (line.includes("지급합계")) {
      inItemsSection = false;
      continue;
    }
    if (!inItemsSection) continue;

    // Skip empty lines and calculation method lines
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes("계산방법") || trimmed.includes("시급") || trimmed.includes("/12M") || trimmed.includes("/12/209H") || trimmed.includes("배")) continue;

    // Determine if this line is deduction-only by checking leading whitespace
    // Deduction-only lines have significant leading whitespace (payment column is empty)
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
    const isDeductionOnlyLine = leadingSpaces > 30;

    // Find all "name amount" patterns in the line
    const itemPattern = /([\w가-힣\s/()]+?)\s{2,}([\d,]+)/g;
    const matches: Array<{ name: string; amount: number }> = [];
    let match;
    while ((match = itemPattern.exec(line)) !== null) {
      const name = match[1].trim();
      const amount = parseNumber(match[2]);
      if (name && amount > 0) {
        matches.push({ name, amount });
      }
    }

    if (matches.length === 0) continue;

    if (isDeductionOnlyLine) {
      // All items on this line are deductions
      for (const m of matches) {
        items.push({ type: "deduction", name: m.name, amount: m.amount });
      }
    } else if (matches.length >= 2) {
      // First item is payment, second is deduction
      items.push({ type: "payment", name: matches[0].name, amount: matches[0].amount });
      for (let i = 1; i < matches.length; i++) {
        items.push({ type: "deduction", name: matches[i].name, amount: matches[i].amount });
      }
    } else {
      // Single item on a non-indented line = payment
      items.push({ type: "payment", name: matches[0].name, amount: matches[0].amount });
    }
  }

  // Extract totals
  let grossPay = 0;
  let totalDeductions = 0;
  let netPay = 0;

  const grossMatch = text.match(/지급합계\s+([\d,]+)/);
  if (grossMatch) grossPay = parseNumber(grossMatch[1]);

  const deductionMatch = text.match(/공제합계\s+([\d,]+)/);
  if (deductionMatch) totalDeductions = parseNumber(deductionMatch[1]);

  const netMatch = text.match(/실지급액\s+([\d,]+)/);
  if (netMatch) netPay = parseNumber(netMatch[1]);

  return {
    payDate,
    employeeName,
    employeeId,
    position,
    department,
    companyName,
    grossPay,
    totalDeductions,
    netPay,
    items,
  };
}

export function parseSalaryPdf(
  buffer: Buffer,
  password: string
): ParsedSalaryStatement {
  const text = extractPdfText(buffer, password);
  return parseSalaryText(text);
}
