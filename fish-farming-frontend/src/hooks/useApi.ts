import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, PaginationParams, api } from '@/lib/api';
import { toast } from 'sonner';

// Simple useApi hook for basic API operations
export function useApi() {
  const get = async (url: string) => {
    try {
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      const errorDetails = {
        url,
        message: error?.message || 'Unknown error',
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
      };
      
      console.error('GET Error Details:', errorDetails);
      throw error;
    }
  };

  const post = async (url: string, data: any) => {
    try {
      console.log('POST Request:', { url, data });
      const response = await api.post(url, data);
      console.log('POST Response:', response.data);
      return response.data;
    } catch (error: any) {
      // Create a clean error object without circular references
      const errorDetails = {
        url,
        data,
        message: error?.message || 'Unknown error',
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
        stack: error?.stack
      };
      
      console.error('POST Error Details:', errorDetails);
      
      // Also log the raw error for debugging (but safely)
      console.error('Raw error object:', error);
      
      throw error;
    }
  };

  const put = async (url: string, data: any) => {
    const response = await api.put(url, data);
    return response.data;
  };

  const del = async (url: string) => {
    const response = await api.delete(url);
    return response.data;
  };

  return { get, post, put, delete: del };
}

// Generic hook for GET requests
export function  useApiQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<{ data: T }>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) {
  const result = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await queryFn();
      console.log('useApiQuery raw response:', response);
      
      // The API service already returns the Axios response with data property
      // So we just return the response as-is
      return response;
    },
    ...options,
  });
  
  // Debug logging for FCR analysis
  if (queryKey[0] === 'fcr-analysis') {
    console.log('useApiQuery FCR Debug:', {
      queryKey,
      isLoading: result.isLoading,
      error: result.error,
      data: result.data,
      status: result.status,
      isError: result.isError,
      isSuccess: result.isSuccess
    });
  }
  
  return result;
}

// Generic hook for mutations
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData }>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: any) => void;
    invalidateQueries?: string[][];
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data.data);
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
    onError: (error: any) => {
      console.error('API Error:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
      options?.onError?.(error);
    },
  });
}

// Specific hooks for different entities
export function usePonds(params?: PaginationParams) {
  return useApiQuery(['ponds', JSON.stringify(params || {})], () => apiService.getPonds(params));
}

export function usePond(id: number) {
  return useApiQuery(['ponds', id.toString()], () => apiService.getPondById(id), {
    enabled: !!id,
  });
}

export function usePondSummary(id: number) {
  return useApiQuery(['ponds', id.toString(), 'summary'], () => apiService.getPondSummary(id), {
    enabled: !!id,
  });
}

export function usePondFinancialSummary(id: number) {
  return useApiQuery(['ponds', id.toString(), 'financial'], () => apiService.getPondFinancialSummary(id), {
    enabled: !!id,
  });
}

export function useSpecies(params?: PaginationParams) {
  return useApiQuery(['species', JSON.stringify(params || {})], () => apiService.getSpecies(params));
}

export function useSpeciesTree() {
  return useApiQuery(['species', 'tree'], () => apiService.getSpeciesTree());
}

export function useSpeciesById(id: number) {
  return useApiQuery(
    ['species', id.toString()],
    () => apiService.getSpeciesById(id),
    { enabled: !!id }
  );
}

export function useCreateSpecies() {
  return useApiMutation(
    (data: any) => apiService.createSpecies(data),
    {
      onSuccess: () => {
        toast.success('Species created successfully');
      },
      invalidateQueries: [['species']],
    }
  );
}

export function useUpdateSpecies() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateSpecies(id, data),
    {
      onSuccess: () => {
        toast.success('Species updated successfully');
      },
      invalidateQueries: [['species']],
    }
  );
}

export function useDeleteSpecies() {
  return useApiMutation(
    (id: number) => apiService.deleteSpecies(id),
    {
      onSuccess: () => {
        toast.success('Species deleted successfully');
      },
      invalidateQueries: [['species']],
    }
  );
}

export function useStocking(params?: PaginationParams) {
  return useApiQuery(['stocking', JSON.stringify(params || {})], () => apiService.getStocking(params));
}

export function useExpenses(params?: PaginationParams) {
  return useApiQuery(['expenses', JSON.stringify(params || {})], () => apiService.getExpenses(params));
}

export function useIncomes(params?: PaginationParams) {
  return useApiQuery(['incomes', JSON.stringify(params || {})], () => apiService.getIncomes(params));
}


// Expense CRUD hooks
export function useExpenseById(id: number) {
  return useApiQuery(
    ['expenses', id.toString()],
    () => apiService.getExpenseById(id),
    { enabled: !!id }
  );
}

export function useUpdateExpense() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateExpense(id, data),
    {
      onSuccess: () => {
        toast.success('Expense updated successfully');
      },
      invalidateQueries: [['expenses'], ['ponds']],
    }
  );
}

