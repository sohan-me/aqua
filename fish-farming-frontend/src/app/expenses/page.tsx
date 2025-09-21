'use client';

import { useState, useMemo } from 'react';
import { useExpenses, usePonds, useDeleteExpense, useExpenseTypes } from '@/hooks/useApi';
import { Expense, Pond, ExpenseType } from '@/lib/api';
import { formatDate, extractApiData } from '@/lib/utils';
import { Plus, Edit, Trash2, Eye, TrendingDown, Receipt, Building2, Filter, X, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const { data: expensesData, isLoading } = useExpenses();
  const { data: pondsData } = usePonds();
  const { data: expenseTypesData } = useExpenseTypes();
  const deleteExpense = useDeleteExpense();
  
  const expenses = extractApiData<Expense>(expensesData);
  const ponds = extractApiData<Pond>(pondsData);
  const expenseTypes = extractApiData<ExpenseType>(expenseTypesData);

  // Date range, pond, and expense type filtering state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filterPond, setFilterPond] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter expenses based on date range, pond, and expense type
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Date range filtering
      const expenseDate = new Date(expense.date);
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

      let dateMatch = true;
      if (startDate && endDate) {
        dateMatch = expenseDate >= startDate && expenseDate <= endDate;
      } else if (startDate) {
        dateMatch = expenseDate >= startDate;
      } else if (endDate) {
        dateMatch = expenseDate <= endDate;
      }

      // Pond filtering
      const pondMatch = !filterPond || expense.pond === parseInt(filterPond);

      // Expense type filtering
      const expenseTypeMatch = !filterExpenseType || expense.expense_type === parseInt(filterExpenseType);

      return dateMatch && pondMatch && expenseTypeMatch;
    });
  }, [expenses, dateRange, filterPond, filterExpenseType]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0);
    const thisMonthAmount = filteredExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        const now = new Date();
        return expenseDate.getMonth() === now.getMonth() && 
               expenseDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0);
    
    return { totalAmount, thisMonthAmount };
  }, [filteredExpenses]);

  const handleDelete = async (id: number, expenseType: string, amount: string, date: string) => {
    if (window.confirm(`Are you sure you want to delete the expense record for ${expenseType} (৳${parseFloat(amount).toFixed(4)}) on ${formatDate(date)}? This action cannot be undone.`)) {
      try {
        await deleteExpense.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete expense record');
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
          <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600">Track and manage farm expenses</p>
        </div>
        <div className="md:flex space-x-3 space-y-3 md:space-y-0">
          <Link
            href="/expense-types"
            className="w-full md:w-auto inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Manage Expense Types
          </Link>
          <Link
            style={{color: "white"}}
            href="/expenses/new"
            className="w-full md:w-auto inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="md:text-lg font-medium text-gray-900">Filter Expenses</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full md:w-auto inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
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
                Filter by Expense Type
              </label>
              <select
                value={filterExpenseType}
                onChange={(e) => setFilterExpenseType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">All Expense Types</option>
                {expenseTypes.map((expenseType) => (
                  <option key={expenseType.id} value={expenseType.id}>
                    {expenseType.name} ({expenseType.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end w-full">
              <button
                onClick={() => {
                  setDateRange({ startDate: '', endDate: '' });
                  setFilterPond('');
                  setFilterExpenseType('');
                }}
                className="w-full  inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {(dateRange.startDate || dateRange.endDate || filterPond || filterExpenseType) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-blue-400 mr-2" />
              <span className="text-sm text-blue-700">
                Showing expenses{' '}
                {dateRange.startDate || dateRange.endDate ? (
                  <>
                    from{' '}
                    {dateRange.startDate ? formatDate(dateRange.startDate) : 'beginning'} to{' '}
                    {dateRange.endDate ? formatDate(dateRange.endDate) : 'now'}
                  </>
                ) : null}
                {dateRange.startDate || dateRange.endDate ? ' and ' : ''}
                {filterPond && `for Pond: ${ponds.find(p => p.id === parseInt(filterPond))?.name || 'Unknown'}`}
                {(dateRange.startDate || dateRange.endDate || filterPond) && filterExpenseType ? ' and ' : ''}
                {filterExpenseType && `Type: ${expenseTypes.find(et => et.id === parseInt(filterExpenseType))?.name || 'Unknown'}`}
                {' '}({filteredExpenses.length} records)
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
              <h3 className="text-lg font-semibold text-gray-900">Total Expenses</h3>
              <p className="text-3xl font-bold text-red-600">{filteredExpenses.length}</p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Amount</h3>
              <p className="text-3xl font-bold text-red-600">
                ৳{filteredTotals.totalAmount.toFixed(4)}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
              <p className="text-3xl font-bold text-orange-600">
                ৳{filteredTotals.thisMonthAmount.toFixed(4)}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Receipt className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Suppliers</h3>
              <p className="text-3xl font-bold text-purple-600">
                {new Set(filteredExpenses.filter(e => e.supplier).map(e => e.supplier)).size}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <TrendingDown className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No expense records</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first expense.</p>
          <div className="mt-6">
            <Link
              href="/expenses/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
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
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {expense.expense_type_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.pond_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ৳{parseFloat(expense.amount).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.quantity ? `${parseFloat(expense.quantity).toFixed(4)} ${expense.unit}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.supplier || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/expenses/${expense.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/expenses/${expense.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(expense.id, expense.expense_type_name, expense.amount, expense.date)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                          disabled={deleteExpense.isPending}
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