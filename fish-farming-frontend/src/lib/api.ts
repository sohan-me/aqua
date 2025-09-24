import axios from 'axios';

import { API_CONFIG } from '@/config/api';

// API Configuration
const API_BASE_URL = API_CONFIG.BASE_URL;

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Pagination Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// API Types
export interface Species {
  id: number;
  user: number;
  user_username: string;
  name: string;
  scientific_name: string;
  description: string;
  optimal_temp_min?: number;
  optimal_temp_max?: number;
  optimal_ph_min?: number;
  optimal_ph_max?: number;
  parent?: number;
  parent_name?: string;
  children?: Species[];
  full_path?: string;
  level?: number;
  created_at: string;
}

export interface Pond {
  pond_id: number;
  name: string;
  water_area_decimal: string;
  depth_ft: string;
  volume_m3: string;
  location: string;
  is_active: boolean;
  leasing_date?: string;
  leasing_end_date?: string;
  rate_per_decimal?: number;
  total_leasing_money?: number;
  created_at: string;
  updated_at: string;
  user_username: string;
}

export interface MedicalDiagnostic {
  id: number;
  pond: number;
  pond_name: string;
  pond_area: string;
  pond_location: string;
  disease_name: string;
  confidence_percentage: string;
  recommended_treatment: string;
  dosage_application: string;
  selected_organs: any[];
  selected_symptoms: any[];
  notes: string;
  is_applied: boolean;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stocking {
  stocking_id: number;
  pond: number;
  species: number;
  date: string;
  pcs: number;
  pieces_per_kg: string | null;
  initial_avg_weight_kg: string;
  notes: string;
  created_at: string;
  pond_name: string;
  species_name: string;
  total_weight_kg: string;
}


export interface Sampling {
  id: number;
  pond: number;
  date: string;
  sample_type: number;
  ph: string;
  temperature_c: string;
  dissolved_oxygen: string;
  ammonia: string;
  nitrite: string;
  nitrate: string;
  alkalinity: string;
  hardness: string;
  turbidity: string;
  fish_weight_g: string;
  fish_length_cm: string;
  notes: string;
  created_at: string;
  pond_name: string;
  sample_type_name: string;
  sample_type_icon: string;
  sample_type_color: string;
}

export interface Feed {
  id: number;
  pond: number;
  feed_type: number;
  date: string;
  amount_kg: string;
  feeding_time: string;
  packet_size_kg: string | null;
  cost_per_packet: string | null;
  cost_per_kg: string | null;
  total_cost: string | null;
  consumption_rate_kg_per_day: string | null;
  biomass_at_feeding_kg: string | null;
  feeding_rate_percent: string | null;
  notes: string;
  created_at: string;
  pond_name: string;
  feed_type_name: string;
}

export interface InventoryFeed {
  id: number;
  feed_type: number;
  quantity_kg: string;
  unit_price: string;
  expiry_date: string;
  supplier: string;
  batch_number: string;
  notes: string;
  created_at: string;
  updated_at: string;
  feed_type_name: string;
}

export interface FeedingBand {
  id: number;
  name: string;
  min_weight_g: string;
  max_weight_g: string;
  feeding_rate_percent: string;
  frequency_per_day: number;
  notes: string;
  created_at: string;
}

export interface Mortality {
  id: number;
  pond: number;
  date: string;
  count: number;
  avg_weight_kg: string;
  cause: string;
  notes: string;
  created_at: string;
  pond_name: string;
}

export interface ExpenseType {
  id: number;
  name: string;
  category: string;
  description: string;
  created_at: string;
}

export interface IncomeType {
  id: number;
  name: string;
  category: string;
  description: string;
  created_at: string;
}

export interface IncomeType {
  id: number;
  name: string;
  category: string;
  description: string;
  created_at: string;
}

export interface Expense {
  id: number;
  user: number;
  pond: number | null;
  expense_type: number;
  date: string;
  amount: string;
  quantity: string | null;
  unit: string;
  supplier: string;
  notes: string;
  created_at: string;
  user_username: string;
  pond_name: string;
  expense_type_name: string;
}

export interface Income {
  id: number;
  user: number;
  pond: number | null;
  income_type: number;
  date: string;
  amount: string;
  quantity: string | null;
  unit: string;
  customer: string;
  notes: string;
  created_at: string;
  user_username: string;
  pond_name: string;
  income_type_name: string;
}

export interface FeedType {
  id: number;
  name: string;
  protein_content: string | null;
  description: string;
  created_at: string;
}

export interface SampleType {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface FeedingBand {
  id: number;
  name: string;
  min_weight_g: string;
  max_weight_g: string;
  feeding_rate_percent: string;
  frequency_per_day: number;
  notes: string;
  created_at: string;
}

export interface Alert {
  id: number;
  pond: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  created_at: string;
  pond_name: string;
  resolved_by_username: string;
}

export interface FishSampling {
  id: number;
  pond: number;
  species: number | null;
  user: number;
  date: string;
  sample_size: number;
  total_weight_kg: string;
  average_weight_kg: string;
  fish_per_kg: string;
  growth_rate_kg_per_day: string | null;
  biomass_difference_kg: string | null;
  condition_factor: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  pond_name: string;
  species_name: string | null;
  user_username: string;
}

export interface FeedingAdvice {
  id: number;
  pond: number;
  user: number;
  date: string;
  estimated_fish_count: number;
  average_fish_weight_kg: string;
  total_biomass_kg: string;
  recommended_feed_kg: string;
  feeding_rate_percent: string;
  feeding_frequency: number;
  water_temp_c: string | null;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  feed_type: number | null;
  feed_cost_per_kg: string | null;
  daily_feed_cost: string | null;
  is_applied: boolean;
  applied_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  pond_name: string;
  user_username: string;
  feed_type_name: string | null;
  medical_considerations: string;
  medical_warnings: string[];
  medical_diagnostics_data: MedicalDiagnostic[];
  analysis_data?: {
    fish_count_analysis: {
      total_stocked: number;
      total_mortality: number;
      recent_mortality_30d: number;
      total_harvested: number;
      current_count: number;
      survival_rate: number;
      mortality_trend: string;
    };
    water_quality_analysis: {
      temperature: number | null;
      ph: number | null;
      dissolved_oxygen: number | null;
      turbidity: number | null;
      ammonia: number | null;
      nitrite: number | null;
      quality_score: number;
      quality_status: string;
    };
    mortality_analysis: {
      total_recent_deaths: number;
      mortality_events: number;
      avg_deaths_per_event: number;
      mortality_trend: string;
      risk_factors: string[];
      causes: Array<{
        cause: string;
        total_deaths: number;
        event_count: number;
      }>;
    };
    feeding_analysis: {
      total_feed_30d: number;
      avg_daily_feed: number;
      feeding_consistency: string;
      feed_efficiency: number;
      cost_analysis: Record<string, any>;
      feed_types_used: Array<{
        feed_type__name: string;
        total_amount: number;
        usage_count: number;
      }>;
    };
    environmental_analysis: {
      season: string;
      temperature_trend: string;
      weather_conditions: string;
      seasonal_factors: string[];
    };
    growth_analysis: {
      growth_rate_kg_per_day: number;
      growth_trend: string;
      weight_gain_90d: number;
      growth_consistency: string;
      growth_quality: string;
    };
    feeding_recommendations: {
      base_rate: number;
      final_rate: number;
      recommended_feed_kg: number;
      feeding_frequency: number;
      protein_requirement: number;
      pellet_size: string;
      feeding_stage: string;
      pcs_per_kg: number;
      feeding_times: string;
      feeding_split: string;
      adjustments: {
        water_quality: number;
        temperature: number;
        mortality: number;
        growth: number;
        seasonal: number;
        feeding_consistency: number;
        total_adjustment: number;
      };
      total_biomass_kg: number;
      base_daily_feed_kg: number;
    };
  };
}

export interface BiomassAnalysis {
  summary: {
    total_biomass_gain_kg: number;
    total_biomass_loss_kg: number;
    net_biomass_change_kg: number;
    total_current_biomass_kg: number;
    total_samplings: number;
    samplings_with_biomass_data: number;
  };
  load_analysis: {
    total_area_sqm: number;
    overall_load_kg_per_sqm: number;
    pond_loads: Array<{
      pond_name: string;
      area_sqm: number;
      area_decimal: number;
      total_biomass_kg: number;
      load_kg_per_sqm: number;
    }>;
  };
  pond_summary: Record<string, {
    total_gain: number;
    total_loss: number;
    net_change: number;
    sampling_count: number;
  }>;
  species_summary: Record<string, {
    total_gain: number;
    total_loss: number;
    net_change: number;
    sampling_count: number;
  }>;
  biomass_changes: Array<{
    id: number;
    pond_name: string;
    species_name: string;
    date: string;
    biomass_difference_kg: number;
    growth_rate_kg_per_day: number | null;
    average_weight_kg: number;
    sample_size: number;
  }>;
  pond_species_biomass: Record<string, {
    initial_biomass: number;
    growth_biomass: number;
    current_biomass: number;
  }>;
  filters_applied: {
    pond_id: string | null;
    species_id: string | null;
    start_date: string | null;
    end_date: string | null;
  };
}

export interface FcrAnalysis {
  summary: {
    total_feed_kg: number;
    total_weight_gain_kg: number;
    overall_fcr: number;
    fcr_status: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
    total_combinations: number;
    date_range: {
      start_date: string;
      end_date: string;
    };
  };
  fcr_data: Array<{
    pond_id: number;
    pond_name: string;
    species_id: number;
    species_name: string;
    start_date: string;
    end_date: string;
    days: number;
    estimated_fish_count: number;
    initial_weight_kg: number;
    final_weight_kg: number;
    weight_gain_per_fish_kg: number;
    total_weight_gain_kg: number;
    total_feed_kg: number;
    avg_daily_feed_kg: number;
    avg_daily_weight_gain_kg: number;
    fcr: number;
    fcr_status: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
    sampling_count: number;
    feeding_days: number;
  }>;
}

export interface DailyLog {
  id: number;
  pond: number;
  date: string;
  weather: string;
  water_temp_c: string | null;
  ph: string | null;
  dissolved_oxygen: string | null;
  ammonia: string | null;
  nitrite: string | null;
  notes: string;
  created_at: string;
  pond_name: string;
}

export interface Harvest {
  id: number;
  pond: number;
  date: string;
  total_weight_kg: string;
  total_count: number | null;
  pieces_per_kg: string | null;
  price_per_kg: string | null;
  avg_weight_kg: string;
  total_revenue: string | null;
  notes: string;
  created_at: string;
  pond_name: string;
  species_name: string;
}

export interface PondSummary {
  id: number;
  name: string;
  user_username: string;
  area_decimal: string;
  depth_ft: string;
  volume_m3: string;
  location: string;
  is_active: boolean;
  latest_stocking: Stocking | null;
  latest_daily_log: DailyLog | null;
  latest_harvest: Harvest | null;
  total_expenses: number;
  total_income: number;
  active_alerts_count: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  total_expenses: number;
  total_income: number;
  profit_loss: number;
  expenses_by_category: Record<string, number>;
  income_by_category: Record<string, number>;
  monthly_trends: Record<string, {
    expenses: number;
    income: number;
    profit_loss: number;
  }>;
}

// Business Management Types
export interface Customer {
  customer_id: number;
  user: number;
  name: string;
  type: 'internal_pond' | 'external_buyer';
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerStock {
  customer_stock_id: number;
  user: number;
  user_username: string;
  customer: number;
  customer_name: string;
  pond?: number;
  pond_name?: string;
  item: number;
  item_name: string;
  item_type: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  unit: string;
  packet_size?: number;
  unit_cost?: string;
  stock_status: 'out_of_stock' | 'low_stock' | 'in_stock' | 'overstocked';
  last_updated: string;
  created_at: string;
}

export interface PaymentTerms {
  terms_id: number;
  name: string;
  day_count: number;
  description: string;
  created_at: string;
}

export interface VendorCategory {
  vendor_category_id: number;
  name: string;
  description: string;
  parent_id: number | null;
  created_at: string;
}

export interface Vendor {
  vendor_id: number;
  user: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  terms_default: number | null;
  terms_default_name?: string;
  memo: string;
  active: boolean;
  created_at: string;
  vendor_categories: Array<{
    vendor_category_id: number;
    name: string;
  }>;
}

export interface StockEntry {
  entry_id: number;
  user: number;
  item: number;
  item_name?: string;
  quantity: number;
  unit: string;
  packet_size?: number;
  gallon_size?: number;
  unit_cost?: number;
  total_cost?: number;
  entry_date: string;
  supplier?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  kg_equivalent?: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  item_id: number;
  user: number;
  name: string;
  item_type: string;
  category: string | null;
  income_account: number | null;
  expense_account: number | null;
  asset_account: number | null;
  cost_of_goods_sold_account: number | null;
  protein_content?: number;
  feed_stage?: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  user_username: string;
  category_name?: string;
  total_stock_kg?: number;
  stock_summary?: string[];
  stock_entries?: StockEntry[];
  income_account_name: string | null;
  expense_account_name: string | null;
  asset_account_name: string | null;
  cost_of_goods_sold_account_name?: string | null;
  current_stock?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  stock_status?: string;
  is_low_stock?: boolean;
}

export interface Bill {
  bill_id: number;
  user: number;
  vendor_id: number;
  vendor_name?: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  terms_id: number;
  terms_name?: string;
  memo: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'open' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  invoice_id: number;
  user: number;
  customer_id: number;
  customer_name?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  terms_id: number;
  terms_name?: string;
  memo: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'open' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  transaction_id: number;
  user: number;
  transaction_type: 'in' | 'out' | 'transfer';
  transaction_date: string;
  reference: string;
  memo: string;
  created_at: string;
  updated_at: string;
}

export interface StockingEvent {
  stocking_id: number;
  user: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  supplier_vendor_id: number | null;
  supplier_vendor_name?: string;
  line_summary: string;
  memo: string;
  created_at: string;
  total_fish: number;
  total_weight: number;
  total_cost: number;
}

export interface StockingLine {
  stocking_line_id: number;
  stocking_id: number;
  item_id: number;
  item_name?: string;
  qty_pcs: number;
  pcs_per_kg_at_stocking: number;
  weight_kg: number | null;
  unit_cost: number | null;
  total_cost: number;
}

export interface FeedingEvent {
  feeding_event_id: number;
  user: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  memo: string;
  created_at: string;
  total_feed_kg: number;
  total_cost: number;
}

export interface MedicineEvent {
  medicine_event_id: number;
  user: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  memo: string;
  created_at: string;
  total_cost: number;
}

export interface OtherPondEvent {
  other_event_id: number;
  user: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  event_type: string;
  memo: string;
  created_at: string;
}

export interface Employee {
  employee_id: number;
  user: number;
  name: string;
  position: string;
  hire_date: string;
  salary: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  payroll_run_id: number;
  user: number;
  run_date: string;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: 'draft' | 'approved' | 'paid';
  created_at: string;
}

// API Functions
export const apiService = {
  // Authentication
  login: async (username: string, password: string) => {
    const response = await axios.post(`${API_CONFIG.AUTH_URL}/login/`, {
      username,
      password,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await axios.post(`${API_CONFIG.AUTH_URL}/change-password/`, {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }, {
      headers: {
        'Authorization': `Token ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });
    return response.data;
  },

  // Species
  getSpecies: (params?: PaginationParams) => api.get<PaginatedResponse<Species>>('/species/', { params }),
  getSpeciesTree: () => api.get<Species[]>('/species/?tree=true'),
  getSpeciesById: (id: number) => api.get<Species>(`/species/${id}/`),
  createSpecies: (data: Partial<Species>) => api.post<Species>('/species/', data),
  updateSpecies: (id: number, data: Partial<Species>) => api.put<Species>(`/species/${id}/`, data),
  deleteSpecies: (id: number) => api.delete(`/species/${id}/`),

  // Ponds
  getPonds: (params?: PaginationParams) => api.get<PaginatedResponse<Pond>>('/ponds/', { params }),
  getPondById: (id: number) => api.get<Pond>(`/ponds/${id}/`),
  getPondSummary: (id: number) => api.get<PondSummary>(`/ponds/${id}/summary/`),
  getPondFinancialSummary: (id: number) => api.get<FinancialSummary>(`/ponds/${id}/financial_summary/`),
  createPond: (data: Partial<Pond>) => api.post<Pond>('/ponds/', data),
  updatePond: (id: number, data: Partial<Pond>) => api.put<Pond>(`/ponds/${id}/`, data),
  deletePond: (id: number) => api.delete(`/ponds/${id}/`),

  // Stocking
  getStocking: (params?: PaginationParams) => api.get<PaginatedResponse<Stocking>>('/stocking/', { params }),
  getStockingById: (id: number) => api.get<Stocking>(`/stocking/${id}/`),
  createStocking: (data: Partial<Stocking>) => api.post<Stocking>('/stocking/', data),
  updateStocking: (id: number, data: Partial<Stocking>) => api.put<Stocking>(`/stocking/${id}/`, data),
  deleteStocking: (id: number) => api.delete(`/stocking/${id}/`),

  // Daily Logs
  getDailyLogs: (params?: PaginationParams) => api.get<PaginatedResponse<DailyLog>>('/daily-logs/', { params }),
  getDailyLogById: (id: number) => api.get<DailyLog>(`/daily-logs/${id}/`),
  createDailyLog: (data: Partial<DailyLog>) => api.post<DailyLog>('/daily-logs/', data),
  updateDailyLog: (id: number, data: Partial<DailyLog>) => api.put<DailyLog>(`/daily-logs/${id}/`, data),
  deleteDailyLog: (id: number) => api.delete(`/daily-logs/${id}/`),


  // Water Quality Sampling
  getSamplings: (params?: PaginationParams) => api.get<PaginatedResponse<Sampling>>('/sampling/', { params }),
  getSamplingById: (id: number) => api.get<Sampling>(`/sampling/${id}/`),
  createSampling: (data: Partial<Sampling>) => api.post<Sampling>('/sampling/', data),
  updateSampling: (id: number, data: Partial<Sampling>) => api.put<Sampling>(`/sampling/${id}/`, data),
  deleteSampling: (id: number) => api.delete(`/sampling/${id}/`),

  // Mortality Tracking
  getMortalities: (params?: PaginationParams) => api.get<PaginatedResponse<Mortality>>('/mortality/', { params }),
  getMortalityById: (id: number) => api.get<Mortality>(`/mortality/${id}/`),
  createMortality: (data: Partial<Mortality>) => api.post<Mortality>('/mortality/', data),
  updateMortality: (id: number, data: Partial<Mortality>) => api.put<Mortality>(`/mortality/${id}/`, data),
  deleteMortality: (id: number) => api.delete(`/mortality/${id}/`),

  // Feed Types
  getFeedTypes: (params?: PaginationParams) => api.get<PaginatedResponse<FeedType>>('/feed-types/', { params }),
  getFeedTypeById: (id: number) => api.get<FeedType>(`/feed-types/${id}/`),
  createFeedType: (data: Partial<FeedType>) => api.post<FeedType>('/feed-types/', data),
  updateFeedType: (id: number, data: Partial<FeedType>) => api.put<FeedType>(`/feed-types/${id}/`, data),
  deleteFeedType: (id: number) => api.delete(`/feed-types/${id}/`),

  // Sample Types
  getSampleTypes: () => api.get<SampleType[]>('/sample-types/'),

  // Feeds
  getFeeds: (params?: PaginationParams) => api.get<PaginatedResponse<Feed>>('/feeds/', { params }),
  getFeedById: (id: number) => api.get<Feed>(`/feeds/${id}/`),
  createFeed: (data: Partial<Feed>) => api.post<Feed>('/feeds/', data),
  updateFeed: (id: number, data: Partial<Feed>) => api.put<Feed>(`/feeds/${id}/`, data),
  deleteFeed: (id: number) => api.delete(`/feeds/${id}/`),

  // Feed Inventory
  getInventoryFeeds: () => api.get<InventoryFeed[]>('/inventory-feed/'),
  getInventoryFeedById: (id: number) => api.get<InventoryFeed>(`/inventory-feed/${id}/`),
  createInventoryFeed: (data: Partial<InventoryFeed>) => api.post<InventoryFeed>('/inventory-feed/', data),
  updateInventoryFeed: (id: number, data: Partial<InventoryFeed>) => api.put<InventoryFeed>(`/inventory-feed/${id}/`, data),
  deleteInventoryFeed: (id: number) => api.delete(`/inventory-feed/${id}/`),

  // Feeding Bands
  getFeedingBands: () => api.get<FeedingBand[]>('/feeding-bands/'),
  getFeedingBandById: (id: number) => api.get<FeedingBand>(`/feeding-bands/${id}/`),
  createFeedingBand: (data: Partial<FeedingBand>) => api.post<FeedingBand>('/feeding-bands/', data),
  updateFeedingBand: (id: number, data: Partial<FeedingBand>) => api.put<FeedingBand>(`/feeding-bands/${id}/`, data),
  deleteFeedingBand: (id: number) => api.delete(`/feeding-bands/${id}/`),

  // Harvests
  getHarvests: (params?: PaginationParams) => api.get<PaginatedResponse<Harvest>>('/harvests/', { params }),
  getHarvestById: (id: number) => api.get<Harvest>(`/harvests/${id}/`),
  createHarvest: (data: Partial<Harvest>) => api.post<Harvest>('/harvests/', data),
  updateHarvest: (id: number, data: Partial<Harvest>) => api.put<Harvest>(`/harvests/${id}/`, data),
  deleteHarvest: (id: number) => api.delete(`/harvests/${id}/`),

  // Expenses
  getExpenses: (params?: PaginationParams) => api.get<PaginatedResponse<Expense>>('/expenses/', { params }),
  getExpenseById: (id: number) => api.get<Expense>(`/expenses/${id}/`),
  createExpense: (data: Partial<Expense>) => api.post<Expense>('/expenses/', data),
  updateExpense: (id: number, data: Partial<Expense>) => api.put<Expense>(`/expenses/${id}/`, data),
  deleteExpense: (id: number) => api.delete(`/expenses/${id}/`),

  // Income
  getIncomes: (params?: PaginationParams) => api.get<PaginatedResponse<Income>>('/incomes/', { params }),
  getIncomeById: (id: number) => api.get<Income>(`/incomes/${id}/`),
  createIncome: (data: Partial<Income>) => api.post<Income>('/incomes/', data),
  updateIncome: (id: number, data: Partial<Income>) => api.put<Income>(`/incomes/${id}/`, data),
  deleteIncome: (id: number) => api.delete(`/incomes/${id}/`),

  // Expense Types
  getExpenseTypes: () => api.get<ExpenseType[]>('/expense-types/'),
  getExpenseTypeById: (id: number) => api.get<ExpenseType>(`/expense-types/${id}/`),
  createExpenseType: (data: Partial<ExpenseType>) => api.post<ExpenseType>('/expense-types/', data),
  updateExpenseType: (id: number, data: Partial<ExpenseType>) => api.put<ExpenseType>(`/expense-types/${id}/`, data),
  deleteExpenseType: (id: number) => api.delete(`/expense-types/${id}/`),

  // Income Types
  getIncomeTypes: () => api.get<IncomeType[]>('/income-types/'),
  getIncomeTypeById: (id: number) => api.get<IncomeType>(`/income-types/${id}/`),
  createIncomeType: (data: Partial<IncomeType>) => api.post<IncomeType>('/income-types/', data),
  updateIncomeType: (id: number, data: Partial<IncomeType>) => api.put<IncomeType>(`/income-types/${id}/`, data),
  deleteIncomeType: (id: number) => api.delete(`/income-types/${id}/`),

  // Alerts
  getAlerts: () => api.get<Alert[]>('/alerts/'),
  getAlertById: (id: number) => api.get<Alert>(`/alerts/${id}/`),
  resolveAlert: (id: number) => api.post(`/alerts/${id}/resolve/`),

  // Fish Sampling
  getFishSampling: (params?: PaginationParams) => api.get<PaginatedResponse<FishSampling>>('/fish-sampling/', { params }),
  getFishSamplingById: (id: number) => api.get<FishSampling>(`/fish-sampling/${id}/`),
  createFishSampling: (data: Partial<FishSampling>) => api.post<FishSampling>('/fish-sampling/', data),
  updateFishSampling: (id: number, data: Partial<FishSampling>) => api.put<FishSampling>(`/fish-sampling/${id}/`, data),
  deleteFishSampling: (id: number) => api.delete(`/fish-sampling/${id}/`),
  getBiomassAnalysis: (params?: { pond?: number; species?: number; start_date?: string; end_date?: string }) => 
    api.get<BiomassAnalysis>('/fish-sampling/biomass_analysis/', { params }),
  getFcrAnalysis: (params?: { pond?: number; species?: number; start_date?: string; end_date?: string }) => {
    console.log('API getFcrAnalysis called with params:', params);
    return api.get<FcrAnalysis>('/fish-sampling/fcr_analysis/', { params });
  },

  // Feeding Advice
  getFeedingAdvice: (params?: PaginationParams) => api.get<PaginatedResponse<FeedingAdvice>>('/feeding-advice/', { params }),
  getFeedingAdviceById: (id: number) => api.get<FeedingAdvice>(`/feeding-advice/${id}/`),
  createFeedingAdvice: (data: Partial<FeedingAdvice>) => api.post<FeedingAdvice>('/feeding-advice/', data),
  generateFeedingAdvice: (data: { pond_id: number }) => api.post<FeedingAdvice>('/feeding-advice/generate_advice/', data),
  autoGenerateFeedingAdvice: (data: { pond: number }) => {
    console.log('API Debug - Sending request to:', '/feeding-advice/auto_generate/');
    console.log('API Debug - Request data:', data);
    console.log('API Debug - Full URL:', `${API_BASE_URL}/feeding-advice/auto_generate/`);
    return api.post<{ message: string; advice: FeedingAdvice[]; warnings?: { species_without_sampling?: string[]; failed_species?: string[] } }>('/feeding-advice/auto_generate/', data);
  },
  updateFeedingAdvice: (id: number, data: Partial<FeedingAdvice>) => api.put<FeedingAdvice>(`/feeding-advice/${id}/`, data),
  deleteFeedingAdvice: (id: number) => api.delete(`/feeding-advice/${id}/`),
  applyFeedingAdvice: (id: number) => api.post(`/feeding-advice/${id}/apply_advice/`),

  // Medical Diagnostic
  getMedicalDiagnostics: (params?: PaginationParams) => api.get<PaginatedResponse<MedicalDiagnostic>>('/medical-diagnostics/', { params }),
  getMedicalDiagnosticById: (id: number) => api.get<MedicalDiagnostic>(`/medical-diagnostics/${id}/`),
  createMedicalDiagnostic: (data: Partial<MedicalDiagnostic>) => api.post<MedicalDiagnostic>('/medical-diagnostics/', data),
  updateMedicalDiagnostic: (id: number, data: Partial<MedicalDiagnostic>) => api.put<MedicalDiagnostic>(`/medical-diagnostics/${id}/`, data),
  deleteMedicalDiagnostic: (id: number) => api.delete(`/medical-diagnostics/${id}/`),
  applyTreatment: (id: number) => api.post(`/medical-diagnostics/${id}/apply_treatment/`),
  getMedicalDiagnosticsByPond: (pondId: number) => api.get<MedicalDiagnostic[]>(`/medical-diagnostics/by_pond/?pond_id=${pondId}`),
  getRecentMedicalDiagnostics: () => api.get<MedicalDiagnostic[]>('/medical-diagnostics/recent/'),

  // Business Management APIs
  // Customers
  getCustomers: (params?: PaginationParams) => api.get<PaginatedResponse<Customer>>('/customers/', { params }),
  getCustomerById: (id: number) => api.get<Customer>(`/customers/${id}/`),
  createCustomer: (data: Partial<Customer>) => api.post<Customer>('/customers/', data),
  updateCustomer: (id: number, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}/`, data),
  deleteCustomer: (id: number) => api.delete(`/customers/${id}/`),

  // Payment Terms
  getPaymentTerms: () => api.get<PaymentTerms[]>('/payment-terms/'),
  getPaymentTermById: (id: number) => api.get<PaymentTerms>(`/payment-terms/${id}/`),
  createPaymentTerm: (data: Partial<PaymentTerms>) => api.post<PaymentTerms>('/payment-terms/', data),
  updatePaymentTerm: (id: number, data: Partial<PaymentTerms>) => api.put<PaymentTerms>(`/payment-terms/${id}/`, data),
  deletePaymentTerm: (id: number) => api.delete(`/payment-terms/${id}/`),

  // Vendors
  getVendors: (params?: PaginationParams) => api.get<PaginatedResponse<Vendor>>('/vendors/', { params }),
  getVendorById: (id: number) => api.get<Vendor>(`/vendors/${id}/`),
  createVendor: (data: Partial<Vendor>) => api.post<Vendor>('/vendors/', data),
  updateVendor: (id: number, data: Partial<Vendor>) => api.put<Vendor>(`/vendors/${id}/`, data),
  deleteVendor: (id: number) => api.delete(`/vendors/${id}/`),

  // Vendor Categories
  getVendorCategories: () => api.get<VendorCategory[]>('/vendor-categories/'),
  getVendorCategoryById: (id: number) => api.get<VendorCategory>(`/vendor-categories/${id}/`),
  createVendorCategory: (data: Partial<VendorCategory>) => api.post<VendorCategory>('/vendor-categories/', data),
  updateVendorCategory: (id: number, data: Partial<VendorCategory>) => api.put<VendorCategory>(`/vendor-categories/${id}/`, data),
  deleteVendorCategory: (id: number) => api.delete(`/vendor-categories/${id}/`),

  // Items
  getItems: (params?: PaginationParams) => api.get<PaginatedResponse<Item>>('/items/', { params }),
  getItemById: (id: number) => api.get<Item>(`/items/${id}/`),
  createItem: (data: Partial<Item>) => api.post<Item>('/items/', data),
  updateItem: (id: number, data: Partial<Item>) => api.put<Item>(`/items/${id}/`, data),
  deleteItem: (id: number) => api.delete(`/items/${id}/`),

  // Bills
  getBills: (params?: PaginationParams) => api.get<PaginatedResponse<Bill>>('/bills/', { params }),
  getBillById: (id: number) => api.get<Bill>(`/bills/${id}/`),
  createBill: (data: Partial<Bill>) => api.post<Bill>('/bills/', data),
  updateBill: (id: number, data: Partial<Bill>) => api.put<Bill>(`/bills/${id}/`, data),
  deleteBill: (id: number) => api.delete(`/bills/${id}/`),

  // Invoices
  getInvoices: (params?: PaginationParams) => api.get<PaginatedResponse<Invoice>>('/invoices/', { params }),
  getInvoiceById: (id: number) => api.get<Invoice>(`/invoices/${id}/`),
  createInvoice: (data: Partial<Invoice>) => api.post<Invoice>('/invoices/', data),
  updateInvoice: (id: number, data: Partial<Invoice>) => api.put<Invoice>(`/invoices/${id}/`, data),
  deleteInvoice: (id: number) => api.delete(`/invoices/${id}/`),

  // Inventory Transactions
  getInventoryTransactions: (params?: PaginationParams) => api.get<PaginatedResponse<InventoryTransaction>>('/inventory-transactions/', { params }),
  getInventoryTransactionById: (id: number) => api.get<InventoryTransaction>(`/inventory-transactions/${id}/`),
  createInventoryTransaction: (data: Partial<InventoryTransaction>) => api.post<InventoryTransaction>('/inventory-transactions/', data),
  updateInventoryTransaction: (id: number, data: Partial<InventoryTransaction>) => api.put<InventoryTransaction>(`/inventory-transactions/${id}/`, data),
  deleteInventoryTransaction: (id: number) => api.delete(`/inventory-transactions/${id}/`),

  // Stocking Events
  getStockingEvents: (params?: PaginationParams) => api.get<PaginatedResponse<StockingEvent>>('/stocking-events/', { params }),
  getStockingEventById: (id: number) => api.get<StockingEvent>(`/stocking-events/${id}/`),
  createStockingEvent: (data: Partial<StockingEvent>) => api.post<StockingEvent>('/stocking-events/', data),
  updateStockingEvent: (id: number, data: Partial<StockingEvent>) => api.put<StockingEvent>(`/stocking-events/${id}/`, data),
  deleteStockingEvent: (id: number) => api.delete(`/stocking-events/${id}/`),
  getStockingEventLines: (id: number) => api.get<StockingLine[]>(`/stocking-events/${id}/lines/`),
  addStockingEventLine: (id: number, data: Partial<StockingLine>) => api.post<StockingLine>(`/stocking-events/${id}/add_line/`, data),

  // Feeding Events
  getFeedingEvents: (params?: PaginationParams) => api.get<PaginatedResponse<FeedingEvent>>('/feeding-events/', { params }),
  getFeedingEventById: (id: number) => api.get<FeedingEvent>(`/feeding-events/${id}/`),
  createFeedingEvent: (data: Partial<FeedingEvent>) => api.post<FeedingEvent>('/feeding-events/', data),
  updateFeedingEvent: (id: number, data: Partial<FeedingEvent>) => api.put<FeedingEvent>(`/feeding-events/${id}/`, data),
  deleteFeedingEvent: (id: number) => api.delete(`/feeding-events/${id}/`),

  // Medicine Events
  getMedicineEvents: (params?: PaginationParams) => api.get<PaginatedResponse<MedicineEvent>>('/medicine-events/', { params }),
  getMedicineEventById: (id: number) => api.get<MedicineEvent>(`/medicine-events/${id}/`),
  createMedicineEvent: (data: Partial<MedicineEvent>) => api.post<MedicineEvent>('/medicine-events/', data),
  updateMedicineEvent: (id: number, data: Partial<MedicineEvent>) => api.put<MedicineEvent>(`/medicine-events/${id}/`, data),
  deleteMedicineEvent: (id: number) => api.delete(`/medicine-events/${id}/`),

  // Other Pond Events
  getOtherPondEvents: (params?: PaginationParams) => api.get<PaginatedResponse<OtherPondEvent>>('/other-pond-events/', { params }),
  getOtherPondEventById: (id: number) => api.get<OtherPondEvent>(`/other-pond-events/${id}/`),
  createOtherPondEvent: (data: Partial<OtherPondEvent>) => api.post<OtherPondEvent>('/other-pond-events/', data),
  updateOtherPondEvent: (id: number, data: Partial<OtherPondEvent>) => api.put<OtherPondEvent>(`/other-pond-events/${id}/`, data),
  deleteOtherPondEvent: (id: number) => api.delete(`/other-pond-events/${id}/`),

  // Employees
  getEmployees: (params?: PaginationParams) => api.get<PaginatedResponse<Employee>>('/employees/', { params }),
  getEmployeeById: (id: number) => api.get<Employee>(`/employees/${id}/`),
  createEmployee: (data: Partial<Employee>) => api.post<Employee>('/employees/', data),
  updateEmployee: (id: number, data: Partial<Employee>) => api.put<Employee>(`/employees/${id}/`, data),
  deleteEmployee: (id: number) => api.delete(`/employees/${id}/`),

  // Payroll Runs
  getPayrollRuns: (params?: PaginationParams) => api.get<PaginatedResponse<PayrollRun>>('/payroll-runs/', { params }),
  getPayrollRunById: (id: number) => api.get<PayrollRun>(`/payroll-runs/${id}/`),
  createPayrollRun: (data: Partial<PayrollRun>) => api.post<PayrollRun>('/payroll-runs/', data),
  updatePayrollRun: (id: number, data: Partial<PayrollRun>) => api.put<PayrollRun>(`/payroll-runs/${id}/`, data),
  deletePayrollRun: (id: number) => api.delete(`/payroll-runs/${id}/`),

  // Customer Stocks
  getCustomerStocks: (params?: PaginationParams) => api.get<PaginatedResponse<CustomerStock>>('/customer-stocks/', { params }),
  getCustomerStockById: (id: number) => api.get<CustomerStock>(`/customer-stocks/${id}/`),
  createCustomerStock: (data: Partial<CustomerStock>) => api.post<CustomerStock>('/customer-stocks/', data),
  updateCustomerStock: (id: number, data: Partial<CustomerStock>) => api.put<CustomerStock>(`/customer-stocks/${id}/`, data),
  deleteCustomerStock: (id: number) => api.delete(`/customer-stocks/${id}/`),

  // Stock Entries
  getStockEntries: (params?: PaginationParams) => api.get<PaginatedResponse<StockEntry>>('/stock-entries/', { params }),
  getStockEntryById: (id: number) => api.get<StockEntry>(`/stock-entries/${id}/`),
  createStockEntry: (data: Partial<StockEntry>) => api.post<StockEntry>('/stock-entries/', data),
  updateStockEntry: (id: number, data: Partial<StockEntry>) => api.put<StockEntry>(`/stock-entries/${id}/`, data),
  deleteStockEntry: (id: number) => api.delete(`/stock-entries/${id}/`),
  getStockEntriesByItem: (itemId: number) => api.get<StockEntry[]>(`/stock-entries/by_item/?item_id=${itemId}`),

};