export function useDeleteExpense() {
  return useApiMutation(
    (id: number) => apiService.deleteExpense(id),
    {
      onSuccess: () => {
        toast.success('Expense deleted successfully');
      },
      invalidateQueries: [['expenses'], ['ponds']],
    }
  );
}

// Income CRUD hooks
export function useIncomeById(id: number) {
  return useApiQuery(
    ['incomes', id.toString()],
    () => apiService.getIncomeById(id),
    { enabled: !!id }
  );
}

export function useUpdateIncome() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateIncome(id, data),
    {
      onSuccess: () => {
        toast.success('Income updated successfully');
      },
      invalidateQueries: [['incomes'], ['ponds']],
    }
  );
}

export function useDeleteIncome() {
  return useApiMutation(
    (id: number) => apiService.deleteIncome(id),
    {
      onSuccess: () => {
        toast.success('Income deleted successfully');
      },
      invalidateQueries: [['incomes'], ['ponds']],
    }
  );
}

export function useAlerts() {
  return useApiQuery(['alerts'], () => apiService.getAlerts());
}

export function useAlertById(id: number) {
  return useApiQuery(
    ['alerts', id.toString()],
    () => apiService.getAlertById(id),
    { enabled: !!id }
  );
}

// Mutation hooks
export function useCreatePond() {
  return useApiMutation(
    (data: any) => apiService.createPond(data),
    {
      onSuccess: () => {
        toast.success('Pond created successfully');
      },
      invalidateQueries: [['ponds']],
    }
  );
}

export function useUpdatePond() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updatePond(id, data),
    {
      onSuccess: () => {
        toast.success('Pond updated successfully');
      },
      invalidateQueries: [['ponds']],
    }
  );
}

export function useDeletePond() {
  return useApiMutation(
    (id: number) => apiService.deletePond(id),
    {
      onSuccess: () => {
        toast.success('Pond deleted successfully');
      },
      invalidateQueries: [['ponds']],
    }
  );
}

export function useCreateStocking() {
  return useApiMutation(
    (data: any) => apiService.createStocking(data),
    {
      onSuccess: () => {
        toast.success('Stocking record created successfully');
      },
      invalidateQueries: [['stocking'], ['ponds']],
    }
  );
}

export function useStockingById(id: number) {
  return useApiQuery(
    ['stocking', id.toString()],
    () => apiService.getStockingById(id),
    { enabled: !!id }
  );
}

export function useUpdateStocking() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateStocking(id, data),
    {
      onSuccess: () => {
        toast.success('Stocking record updated successfully');
      },
      invalidateQueries: [['stocking'], ['ponds']],
    }
  );
}

export function useDeleteStocking() {
  return useApiMutation(
    (id: number) => apiService.deleteStocking(id),
    {
      onSuccess: () => {
        toast.success('Stocking record deleted successfully');
      },
      invalidateQueries: [['stocking'], ['ponds']],
    }
  );
}

// Daily Logs
export function useDailyLogs(params?: PaginationParams) {
  return useApiQuery(['daily-logs', JSON.stringify(params || {})], () => apiService.getDailyLogs(params));
}

export function useDailyLogById(id: number) {
  return useApiQuery(
    ['daily-logs', id.toString()],
    () => apiService.getDailyLogById(id),
    { enabled: !!id }
  );
}

export function useCreateDailyLog() {
  return useApiMutation(
    (data: any) => apiService.createDailyLog(data),
    {
      onSuccess: () => {
        toast.success('Daily log created successfully');
      },
      invalidateQueries: [['daily-logs'], ['ponds']],
    }
  );
}

export function useUpdateDailyLog() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateDailyLog(id, data),
    {
      onSuccess: () => {
        toast.success('Daily log updated successfully');
      },
      invalidateQueries: [['daily-logs'], ['ponds']],
    }
  );
}

export function useDeleteDailyLog() {
  return useApiMutation(
    (id: number) => apiService.deleteDailyLog(id),
    {
      onSuccess: () => {
        toast.success('Daily log deleted successfully');
      },
      invalidateQueries: [['daily-logs'], ['ponds']],
    }
  );
}


// Water Quality Sampling
export function useSamplings(params?: PaginationParams) {
  return useApiQuery(['sampling', JSON.stringify(params || {})], () => apiService.getSamplings(params));
}

export function useSamplingById(id: number) {
  return useApiQuery(
    ['sampling', id.toString()],
    () => apiService.getSamplingById(id),
    { enabled: !!id }
  );
}

export function useCreateSampling() {
  return useApiMutation(
    (data: any) => apiService.createSampling(data),
    {
      onSuccess: () => {
        toast.success('Water quality sample created successfully');
      },
      invalidateQueries: [['sampling']],
    }
  );
}

export function useUpdateSampling() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateSampling(id, data),
    {
      onSuccess: () => {
        toast.success('Water quality sample updated successfully');
      },
      invalidateQueries: [['sampling']],
    }
  );
}

