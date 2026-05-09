export interface UserPreferences {
  notify_price_drops: boolean;
  notify_new_listings: boolean;
  alert_frequency: 'immediate' | 'daily' | 'weekly';
  marketing_emails: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  tier: 'free' | 'pro';
  is_active: boolean;
  is_admin: boolean;
  preferences: UserPreferences;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface DealScoreSummary {
  score: number;
  grade: string;
  verdict?: string;
  ai_analysis?: string;
  score_components?: Record<string, number>;
  key_factors?: Array<{ factor: string; impact: string; description: string }>;
}

export interface PropertySummary {
  id: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  county?: string;
  lat?: number;
  lng?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_size_acres?: number;
  year_built?: number;
  property_type?: string;
  current_price?: number;
  list_date?: string;
  days_on_market?: number;
  description?: string;
  photo_urls?: string[];
  deal_score?: number;
}

export interface PriceEvent {
  id: string;
  event_type: string;
  price: number;
  event_date: string;
  source: string;
  notes?: string;
}

export interface TaxRecord {
  id: string;
  year: number;
  assessed_value?: number;
  tax_amount?: number;
  source: string;
}

export interface ComparableSale {
  address: string;
  city: string;
  state: string;
  price: number;
  sqft?: number;
  beds?: number;
  baths?: number;
  lot_size_acres?: number;
  sale_date: string;
  distance_miles?: number;
  price_per_sqft?: number;
  similarity_score?: number;
}

export interface NeighborhoodSummary {
  crime_index?: number;
  crime_grade?: string;
  crime_rate_per_100k?: number;
  violent_rate_per_100k?: number;
  property_rate_per_100k?: number;
  median_household_income?: number;
  population?: number;
  population_growth_pct?: number;
  owner_occupied_pct?: number;
  walk_score?: number;
  transit_score?: number;
  bike_score?: number;
  school_rating_avg?: number;
}

export interface MarketSummary {
  median_price?: number;
  price_per_sqft?: number;
  median_days_on_market?: number;
  months_of_supply?: number;
  sales_volume_30d?: number;
  yoy_price_change_pct?: number;
  mom_price_change_pct?: number;
  interest_rate_30yr?: number;
  interest_rate_15yr?: number;
  interest_rate_5yr_arm?: number;
}

export interface PropertyDetail {
  property: PropertySummary;
  price_history: PriceEvent[];
  tax_history: TaxRecord[];
  comps: ComparableSale[];
  neighborhood?: NeighborhoodSummary;
  market?: MarketSummary;
  deal_score?: DealScoreSummary;
}

export interface AVMResult {
  status: string;
  estimated_value?: number;
  confidence_low?: number;
  confidence_high?: number;
  model_version?: string;
}

export interface UsageInfo {
  views_used: number;
  views_limit: number;
  views_remaining: number;
  resets_at: string;
  is_unlimited: boolean;
}

export interface SavedProperty {
  id: string;
  property_id: string;
  notes?: string;
  alert_enabled: boolean;
  property?: PropertySummary;
}

export interface SavedSearch {
  id: string;
  name: string;
  search_params: Record<string, unknown>;
  alert_enabled: boolean;
  alert_frequency: string;
}

export interface SearchParams {
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  min_price?: number;
  max_price?: number;
  beds?: number;
  property_type?: string;
  limit?: number;
}
