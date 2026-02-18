export interface ParsedTransaction {
  date: string;
  cardCompany: string;
  cardName?: string;
  merchant: string;
  amount: number;
  paymentType?: string;
  installmentMonths?: number;
  installmentSeq?: number;
  paymentAmount?: number;
  fee?: number;
  discount?: number;
}

export type CardCompany =
  | "국민카드"
  | "농협카드"
  | "현대카드"
  | "롯데카드"
  | "신한카드"
  | "하나카드"
  | "우리카드"
  | "기타";