export function useDeleteSampling() {
  return useApiMutation(
    (id: number) => apiService.deleteSampling(id),
    {
      onSuccess: () => {
        toast.success('Water quality sample deleted successfully');
      },
      invalidateQueries: [['sampling']],
    }
  );
}

// Mortality Tracking
export function useMortalities(params?: PaginationParams) {
  return useApiQuery(['mortality', JSON.stringify(params || {})], () => apiService.getMortalities(params));
}

export function useMortalityById(id: number) {
  return useApiQuery(
    ['mortality', id.toString()],
    () => apiService.getMortalityById(id),
    { enabled: !!id }
  );
}

export function useCreateMortality() {
  return useApiMutation(
    (data: any) => apiService.createMortality(data),
    {
      onSuccess: () => {
        toast.success('Mortality record created successfully');
      },
      invalidateQueries: [['mortality']],
    }
  );
}

export function useUpdateMortality() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateMortality(id, data),
    {
      onSuccess: () => {
        toast.success('Mortality record updated successfully');
      },
      invalidateQueries: [['mortality']],
    }
  );
}

export function useDeleteMortality() {
  return useApiMutation(
    (id: number) => apiService.deleteMortality(id),
    {
      onSuccess: () => {
        toast.success('Mortality record deleted successfully');
      },
      invalidateQueries: [['mortality']],
    }
  );
}

// Feed Types
export function useFeedTypes() {
  return useApiQuery(['feed-types'], () => apiService.getFeedTypes());
}

// Sample Types
export function useSampleTypes() {
  return useApiQuery(['sample-types'], () => apiService.getSampleTypes());
}

export function useFeedTypeById(id: number) {
  return useApiQuery(
    ['feed-types', id.toString()],
    () => apiService.getFeedTypeById(id),
    { enabled: !!id }
  );
}

export function useCreateFeedType() {
  return useApiMutation(
    (data: any) => apiService.createFeedType(data),
    {
      onSuccess: () => {
        toast.success('Feed type created successfully');
      },
      invalidateQueries: [['feed-types']],
    }
  );
}

export function useUpdateFeedType() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateFeedType(id, data),
    {
      onSuccess: () => {
        toast.success('Feed type updated successfully');
      },
      invalidateQueries: [['feed-types']],
    }
  );
}

export function useDeleteFeedType() {
  return useApiMutation(
    (id: number) => apiService.deleteFeedType(id),
    {
      onSuccess: () => {
        toast.success('Feed type deleted successfully');
      },
      invalidateQueries: [['feed-types']],
    }
  );
}

// Feeds
export function useFeeds(params?: PaginationParams) {
  return useApiQuery(['feeds', JSON.stringify(params || {})], () => apiService.getFeeds(params));
}

export function useFeedById(id: number) {
  return useApiQuery(
    ['feeds', id.toString()],
    () => apiService.getFeedById(id),
    { enabled: !!id }
  );
}

export function useCreateFeed() {
  return useApiMutation(
    (data: any) => apiService.createFeed(data),
    {
      onSuccess: () => {
        toast.success('Feed record created successfully');
      },
      invalidateQueries: [['feeds'], ['ponds']],
    }
  );
}

export function useUpdateFeed() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateFeed(id, data),
    {
      onSuccess: () => {
        toast.success('Feed record updated successfully');
      },
      invalidateQueries: [['feeds'], ['ponds']],
    }
  );
}

export function useDeleteFeed() {
  return useApiMutation(
    (id: number) => apiService.deleteFeed(id),
    {
      onSuccess: () => {
        toast.success('Feed record deleted successfully');
      },
      invalidateQueries: [['feeds'], ['ponds']],
    }
  );
}

// Feed Inventory
export function useInventoryFeeds() {
  return useApiQuery(['inventory-feed'], () => apiService.getInventoryFeeds());
}

export function useInventoryFeedById(id: number) {
  return useApiQuery(
    ['inventory-feed', id.toString()],
    () => apiService.getInventoryFeedById(id),
    { enabled: !!id }
  );
}

export function useCreateInventoryFeed() {
  return useApiMutation(
    (data: any) => apiService.createInventoryFeed(data),
    {
      onSuccess: () => {
        toast.success('Feed inventory record created successfully');
      },
      invalidateQueries: [['inventory-feed']],
    }
  );
}

export function useUpdateInventoryFeed() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateInventoryFeed(id, data),
    {
      onSuccess: () => {
        toast.success('Feed inventory record updated successfully');
      },
      invalidateQueries: [['inventory-feed']],
    }
  );
}

export function useDeleteInventoryFeed() {
  return useApiMutation(
    (id: number) => apiService.deleteInventoryFeed(id),
    {
      onSuccess: () => {
        toast.success('Feed inventory record deleted successfully');
      },
      invalidateQueries: [['inventory-feed']],
    }
  );
}

