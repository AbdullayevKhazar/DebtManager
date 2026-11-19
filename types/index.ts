export interface Debtor {
  id: number;
  name: string;
  phone?: string;
  location?: string;
  balance?: number;
  created_at: number;
  last_payment_date?: number;
  type: number;
}

export interface Transaction {
  id: number;
  debtor_id: number;
  type: "debt" | "payment";
  /** Integer Azerbaijani qəpik; 100 qəpik equals 1 AZN. */
  amount: number;
  note?: string;
  date: number;
  created_at: number;
}
