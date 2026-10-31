// Helpers for the Maintenance screen. Everything here uses the device's local time
// (so on your phone in India, "today" is the Indian date).

export const DUE_DAY = 10; // maintenance is collected on the 10th of every month
export const TEMPLATE_KEY = "maintenance_reminder_template";

export const DEFAULT_TEMPLATE =
  "Hi {name}, a gentle reminder that the maintenance payment of {amount} for {project} ({month}) is due on {due_date}. " +
  "Kindly arrange the payment at your convenience. Thank you!\n— Hussaini Automations";

export const TEMPLATE_PLACEHOLDERS = ["{name}", "{project}", "{amount}", "{month}", "{due_date}"];

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parts(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { y, m };
}

export function shiftMonth(month: string, delta: number) {
  const { y, m } = parts(month);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(month: string) {
  const { y, m } = parts(month);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function dueDate(month: string) {
  const { y, m } = parts(month);
  return new Date(y, m - 1, DUE_DAY);
}

export function fmtDay(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Whole days from today until the due date (negative = overdue).
export function daysUntilDue(month: string, today = new Date()) {
  return Math.round((dueDate(month).getTime() - startOfDay(today).getTime()) / 86_400_000);
}

export type DueState = "upcoming" | "reminder" | "today" | "overdue";

// "reminder" = tomorrow is the due date, i.e. today is the day to send reminders.
export function dueState(month: string, today = new Date()): { state: DueState; days: number } {
  const days = daysUntilDue(month, today);
  if (days < 0) return { state: "overdue", days };
  if (days === 0) return { state: "today", days };
  if (days === 1) return { state: "reminder", days };
  return { state: "upcoming", days };
}

export function buildMessage(
  template: string,
  v: { name: string; project: string; amount: number; month: string }
) {
  return template
    .replaceAll("{name}", v.name)
    .replaceAll("{project}", v.project)
    .replaceAll("{amount}", fmtMoney(v.amount))
    .replaceAll("{month}", monthLabel(v.month))
    .replaceAll("{due_date}", fmtDay(dueDate(v.month)));
}

// Contact is free text ("email / phone"). Pull out a phone number for WhatsApp if there is one.
export function whatsappNumber(contact: string): string | null {
  const noEmails = (contact || "").replace(/\S+@\S+/g, " ");
  const match = noEmails.match(/\+?\d[\d\s\-()]{8,}\d/);
  if (!match) return null;
  const d = match[0].replace(/\D/g, "");
  if (d.length === 10) return "91" + d; // Indian mobile without country code
  if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1);
  if (d.length >= 11 && d.length <= 15) return d; // already has a country code
  return null;
}

export function whatsappLink(contact: string, message: string) {
  const num = whatsappNumber(contact);
  return `https://wa.me/${num ?? ""}?text=${encodeURIComponent(message)}`;
}