// Feeding Bands
export function useFeedingBands() {
  return useApiQuery(['feeding-bands'], () => apiService.getFeedingBands());
}

export function useFeedingBandById(id: number) {
  return useApiQuery(
    ['feeding-bands', id.toString()],
    () => apiService.getFeedingBandById(id),
    { enabled: !!id }
  );
}

export function useCreateFeedingBand() {
  return useApiMutation(
    (data: any) => apiService.createFeedingBand(data),
    {
      onSuccess: () => {
        toast.success('Feeding band created successfully');
      },
      invalidateQueries: [['feeding-bands']],
    }
  );
}

export function useUpdateFeedingBand() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateFeedingBand(id, data),
    {
      onSuccess: () => {
        toast.success('Feeding band updated successfully');
      },
      invalidateQueries: [['feeding-bands']],
    }
  );
}

export function useDeleteFeedingBand() {
  return useApiMutation(
    (id: number) => apiService.deleteFeedingBand(id),
    {
      onSuccess: () => {
        toast.success('Feeding band deleted successfully');
      },
      invalidateQueries: [['feeding-bands']],
    }
  );
}

// Harvests
export function useHarvests(params?: PaginationParams) {
  return useApiQuery(['harvests', JSON.stringify(params || {})], () => apiService.getHarvests(params));
}

export function useHarvestById(id: number) {
  return useApiQuery(
    ['harvests', id.toString()],
    () => apiService.getHarvestById(id),
    { enabled: !!id }
  );
}

export function useCreateHarvest() {
  return useApiMutation(
    (data: any) => apiService.createHarvest(data),
    {
      onSuccess: () => {
        toast.success('Harvest record created successfully');
      },
      invalidateQueries: [['harvests'], ['ponds']],
    }
  );
}

export function useUpdateHarvest() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateHarvest(id, data),
    {
      onSuccess: () => {
        toast.success('Harvest record updated successfully');
      },
      invalidateQueries: [['harvests'], ['ponds']],
    }
  );
}

export function useDeleteHarvest() {
  return useApiMutation(
    (id: number) => apiService.deleteHarvest(id),
    {
      onSuccess: () => {
        toast.success('Harvest record deleted successfully');
      },
      invalidateQueries: [['harvests'], ['ponds']],
    }
  );
}

export function useCreateExpense() {
  return useApiMutation(
    (data: any) => apiService.createExpense(data),
    {
      onSuccess: () => {
        toast.success('Expense recorded successfully');
      },
      invalidateQueries: [['expenses'], ['ponds']],
    }
  );
}

export function useCreateIncome() {
  return useApiMutation(
    (data: any) => apiService.createIncome(data),
    {
      onSuccess: () => {
        toast.success('Income recorded successfully');
      },
      invalidateQueries: [['incomes'], ['ponds']],
    }
  );
}

export function useResolveAlert() {
  return useApiMutation(
    (id: number) => apiService.resolveAlert(id),
    {
      onSuccess: () => {
        toast.success('Alert resolved successfully');
      },
      invalidateQueries: [['alerts']],
    }
  );
}

// Fish Sampling hooks
export function useFishSampling(params?: PaginationParams) {
  return useApiQuery(['fish-sampling', JSON.stringify(params || {})], () => apiService.getFishSampling(params));
}

export function useFishSamplingById(id: number) {
  return useApiQuery(
    ['fish-sampling', id.toString()],
    () => apiService.getFishSamplingById(id),
    { enabled: !!id }
  );
}

export function useCreateFishSampling() {
  return useApiMutation(
    (data: any) => apiService.createFishSampling(data),
    {
      onSuccess: () => {
        toast.success('Fish sampling recorded successfully');
      },
      invalidateQueries: [['fish-sampling']],
    }
  );
}

export function useUpdateFishSampling() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateFishSampling(id, data),
    {
      onSuccess: () => {
        toast.success('Fish sampling updated successfully');
      },
      invalidateQueries: [['fish-sampling']],
    }
  );
}

export function useDeleteFishSampling() {
  return useApiMutation(
    (id: number) => apiService.deleteFishSampling(id),
    {
      onSuccess: () => {
        toast.success('Fish sampling deleted successfully');
      },
      invalidateQueries: [['fish-sampling']],
    }
  );
}

// Feeding Advice hooks
export function useFeedingAdvice(params?: PaginationParams) {
  return useApiQuery(['feeding-advice', JSON.stringify(params || {})], () => apiService.getFeedingAdvice(params));
}

export function useFeedingAdviceById(id: number) {
  return useApiQuery(
    ['feeding-advice', id.toString()],
    () => apiService.getFeedingAdviceById(id),
    { enabled: !!id }
  );
}

export function useGenerateFeedingAdvice() {
  const queryClient = useQueryClient();
  return useApiMutation(
    (data: { pond_id: number }) => apiService.generateFeedingAdvice(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['feeding-advice'] });
        toast.success('Feeding advice generated successfully!');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to generate feeding advice');
      }
    }
  );
}

