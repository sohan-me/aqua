'use client';

import { formatDateTime, extractApiData } from '@/lib/utils';
import { AlertTriangle, DollarSign, Fish, Calendar } from 'lucide-react';
import { useAlerts, useExpenses, useIncomes, useStocking, useHarvests, useDailyLogs } from '@/hooks/useApi';
import { Alert, Expense, Income, Stocking, Harvest, DailyLog } from '@/lib/api';

interface ActivityItem {
  id: string;
  type: 'alert' | 'expense' | 'income' | 'stocking' | 'harvest' | 'log';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'alert':
      return AlertTriangle;
    case 'expense':
    case 'income':
      return DollarSign;
    case 'stocking':
    case 'harvest':
      return Fish;
    case 'log':
      return Calendar;
    default:
      return Calendar;
  }
};

const getActivityColor = (type: string, severity?: string) => {
  if (type === 'alert') {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }
  
  switch (type) {
    case 'expense':
      return 'text-red-600 bg-red-50';
    case 'income':
      return 'text-green-600 bg-green-50';
    case 'stocking':
      return 'text-blue-600 bg-blue-50';
    case 'harvest':
      return 'text-purple-600 bg-purple-50';
    case 'log':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export function RecentActivity() {
  const { data: alertsData } = useAlerts();
  const { data: expensesData } = useExpenses();
  const { data: incomesData } = useIncomes();
  const { data: stockingData } = useStocking();
  const { data: harvestsData } = useHarvests();
  const { data: dailyLogsData } = useDailyLogs();

  const alerts = extractApiData<Alert>(alertsData);
  const expenses = extractApiData<Expense>(expensesData);
  const incomes = extractApiData<Income>(incomesData);
  const stockings = extractApiData<Stocking>(stockingData);
  const harvests = extractApiData<Harvest>(harvestsData);
  const dailyLogs = extractApiData<DailyLog>(dailyLogsData);

  // Helper function to safely convert to number
  const toNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Create activity items from real data
  const activityItems: ActivityItem[] = [
    // Recent alerts
    ...alerts.slice(0, 2).map(alert => ({
      id: `alert-${alert.id}`,
      type: 'alert' as const,
      title: `${alert.alert_type} Alert`,
      description: `${alert.pond_name} - ${alert.message}`,
      timestamp: alert.created_at,
      severity: alert.severity as 'low' | 'medium' | 'high' | 'critical'
    })),
    // Recent expenses
    ...expenses.slice(0, 2).map(expense => ({
      id: `expense-${expense.id}`,
      type: 'expense' as const,
      title: 'Expense Recorded',
      description: `${expense.pond_name} - ৳${toNumber(expense.amount).toFixed(4)} for ${expense.expense_type_name}`,
      timestamp: expense.date
    })),
    // Recent incomes
    ...incomes.slice(0, 2).map(income => ({
      id: `income-${income.id}`,
      type: 'income' as const,
      title: 'Income Recorded',
      description: `${income.pond_name} - ৳${toNumber(income.amount).toFixed(4)} from ${income.income_type_name}`,
      timestamp: income.date
    })),
    // Recent harvests
    ...harvests.slice(0, 2).map(harvest => ({
      id: `harvest-${harvest.id}`,
      type: 'harvest' as const,
      title: 'Harvest Completed',
      description: `${harvest.pond_name} - ${toNumber(harvest.total_weight_kg).toFixed(1)} kg for ৳${toNumber(harvest.total_revenue).toFixed(4)}`,
      timestamp: harvest.date
    })),
    // Recent stockings
    ...stockings.slice(0, 2).map(stocking => ({
      id: `stocking-${stocking.stocking_id}`,
      type: 'stocking' as const,
      title: 'Fish Stocked',
      description: `${stocking.pond_name} - ${toNumber(stocking.pcs).toLocaleString()} ${stocking.species_name}`,
      timestamp: stocking.date
    })),
    // Recent daily logs
    ...dailyLogs.slice(0, 2).map(log => ({
      id: `log-${log.id}`,
      type: 'log' as const,
      title: 'Daily Log Entry',
      description: `${log.pond_name} - Water quality check completed`,
      timestamp: log.date
    }))
  ];

  // Sort by timestamp (most recent first) and take first 8
  const sortedActivities = activityItems
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {sortedActivities.length > 0 ? (
          sortedActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type, activity.severity);
            
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`rounded-full p-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(activity.timestamp)}</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No recent activity found</p>
        )}
      </div>
    </div>
  );
}
