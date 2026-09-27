export type TripStatus = "draft" | "collecting" | "generated" | "decided";

export interface Trip {
  id: string;
  name: string;
  date_start: string;
  date_end: string;
  min_days: number;
  max_days: number;
  participants: string[];
  deadline: string | null;
  status: TripStatus;
  decided_option_id: string | null;
  created_at: string;
}

export interface TripResponse {
  participant_name: string;
  home_city: string;
  budget_min: number;
  budget_max: number;
  available_dates: string[];
  dest_types: string[];
  dealbreakers: string[];
  dealbreaker_other: string | null;
  note: string | null;
  updated_at: string;
}

export interface DateWindow {
  start: string;
  end: string;
  days: number;
  attendees: string[];
  missing: string[];
  /** public holidays on a Fri/Mon inside this window (from Nager.Date) */
  longWeekends?: { date: string; name: string }[];
}

export interface CommonDates {
  /** true when every respondent can make every window listed */
  fullOverlap: boolean;
  windows: DateWindow[];
}

export interface Dealbreaker {
  label: string;
  setBy: string[];
  /** true for travel-mode rules that only apply to the person who set them */
  personal: boolean;
}

export interface TypeScore {
  type: string;
  total: number;
  byPerson: Record<string, number>;
}

export interface Constraints {
  respondents: string[];
  missing: string[];
  minDays: number;
  maxDays: number;
  commonDates: CommonDates;
  budgetCeiling: number;
  budgetFloor: number;
  /** set when highest min > lowest max: nobody's range fully overlaps */
  budgetConflict: { floorBy: string; ceilingBy: string } | null;
  dealbreakers: Dealbreaker[];
  typeScores: TypeScore[];
}

export interface TravelLeg {
  participant: string;
  from: string;
  mode: string;
  approxHours: number;
}

export interface FitScore {
  participant: string;
  score: number;
  reason: string;
}

export interface TripOption {
  id: string;
  destination: string;
  state: string;
  startDate: string;
  endDate: string;
  days: number;
  costPerPersonMin: number;
  costPerPersonMax: number;
  pitch: string;
  tradeoffs: string[];
  travel: TravelLeg[];
  fit: FitScore[];
  /** computed in code, never taken from the model */
  groupFit: number;
  minFit: number;
  /** e.g. "Christmas (25 Dec) — long weekend" when the dates include one */
  longWeekend?: string;
}

export interface DroppedOption {
  id: string;
  destination: string;
  reasons: string[];
}

export interface StoredConstraints extends Constraints {
  dropped: DroppedOption[];
}

export interface TripResult {
  id: string;
  constraints: StoredConstraints;
  options: TripOption[];
  recommended_option_id: string | null;
  recommendation_reason: string | null;
  model: string | null;
  created_at: string;
}

export interface Vote {
  participant_name: string;
  option_id: string;
  updated_at: string;
}