export function useCreateFeedingAdvice() {
  return useApiMutation(
    (data: any) => apiService.createFeedingAdvice(data),
    {
      onSuccess: () => {
        toast.success('Feeding advice generated successfully');
      },
      invalidateQueries: [['feeding-advice']],
    }
  );
}

export function useAutoGenerateFeedingAdvice() {
  return useApiMutation(
    (data: { pond: number }) => apiService.autoGenerateFeedingAdvice(data),
    {
      onSuccess: (data) => {
        if (data.warnings) {
          // Show success with warnings
          toast.success(`Generated feeding advice for ${data.advice?.length || 1} species`);
          
          // Show warnings for species without sampling data
          if (data.warnings.species_without_sampling && data.warnings.species_without_sampling.length > 0) {
            toast.warning(`Some species need fish sampling data: ${data.warnings.species_without_sampling.join(', ')}`);
          }
          
          // Show warnings for failed species
          if (data.warnings.failed_species && data.warnings.failed_species.length > 0) {
            toast.warning(`Some species had issues: ${data.warnings.failed_species.join(', ')}`);
          }
        } else {
          toast.success(`Generated feeding advice for ${data.advice?.length || 1} species`);
        }
      },
      onError: (error: any) => {
        // Handle detailed error messages from backend
        if (error.response?.data?.error) {
          toast.error(error.response.data.error);
          
          // Show additional details if available
          if (error.response.data.details) {
            const details = error.response.data.details;
            if (details.species_without_sampling?.length > 0) {
              toast.error(`Missing fish sampling data for: ${details.species_without_sampling.join(', ')}`);
            }
            if (details.failed_species?.length > 0) {
              toast.error(`Failed species: ${details.failed_species.join(', ')}`);
            }
          }
        } else {
          toast.error('Failed to generate feeding advice. Please try again.');
        }
      },
      invalidateQueries: [['feeding-advice']],
    }
  );
}

export function useUpdateFeedingAdvice() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateFeedingAdvice(id, data),
    {
      onSuccess: () => {
        toast.success('Feeding advice updated successfully');
      },
      invalidateQueries: [['feeding-advice']],
    }
  );
}

export function useDeleteFeedingAdvice() {
  return useApiMutation(
    (id: number) => apiService.deleteFeedingAdvice(id),
    {
      onSuccess: () => {
        toast.success('Feeding advice deleted successfully');
      },
      invalidateQueries: [['feeding-advice']],
    }
  );
}

export function useApplyFeedingAdvice() {
  return useApiMutation(
    (id: number) => apiService.applyFeedingAdvice(id),
    {
      onSuccess: () => {
        toast.success('Feeding advice applied successfully');
      },
      invalidateQueries: [['feeding-advice']],
    }
  );
}

// Biomass Analysis
export function useBiomassAnalysis(params?: { pond?: number; species?: number; start_date?: string; end_date?: string }) {
  return useApiQuery(
    ['biomass-analysis', JSON.stringify(params || {})],
    () => apiService.getBiomassAnalysis(params)
  );
}

// FCR Analysis
export function useFcrAnalysis(params?: { pond?: number; species?: number; start_date?: string; end_date?: string }) {
  const result = useApiQuery(
    ['fcr-analysis', JSON.stringify(params || {})],
    () => apiService.getFcrAnalysis(params)
  );
  
  // Debug logging
  console.log('useFcrAnalysis Debug:', {
    params,
    isLoading: result.isLoading,
    error: result.error,
    data: result.data,
    status: result.status
  });
  
  return result;
}

// Business Management Hooks
export function useCustomers(params?: PaginationParams) {
  return useApiQuery(['customers', JSON.stringify(params || {})], () => apiService.getCustomers(params));
}

export function useCustomer(id: number) {
  return useApiQuery(['customers', id.toString()], () => apiService.getCustomerById(id), {
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  return useApiMutation(
    (data: any) => apiService.createCustomer(data),
    { invalidateQueries: [['customers']] }
  );
}

export function useUpdateCustomer() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateCustomer(id, data),
    { invalidateQueries: [['customers']] }
  );
}

export function useDeleteCustomer() {
  return useApiMutation(
    (id: number) => apiService.deleteCustomer(id),
    { invalidateQueries: [['customers']] }
  );
}

export function usePaymentTerms() {
  return useApiQuery(['payment-terms'], () => apiService.getPaymentTerms());
}

export function useVendors(params?: PaginationParams) {
  return useApiQuery(['vendors', JSON.stringify(params || {})], () => apiService.getVendors(params));
}

export function useVendor(id: number) {
  return useApiQuery(['vendors', id.toString()], () => apiService.getVendorById(id), {
    enabled: !!id,
  });
}

