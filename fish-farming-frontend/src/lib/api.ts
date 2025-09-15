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

// API Types
export interface Species {
  id: number;
  name: string;
  scientific_name: string;
  description: string;
  created_at: string;
}

export interface Pond {
  id: number;
  name: string;
  area_decimal: string;
  depth_ft: string;
  volume_m3: string;
  location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_username: string;
}

export interface Stocking {
  stocking_id: number;
  pond: number;
  species: number;
  date: string;
  pcs: number;
  line_pcs_per_kg: string;
  initial_avg_weight_kg: string;
  notes: string;
  created_at: string;
  pond_name: string;
  species_name: string;
  total_weight_kg: string;
}

export interface SampleType {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
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
  avg_weight_g: string;
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
  total_count: number;
  avg_weight_g: string | null;
  price_per_kg: string | null;
  total_revenue: string | null;
  notes: string;
  created_at: string;
  pond_name: string;
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

  // Species
  getSpecies: () => api.get<Species[]>('/species/'),
  getSpeciesById: (id: number) => api.get<Species>(`/species/${id}/`),
  createSpecies: (data: Partial<Species>) => api.post<Species>('/species/', data),
  updateSpecies: (id: number, data: Partial<Species>) => api.put<Species>(`/species/${id}/`, data),
  deleteSpecies: (id: number) => api.delete(`/species/${id}/`),

  // Ponds
  getPonds: () => api.get<Pond[]>('/ponds/'),
  getPondById: (id: number) => api.get<Pond>(`/ponds/${id}/`),
  getPondSummary: (id: number) => api.get<PondSummary>(`/ponds/${id}/summary/`),
  getPondFinancialSummary: (id: number) => api.get<FinancialSummary>(`/ponds/${id}/financial_summary/`),
  createPond: (data: Partial<Pond>) => api.post<Pond>('/ponds/', data),
  updatePond: (id: number, data: Partial<Pond>) => api.put<Pond>(`/ponds/${id}/`, data),
  deletePond: (id: number) => api.delete(`/ponds/${id}/`),

  // Stocking
  getStocking: () => api.get<Stocking[]>('/stocking/'),
  getStockingById: (id: number) => api.get<Stocking>(`/stocking/${id}/`),
  createStocking: (data: Partial<Stocking>) => api.post<Stocking>('/stocking/', data),
  updateStocking: (id: number, data: Partial<Stocking>) => api.put<Stocking>(`/stocking/${id}/`, data),
  deleteStocking: (id: number) => api.delete(`/stocking/${id}/`),

  // Daily Logs
  getDailyLogs: () => api.get<DailyLog[]>('/daily-logs/'),
  getDailyLogById: (id: number) => api.get<DailyLog>(`/daily-logs/${id}/`),
  createDailyLog: (data: Partial<DailyLog>) => api.post<DailyLog>('/daily-logs/', data),
  updateDailyLog: (id: number, data: Partial<DailyLog>) => api.put<DailyLog>(`/daily-logs/${id}/`, data),
  deleteDailyLog: (id: number) => api.delete(`/daily-logs/${id}/`),

  // Sample Types
  getSampleTypes: () => api.get<SampleType[]>('/sample-types/'),
  getSampleTypeById: (id: number) => api.get<SampleType>(`/sample-types/${id}/`),
  createSampleType: (data: Partial<SampleType>) => api.post<SampleType>('/sample-types/', data),
  updateSampleType: (id: number, data: Partial<SampleType>) => api.put<SampleType>(`/sample-types/${id}/`, data),
  deleteSampleType: (id: number) => api.delete(`/sample-types/${id}/`),

  // Water Quality Sampling
  getSamplings: () => api.get<Sampling[]>('/sampling/'),
  getSamplingById: (id: number) => api.get<Sampling>(`/sampling/${id}/`),
  createSampling: (data: Partial<Sampling>) => api.post<Sampling>('/sampling/', data),
  updateSampling: (id: number, data: Partial<Sampling>) => api.put<Sampling>(`/sampling/${id}/`, data),
  deleteSampling: (id: number) => api.delete(`/sampling/${id}/`),

  // Mortality Tracking
  getMortalities: () => api.get<Mortality[]>('/mortality/'),
  getMortalityById: (id: number) => api.get<Mortality>(`/mortality/${id}/`),
  createMortality: (data: Partial<Mortality>) => api.post<Mortality>('/mortality/', data),
  updateMortality: (id: number, data: Partial<Mortality>) => api.put<Mortality>(`/mortality/${id}/`, data),
  deleteMortality: (id: number) => api.delete(`/mortality/${id}/`),

  // Feed Types
  getFeedTypes: () => api.get<FeedType[]>('/feed-types/'),
  getFeedTypeById: (id: number) => api.get<FeedType>(`/feed-types/${id}/`),
  createFeedType: (data: Partial<FeedType>) => api.post<FeedType>('/feed-types/', data),
  updateFeedType: (id: number, data: Partial<FeedType>) => api.put<FeedType>(`/feed-types/${id}/`, data),
  deleteFeedType: (id: number) => api.delete(`/feed-types/${id}/`),

  // Feeds
  getFeeds: () => api.get<Feed[]>('/feeds/'),
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
  getHarvests: () => api.get<Harvest[]>('/harvests/'),
  getHarvestById: (id: number) => api.get<Harvest>(`/harvests/${id}/`),
  createHarvest: (data: Partial<Harvest>) => api.post<Harvest>('/harvests/', data),
  updateHarvest: (id: number, data: Partial<Harvest>) => api.put<Harvest>(`/harvests/${id}/`, data),
  deleteHarvest: (id: number) => api.delete(`/harvests/${id}/`),

  // Expenses
  getExpenses: () => api.get<Expense[]>('/expenses/'),
  getExpenseById: (id: number) => api.get<Expense>(`/expenses/${id}/`),
  createExpense: (data: Partial<Expense>) => api.post<Expense>('/expenses/', data),
  updateExpense: (id: number, data: Partial<Expense>) => api.put<Expense>(`/expenses/${id}/`, data),
  deleteExpense: (id: number) => api.delete(`/expenses/${id}/`),

  // Income
  getIncomes: () => api.get<Income[]>('/incomes/'),
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
  getFishSampling: () => api.get<FishSampling[]>('/fish-sampling/'),
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
  getFeedingAdvice: () => api.get<FeedingAdvice[]>('/feeding-advice/'),
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

};
