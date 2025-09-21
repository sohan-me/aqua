'use client';

import { useState, useMemo } from 'react';
import { useIncomes, usePonds, useDeleteIncome, useIncomeTypes } from '@/hooks/useApi';
import { Income, Pond, IncomeType } from '@/lib/api';
import { formatDate, extractApiData } from '@/lib/utils';
import { Plus, Edit, Trash2, Eye, TrendingUp, Receipt, Users, Filter, X, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function IncomePage() {
  const { data: incomesData, isLoading } = useIncomes();
  const { data: pondsData } = usePonds();
  const { data: incomeTypesData } = useIncomeTypes();
  const deleteIncome = useDeleteIncome();
  
  const incomes = extractApiData<Income>(incomesData);
  const ponds = extractApiData<Pond>(pondsData);
  const incomeTypes = extractApiData<IncomeType>(incomeTypesData);

  // Date range, pond, and income type filtering state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filterPond, setFilterPond] = useState('');
  const [filterIncomeType, setFilterIncomeType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter incomes based on date range, pond, and income type
  const filteredIncomes = useMemo(() => {
    return incomes.filter(income => {
      // Date range filtering
      const incomeDate = new Date(income.date);
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

      let dateMatch = true;
      if (startDate && endDate) {
        dateMatch = incomeDate >= startDate && incomeDate <= endDate;
      } else if (startDate) {
        dateMatch = incomeDate >= startDate;
      } else if (endDate) {
        dateMatch = incomeDate <= endDate;
      }

      // Pond filtering
      const pondMatch = !filterPond || income.pond === parseInt(filterPond);

      // Income type filtering
      const incomeTypeMatch = !filterIncomeType || income.income_type === parseInt(filterIncomeType);

      return dateMatch && pondMatch && incomeTypeMatch;
    });
  }, [incomes, dateRange, filterPond, filterIncomeType]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const totalAmount = filteredIncomes.reduce((sum, income) => sum + parseFloat(income.amount || '0'), 0);
    const thisMonthAmount = filteredIncomes
      .filter(income => {
        const incomeDate = new Date(income.date);
        const now = new Date();
        return incomeDate.getMonth() === now.getMonth() && 
               incomeDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, income) => sum + parseFloat(income.amount || '0'), 0);
    
    return { totalAmount, thisMonthAmount };
  }, [filteredIncomes]);

  const handleDelete = async (id: number, incomeType: string, amount: string, date: string) => {
    if (window.confirm(`Are you sure you want to delete the income record for ${incomeType} (৳${parseFloat(amount).toFixed(4)}) on ${formatDate(date)}? This action cannot be undone.`)) {
      try {
        await deleteIncome.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete income record');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:flex space-y-3 md:space-y-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Income Management</h1>
          <p className="text-gray-600">Track and manage farm income</p>
        </div>
        <div className="flex space-x-3">
          <Link
            style={{color: "white"}}
            href="/income-types"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Manage Income Types
          </Link>
          <Link
            style={{color: "white"}}
            href="/income/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Link>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Filter Income</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Pond
              </label>
              <select
                value={filterPond}
                onChange={(e) => setFilterPond(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">All Ponds</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.name} ({pond.area_decimal} decimal)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Income Type
              </label>
              <select
                value={filterIncomeType}
                onChange={(e) => setFilterIncomeType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">All Income Types</option>
                {incomeTypes.map((incomeType) => (
                  <option key={incomeType.id} value={incomeType.id}>
                    {incomeType.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateRange({ startDate: '', endDate: '' });
                  setFilterPond('');
                  setFilterIncomeType('');
                }}
                className="w-full inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {(dateRange.startDate || dateRange.endDate || filterPond || filterIncomeType) && (
          <div className="mt-4 p-3 bg-green-50 rounded-md">
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-green-400 mr-2" />
              <span className="text-sm text-green-700">
                Showing income{' '}
                {dateRange.startDate || dateRange.endDate ? (
                  <>
                    from{' '}
                    {dateRange.startDate ? formatDate(dateRange.startDate) : 'beginning'} to{' '}
                    {dateRange.endDate ? formatDate(dateRange.endDate) : 'now'}
                  </>
                ) : null}
                {(dateRange.startDate || dateRange.endDate) && (filterPond || filterIncomeType) ? ' and ' : ''}
                {filterPond && `for Pond: ${ponds.find(p => p.id === parseInt(filterPond))?.name || 'Unknown'}`}
                {filterPond && filterIncomeType ? ' and ' : ''}
                {filterIncomeType && `for Income Type: ${incomeTypes.find(it => it.id === parseInt(filterIncomeType))?.name || 'Unknown'}`}
                {' '}({filteredIncomes.length} records)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Income</h3>
              <p className="text-3xl font-bold text-green-600">{filteredIncomes.length}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Amount</h3>
              <p className="text-3xl font-bold text-green-600">
                ৳{filteredTotals.totalAmount.toFixed(4)}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
              <p className="text-3xl font-bold text-blue-600">
                ৳{filteredTotals.thisMonthAmount.toFixed(4)}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
              <p className="text-3xl font-bold text-purple-600">
                {new Set(filteredIncomes.filter(i => i.customer).map(i => i.customer)).size}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Income List */}
      {filteredIncomes.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No income records</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first income.</p>
          <div className="mt-6">
            <Link
              href="/income/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Income
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pond
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncomes.map((income) => (
                  <tr key={income.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(income.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {income.income_type_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {income.pond_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ৳{parseFloat(income.amount).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {income.quantity ? `${parseFloat(income.quantity).toFixed(4)} ${income.unit}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {income.customer || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/income/${income.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/income/${income.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(income.id, income.income_type_name, income.amount, income.date)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                          disabled={deleteIncome.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}