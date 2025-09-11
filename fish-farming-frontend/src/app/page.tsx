'use client';

import { usePonds, useAlerts, useExpenses, useIncomes, useHarvests, useStocking, useFeeds, useDailyLogs } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { formatCurrency } from '@/lib/utils';
import { Fish, AlertTriangle, DollarSign, TrendingUp, BarChart3, Droplets, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const { data: pondsData } = usePonds();
  const { data: alertsData } = useAlerts();
  const { data: expensesData } = useExpenses();
  const { data: incomesData } = useIncomes();
  const { data: harvestsData } = useHarvests();
  const { data: stockingData } = useStocking();
  const { data: feedsData } = useFeeds();
  const { data: dailyLogsData } = useDailyLogs();

  const ponds = pondsData?.data || [];
  const alerts = alertsData?.data || [];
  const expenses = expensesData?.data || [];
  const incomes = incomesData?.data || [];
  const harvests = harvestsData?.data || [];
  const stockings = stockingData?.data || [];
  const feeds = feedsData?.data || [];
  const dailyLogs = dailyLogsData?.data || [];

  // Helper function to safely convert to number
  const toNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const activeAlerts = alerts.filter(alert => !alert.is_resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = activeAlerts.filter(alert => alert.severity === 'high');

  // Calculate comprehensive financial metrics
  const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const totalIncome = incomes.reduce((sum, income) => sum + toNumber(income.amount), 0);
  const totalHarvestRevenue = harvests.reduce((sum, harvest) => sum + toNumber(harvest.total_revenue), 0);
  const totalRevenue = totalIncome + totalHarvestRevenue;
  const profitLoss = totalRevenue - totalExpenses;

  // Calculate production metrics
  const totalStocked = stockings.reduce((sum, stocking) => sum + toNumber(stocking.pcs), 0);
  const totalHarvested = harvests.reduce((sum, harvest) => sum + toNumber(harvest.total_weight_kg), 0);
  const totalFeedUsed = feeds.reduce((sum, feed) => sum + toNumber(feed.amount_kg), 0);
  const fcr = totalHarvested > 0 ? totalFeedUsed / totalHarvested : 0;

  // Calculate water quality metrics
  const recentLogs = dailyLogs.slice(0, 10); // Get recent logs for water quality
  const avgWaterTemp = recentLogs.length > 0 
    ? recentLogs.reduce((sum, log) => sum + toNumber(log.water_temp_c), 0) / recentLogs.length 
    : 0;
  const avgPH = recentLogs.length > 0 
    ? recentLogs.reduce((sum, log) => sum + toNumber(log.ph), 0) / recentLogs.length 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your fish farming management system</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Ponds"
          value={ponds.length}
          change={`${ponds.filter(p => p.is_active).length} active`}
          icon={Fish}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Active Alerts"
          value={activeAlerts.length}
          change={`${criticalAlerts.length} critical, ${highAlerts.length} high`}
          changeType={criticalAlerts.length > 0 ? 'negative' : 'neutral'}
          icon={AlertTriangle}
          iconColor={criticalAlerts.length > 0 ? 'text-red-600' : 'text-orange-600'}
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          change={`${formatCurrency(totalIncome)} income + ${formatCurrency(totalHarvestRevenue)} harvest`}
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-green-600"
        />
        <StatsCard
          title="Net Profit/Loss"
          value={formatCurrency(profitLoss)}
          change={profitLoss >= 0 ? 'Positive' : 'Negative'}
          changeType={profitLoss >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
          iconColor={profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* Production & Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Stocked"
          value={totalStocked.toLocaleString()}
          change="fish stocked"
          icon={Fish}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Total Harvested"
          value={`${totalHarvested.toFixed(1)} kg`}
          change="total weight"
          icon={BarChart3}
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Feed Conversion Ratio"
          value={fcr.toFixed(2)}
          change="kg feed/kg fish"
          changeType={fcr <= 2.0 ? 'positive' : fcr <= 2.5 ? 'neutral' : 'negative'}
          icon={BarChart3}
          iconColor={fcr <= 2.0 ? 'text-green-600' : fcr <= 2.5 ? 'text-yellow-600' : 'text-red-600'}
        />
        <StatsCard
          title="Avg Water Temp"
          value={`${avgWaterTemp.toFixed(1)}°C`}
          change={`pH: ${avgPH.toFixed(1)}`}
          changeType={avgWaterTemp >= 26 && avgWaterTemp <= 32 ? 'positive' : 'negative'}
          icon={Droplets}
          iconColor={avgWaterTemp >= 26 && avgWaterTemp <= 32 ? 'text-green-600' : 'text-yellow-600'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Ponds Overview */}
      {ponds.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ponds Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ponds.map((pond) => (
              <div key={pond.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{pond.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pond.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {pond.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Area: {parseFloat(pond.area_decimal).toFixed(3)} decimal</p>
                  <p>Depth: {parseFloat(pond.depth_ft).toFixed(1)} ft</p>
                  <p>Volume: {parseFloat(pond.volume_m3).toFixed(1)} m³</p>
                  {pond.location && <p>Location: {pond.location}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Summary */}
      {activeAlerts.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className={`rounded-full p-2 ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{alert.alert_type}</p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-500">{alert.pond_name}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}