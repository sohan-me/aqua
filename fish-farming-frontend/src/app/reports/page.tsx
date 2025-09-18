'use client';

import { useState } from 'react';
import { 
  usePonds, 
  useExpenses, 
  useIncomes, 
  useHarvests,
  useStocking,
  useFeeds 
} from '@/hooks/useApi';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { downloadCSV, formatCurrencyForCSV, formatDateForCSV, sanitizeFilename } from '@/lib/exportUtils';
import { extractApiData } from '@/lib/utils';
import { Pond, Expense, Income, Harvest, Stocking, Feed } from '@/lib/api';
import { toast } from 'sonner';

interface ReportFilters {
  pondId: string;
  startDate: string;
  endDate: string;
  reportType: 'summary' | 'detail';
}

export default function ReportsPage() {
  const { data: pondsData } = usePonds();
  const { data: expensesData } = useExpenses();
  const { data: incomesData } = useIncomes();
  const { data: harvestsData } = useHarvests();
  const { data: stockingData } = useStocking();
  const { data: feedsData } = useFeeds();

  const ponds = extractApiData<Pond>(pondsData);
  const expenses = extractApiData<Expense>(expensesData);
  const incomes = extractApiData<Income>(incomesData);
  const harvests = extractApiData<Harvest>(harvestsData);
  const stockings = extractApiData<Stocking>(stockingData);
  const feeds = extractApiData<Feed>(feedsData);

  const [filters, setFilters] = useState<ReportFilters>({
    pondId: 'all',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0], // Today
    reportType: 'summary'
  });

  const [showFilters, setShowFilters] = useState(true);

  // Helper function to safely convert to number
  const toNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Filter data based on selected filters
  const filterData = (data: any[], dateField: string = 'date') => {
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      const dateMatch = itemDate >= startDate && itemDate <= endDate;
      const pondMatch = filters.pondId === 'all' || item.pond === parseInt(filters.pondId);
      
      return dateMatch && pondMatch;
    });
  };

  const filteredExpenses = filterData(expenses);
  const filteredIncomes = filterData(incomes);
  const filteredHarvests = filterData(harvests);
  const filteredStockings = filterData(stockings);
  const filteredFeeds = filterData(feeds);

  // Calculate financial metrics
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const totalIncome = filteredIncomes.reduce((sum, income) => sum + toNumber(income.amount), 0);
  const totalHarvestRevenue = filteredHarvests.reduce((sum, harvest) => sum + toNumber(harvest.total_revenue), 0);
  const totalRevenue = totalIncome + totalHarvestRevenue;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Calculate production metrics
  const totalStocked = filteredStockings.reduce((sum, stocking) => sum + toNumber(stocking.pcs), 0);
  const totalHarvested = filteredHarvests.reduce((sum, harvest) => sum + toNumber(harvest.total_weight_kg), 0);
  const totalFeedUsed = filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.amount_kg), 0);
  const fcr = totalHarvested > 0 ? totalFeedUsed / totalHarvested : 0;

  // Calculate feed consumption metrics
  const totalFeedCost = filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.total_cost || 0), 0);
  const avgFeedCostPerKg = filteredFeeds.length > 0 
    ? filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.cost_per_kg || 0), 0) / filteredFeeds.length 
    : 0;
  const avgFeedingRate = filteredFeeds.length > 0 
    ? filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.feeding_rate_percent || 0), 0) / filteredFeeds.length 
    : 0;
  const dailyFeedConsumption = filteredFeeds.length > 0 
    ? filteredFeeds.reduce((sum, feed) => sum + toNumber(feed.consumption_rate_kg_per_day || feed.amount_kg), 0) / filteredFeeds.length 
    : 0;

  // Group expenses by type
  const expensesByType = filteredExpenses.reduce((acc, expense) => {
    const type = expense.expense_type_name || 'Other';
    if (!acc[type]) {
      acc[type] = { amount: 0, count: 0 };
    }
    acc[type].amount += toNumber(expense.amount);
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  // Group incomes by type
  const incomesByType = filteredIncomes.reduce((acc, income) => {
    const type = income.income_type_name || 'Other';
    if (!acc[type]) {
      acc[type] = { amount: 0, count: 0 };
    }
    acc[type].amount += toNumber(income.amount);
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    // Filters are applied automatically via state
    console.log('Generating report with filters:', filters);
  };

  // CSV Export functionality
  const exportToCSV = () => {
    const selectedPond = filters.pondId === 'all' ? 'All Ponds' : ponds.find(p => p.id === parseInt(filters.pondId))?.name || 'Unknown Pond';
    const reportType = filters.reportType === 'summary' ? 'Summary' : 'Detail';
    const filename = `P&L_Report_${selectedPond.replace(/\s+/g, '_')}_${filters.startDate}_to_${filters.endDate}_${reportType}.csv`;

    let csvContent = '';
    
    // Add report header
    csvContent += `Profit & Loss Report\n`;
    csvContent += `Report Type: ${reportType}\n`;
    csvContent += `Pond: ${selectedPond}\n`;
    csvContent += `Date Range: ${formatDateForCSV(filters.startDate)} to ${formatDateForCSV(filters.endDate)}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    if (filters.reportType === 'summary') {
      // Summary CSV
      csvContent += `SUMMARY REPORT\n\n`;
      
      // Financial Summary
      csvContent += `FINANCIAL SUMMARY\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Revenue,${formatCurrencyForCSV(totalRevenue)}\n`;
      csvContent += `Total Expenses,${formatCurrencyForCSV(totalExpenses)}\n`;
      csvContent += `Net Profit/Loss,${formatCurrencyForCSV(netProfit)}\n`;
      csvContent += `Profit Margin,${profitMargin.toFixed(1)}%\n\n`;

      // Feed Consumption Summary
      csvContent += `FEED CONSUMPTION SUMMARY\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Feed Conversion Ratio,${fcr.toFixed(4)}\n`;
      csvContent += `Total Feed Cost,${formatCurrencyForCSV(totalFeedCost)}\n`;
      csvContent += `Average Feed Cost per KG,${formatCurrencyForCSV(avgFeedCostPerKg)}\n`;
      csvContent += `Daily Feed Consumption,${dailyFeedConsumption.toFixed(1)} kg\n`;
      csvContent += `Average Feeding Rate,${avgFeedingRate.toFixed(1)}%\n\n`;

      // Expenses by Type
      csvContent += `EXPENSES BY TYPE\n`;
      csvContent += `Type,Amount,Transaction Count\n`;
      Object.entries(expensesByType).forEach(([type, data]) => {
        const expenseData = data as { amount: number; count: number };
        csvContent += `"${type}",${formatCurrencyForCSV(expenseData.amount)},${expenseData.count}\n`;
      });
      csvContent += `\n`;

      // Income by Type
      csvContent += `INCOME BY TYPE\n`;
      csvContent += `Type,Amount,Transaction Count\n`;
      Object.entries(incomesByType).forEach(([type, data]) => {
        const incomeData = data as { amount: number; count: number };
        csvContent += `"${type}",${formatCurrencyForCSV(incomeData.amount)},${incomeData.count}\n`;
      });
      csvContent += `\n`;

      // Production Metrics
      csvContent += `PRODUCTION METRICS\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Stocked,${totalStocked.toLocaleString()} fish\n`;
      csvContent += `Total Harvested,${totalHarvested.toFixed(1)} kg\n`;
      csvContent += `Total Feed Used,${totalFeedUsed.toFixed(1)} kg\n`;
      csvContent += `Feed Conversion Ratio,${fcr.toFixed(4)}\n`;

    } else {
      // Detail CSV
      csvContent += `DETAILED REPORT\n\n`;

      // Detailed Expenses
      csvContent += `DETAILED EXPENSES\n`;
      csvContent += `Date,Pond,Type,Description,Amount\n`;
      filteredExpenses.forEach(expense => {
        const description = expense.description || 'No description';
        csvContent += `${formatDateForCSV(expense.date)},"${expense.pond_name}","${expense.expense_type_name}","${description}",${formatCurrencyForCSV(toNumber(expense.amount))}\n`;
      });
      csvContent += `\n`;

      // Detailed Income
      csvContent += `DETAILED INCOME\n`;
      csvContent += `Date,Pond,Type,Description,Amount\n`;
      filteredIncomes.forEach(income => {
        const description = income.description || 'No description';
        csvContent += `${formatDateForCSV(income.date)},"${income.pond_name}","${income.income_type_name}","${description}",${formatCurrencyForCSV(toNumber(income.amount))}\n`;
      });
      csvContent += `\n`;

      // Harvest Details
      csvContent += `HARVEST DETAILS\n`;
      csvContent += `Date,Pond,Weight (kg),Count,Avg Weight (g),Price per kg,Total Revenue\n`;
      filteredHarvests.forEach(harvest => {
        csvContent += `${formatDateForCSV(harvest.date)},"${harvest.pond_name}",${toNumber(harvest.total_weight_kg).toFixed(1)},${harvest.total_count || 0},${toNumber(harvest.avg_weight_kg).toFixed(1)},${formatCurrencyForCSV(toNumber(harvest.price_per_kg))},${formatCurrencyForCSV(toNumber(harvest.total_revenue))}\n`;
      });
      csvContent += `\n`;

      // Stocking Details
      csvContent += `STOCKING DETAILS\n`;
      csvContent += `Date,Pond,Species,Pieces,Initial Avg Weight (g),Total Weight (kg)\n`;
      filteredStockings.forEach(stocking => {
        csvContent += `${formatDateForCSV(stocking.date)},"${stocking.pond_name}","${stocking.species_name}",${toNumber(stocking.pcs).toLocaleString()},${toNumber(stocking.initial_avg_g).toFixed(1)},${toNumber(stocking.total_weight_kg).toFixed(1)}\n`;
      });
      csvContent += `\n`;

      // Feed Details
      csvContent += `FEED DETAILS\n`;
      csvContent += `Date,Pond,Feed Type,Amount (kg),Cost per Packet,Total Cost,Biomass (kg),Feeding Rate (%),Feeding Time,Notes\n`;
      filteredFeeds.forEach(feed => {
        const notes = feed.notes || 'No notes';
        csvContent += `${formatDateForCSV(feed.date)},"${feed.pond_name}","${feed.feed_type_name}",${toNumber(feed.amount_kg).toFixed(1)},${formatCurrencyForCSV(toNumber(feed.cost_per_packet))},${formatCurrencyForCSV(toNumber(feed.total_cost))},${toNumber(feed.biomass_at_feeding_kg).toFixed(1)},${toNumber(feed.feeding_rate_percent).toFixed(1)},"${feed.feeding_time}","${notes}"\n`;
      });
    }

    // Download the file using utility function
    const sanitizedFilename = sanitizeFilename(filename);
    downloadCSV(csvContent, sanitizedFilename);
    
    // Show success message
    toast.success(`CSV report exported successfully: ${sanitizedFilename}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="md:flex space-y-3 md:space-y-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analysis</h1>
          <p className="text-gray-600">Comprehensive analysis of your fish farming operations</p>
          <div className="mt-2 flex space-x-4">
            <a 
              href="/reports/fcr" 
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              📊 FCR Analysis
            </a>
            <a 
              href="/reports/biomass" 
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              🐟 Biomass Analysis
            </a>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
          
          <button 
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Report Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pond Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pond Selection
              </label>
              <select
                value={filters.pondId}
                onChange={(e) => handleFilterChange('pondId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Ponds</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={filters.reportType}
                onChange={(e) => handleFilterChange('reportType', e.target.value as 'summary' | 'detail')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="summary">Summary</option>
                <option value="detail">Detail</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Generate Report
            </button>
          </div>
        </div>
      )}

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-green-600">Income + Harvest</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalExpenses)}</p>
              <p className="text-sm text-red-600">Operational costs</p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit/Loss</p>
              <p className={`text-2xl font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className={`text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? 'Profit' : 'Loss'}
              </p>
            </div>
            <div className={`rounded-full p-3 ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className={`text-2xl font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Return on revenue</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Feed Consumption Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Feed Conversion Ratio</p>
              <p className="text-2xl font-semibold text-gray-900">{fcr.toFixed(4)}</p>
              <p className="text-sm text-blue-600">kg feed/kg fish</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Feed Cost</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalFeedCost)}</p>
              <p className="text-sm text-orange-600">Feed expenses</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Feed Cost per KG</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(avgFeedCostPerKg)}</p>
              <p className="text-sm text-purple-600">Per kg</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Feed Consumption</p>
              <p className="text-2xl font-semibold text-gray-900">{dailyFeedConsumption.toFixed(1)} kg</p>
              <p className="text-sm text-green-600">Avg daily usage</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {filters.reportType === 'summary' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses by Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Type</h3>
            <div className="space-y-3">
              {Object.entries(expensesByType).map(([type, data]) => (
                <div key={type} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{type}</p>
                    <p className="text-xs text-gray-500">{(data as { count: number }).count} transactions</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency((data as { amount: number }).amount)}
                  </span>
                </div>
              ))}
              {Object.keys(expensesByType).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No expenses found for the selected period</p>
              )}
            </div>
          </div>

          {/* Income by Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Income by Type</h3>
            <div className="space-y-3">
              {Object.entries(incomesByType).map(([type, data]) => (
                <div key={type} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{type}</p>
                    <p className="text-xs text-gray-500">{(data as { count: number }).count} transactions</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency((data as { amount: number }).amount)}
                  </span>
                </div>
              ))}
              {Object.keys(incomesByType).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No income found for the selected period</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Detailed Expenses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Expenses</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pond
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.pond_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.expense_type_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        {formatCurrency(toNumber(expense.amount))}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No expenses found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Income */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Income</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pond
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIncomes.map((income) => (
                    <tr key={income.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(income.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {income.pond_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {income.income_type_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {income.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(toNumber(income.amount))}
                      </td>
                    </tr>
                  ))}
                  {filteredIncomes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No income found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Production Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Stocked</p>
                <p className="text-2xl font-semibold text-gray-900">{totalStocked.toLocaleString()}</p>
                <p className="text-xs text-gray-500">fish</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Harvested</p>
                <p className="text-2xl font-semibold text-gray-900">{totalHarvested.toFixed(1)}</p>
                <p className="text-xs text-gray-500">kg</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Feed Conversion Ratio</p>
                <p className="text-2xl font-semibold text-gray-900">{fcr.toFixed(4)}</p>
                <p className="text-xs text-gray-500">kg feed/kg fish</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