export function useCustomerStocks(params?: PaginationParams) {
  return useApiQuery(['customer-stocks', JSON.stringify(params || {})], () => apiService.getCustomerStocks(params));
}

export function useCustomerStock(id: number) {
  return useApiQuery(['customer-stocks', id.toString()], () => apiService.getCustomerStockById(id), {
    enabled: !!id,
  });
}

export function useCreateVendor() {
  return useApiMutation(
    (data: any) => apiService.createVendor(data),
    { invalidateQueries: [['vendors']] }
  );
}

export function useUpdateVendor() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateVendor(id, data),
    { invalidateQueries: [['vendors']] }
  );
}

export function useDeleteVendor() {
  return useApiMutation(
    (id: number) => apiService.deleteVendor(id),
    { invalidateQueries: [['vendors']] }
  );
}

export function useCreateCustomerStock() {
  return useApiMutation(
    (data: any) => apiService.createCustomerStock(data),
    { invalidateQueries: [['customer-stocks']] }
  );
}

export function useUpdateCustomerStock() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateCustomerStock(id, data),
    { invalidateQueries: [['customer-stocks']] }
  );
}

export function useDeleteCustomerStock() {
  return useApiMutation(
    (id: number) => apiService.deleteCustomerStock(id),
    { invalidateQueries: [['customer-stocks']] }
  );
}

export function useVendorCategories() {
  return useApiQuery(['vendor-categories'], () => apiService.getVendorCategories());
}

export function useItems(params?: PaginationParams) {
  return useApiQuery(['items', JSON.stringify(params || {})], () => apiService.getItems(params));
}

export function useItem(id: number) {
  return useApiQuery(['items', id.toString()], () => apiService.getItemById(id), {
    enabled: !!id,
  });
}

export function useCreateItem() {
  return useApiMutation(
    (data: any) => apiService.createItem(data),
    { invalidateQueries: [['items']] }
  );
}

export function useUpdateItem() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateItem(id, data),
    { invalidateQueries: [['items']] }
  );
}

export function useDeleteItem() {
  return useApiMutation(
    (id: number) => apiService.deleteItem(id),
    { invalidateQueries: [['items']] }
  );
}

export function useBills(params?: PaginationParams) {
  return useApiQuery(['bills', JSON.stringify(params || {})], () => apiService.getBills(params));
}

export function useBill(id: number) {
  return useApiQuery(['bills', id.toString()], () => apiService.getBillById(id), {
    enabled: !!id,
  });
}

export function useCreateBill() {
  return useApiMutation(
    (data: any) => apiService.createBill(data),
    { invalidateQueries: [['bills']] }
  );
}

export function useUpdateBill() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateBill(id, data),
    { invalidateQueries: [['bills']] }
  );
}

export function useDeleteBill() {
  return useApiMutation(
    (id: number) => apiService.deleteBill(id),
    { invalidateQueries: [['bills']] }
  );
}

export function useInvoices(params?: PaginationParams) {
  return useApiQuery(['invoices', JSON.stringify(params || {})], () => apiService.getInvoices(params));
}

export function useInvoice(id: number) {
  return useApiQuery(['invoices', id.toString()], () => apiService.getInvoiceById(id), {
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  return useApiMutation(
    (data: any) => apiService.createInvoice(data),
    { invalidateQueries: [['invoices']] }
  );
}

export function useUpdateInvoice() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateInvoice(id, data),
    { invalidateQueries: [['invoices']] }
  );
}

export function useDeleteInvoice() {
  return useApiMutation(
    (id: number) => apiService.deleteInvoice(id),
    { invalidateQueries: [['invoices']] }
  );
}

export function useInventoryTransactions(params?: PaginationParams) {
  return useApiQuery(['inventory-transactions', JSON.stringify(params || {})], () => apiService.getInventoryTransactions(params));
}

export function useInventoryTransaction(id: number) {
  return useApiQuery(['inventory-transactions', id.toString()], () => apiService.getInventoryTransactionById(id), {
    enabled: !!id,
  });
}

export function useCreateInventoryTransaction() {
  return useApiMutation(
    (data: any) => apiService.createInventoryTransaction(data),
    { invalidateQueries: [['inventory-transactions']] }
  );
}

export function useUpdateInventoryTransaction() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateInventoryTransaction(id, data),
    { invalidateQueries: [['inventory-transactions']] }
  );
}

export function useDeleteInventoryTransaction() {
  return useApiMutation(
    (id: number) => apiService.deleteInventoryTransaction(id),
    { invalidateQueries: [['inventory-transactions']] }
  );
}

// Chart of Accounts hooks
export function useChartAccounts() {
  return useApiQuery(['chart-accounts'], () => apiService.getChartAccounts());
}

export function useChartAccount(id: number) {
  return useApiQuery(['chart-accounts', id.toString()], () => apiService.getChartAccountById(id), {
    enabled: !!id,
  });
}

