export type Client = {
  id: string;
  name: string;
  contact: string;
  status: "lead" | "active" | "recurring" | "churned";
  notes: string;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  client_name: string;
  client_status: string;
  name: string;
  description: string;
  status: "lead" | "discussion" | "quotation_sent" | "in_work" | "in_test" | "completed";
  tags: string;
  start_date: string | null;
  delivery_date: string | null;

  quoted_amount: number;
  final_amount: number;
  amount_collected: number;
  payment_status: "unpaid" | "partial" | "paid";

  account_used: string;
  repo_url: string;
  hosting: string;
  architecture_notes: string;
  backend_notes: string;

  maintenance_status: "none" | "active" | "paused" | "ended";
  maintenance_amount: number;
  maintenance_cycle: "monthly" | "quarterly" | "yearly";
  maintenance_next_due: string | null;
  maintenance_coverage: string;

  last_touched: string;
  created_at: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
};

export type Account = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type FileMeta = {
  id: string;
  project_id: string;
  original_name: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
};

export type CredentialMeta = {
  id: string;
  project_id: string;
  key_name: string;
  created_at: string;
};

export type VaultEntry = {
  id: string;
  category: string;
  title: string;
  username: string;
  url: string;
  has_notes: boolean;
  created_at: string;
  updated_at: string;
};

export type MaintenanceItem = {
  project_id: string;
  project_name: string;
  client_name: string;
  contact: string;
  expected_amount: number;
  amount: number;
  received_at: string | null;
};