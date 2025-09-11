import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';

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
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
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
export function usePonds() {
  return useApiQuery(['ponds'], () => apiService.getPonds());
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

export function useSpecies() {
  return useApiQuery(['species'], () => apiService.getSpecies());
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

export function useStocking() {
  return useApiQuery(['stocking'], () => apiService.getStocking());
}

export function useExpenses() {
  return useApiQuery(['expenses'], () => apiService.getExpenses());
}

export function useIncomes() {
  return useApiQuery(['incomes'], () => apiService.getIncomes());
}

export function useExpenseTypes() {
  return useApiQuery(['expense-types'], () => apiService.getExpenseTypes());
}

export function useExpenseTypeById(id: number) {
  return useApiQuery(
    ['expense-types', id.toString()],
    () => apiService.getExpenseTypeById(id),
    { enabled: !!id }
  );
}

export function useCreateExpenseType() {
  return useApiMutation(
    (data: any) => apiService.createExpenseType(data),
    {
      onSuccess: () => {
        toast.success('Expense type created successfully');
      },
      invalidateQueries: [['expense-types']],
    }
  );
}

export function useUpdateExpenseType() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateExpenseType(id, data),
    {
      onSuccess: () => {
        toast.success('Expense type updated successfully');
      },
      invalidateQueries: [['expense-types']],
    }
  );
}

export function useDeleteExpenseType() {
  return useApiMutation(
    (id: number) => apiService.deleteExpenseType(id),
    {
      onSuccess: () => {
        toast.success('Expense type deleted successfully');
      },
      invalidateQueries: [['expense-types']],
    }
  );
}

export function useIncomeTypes() {
  return useApiQuery(['income-types'], () => apiService.getIncomeTypes());
}

export function useIncomeTypeById(id: number) {
  return useApiQuery(
    ['income-types', id.toString()],
    () => apiService.getIncomeTypeById(id),
    { enabled: !!id }
  );
}

export function useCreateIncomeType() {
  return useApiMutation(
    (data: any) => apiService.createIncomeType(data),
    {
      onSuccess: () => {
        toast.success('Income type created successfully');
      },
      invalidateQueries: [['income-types']],
    }
  );
}

export function useUpdateIncomeType() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateIncomeType(id, data),
    {
      onSuccess: () => {
        toast.success('Income type updated successfully');
      },
      invalidateQueries: [['income-types']],
    }
  );
}

export function useDeleteIncomeType() {
  return useApiMutation(
    (id: number) => apiService.deleteIncomeType(id),
    {
      onSuccess: () => {
        toast.success('Income type deleted successfully');
      },
      invalidateQueries: [['income-types']],
    }
  );
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
export function useDailyLogs() {
  return useApiQuery(['daily-logs'], () => apiService.getDailyLogs());
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

// Sample Types
export function useSampleTypes() {
  return useApiQuery(['sample-types'], () => apiService.getSampleTypes());
}

export function useSampleTypeById(id: number) {
  return useApiQuery(
    ['sample-types', id.toString()],
    () => apiService.getSampleTypeById(id),
    { enabled: !!id }
  );
}

export function useCreateSampleType() {
  return useApiMutation(
    (data: any) => apiService.createSampleType(data),
    {
      onSuccess: () => {
        toast.success('Sample type created successfully');
      },
      invalidateQueries: [['sample-types']],
    }
  );
}

export function useUpdateSampleType() {
  return useApiMutation(
    ({ id, data }: { id: number; data: any }) => apiService.updateSampleType(id, data),
    {
      onSuccess: () => {
        toast.success('Sample type updated successfully');
      },
      invalidateQueries: [['sample-types']],
    }
  );
}

export function useDeleteSampleType() {
  return useApiMutation(
    (id: number) => apiService.deleteSampleType(id),
    {
      onSuccess: () => {
        toast.success('Sample type deleted successfully');
      },
      invalidateQueries: [['sample-types']],
    }
  );
}

// Water Quality Sampling
export function useSamplings() {
  return useApiQuery(['sampling'], () => apiService.getSamplings());
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
export function useMortalities() {
  return useApiQuery(['mortality'], () => apiService.getMortalities());
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
export function useFeeds() {
  return useApiQuery(['feeds'], () => apiService.getFeeds());
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
export function useHarvests() {
  return useApiQuery(['harvests'], () => apiService.getHarvests());
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
export function useFishSampling() {
  return useApiQuery(['fish-sampling'], () => apiService.getFishSampling());
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
export function useFeedingAdvice() {
  return useApiQuery(['feeding-advice'], () => apiService.getFeedingAdvice());
}

export function useFeedingAdviceById(id: number) {
  return useApiQuery(
    ['feeding-advice', id.toString()],
    () => apiService.getFeedingAdviceById(id),
    { enabled: !!id }
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