export function useCreateChartAccount() {
  return useApiMutation(
    (data: any) => apiService.createChartAccount(data),
    { invalidateQueries: [['chart-accounts']] }
  );
}

export function useUpdateChartAccount() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateChartAccount(id, data),
    { invalidateQueries: [['chart-accounts']] }
  );
}

export function useDeleteChartAccount() {
  return useApiMutation(
    (id: number) => apiService.deleteChartAccount(id),
    { invalidateQueries: [['chart-accounts']] }
  );
}

// Journal Entries hooks
export function useJournalEntries(params?: PaginationParams) {
  return useApiQuery(['journal-entries', JSON.stringify(params || {})], () => apiService.getJournalEntries(params));
}

export function useJournalEntry(id: number) {
  return useApiQuery(['journal-entries', id.toString()], () => apiService.getJournalEntryById(id), {
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  return useApiMutation(
    (data: any) => apiService.createJournalEntry(data),
    { invalidateQueries: [['journal-entries'], ['chart-accounts']] }
  );
}

export function useUpdateJournalEntry() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateJournalEntry(id, data),
    { invalidateQueries: [['journal-entries'], ['chart-accounts']] }
  );
}

export function useDeleteJournalEntry() {
  return useApiMutation(
    (id: number) => apiService.deleteJournalEntry(id),
    { invalidateQueries: [['journal-entries'], ['chart-accounts']] }
  );
}

// Bill Payments hooks
export function useBillPayments(params?: PaginationParams) {
  return useApiQuery(['bill-payments', JSON.stringify(params || {})], () => apiService.getBillPayments(params));
}

export function useBillPayment(id: number) {
  return useApiQuery(['bill-payments', id.toString()], () => apiService.getBillPaymentById(id), {
    enabled: !!id,
  });
}

export function useCreateBillPayment() {
  return useApiMutation(
    (data: any) => apiService.createBillPayment(data),
    { invalidateQueries: [['bill-payments'], ['bills'], ['chart-accounts']] }
  );
}

export function useUpdateBillPayment() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateBillPayment(id, data),
    { invalidateQueries: [['bill-payments'], ['bills'], ['chart-accounts']] }
  );
}

export function useDeleteBillPayment() {
  return useApiMutation(
    (id: number) => apiService.deleteBillPayment(id),
    { invalidateQueries: [['bill-payments'], ['bills'], ['chart-accounts']] }
  );
}

// Customer Payments hooks
export function useCustomerPayments(params?: PaginationParams) {
  return useApiQuery(['customer-payments', JSON.stringify(params || {})], () => apiService.getCustomerPayments(params));
}

export function useCustomerPayment(id: number) {
  return useApiQuery(['customer-payments', id.toString()], () => apiService.getCustomerPaymentById(id), {
    enabled: !!id,
  });
}

export function useCreateCustomerPayment() {
  return useApiMutation(
    (data: any) => apiService.createCustomerPayment(data),
    { invalidateQueries: [['customer-payments'], ['invoices'], ['chart-accounts']] }
  );
}

export function useUpdateCustomerPayment() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateCustomerPayment(id, data),
    { invalidateQueries: [['customer-payments'], ['invoices'], ['chart-accounts']] }
  );
}

export function useDeleteCustomerPayment() {
  return useApiMutation(
    (id: number) => apiService.deleteCustomerPayment(id),
    { invalidateQueries: [['customer-payments'], ['invoices'], ['chart-accounts']] }
  );
}

// Deposits hooks
export function useDeposits(params?: PaginationParams) {
  return useApiQuery(['deposits', JSON.stringify(params || {})], () => apiService.getDeposits(params));
}

export function useDeposit(id: number) {
  return useApiQuery(['deposits', id.toString()], () => apiService.getDepositById(id), {
    enabled: !!id,
  });
}

export function useCreateDeposit() {
  return useApiMutation(
    (data: any) => apiService.createDeposit(data),
    { invalidateQueries: [['deposits'], ['chart-accounts']] }
  );
}

export function useUpdateDeposit() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateDeposit(id, data),
    { invalidateQueries: [['deposits'], ['chart-accounts']] }
  );
}

export function useDeleteDeposit() {
  return useApiMutation(
    (id: number) => apiService.deleteDeposit(id),
    { invalidateQueries: [['deposits'], ['chart-accounts']] }
  );
}

export function useStockingEvents(params?: PaginationParams) {
  return useApiQuery(['stocking-events', JSON.stringify(params || {})], () => apiService.getStockingEvents(params));
}

export function useStockingEvent(id: number) {
  return useApiQuery(['stocking-events', id.toString()], () => apiService.getStockingEventById(id), {
    enabled: !!id,
  });
}

export function useCreateStockingEvent() {
  return useApiMutation(
    (data: any) => apiService.createStockingEvent(data),
    { invalidateQueries: [['stocking-events']] }
  );
}

