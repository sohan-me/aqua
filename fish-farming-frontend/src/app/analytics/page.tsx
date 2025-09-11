'use client';

import { useState } from 'react';
import { 
  usePonds, 
  useStocking, 
  useDailyLogs, 
  useSamplings, 
  useFeeds, 
  useHarvests, 
  useExpenses, 
  useIncomes,
  useAlerts 
} from '@/hooks/useApi';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Fish, 
  Droplets, 
  AlertTriangle,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { downloadCSV, formatCurrencyForCSV, formatDateForCSV, sanitizeFilename } from '@/lib/exportUtils';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const { data: pondsData } = usePonds();
  const { data: stockingData } = useStocking();
  const { data: dailyLogsData } = useDailyLogs();
  const { data: samplingsData } = useSamplings();
  const { data: feedsData } = useFeeds();
  const { data: harvestsData } = useHarvests();
  const { data: expensesData } = useExpenses();
  const { data: incomesData } = useIncomes();
  const { data: alertsData } = useAlerts();

  const [timeRange, setTimeRange] = useState('30d');
  const [selectedPond, setSelectedPond] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const allPonds = pondsData?.data || [];
  const allStockings = stockingData?.data || [];
  const allDailyLogs = dailyLogsData?.data || [];
  const allSamplings = samplingsData?.data || [];
  const allFeeds = feedsData?.data || [];
  const allHarvests = harvestsData?.data || [];
  const allExpenses = expensesData?.data || [];
  const allIncomes = incomesData?.data || [];
  const allAlerts = alertsData?.data || [];

  // Filter data based on selected pond
  const ponds = allPonds;
  const stockings = selectedPond === 'all' 
    ? allStockings 
    : allStockings.filter(stocking => stocking.pond === parseInt(selectedPond));
  const dailyLogs = selectedPond === 'all' 
    ? allDailyLogs 
    : allDailyLogs.filter(log => log.pond === parseInt(selectedPond));
  const samplings = selectedPond === 'all' 
    ? allSamplings 
    : allSamplings.filter(sampling => sampling.pond === parseInt(selectedPond));
  const feeds = selectedPond === 'all' 
    ? allFeeds 
    : allFeeds.filter(feed => feed.pond === parseInt(selectedPond));
  const harvests = selectedPond === 'all' 
    ? allHarvests 
    : allHarvests.filter(harvest => harvest.pond === parseInt(selectedPond));
  const expenses = selectedPond === 'all' 
    ? allExpenses 
    : allExpenses.filter(expense => expense.pond === parseInt(selectedPond));
  const incomes = selectedPond === 'all' 
    ? allIncomes 
    : allIncomes.filter(income => income.pond === parseInt(selectedPond));
  const alerts = selectedPond === 'all' 
    ? allAlerts 
    : allAlerts.filter(alert => alert.pond === parseInt(selectedPond));

  // Date filtering function
  const filterByDateRange = (data: any[], dateField: string = 'date') => {
    if (!dateRange.startDate && !dateRange.endDate) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
      
      if (startDate && endDate) {
        return itemDate >= startDate && itemDate <= endDate;
      } else if (startDate) {
        return itemDate >= startDate;
      } else if (endDate) {
        return itemDate <= endDate;
      }
      return true;
    });
  };

  // Apply date filtering to all data
  const filteredStockings = filterByDateRange(stockings);
  const filteredDailyLogs = filterByDateRange(dailyLogs);
  const filteredSamplings = filterByDateRange(samplings);
  const filteredFeeds = filterByDateRange(feeds);
  const filteredHarvests = filterByDateRange(harvests);
  const filteredExpenses = filterByDateRange(expenses);
  const filteredIncomes = filterByDateRange(incomes);
  const filteredAlerts = filterByDateRange(alerts, 'created_at');

  console.log(ponds, filteredStockings, filteredHarvests, filteredExpenses, filteredIncomes, filteredAlerts);

  // Helper function to safely convert to number
  const toNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Calculate KPIs
  const totalPonds = ponds.length;
  const activePonds = ponds.filter(pond => pond.is_active).length;
  const totalStocked = filteredStockings.reduce((sum, stocking) => sum + toNumber(stocking.pcs), 0);
  const totalHarvested = filteredHarvests.reduce((sum, harvest) => sum + toNumber(harvest.total_weight_kg), 0);
  const totalRevenue = filteredHarvests.reduce((sum, harvest) => sum + toNumber(harvest.total_revenue), 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const totalIncome = filteredIncomes.reduce((sum, income) => sum + toNumber(income.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  const activeAlerts = filteredAlerts.filter(alert => !alert.is_resolved).length;

  // Calculate averages
  const avgWaterTemp = filteredSamplings.length > 0 
    ? filteredSamplings.reduce((sum, s) => sum + toNumber(s.temperature_c), 0) / filteredSamplings.length 
    : 0;
  const avgDO = filteredSamplings.length > 0 
    ? filteredSamplings.reduce((sum, s) => sum + toNumber(s.dissolved_oxygen), 0) / filteredSamplings.length 
    : 0;
  const avgPH = filteredSamplings.length > 0 
    ? filteredSamplings.reduce((sum, s) => sum + toNumber(s.ph), 0) / filteredSamplings.length 
    : 0;

  // Calculate FCR (Feed Conversion Ratio)
  const totalFeedUsed = filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.amount_kg), 0);
  const fcr = totalHarvested > 0 ? totalFeedUsed / totalHarvested : 0;

  // Calculate feed consumption metrics
  const totalFeedCost = filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.total_cost || 0), 0);
  const avgFeedCostPerPacket = filteredFeeds.length > 0 
    ? filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.cost_per_packet || 0), 0) / filteredFeeds.length 
    : 0;
  const avgFeedingRate = filteredFeeds.length > 0 
    ? filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.feeding_rate_percent || 0), 0) / filteredFeeds.length 
    : 0;
  const dailyFeedConsumption = filteredFeeds.length > 0 
    ? filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.consumption_rate_kg_per_day || feed.amount_kg), 0) / filteredFeeds.length 
    : 0;

  // Calculate survival rate (mortality data not available in current API)
  // TODO: Add mortality API endpoint to calculate accurate survival rate
  const survivalRate = 0; // Placeholder until mortality data is available

  const kpiCards = [
    {
      title: 'Total Ponds',
      value: totalPonds,
      change: `${activePonds} active`,
      icon: Fish,
      color: 'blue',
      trend: 'neutral'
    },
    {
      title: 'Total Stocked',
      value: totalStocked.toLocaleString(),
      change: 'fish stocked',
      icon: Fish,
      color: 'green',
      trend: 'up'
    },
    {
      title: 'Total Harvested',
      value: `${totalHarvested.toFixed(1)} kg`,
      change: 'total weight',
      icon: TrendingUp,
      color: 'green',
      trend: 'up'
    },
    {
      title: 'Total Revenue',
      value: `৳${totalRevenue.toLocaleString()}`,
      change: 'from harvests',
      icon: DollarSign,
      color: 'green',
      trend: 'up'
    },
    {
      title: 'Total Expenses',
      value: `৳${totalExpenses.toLocaleString()}`,
      change: 'operational costs',
      icon: TrendingDown,
      color: 'red',
      trend: 'down'
    },
    {
      title: 'Net Profit',
      value: `৳${netProfit.toLocaleString()}`,
      change: netProfit >= 0 ? 'profit' : 'loss',
      icon: DollarSign,
      color: netProfit >= 0 ? 'green' : 'red',
      trend: netProfit >= 0 ? 'up' : 'down'
    },
    {
      title: 'Feed Conversion Ratio',
      value: fcr.toFixed(2),
      change: 'kg feed/kg fish',
      icon: BarChart3,
      color: fcr <= 2.0 ? 'green' : fcr <= 2.5 ? 'yellow' : 'red',
      trend: fcr <= 2.0 ? 'up' : 'down'
    },
    {
      title: 'Survival Rate',
      value: `${survivalRate.toFixed(1)}%`,
      change: 'fish survival',
      icon: Fish,
      color: survivalRate >= 80 ? 'green' : survivalRate >= 60 ? 'yellow' : 'red',
      trend: survivalRate >= 80 ? 'up' : 'down'
    },
    {
      title: 'Total Feed Cost',
      value: `৳${totalFeedCost.toLocaleString()}`,
      change: 'feed expenses',
      icon: DollarSign,
      color: 'orange',
      trend: 'neutral'
    },
    {
      title: 'Avg Feed Cost/Packet',
      value: `৳${avgFeedCostPerPacket.toFixed(2)}`,
      change: 'per packet (25kg)',
      icon: BarChart3,
      color: avgFeedCostPerPacket <= 1000 ? 'green' : avgFeedCostPerPacket <= 1500 ? 'yellow' : 'red',
      trend: avgFeedCostPerPacket <= 1000 ? 'up' : 'down'
    },
    {
      title: 'Daily Feed Consumption',
      value: `${dailyFeedConsumption.toFixed(1)} kg`,
      change: 'avg daily usage',
      icon: TrendingUp,
      color: 'blue',
      trend: 'neutral'
    },
    {
      title: 'Avg Feeding Rate',
      value: `${avgFeedingRate.toFixed(1)}%`,
      change: 'of biomass',
      icon: BarChart3,
      color: avgFeedingRate >= 2 && avgFeedingRate <= 4 ? 'green' : avgFeedingRate < 2 ? 'yellow' : 'red',
      trend: avgFeedingRate >= 2 && avgFeedingRate <= 4 ? 'up' : 'down'
    }
  ];

  const waterQualityCards = [
    {
      title: 'Avg Water Temperature',
      value: `${avgWaterTemp.toFixed(1)}°C`,
      status: avgWaterTemp >= 26 && avgWaterTemp <= 32 ? 'optimal' : 'warning',
      icon: Droplets,
      color: avgWaterTemp >= 26 && avgWaterTemp <= 32 ? 'green' : 'yellow'
    },
    {
      title: 'Avg Dissolved Oxygen',
      value: `${avgDO.toFixed(1)} mg/L`,
      status: avgDO >= 5 ? 'optimal' : avgDO >= 3 ? 'warning' : 'critical',
      icon: Droplets,
      color: avgDO >= 5 ? 'green' : avgDO >= 3 ? 'yellow' : 'red'
    },
    {
      title: 'Avg pH Level',
      value: avgPH.toFixed(1),
      status: avgPH >= 6.5 && avgPH <= 8.5 ? 'optimal' : 'warning',
      icon: Droplets,
      color: avgPH >= 6.5 && avgPH <= 8.5 ? 'green' : 'yellow'
    },
    {
      title: 'Active Alerts',
      value: activeAlerts,
      status: activeAlerts === 0 ? 'optimal' : activeAlerts <= 3 ? 'warning' : 'critical',
      icon: AlertTriangle,
      color: activeAlerts === 0 ? 'green' : activeAlerts <= 3 ? 'yellow' : 'red'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      yellow: 'bg-yellow-100 text-yellow-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  // CSV Export functionality for Analytics
  const exportAnalyticsToCSV = () => {
    const pondName = selectedPond === 'all' ? 'All Ponds' : ponds.find(p => p.id === parseInt(selectedPond))?.name || 'Selected Pond';
    const filename = `Analytics_${pondName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    
    let csvContent = '';
    
    // Add report header
    csvContent += `Analytics Dashboard Report\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Filter: ${pondName}\n\n`;

    // KPI Summary
    csvContent += `KEY PERFORMANCE INDICATORS\n`;
    csvContent += `Metric,Value,Status\n`;
    csvContent += `Total Ponds,${totalPonds},${activePonds} active\n`;
    csvContent += `Total Stocked,${totalStocked.toLocaleString()},fish\n`;
    csvContent += `Total Harvested,${totalHarvested.toFixed(1)},kg\n`;
    csvContent += `Total Revenue,${formatCurrencyForCSV(totalRevenue)},from harvests\n`;
    csvContent += `Total Expenses,${formatCurrencyForCSV(totalExpenses)},operational costs\n`;
    csvContent += `Net Profit,${formatCurrencyForCSV(netProfit)},${netProfit >= 0 ? 'profit' : 'loss'}\n`;
    csvContent += `Feed Conversion Ratio,${fcr.toFixed(2)},kg feed/kg fish\n`;
    csvContent += `Survival Rate,${survivalRate.toFixed(1)}%,fish survival\n\n`;

    // Water Quality Summary
    csvContent += `WATER QUALITY METRICS\n`;
    csvContent += `Metric,Value,Status\n`;
    csvContent += `Avg Water Temperature,${avgWaterTemp.toFixed(1)}°C,${avgWaterTemp >= 26 && avgWaterTemp <= 32 ? 'optimal' : 'warning'}\n`;
    csvContent += `Avg Dissolved Oxygen,${avgDO.toFixed(1)} mg/L,${avgDO >= 5 ? 'optimal' : avgDO >= 3 ? 'warning' : 'critical'}\n`;
    csvContent += `Avg pH Level,${avgPH.toFixed(1)},${avgPH >= 6.5 && avgPH <= 8.5 ? 'optimal' : 'warning'}\n`;
    csvContent += `Active Alerts,${activeAlerts},${activeAlerts === 0 ? 'optimal' : activeAlerts <= 3 ? 'warning' : 'critical'}\n\n`;

    // Recent Harvests
    csvContent += `RECENT HARVESTS\n`;
    csvContent += `Date,Pond,Weight (kg),Revenue\n`;
    harvests.slice(0, 10).forEach(harvest => {
      csvContent += `${formatDateForCSV(harvest.date)},"${harvest.pond_name}",${toNumber(harvest.total_weight_kg).toFixed(1)},${formatCurrencyForCSV(toNumber(harvest.total_revenue))}\n`;
    });
    csvContent += `\n`;

    // Recent Alerts
    csvContent += `RECENT ALERTS\n`;
    csvContent += `Date,Pond,Type,Severity,Message\n`;
    alerts.slice(0, 10).forEach(alert => {
      csvContent += `${formatDateForCSV(alert.created_at)},"${alert.pond_name}","${alert.alert_type}","${alert.severity}","${alert.message}"\n`;
    });

    // Download the file
    const sanitizedFilename = sanitizeFilename(filename);
    downloadCSV(csvContent, sanitizedFilename);
    
    // Show success message
    toast.success(`Analytics CSV exported successfully: ${sanitizedFilename}`);
  };

  return (
    <div className="space-y-6">
      <div className="md:flex space-y-3 md:space-y-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">
            {selectedPond === 'all' 
              ? 'Comprehensive insights into your fish farming operations' 
              : `Analytics for ${ponds.find(p => p.id === parseInt(selectedPond))?.name || 'Selected Pond'}`
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-5">
          <div className="flex items-center space-x-2 w-full">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border w-full border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2 w-full">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="border w-full border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Start Date"
            />
          </div>
          
          <div className="flex items-center space-x-2 w-full">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="border w-full border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="End Date"
            />
          </div>
          
          <div className="flex items-center space-x-2  w-full">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPond}
              onChange={(e) => setSelectedPond(e.target.value)}
              className={`border w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                selectedPond !== 'all' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300'
              }`}
            >
              <option value="all">All Ponds</option>
              {ponds.map((pond) => (
                <option key={pond.id} value={pond.id}>
                  {pond.name}
                </option>
              ))}
            </select>
            {selectedPond !== 'all' && (
              <button
                onClick={() => setSelectedPond('all')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>

          <button 
            onClick={exportAnalyticsToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{kpi.change}</p>
                </div>
                <div className={`rounded-full p-3 ${getColorClasses(kpi.color)}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              {getTrendIcon(kpi.trend)}
            </div>
          );
        })}
      </div>

      {/* Water Quality Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Water Quality Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {waterQualityCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="text-center">
                <div className={`inline-flex rounded-full p-3 ${getColorClasses(card.color)}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mt-2">{card.title}</h3>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</p>
                <p className={`text-sm mt-1 ${
                  card.status === 'optimal' ? 'text-green-600' :
                  card.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {card.status.toUpperCase()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Income</span>
              <span className="text-green-600 font-semibold">৳{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Expenses</span>
              <span className="text-red-600 font-semibold">৳{totalExpenses.toLocaleString()}</span>
            </div>
            <hr className="border-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-semibold">Net Profit</span>
              <span className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳{netProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Profit Margin</span>
              <span className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Stocked</span>
              <span className="text-gray-900 font-semibold">{totalStocked.toLocaleString()} fish</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Harvested</span>
              <span className="text-gray-900 font-semibold">{totalHarvested.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Survival Rate</span>
              <span className={`font-semibold ${survivalRate >= 80 ? 'text-green-600' : survivalRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {survivalRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Feed Conversion Ratio</span>
              <span className={`font-semibold ${fcr <= 2.0 ? 'text-green-600' : fcr <= 2.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                {fcr.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {harvests.slice(0, 5).map((harvest) => (
            <div key={harvest.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-green-100 p-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Harvest completed</p>
                  <p className="text-xs text-gray-500">{harvest.pond_name} - {toNumber(harvest.total_weight_kg)} kg</p>
                </div>
              </div>
              <span className="text-sm text-green-600 font-semibold">৳{toNumber(harvest.total_revenue)}</span>
            </div>
          ))}
          {alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Alert: {alert.alert_type}</p>
                  <p className="text-xs text-gray-500">{alert.pond_name}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
