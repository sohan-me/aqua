'use client';

import { useState, useMemo } from 'react';
import { usePonds } from '@/hooks/useApi';
import { useBills } from '@/hooks/useApi';
import { useInvoices } from '@/hooks/useApi';
import { usePayrollRuns } from '@/hooks/useApi';
import { useChartAccounts } from '@/hooks/useApi';
import { useCustomers } from '@/hooks/useApi';
import { useVendors } from '@/hooks/useApi';
import { useItems } from '@/hooks/useApi';
import { useBillPayments } from '@/hooks/useApi';
import { useCustomerPayments } from '@/hooks/useApi';
import { useDeposits } from '@/hooks/useApi';
import { useJournalEntries } from '@/hooks/useApi';
import { formatCurrency } from '@/lib/utils';

interface BalanceSheetFilters {
  date: string;
  pondId: string;
}

export default function BalanceSheetPage() {
  const [filters, setFilters] = useState<BalanceSheetFilters>({
    date: new Date().toISOString().split('T')[0],
    pondId: 'all'
  });

  // Data fetching
  const { data: pondsData } = usePonds();
  const { data: billsData } = useBills();
  const { data: invoicesData } = useInvoices();
  const { data: payrollData } = usePayrollRuns();
  const { data: accountsData } = useChartAccounts();
  const { data: customersData } = useCustomers();
  const { data: vendorsData } = useVendors();
  const { data: itemsData } = useItems();
  const { data: billPaymentsData } = useBillPayments();
  const { data: customerPaymentsData } = useCustomerPayments();
  const { data: depositsData } = useDeposits();
  const { data: journalEntriesData } = useJournalEntries();

  const ponds = pondsData?.data?.results || [];
  const bills = billsData?.data?.results || [];
  const invoices = invoicesData?.data?.results || [];
  const payrollRuns = payrollData?.data?.results || [];
  const accounts = accountsData?.data?.results || [];
  const customers = customersData?.data?.results || [];
  const vendors = vendorsData?.data?.results || [];
  const items = itemsData?.data?.results || [];
  const billPayments = billPaymentsData?.data?.results || [];
  const customerPayments = customerPaymentsData?.data?.results || [];
  const deposits = depositsData?.data?.results || [];
  const journalEntries = journalEntriesData?.data?.results || [];

  // Filter data based on date and pond
  const filterData = (data: any[], dateField: string, pondField?: string) => {
    return data.filter((item: any) => {
      const itemDate = new Date(item[dateField]);
      const filterDate = new Date(filters.date);
      const dateMatch = itemDate <= filterDate;
      
      if (!pondField || filters.pondId === 'all') {
        return dateMatch;
      }
      
      const pondMatch = item[pondField]?.pond_id?.toString() === filters.pondId;
      return dateMatch && pondMatch;
    });
  };

  // Balance Sheet Calculations
  const balanceSheetData = useMemo(() => {
    const filterDate = new Date(filters.date);
    
    // ASSETS
    // Current Assets
    const cashAccount = accounts.find((acc: any) => acc.name === 'Cash');
    const cashBalance = cashAccount ? parseFloat(cashAccount.balance || '0') : 0;
    
    // Accounts Receivable
    const accountsReceivable = filterData(invoices, 'invoice_date')
      .reduce((total, invoice) => total + parseFloat(invoice.open_balance || '0'), 0);
    
    // Inventory (Fish Biomass + Feed/Medicine Stock)
    const fishItems = items.filter((item: any) => item.category === 'fish');
    const feedItems = items.filter((item: any) => item.category === 'feed');
    const medicineItems = items.filter((item: any) => item.category === 'medicine');
    
    const fishInventory = fishItems.reduce((total: number, item: any) => 
      total + (parseFloat(item.current_stock || '0') * parseFloat(item.cost_price || '0')), 0);
    
    const feedInventory = feedItems.reduce((total: number, item: any) => 
      total + (parseFloat(item.current_stock || '0') * parseFloat(item.cost_price || '0')), 0);
    
    const medicineInventory = medicineItems.reduce((total: number, item: any) => 
      total + (parseFloat(item.current_stock || '0') * parseFloat(item.cost_price || '0')), 0);
    
    const totalInventory = fishInventory + feedInventory + medicineInventory;
    
    // Fish Biomass Value (Estimated current value of fish in ponds)
    const fishBiomassValue = filterData(invoices, 'invoice_date')
      .filter(invoice => invoice.lines?.some((line: any) => line.item?.category === 'fish'))
      .reduce((total, invoice) => {
        const fishLines = invoice.lines?.filter((line: any) => line.item?.category === 'fish') || [];
        return total + fishLines.reduce((lineTotal: number, line: any) => 
          lineTotal + (parseFloat(line.total_weight || '0') * parseFloat(line.rate || '0')), 0);
      }, 0);
    
    // Fixed Assets (Equipment)
    const equipmentItems = items.filter((item: any) => item.category === 'equipment');
    const equipmentValue = equipmentItems.reduce((total: number, item: any) => 
      total + (parseFloat(item.current_stock || '0') * parseFloat(item.cost_price || '0')), 0);
    
    // Total Current Assets
    const currentAssets = cashBalance + accountsReceivable + totalInventory + fishBiomassValue;
    const fixedAssets = equipmentValue;
    const totalAssets = currentAssets + fixedAssets;
    
    // LIABILITIES
    // Current Liabilities
    const accountsPayable = filterData(bills, 'bill_date')
      .reduce((total, bill) => total + parseFloat(bill.open_balance || '0'), 0);
    
    // Accrued Payroll
    const accruedPayroll = filterData(payrollRuns, 'pay_date')
      .filter(payroll => payroll.status !== 'paid')
      .reduce((total, payroll) => total + parseFloat(payroll.total_net || '0'), 0);
    
    // Total Current Liabilities
    const currentLiabilities = accountsPayable + accruedPayroll;
    const totalLiabilities = currentLiabilities;
    
    // EQUITY
    // Retained Earnings (Net Profit over time)
    const totalRevenue = filterData(invoices, 'invoice_date')
      .reduce((total, invoice) => total + parseFloat(invoice.total_amount || '0'), 0);
    
    const totalExpenses = filterData(bills, 'bill_date')
      .reduce((total, bill) => total + parseFloat(bill.total_amount || '0'), 0) +
      filterData(payrollRuns, 'pay_date')
      .reduce((total, payroll) => total + parseFloat(payroll.total_net || '0'), 0);
    
    const netProfit = totalRevenue - totalExpenses;
    const retainedEarnings = Math.max(0, netProfit); // Don't show negative retained earnings
    
    // Capital Investment (Starting capital)
    const capitalInvestment = 500000; // Assume starting capital
    const totalEquity = capitalInvestment + retainedEarnings;
    
    return {
      assets: {
        current: {
          cash: cashBalance,
          accountsReceivable,
          inventory: totalInventory,
          fishBiomass: fishBiomassValue,
          total: currentAssets
        },
        fixed: {
          equipment: equipmentValue,
          total: fixedAssets
        },
        total: totalAssets
      },
      liabilities: {
        current: {
          accountsPayable,
          accruedPayroll,
          total: currentLiabilities
        },
        total: totalLiabilities
      },
      equity: {
        capitalInvestment,
        retainedEarnings,
        total: totalEquity
      },
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        balance: totalAssets - (totalLiabilities + totalEquity)
      }
    };
  }, [filters, invoices, bills, payrollRuns, accounts, items, customers, vendors, billPayments, customerPayments, deposits, journalEntries]);

  const handleFilterChange = (key: keyof BalanceSheetFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToCSV = () => {
    const csvData = [
      ['Balance Sheet', `As of ${filters.date}`],
      [''],
      ['ASSETS', ''],
      ['Current Assets', ''],
      ['Cash', formatCurrency(balanceSheetData.assets.current.cash)],
      ['Accounts Receivable', formatCurrency(balanceSheetData.assets.current.accountsReceivable)],
      ['Inventory', formatCurrency(balanceSheetData.assets.current.inventory)],
      ['Fish Biomass', formatCurrency(balanceSheetData.assets.current.fishBiomass)],
      ['Total Current Assets', formatCurrency(balanceSheetData.assets.current.total)],
      [''],
      ['Fixed Assets', ''],
      ['Equipment', formatCurrency(balanceSheetData.assets.fixed.equipment)],
      ['Total Fixed Assets', formatCurrency(balanceSheetData.assets.fixed.total)],
      [''],
      ['TOTAL ASSETS', formatCurrency(balanceSheetData.assets.total)],
      [''],
      ['LIABILITIES', ''],
      ['Current Liabilities', ''],
      ['Accounts Payable', formatCurrency(balanceSheetData.liabilities.current.accountsPayable)],
      ['Accrued Payroll', formatCurrency(balanceSheetData.liabilities.current.accruedPayroll)],
      ['Total Current Liabilities', formatCurrency(balanceSheetData.liabilities.current.total)],
      [''],
      ['TOTAL LIABILITIES', formatCurrency(balanceSheetData.liabilities.total)],
      [''],
      ['EQUITY', ''],
      ['Capital Investment', formatCurrency(balanceSheetData.equity.capitalInvestment)],
      ['Retained Earnings', formatCurrency(balanceSheetData.equity.retainedEarnings)],
      ['Total Equity', formatCurrency(balanceSheetData.equity.total)],
      [''],
      ['TOTAL LIABILITIES & EQUITY', formatCurrency(balanceSheetData.liabilities.total + balanceSheetData.equity.total)],
      [''],
      ['Balance Check', formatCurrency(balanceSheetData.summary.balance)]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${filters.date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-gray-600">Financial position as of a specific date</p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              As of Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pond Filter
            </label>
            <select
              value={filters.pondId}
              onChange={(e) => handleFilterChange('pondId', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Ponds</option>
              {ponds.map((pond: any) => (
                <option key={pond.pond_id} value={pond.pond_id.toString()}>
                  {pond.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Balance Sheet */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Balance Sheet - As of {new Date(filters.date).toLocaleDateString()}
          </h2>
        </div>

        <div className="p-6">
          {/* Assets */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ASSETS</h3>
            
            {/* Current Assets */}
            <div className="ml-4 mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Current Assets</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Cash</span>
                  <span className="font-medium">{formatCurrency(balanceSheetData.assets.current.cash)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Accounts Receivable</span>
                  <span className="font-medium">{formatCurrency(balanceSheetData.assets.current.accountsReceivable)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Inventory</span>
                  <span className="font-medium">{formatCurrency(balanceSheetData.assets.current.inventory)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Fish Biomass (Estimated)</span>
                  <span className="font-medium">{formatCurrency(balanceSheetData.assets.current.fishBiomass)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                  <span className="font-semibold text-gray-900">Total Current Assets</span>
                  <span className="font-bold text-lg">{formatCurrency(balanceSheetData.assets.current.total)}</span>
                </div>
              </div>
            </div>

            {/* Fixed Assets */}
            <div className="ml-4 mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Fixed Assets</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Equipment</span>
                  <span className="font-medium">{formatCurrency(balanceSheetData.assets.fixed.equipment)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                  <span className="font-semibold text-gray-900">Total Fixed Assets</span>
                  <span className="font-bold text-lg">{formatCurrency(balanceSheetData.assets.fixed.total)}</span>
                </div>
              </div>
            </div>

            {/* Total Assets */}
            <div className="flex justify-between items-center py-4 border-t-4 border-blue-500 bg-blue-50 px-4 rounded-lg">
              <span className="text-xl font-bold text-gray-900">TOTAL ASSETS</span>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(balanceSheetData.assets.total)}</span>
            </div>
          </div>

          {/* Liabilities */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">LIABILITIES</h3>
            
            {/* Current Liabilities */}
            <div className="ml-4 mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Current Liabilities</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Accounts Payable</span>
                  <span className="font-medium">{formatCurrency(balanceSheetData.liabilities.current.accountsPayable)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Accrued Payroll</span>
                  <span className="font-medium">{formatCurrency(balanceSheetData.liabilities.current.accruedPayroll)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                  <span className="font-semibold text-gray-900">Total Current Liabilities</span>
                  <span className="font-bold text-lg">{formatCurrency(balanceSheetData.liabilities.current.total)}</span>
                </div>
              </div>
            </div>

            {/* Total Liabilities */}
            <div className="flex justify-between items-center py-4 border-t-4 border-red-500 bg-red-50 px-4 rounded-lg">
              <span className="text-xl font-bold text-gray-900">TOTAL LIABILITIES</span>
              <span className="text-2xl font-bold text-red-600">{formatCurrency(balanceSheetData.liabilities.total)}</span>
            </div>
          </div>

          {/* Equity */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">EQUITY</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Capital Investment</span>
                <span className="font-medium">{formatCurrency(balanceSheetData.equity.capitalInvestment)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Retained Earnings</span>
                <span className="font-medium">{formatCurrency(balanceSheetData.equity.retainedEarnings)}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-t-4 border-green-500 bg-green-50 px-4 rounded-lg">
                <span className="text-xl font-bold text-gray-900">TOTAL EQUITY</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(balanceSheetData.equity.total)}</span>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className="border-t-4 border-gray-400 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Assets</div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(balanceSheetData.summary.totalAssets)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Liabilities & Equity</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrency(balanceSheetData.liabilities.total + balanceSheetData.equity.total)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Balance Check</div>
                <div className={`text-lg font-bold ${balanceSheetData.summary.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(balanceSheetData.summary.balance)}
                </div>
              </div>
            </div>
            {balanceSheetData.summary.balance !== 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  ⚠️ Balance sheet does not balance. This indicates a calculation error or missing data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Ratios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Current Ratio</div>
            <div className="text-2xl font-bold text-blue-600">
              {balanceSheetData.liabilities.current.total > 0 
                ? (balanceSheetData.assets.current.total / balanceSheetData.liabilities.current.total).toFixed(2)
                : 'N/A'
              }
            </div>
            <div className="text-xs text-gray-500">Current Assets / Current Liabilities</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">Debt-to-Equity</div>
            <div className="text-2xl font-bold text-green-600">
              {balanceSheetData.equity.total > 0 
                ? (balanceSheetData.liabilities.total / balanceSheetData.equity.total).toFixed(2)
                : 'N/A'
              }
            </div>
            <div className="text-xs text-gray-500">Total Liabilities / Total Equity</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600">Equity Ratio</div>
            <div className="text-2xl font-bold text-purple-600">
              {balanceSheetData.assets.total > 0 
                ? ((balanceSheetData.equity.total / balanceSheetData.assets.total) * 100).toFixed(1)
                : 'N/A'
              }%
            </div>
            <div className="text-xs text-gray-500">Total Equity / Total Assets</div>
          </div>
        </div>
      </div>
    </div>
  );
}