export function useUpdateStockingEvent() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateStockingEvent(id, data),
    { invalidateQueries: [['stocking-events']] }
  );
}

export function useDeleteStockingEvent() {
  return useApiMutation(
    (id: number) => apiService.deleteStockingEvent(id),
    { invalidateQueries: [['stocking-events']] }
  );
}

export function useStockingEventLines(id: number) {
  return useApiQuery(['stocking-events', id.toString(), 'lines'], () => apiService.getStockingEventLines(id), {
    enabled: !!id,
  });
}

export function useAddStockingEventLine() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.addStockingEventLine(id, data),
    { invalidateQueries: [['stocking-events']] }
  );
}

export function useFeedingEvents(params?: PaginationParams) {
  return useApiQuery(['feeding-events', JSON.stringify(params || {})], () => apiService.getFeedingEvents(params));
}

export function useFeedingEvent(id: number) {
  return useApiQuery(['feeding-events', id.toString()], () => apiService.getFeedingEventById(id), {
    enabled: !!id,
  });
}

export function useCreateFeedingEvent() {
  return useApiMutation(
    (data: any) => apiService.createFeedingEvent(data),
    { invalidateQueries: [['feeding-events']] }
  );
}

export function useUpdateFeedingEvent() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateFeedingEvent(id, data),
    { invalidateQueries: [['feeding-events']] }
  );
}

export function useDeleteFeedingEvent() {
  return useApiMutation(
    (id: number) => apiService.deleteFeedingEvent(id),
    { invalidateQueries: [['feeding-events']] }
  );
}

export function useMedicineEvents(params?: PaginationParams) {
  return useApiQuery(['medicine-events', JSON.stringify(params || {})], () => apiService.getMedicineEvents(params));
}

export function useMedicineEvent(id: number) {
  return useApiQuery(['medicine-events', id.toString()], () => apiService.getMedicineEventById(id), {
    enabled: !!id,
  });
}

export function useCreateMedicineEvent() {
  return useApiMutation(
    (data: any) => apiService.createMedicineEvent(data),
    { invalidateQueries: [['medicine-events']] }
  );
}

export function useUpdateMedicineEvent() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateMedicineEvent(id, data),
    { invalidateQueries: [['medicine-events']] }
  );
}

export function useDeleteMedicineEvent() {
  return useApiMutation(
    (id: number) => apiService.deleteMedicineEvent(id),
    { invalidateQueries: [['medicine-events']] }
  );
}

export function useOtherPondEvents(params?: PaginationParams) {
  return useApiQuery(['other-pond-events', JSON.stringify(params || {})], () => apiService.getOtherPondEvents(params));
}

export function useOtherPondEvent(id: number) {
  return useApiQuery(['other-pond-events', id.toString()], () => apiService.getOtherPondEventById(id), {
    enabled: !!id,
  });
}

export function useCreateOtherPondEvent() {
  return useApiMutation(
    (data: any) => apiService.createOtherPondEvent(data),
    { invalidateQueries: [['other-pond-events']] }
  );
}

export function useUpdateOtherPondEvent() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateOtherPondEvent(id, data),
    { invalidateQueries: [['other-pond-events']] }
  );
}

export function useDeleteOtherPondEvent() {
  return useApiMutation(
    (id: number) => apiService.deleteOtherPondEvent(id),
    { invalidateQueries: [['other-pond-events']] }
  );
}

export function useEmployees(params?: PaginationParams) {
  return useApiQuery(['employees', JSON.stringify(params || {})], () => apiService.getEmployees(params));
}

export function useEmployee(id: number) {
  return useApiQuery(['employees', id.toString()], () => apiService.getEmployeeById(id), {
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  return useApiMutation(
    (data: any) => apiService.createEmployee(data),
    { invalidateQueries: [['employees']] }
  );
}

export function useUpdateEmployee() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateEmployee(id, data),
    { invalidateQueries: [['employees']] }
  );
}

export function useDeleteEmployee() {
  return useApiMutation(
    (id: number) => apiService.deleteEmployee(id),
    { invalidateQueries: [['employees']] }
  );
}

export function usePayrollRuns(params?: PaginationParams) {
  return useApiQuery(['payroll-runs', JSON.stringify(params || {})], () => apiService.getPayrollRuns(params));
}

export function usePayrollRun(id: number) {
  return useApiQuery(['payroll-runs', id.toString()], () => apiService.getPayrollRunById(id), {
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  return useApiMutation(
    (data: any) => apiService.createPayrollRun(data),
    { invalidateQueries: [['payroll-runs']] }
  );
}

export function useUpdatePayrollRun() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updatePayrollRun(id, data),
    { invalidateQueries: [['payroll-runs']] }
  );
}

export function useDeletePayrollRun() {
  return useApiMutation(
    (id: number) => apiService.deletePayrollRun(id),
    { invalidateQueries: [['payroll-runs']] }
  );
}
