'use client';

import { useState, useMemo } from 'react';
import { 
  usePonds, 
  useBills,
  useInvoices,
  useBillPayments,
  useCustomerPayments,
  useDeposits,
  useJournalEntries,
  usePayrollRuns,
  useCustomers,
  useSpecies,
  useItems
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
  EyeOff,
  BarChart3,
  PieChart,
  Activity,
  Fish,
  Package,
  Users,
  Building2,
  Banknote,
  CreditCard,
  Wallet,
  Calculator,
  Target,
  Scale,
  AlertCircle
} from 'lucide-react';
import { downloadCSV, formatCurrencyForCSV, formatDateForCSV, sanitizeFilename } from '@/lib/exportUtils';
import { extractApiData } from '@/lib/utils';
import { Pond, Bill, Invoice, PayrollRun } from '@/lib/api';
import { toast } from 'sonner';

interface ReportFilters {
  pondId: string;
  startDate: string;
  endDate: string;
  reportType: 'summary' | 'detail' | 'revenue' | 'expense' | 'pnl' | 'cashflow' | 'balancesheet' | 'harvest' | 'comparative';
}

export default function ReportsPage() {
  const { data: pondsData } = usePonds();
  const { data: billsData } = useBills();
  const { data: invoicesData } = useInvoices();
  const { data: billPaymentsData } = useBillPayments();
  const { data: customerPaymentsData } = useCustomerPayments();
  const { data: depositsData } = useDeposits();
  const { data: journalEntriesData } = useJournalEntries();
  const { data: payrollRunsData } = usePayrollRuns();
  const { data: customersData } = useCustomers();
  const { data: speciesData } = useSpecies();
  const { data: itemsData } = useItems();

  const ponds = extractApiData<Pond>(pondsData?.data);
  const bills = extractApiData<Bill>(billsData?.data);
  const invoices = extractApiData<Invoice>(invoicesData?.data);
  const billPayments = extractApiData<any>(billPaymentsData?.data);
  const customerPayments = extractApiData<any>(customerPaymentsData?.data);
  const deposits = extractApiData<any>(depositsData?.data);
  const journalEntries = extractApiData<any>(journalEntriesData?.data);
  const payrollRuns = extractApiData<PayrollRun>(payrollRunsData?.data);
  const customers = extractApiData<any>(customersData?.data);
  const species = extractApiData<any>(speciesData?.data);
  const items = extractApiData<any>(itemsData?.data);

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
  const filterData = (data: any[], dateField: string = 'date', pondField: string = 'pond') => {
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      const dateMatch = itemDate >= startDate && itemDate <= endDate;
      const pondMatch = filters.pondId === 'all' || item[pondField] === parseInt(filters.pondId);
      
      return dateMatch && pondMatch;
    });
  };

  // Revenue Reports Calculations
  const revenueCalculations = useMemo(() => {
    // Filter fish sales from invoices (fish items)
    const fishInvoices = invoices.filter(invoice => 
      (invoice as any).lines && (invoice as any).lines.some((line: any) => 
        line.item && line.item.category === 'fish'
      )
    );

    // Total Fish Sales (Qty & Value)
    let totalFishWeight = 0;
    let totalFishValue = 0;
    const speciesSales: { [key: string]: { weight: number; value: number; count: number } } = {};
    const customerSales: { [key: string]: { weight: number; value: number; count: number } } = {};

    fishInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoice_date);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      if (invoiceDate >= startDate && invoiceDate <= endDate) {
        if (filters.pondId === 'all' || (invoice as any).customer?.pond?.id === parseInt(filters.pondId)) {
          (invoice as any).lines.forEach((line: any) => {
            if (line.item?.category === 'fish') {
              const weight = toNumber(line.total_weight || line.qty);
              const value = toNumber(line.amount);
              const count = toNumber(line.fish_count);
              
              totalFishWeight += weight;
              totalFishValue += value;
              
              // Species-wise sales
              const speciesName = line.species?.name || 'Unknown';
              if (!speciesSales[speciesName]) {
                speciesSales[speciesName] = { weight: 0, value: 0, count: 0 };
              }
              speciesSales[speciesName].weight += weight;
              speciesSales[speciesName].value += value;
              speciesSales[speciesName].count += count;
              
              // Customer-wise sales
              const customerName = (invoice as any).customer?.name || 'Unknown';
              if (!customerSales[customerName]) {
                customerSales[customerName] = { weight: 0, value: 0, count: 0 };
              }
              customerSales[customerName].weight += weight;
              customerSales[customerName].value += value;
              customerSales[customerName].count += count;
            }
          });
        }
      }
    });

    // Average Price per Kg
    const averagePricePerKg = totalFishWeight > 0 ? totalFishValue / totalFishWeight : 0;

    return {
      totalFishWeight,
      totalFishValue,
      averagePricePerKg,
      speciesSales,
      customerSales,
      fishInvoices
    };
  }, [invoices, filters]);

  // Expense Reports Calculations
  const expenseCalculations = useMemo(() => {
    const filteredBills = filterData(bills, 'bill_date', 'vendor_id');
    const filteredPayroll = filterData(payrollRuns, 'pay_date');

    // Feed Cost Report
    let feedCost = 0;
    let feedQuantity = 0;
    
    // Medicine & Pond Care Cost
    let medicineCost = 0;
    
    // Labor & Salary Cost
    let laborCost = 0;
    
    // Other Operating Expenses
    let otherExpenses = 0;

    // Calculate from bills
    filteredBills.forEach(bill => {
      bill.lines?.forEach((line: any) => {
        if (line.item) {
          const amount = toNumber(line.line_amount || line.amount);
          const qty = toNumber(line.qty);
          
          if (line.item.category === 'feed') {
            feedCost += amount;
            feedQuantity += qty;
          } else if (line.item.category === 'medicine') {
            medicineCost += amount;
          } else {
            otherExpenses += amount;
          }
        } else {
          // Direct expense
          otherExpenses += toNumber(line.amount);
        }
      });
    });

    // Calculate from payroll
    filteredPayroll.forEach(payroll => {
      laborCost += toNumber(payroll.total_net);
    });

    return {
      feedCost,
      feedQuantity,
      medicineCost,
      laborCost,
      otherExpenses,
      totalExpenses: feedCost + medicineCost + laborCost + otherExpenses
    };
  }, [bills, payrollRuns, filters]);

  // Profit & Loss Calculations
  const pnlCalculations = useMemo(() => {
    const { totalFishValue } = revenueCalculations;
    const { feedCost, medicineCost, laborCost, otherExpenses, totalExpenses } = expenseCalculations;
    
    const directCosts = feedCost + medicineCost + laborCost;
    const grossProfit = totalFishValue - directCosts;
    const netProfit = grossProfit - otherExpenses;
    
    // Calculate profit per decimal/acre (assuming 1 acre = 100 decimals)
    const selectedPond = ponds.find(p => p.pond_id === parseInt(filters.pondId));
    const pondArea = selectedPond ? toNumber((selectedPond as any).area_decimal || 0) : 0;
    const profitPerDecimal = pondArea > 0 ? netProfit / pondArea : 0;
    const profitPerAcre = profitPerDecimal * 100;

    return {
      grossProfit,
      netProfit,
      directCosts,
      profitPerDecimal,
      profitPerAcre,
      totalRevenue: totalFishValue
    };
  }, [revenueCalculations, expenseCalculations, ponds, filters]);

  // Cash Flow Calculations
  const cashFlowCalculations = useMemo(() => {
    const filteredCustomerPayments = filterData(customerPayments, 'payment_date');
    const filteredDeposits = filterData(deposits, 'deposit_date');
    const filteredBillPayments = filterData(billPayments, 'payment_date');

    // Cash Inflow
    const fishSalesInflow = revenueCalculations.totalFishValue;
    const customerPaymentsInflow = filteredCustomerPayments.reduce((sum, payment) => 
      sum + toNumber(payment.amount_total), 0);
    const depositsInflow = filteredDeposits.reduce((sum, deposit) => 
      sum + toNumber(deposit.amount_total), 0);
    
    const totalCashInflow = fishSalesInflow + customerPaymentsInflow + depositsInflow;

    // Cash Outflow
    const billPaymentsOutflow = filteredBillPayments.reduce((sum, payment) => 
      sum + toNumber(payment.total_amount), 0);
    const payrollOutflow = expenseCalculations.laborCost;
    const otherOutflow = expenseCalculations.feedCost + expenseCalculations.medicineCost + expenseCalculations.otherExpenses;
    
    const totalCashOutflow = billPaymentsOutflow + payrollOutflow + otherOutflow;

    const netCashFlow = totalCashInflow - totalCashOutflow;

    return {
      totalCashInflow,
      totalCashOutflow,
      netCashFlow,
      fishSalesInflow,
      customerPaymentsInflow,
      depositsInflow,
      billPaymentsOutflow,
      payrollOutflow,
      otherOutflow
    };
  }, [revenueCalculations, expenseCalculations, customerPayments, deposits, billPayments, filters]);

  const filteredBills = filterData(bills, 'bill_date', 'vendor_id'); // Bills don't have pond field
  const filteredInvoices = filterData(invoices, 'invoice_date', 'customer_id'); // Invoices don't have pond field
  const filteredBillPayments = filterData(billPayments, 'payment_date');
  const filteredCustomerPayments = filterData(customerPayments, 'payment_date');
  const filteredDeposits = filterData(deposits, 'deposit_date');
  const filteredJournalEntries = filterData(journalEntries, 'entry_date');
  const filteredPayrollRuns = filterData(payrollRuns, 'pay_date');

  // Calculate financial metrics from bills and invoices
  const totalExpenses = expenseCalculations.totalExpenses;
  const totalIncome = revenueCalculations.totalFishValue;
  const totalHarvestRevenue = revenueCalculations.totalFishValue;
  
  // Accounting metrics
  const totalBills = filteredBills.reduce((sum, bill) => sum + toNumber(bill.total_amount), 0);
  const totalInvoices = filteredInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total_amount), 0);
  const totalBillPayments = filteredBillPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const totalCustomerPayments = filteredCustomerPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const totalDeposits = filteredDeposits.reduce((sum, deposit) => sum + toNumber(deposit.amount), 0);
  const totalPayroll = filteredPayrollRuns.reduce((sum, payroll) => sum + toNumber(payroll.total_net), 0);
  
  // Accounts Payable (unpaid bills)
  const accountsPayable = filteredBills.reduce((sum, bill) => sum + toNumber(bill.balance_due), 0);
  
  // Accounts Receivable (unpaid invoices)
  const accountsReceivable = filteredInvoices.reduce((sum, invoice) => sum + toNumber(invoice.balance_due), 0);
  
  // Cash flow calculations
  const cashInflows = totalIncome + totalHarvestRevenue + totalCustomerPayments + totalDeposits;
  const cashOutflows = totalExpenses + totalBillPayments + totalPayroll;
  const netCashFlow = cashInflows - cashOutflows;
  
  const totalRevenue = totalIncome + totalHarvestRevenue + totalInvoices;
  const netProfit = totalRevenue - totalExpenses - totalPayroll;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Calculate production metrics from bills and invoices
  const totalStocked = useMemo(() => {
    let stocked = 0;
    filteredBills.forEach(bill => {
      bill.lines?.forEach((line: any) => {
        if (line.item?.category === 'fish' && line.is_item) {
          stocked += toNumber(line.fish_count || line.qty);
        }
      });
    });
    return stocked;
  }, [filteredBills]);
  
  const totalHarvested = revenueCalculations.totalFishWeight;
  const totalFeedUsed = expenseCalculations.feedQuantity;
  const fcr = totalHarvested > 0 ? totalFeedUsed / totalHarvested : 0;

  // Format number for display
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Calculate feed consumption metrics from bills
  const totalFeedCost = expenseCalculations.feedCost;
  const avgFeedCostPerKg = expenseCalculations.feedQuantity > 0 
    ? expenseCalculations.feedCost / expenseCalculations.feedQuantity 
    : 0;
  const avgFeedingRate = 0; // Will be calculated from feeding events if needed
  const dailyFeedConsumption = expenseCalculations.feedQuantity;

  // Group expenses by type from bills
  const expensesByType = useMemo(() => {
    const acc: Record<string, { amount: number; count: number }> = {};
    filteredBills.forEach(bill => {
      bill.lines?.forEach((line: any) => {
        const type = line.item?.category || 'Other';
        if (!acc[type]) {
          acc[type] = { amount: 0, count: 0 };
        }
        acc[type].amount += toNumber(line.line_amount || line.amount);
        acc[type].count += 1;
      });
    });
    return acc;
  }, [filteredBills]);

  // Group incomes by type from invoices
  const incomesByType = useMemo(() => {
    const acc: Record<string, { amount: number; count: number }> = {};
    filteredInvoices.forEach(invoice => {
      invoice.lines?.forEach((line: any) => {
        const type = line.item?.category || 'Other';
        if (!acc[type]) {
          acc[type] = { amount: 0, count: 0 };
        }
        acc[type].amount += toNumber(line.amount);
        acc[type].count += 1;
      });
    });
    return acc;
  }, [filteredInvoices]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    // Filters are applied automatically via state
    console.log('Generating report with filters:', filters);
  };

  // CSV Export functionality
  const exportToCSV = () => {
    const selectedPond = filters.pondId === 'all' ? 'All Ponds' : ponds.find(p => p.pond_id === parseInt(filters.pondId))?.name || 'Unknown Pond';
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
      csvContent += `Profit Margin,${profitMargin.toFixed(1)}%\n`;
      csvContent += `Accounts Payable,${formatCurrencyForCSV(accountsPayable)}\n`;
      csvContent += `Accounts Receivable,${formatCurrencyForCSV(accountsReceivable)}\n`;
      csvContent += `Net Cash Flow,${formatCurrencyForCSV(netCashFlow)}\n`;
      csvContent += `Total Payroll,${formatCurrencyForCSV(totalPayroll)}\n\n`;

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

      // Accounting Summary
      csvContent += `ACCOUNTING SUMMARY\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Bills,${formatCurrencyForCSV(totalBills)}\n`;
      csvContent += `Total Invoices,${formatCurrencyForCSV(totalInvoices)}\n`;
      csvContent += `Bill Payments,${formatCurrencyForCSV(totalBillPayments)}\n`;
      csvContent += `Customer Payments,${formatCurrencyForCSV(totalCustomerPayments)}\n`;
      csvContent += `Deposits,${formatCurrencyForCSV(totalDeposits)}\n`;
      csvContent += `Accounts Payable,${formatCurrencyForCSV(accountsPayable)}\n`;
      csvContent += `Accounts Receivable,${formatCurrencyForCSV(accountsReceivable)}\n`;
      csvContent += `Net Cash Flow,${formatCurrencyForCSV(netCashFlow)}\n`;
      csvContent += `Total Payroll,${formatCurrencyForCSV(totalPayroll)}\n\n`;

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

      // Detailed Expenses (from Bills)
      csvContent += `DETAILED EXPENSES (FROM BILLS)\n`;
      csvContent += `Date,Vendor,Item Category,Description,Quantity,Amount\n`;
      filteredBills.forEach(bill => {
        bill.lines?.forEach((line: any) => {
          const category = line.item?.category || 'Direct Expense';
          const description = line.item?.name || line.description || 'No description';
          csvContent += `${formatDateForCSV(bill.bill_date)},"${bill.vendor_name || 'Unknown'}","${category}","${description}",${toNumber(line.qty)},${formatCurrencyForCSV(toNumber(line.line_amount || line.amount))}\n`;
        });
      });
      csvContent += `\n`;

      // Detailed Income (from Invoices)
      csvContent += `DETAILED INCOME (FROM INVOICES)\n`;
      csvContent += `Date,Customer,Item Category,Description,Quantity,Amount\n`;
      filteredInvoices.forEach(invoice => {
        invoice.lines?.forEach((line: any) => {
          const category = line.item?.category || 'Service';
          const description = line.item?.name || line.description || 'No description';
          csvContent += `${formatDateForCSV(invoice.invoice_date)},"${invoice.customer_name || 'Unknown'}","${category}","${description}",${toNumber(line.qty)},${formatCurrencyForCSV(toNumber(line.amount))}\n`;
        });
      });
      csvContent += `\n`;

      // Harvest Details (from Invoices with Fish Items)
      csvContent += `HARVEST DETAILS (FROM INVOICES)\n`;
      csvContent += `Date,Customer,Species,Weight (kg),Count,Price per kg,Total Revenue\n`;
      filteredInvoices.forEach(invoice => {
        invoice.lines?.forEach((line: any) => {
          if (line.item?.category === 'fish') {
            const weight = toNumber(line.total_weight || line.qty);
            const count = toNumber(line.fish_count || 0);
            const pricePerKg = weight > 0 ? toNumber(line.amount) / weight : 0;
            csvContent += `${formatDateForCSV(invoice.invoice_date)},"${invoice.customer_name || 'Unknown'}","${line.species?.name || 'Unknown'}",${weight.toFixed(1)},${count},${formatCurrencyForCSV(pricePerKg)},${formatCurrencyForCSV(toNumber(line.amount))}\n`;
          }
        });
      });
      csvContent += `\n`;

      // Stocking Details (from Bills with Fish Items)
      csvContent += `STOCKING DETAILS (FROM BILLS)\n`;
      csvContent += `Date,Vendor,Species,Pieces,Weight (kg),Total Cost\n`;
      filteredBills.forEach(bill => {
        bill.lines?.forEach((line: any) => {
          if (line.item?.category === 'fish' && line.is_item) {
            const count = toNumber(line.fish_count || line.qty);
            const weight = toNumber(line.total_weight || 0);
            csvContent += `${formatDateForCSV(bill.bill_date)},"${bill.vendor_name || 'Unknown'}","${line.species?.name || 'Unknown'}",${count.toLocaleString()},${weight.toFixed(1)},${formatCurrencyForCSV(toNumber(line.line_amount || line.amount))}\n`;
          }
        });
      });
      csvContent += `\n`;

      // Feed Details (from Bills with Feed Items)
      csvContent += `FEED DETAILS (FROM BILLS)\n`;
      csvContent += `Date,Vendor,Feed Type,Quantity,Unit,Cost per Unit,Total Cost\n`;
      filteredBills.forEach(bill => {
        bill.lines?.forEach((line: any) => {
          if (line.item?.category === 'feed') {
            csvContent += `${formatDateForCSV(bill.bill_date)},"${bill.vendor_name || 'Unknown'}","${line.item?.name || 'Unknown'}",${toNumber(line.qty)},${line.unit || 'kg'},${formatCurrencyForCSV(toNumber(line.cost || 0))},${formatCurrencyForCSV(toNumber(line.line_amount || line.amount))}\n`;
          }
        });
      });
      csvContent += `\n`;

      // Detailed Bills
      csvContent += `DETAILED BILLS\n`;
      csvContent += `Date,Vendor,Bill Number,Total Amount,Paid Amount,Balance Due,Status,Memo\n`;
      filteredBills.forEach(bill => {
        const memo = bill.memo || 'No memo';
        csvContent += `${formatDateForCSV(bill.bill_date)},"${bill.vendor_name || 'Unknown'}","${bill.bill_number}",${formatCurrencyForCSV(toNumber(bill.total_amount))},${formatCurrencyForCSV(toNumber(bill.paid_amount))},${formatCurrencyForCSV(toNumber(bill.balance_due))},"${bill.status}","${memo}"\n`;
      });
      csvContent += `\n`;

      // Detailed Invoices
      csvContent += `DETAILED INVOICES\n`;
      csvContent += `Date,Customer,Invoice Number,Total Amount,Paid Amount,Balance Due,Status,Memo\n`;
      filteredInvoices.forEach(invoice => {
        const memo = invoice.memo || 'No memo';
        csvContent += `${formatDateForCSV(invoice.invoice_date)},"${invoice.customer_name || 'Unknown'}","${invoice.invoice_number}",${formatCurrencyForCSV(toNumber(invoice.total_amount))},${formatCurrencyForCSV(toNumber(invoice.paid_amount))},${formatCurrencyForCSV(toNumber(invoice.balance_due))},"${invoice.status}","${memo}"\n`;
      });
      csvContent += `\n`;

      // Payroll Details
      csvContent += `PAYROLL DETAILS\n`;
      csvContent += `Date,Period Start,Period End,Total Gross,Total Deductions,Total Net,Status\n`;
      filteredPayrollRuns.forEach(payroll => {
        csvContent += `${formatDateForCSV(payroll.pay_date)},${formatDateForCSV(payroll.period_start)},${formatDateForCSV(payroll.period_end)},${formatCurrencyForCSV(toNumber(payroll.total_gross))},${formatCurrencyForCSV(toNumber(payroll.total_deductions))},${formatCurrencyForCSV(toNumber(payroll.total_net))},"${payroll.status}"\n`;
      });
    }

    // Download the file using utility function
    const sanitizedFilename = sanitizeFilename(filename);
    downloadCSV(csvContent, sanitizedFilename);
    
    // Show success message
    toast.success(`CSV report exported successfully: ${sanitizedFilename}`);
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
                  <option key={pond.pond_id} value={pond.pond_id}>
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
                onChange={(e) => handleFilterChange('reportType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="summary">Summary Report</option>
                <option value="detail">Detailed Report</option>
                <option value="revenue">Revenue Reports</option>
                <option value="expense">Expense Reports</option>
                <option value="pnl">Profit & Loss</option>
                <option value="cashflow">Cash Flow Report</option>
                <option value="balancesheet">Balance Sheet</option>
                <option value="harvest">Harvest & Stock Reports</option>
                <option value="comparative">Comparative Analysis</option>
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

      {/* Accounting Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accounts Payable</p>
              <p className="text-2xl font-semibold text-red-600">{formatCurrency(accountsPayable)}</p>
              <p className="text-sm text-gray-600">Unpaid bills</p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accounts Receivable</p>
              <p className="text-2xl font-semibold text-green-600">{formatCurrency(accountsReceivable)}</p>
              <p className="text-sm text-gray-600">Unpaid invoices</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
              <p className={`text-2xl font-semibold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashFlow)}
              </p>
              <p className={`text-sm ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netCashFlow >= 0 ? 'Positive' : 'Negative'}
              </p>
            </div>
            <div className={`rounded-full p-3 ${netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payroll</p>
              <p className="text-2xl font-semibold text-blue-600">{formatCurrency(totalPayroll)}</p>
              <p className="text-sm text-gray-600">Employee costs</p>
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
      {filters.reportType === 'revenue' ? (
        <div className="space-y-6">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Fish Sales (Qty)</p>
                  <p className="text-2xl font-semibold text-blue-600">{formatNumber(revenueCalculations.totalFishWeight, 1)} kg</p>
                  <p className="text-sm text-gray-600">Weight sold</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Fish className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Fish Sales (Value)</p>
                  <p className="text-2xl font-semibold text-green-600">{formatCurrency(revenueCalculations.totalFishValue)}</p>
                  <p className="text-sm text-gray-600">Revenue generated</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Price per Kg</p>
                  <p className="text-2xl font-semibold text-purple-600">{formatCurrency(revenueCalculations.averagePricePerKg)}</p>
                  <p className="text-sm text-gray-600">Per kg average</p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <Scale className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-semibold text-orange-600">{revenueCalculations.fishInvoices.length}</p>
                  <p className="text-sm text-gray-600">Fish sales invoices</p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Species-wise Sales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Species-wise Sales Report</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Species</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price/kg</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(revenueCalculations.speciesSales).map(([species, data]) => (
                    <tr key={species}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{species}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(data.weight, 1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.count.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(data.value)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(data.weight > 0 ? data.value / data.weight : 0)}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(revenueCalculations.speciesSales).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No fish sales found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer-wise Sales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer-wise Sales Report</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price/kg</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(revenueCalculations.customerSales).map(([customer, data]) => (
                    <tr key={customer}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(data.weight, 1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.count.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(data.value)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(data.weight > 0 ? data.value / data.weight : 0)}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(revenueCalculations.customerSales).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No customer sales found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : filters.reportType === 'expense' ? (
        <div className="space-y-6">
          {/* Expense KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Feed Cost</p>
                  <p className="text-2xl font-semibold text-orange-600">{formatCurrency(expenseCalculations.feedCost)}</p>
                  <p className="text-sm text-gray-600">{formatNumber(expenseCalculations.feedQuantity, 1)} kg</p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Medicine & Pond Care</p>
                  <p className="text-2xl font-semibold text-red-600">{formatCurrency(expenseCalculations.medicineCost)}</p>
                  <p className="text-sm text-gray-600">Treatment costs</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <Activity className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Labor & Salary</p>
                  <p className="text-2xl font-semibold text-blue-600">{formatCurrency(expenseCalculations.laborCost)}</p>
                  <p className="text-sm text-gray-600">Employee costs</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Other Operating</p>
                  <p className="text-2xl font-semibold text-purple-600">{formatCurrency(expenseCalculations.otherExpenses)}</p>
                  <p className="text-sm text-gray-600">Utilities, transport</p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900">Feed Cost</p>
                    <p className="text-sm text-gray-600">{formatNumber(expenseCalculations.feedQuantity, 1)} kg feed</p>
                  </div>
                </div>
                <span className="text-lg font-semibold text-orange-600">{formatCurrency(expenseCalculations.feedCost)}</span>
              </div>

              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Medicine & Pond Care</p>
                    <p className="text-sm text-gray-600">Treatment and maintenance</p>
                  </div>
                </div>
                <span className="text-lg font-semibold text-red-600">{formatCurrency(expenseCalculations.medicineCost)}</span>
              </div>

              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Labor & Salary</p>
                    <p className="text-sm text-gray-600">Employee wages and benefits</p>
                  </div>
                </div>
                <span className="text-lg font-semibold text-blue-600">{formatCurrency(expenseCalculations.laborCost)}</span>
              </div>

              <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Other Operating Expenses</p>
                    <p className="text-sm text-gray-600">Utilities, transport, rent</p>
                  </div>
                </div>
                <span className="text-lg font-semibold text-purple-600">{formatCurrency(expenseCalculations.otherExpenses)}</span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-bold text-gray-900">Total Expenses</p>
                    <p className="text-sm text-gray-600">All operational costs</p>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(expenseCalculations.totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : filters.reportType === 'pnl' ? (
        <div className="space-y-6">
          {/* P&L KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-semibold text-green-600">{formatCurrency(pnlCalculations.totalRevenue)}</p>
                  <p className="text-sm text-gray-600">Fish sales</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Direct Costs</p>
                  <p className="text-2xl font-semibold text-red-600">{formatCurrency(pnlCalculations.directCosts)}</p>
                  <p className="text-sm text-gray-600">Feed, medicine, labor</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                  <p className={`text-2xl font-semibold ${pnlCalculations.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(pnlCalculations.grossProfit)}
                  </p>
                  <p className="text-sm text-gray-600">Revenue - Direct Costs</p>
                </div>
                <div className={`rounded-full p-3 ${pnlCalculations.grossProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={`h-6 w-6 ${pnlCalculations.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-semibold ${pnlCalculations.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(pnlCalculations.netProfit)}
                  </p>
                  <p className="text-sm text-gray-600">After all expenses</p>
                </div>
                <div className={`rounded-full p-3 ${pnlCalculations.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Calculator className={`h-6 w-6 ${pnlCalculations.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Profit per Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit per Area Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <p className="font-medium text-gray-900">Profit per Decimal</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(pnlCalculations.profitPerDecimal)}</p>
                <p className="text-sm text-gray-600">Per decimal of pond area</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Scale className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-gray-900">Profit per Acre</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(pnlCalculations.profitPerAcre)}</p>
                <p className="text-sm text-gray-600">Per acre (100 decimals)</p>
              </div>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-medium text-gray-900">Total Revenue</span>
                <span className="font-semibold text-green-600">{formatCurrency(pnlCalculations.totalRevenue)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-700">Direct Costs:</span>
                <span></span>
              </div>
              
              <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                <span className="text-gray-600">Feed Cost</span>
                <span className="text-red-600">{formatCurrency(expenseCalculations.feedCost)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                <span className="text-gray-600">Medicine & Pond Care</span>
                <span className="text-red-600">{formatCurrency(expenseCalculations.medicineCost)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                <span className="text-gray-600">Labor & Salary</span>
                <span className="text-red-600">{formatCurrency(expenseCalculations.laborCost)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-medium text-gray-900">Total Direct Costs</span>
                <span className="font-semibold text-red-600">{formatCurrency(pnlCalculations.directCosts)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-medium text-gray-900">Gross Profit</span>
                <span className={`font-semibold ${pnlCalculations.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pnlCalculations.grossProfit)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-700">Other Operating Expenses</span>
                <span className="text-red-600">{formatCurrency(expenseCalculations.otherExpenses)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                <span className="font-bold text-gray-900">Net Profit/Loss</span>
                <span className={`font-bold text-lg ${pnlCalculations.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pnlCalculations.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : filters.reportType === 'cashflow' ? (
        <div className="space-y-6">
          {/* Cash Flow KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cash Inflow</p>
                  <p className="text-2xl font-semibold text-green-600">{formatCurrency(cashFlowCalculations.totalCashInflow)}</p>
                  <p className="text-sm text-gray-600">Money coming in</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cash Outflow</p>
                  <p className="text-2xl font-semibold text-red-600">{formatCurrency(cashFlowCalculations.totalCashOutflow)}</p>
                  <p className="text-sm text-gray-600">Money going out</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                  <p className={`text-2xl font-semibold ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowCalculations.netCashFlow)}
                  </p>
                  <p className={`text-sm ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cashFlowCalculations.netCashFlow >= 0 ? 'Positive' : 'Negative'}
                  </p>
                </div>
                <div className={`rounded-full p-3 ${cashFlowCalculations.netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={`h-6 w-6 ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cash Flow Margin</p>
                  <p className={`text-2xl font-semibold ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cashFlowCalculations.totalCashInflow > 0 ? 
                      ((cashFlowCalculations.netCashFlow / cashFlowCalculations.totalCashInflow) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-sm text-gray-600">Net/Inflow ratio</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Inflows */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Inflows</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Fish className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Fish Sales</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(cashFlowCalculations.fishSalesInflow)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Customer Payments</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(cashFlowCalculations.customerPaymentsInflow)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Banknote className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Deposits</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(cashFlowCalculations.depositsInflow)}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg">
                    <span className="font-bold text-gray-900">Total Inflows</span>
                    <span className="font-bold text-green-600">{formatCurrency(cashFlowCalculations.totalCashInflow)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Outflows */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Outflows</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">Feed & Supplies</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(expenseCalculations.feedCost + expenseCalculations.medicineCost)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">Payroll</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(cashFlowCalculations.payrollOutflow)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">Bill Payments</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(cashFlowCalculations.billPaymentsOutflow)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">Other Expenses</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(cashFlowCalculations.otherOutflow)}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg">
                    <span className="font-bold text-gray-900">Total Outflows</span>
                    <span className="font-bold text-red-600">{formatCurrency(cashFlowCalculations.totalCashOutflow)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : filters.reportType === 'summary' ? (
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

          {/* Accounting Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Bills Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bills Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">Total Bills</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(totalBills)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">Paid Bills</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(totalBillPayments)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-900">Outstanding</span>
                  <span className="text-sm font-semibold text-orange-600">{formatCurrency(accountsPayable)}</span>
                </div>
              </div>
            </div>

            {/* Invoices Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoices Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">Total Invoices</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(totalInvoices)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">Received Payments</span>
                  <span className="text-sm font-semibold text-blue-600">{formatCurrency(totalCustomerPayments)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-900">Outstanding</span>
                  <span className="text-sm font-semibold text-orange-600">{formatCurrency(accountsReceivable)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : filters.reportType === 'balancesheet' ? (
        <div className="space-y-6">
          {/* Balance Sheet KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assets</p>
                  <p className="text-2xl font-semibold text-green-600">{formatCurrency(
                    revenueCalculations.totalFishValue + accountsReceivable + cashFlowCalculations.totalCashInflow
                  )}</p>
                  <p className="text-sm text-gray-600">Current assets</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                  <p className="text-2xl font-semibold text-red-600">{formatCurrency(accountsPayable)}</p>
                  <p className="text-sm text-gray-600">Outstanding debts</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Owner's Equity</p>
                  <p className="text-2xl font-semibold text-blue-600">{formatCurrency(
                    pnlCalculations.netProfit
                  )}</p>
                  <p className="text-sm text-gray-600">Retained earnings</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Working Capital</p>
                  <p className={`text-2xl font-semibold ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowCalculations.netCashFlow)}
                  </p>
                  <p className="text-sm text-gray-600">Current assets - liabilities</p>
                </div>
                <div className={`rounded-full p-3 ${cashFlowCalculations.netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Wallet className={`h-6 w-6 ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Balance Sheet Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-medium text-gray-900">Current Assets:</span>
                  <span></span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Fish className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Fish Biomass Value</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(revenueCalculations.totalFishValue)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">Accounts Receivable</span>
                  </div>
                  <span className="font-semibold text-blue-600">{formatCurrency(accountsReceivable)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Banknote className="h-5 w-5 text-purple-600" />
                    <span className="text-gray-700">Cash & Deposits</span>
                  </div>
                  <span className="font-semibold text-purple-600">{formatCurrency(cashFlowCalculations.totalCashInflow)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-orange-600" />
                    <span className="text-gray-700">Inventory (Feed, Medicine)</span>
                  </div>
                  <span className="font-semibold text-orange-600">{formatCurrency(expenseCalculations.feedCost + expenseCalculations.medicineCost)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-bold text-gray-900">Total Current Assets</span>
                  <span className="font-bold text-green-600">{formatCurrency(
                    revenueCalculations.totalFishValue + accountsReceivable + cashFlowCalculations.totalCashInflow + 
                    expenseCalculations.feedCost + expenseCalculations.medicineCost
                  )}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-medium text-gray-900">Fixed Assets:</span>
                  <span></span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <span className="text-gray-700">Equipment & Infrastructure</span>
                  </div>
                  <span className="font-semibold text-gray-600">{formatCurrency(expenseCalculations.otherExpenses * 0.3)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                  <span className="font-bold text-gray-900">Total Assets</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(
                    revenueCalculations.totalFishValue + accountsReceivable + cashFlowCalculations.totalCashInflow + 
                    expenseCalculations.feedCost + expenseCalculations.medicineCost + (expenseCalculations.otherExpenses * 0.3)
                  )}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Liabilities & Equity</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-medium text-gray-900">Current Liabilities:</span>
                  <span></span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-gray-700">Accounts Payable</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(accountsPayable)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                    <span className="text-gray-700">Outstanding Bills</span>
                  </div>
                  <span className="font-semibold text-orange-600">{formatCurrency(totalBills)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">Payroll Accruals</span>
                  </div>
                  <span className="font-semibold text-blue-600">{formatCurrency(expenseCalculations.laborCost)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-bold text-gray-900">Total Current Liabilities</span>
                  <span className="font-bold text-red-600">{formatCurrency(
                    accountsPayable + totalBills + expenseCalculations.laborCost
                  )}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-medium text-gray-900">Owner's Equity:</span>
                  <span></span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Calculator className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Retained Earnings</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(pnlCalculations.netProfit)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 pl-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">Capital Investment</span>
                  </div>
                  <span className="font-semibold text-blue-600">{formatCurrency(
                    (expenseCalculations.otherExpenses * 0.7) + (expenseCalculations.feedCost + expenseCalculations.medicineCost)
                  )}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                  <span className="font-bold text-gray-900">Total Liabilities & Equity</span>
                  <span className="font-bold text-lg text-gray-900">{formatCurrency(
                    accountsPayable + totalBills + expenseCalculations.laborCost + pnlCalculations.netProfit + 
                    (expenseCalculations.otherExpenses * 0.7) + (expenseCalculations.feedCost + expenseCalculations.medicineCost)
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : filters.reportType === 'harvest' ? (
        <div className="space-y-6">
          {/* Harvest & Stock KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Harvested</p>
                  <p className="text-2xl font-semibold text-green-600">{formatNumber(totalHarvested, 1)} kg</p>
                  <p className="text-sm text-gray-600">Fish harvested</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <Fish className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Feed Conversion Ratio</p>
                  <p className="text-2xl font-semibold text-blue-600">{fcr.toFixed(4)}</p>
                  <p className="text-sm text-gray-600">kg feed/kg fish</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Scale className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost per Kg</p>
                  <p className="text-2xl font-semibold text-orange-600">{formatCurrency(
                    totalHarvested > 0 ? expenseCalculations.totalExpenses / totalHarvested : 0
                  )}</p>
                  <p className="text-sm text-gray-600">Production cost</p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <Calculator className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Profit per Kg</p>
                  <p className={`text-2xl font-semibold ${pnlCalculations.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalHarvested > 0 ? pnlCalculations.netProfit / totalHarvested : 0)}
                  </p>
                  <p className="text-sm text-gray-600">Net profit per kg</p>
                </div>
                <div className={`rounded-full p-3 ${pnlCalculations.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`h-6 w-6 ${pnlCalculations.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Harvest Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Harvest Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pond</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Species</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/kg</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueCalculations.fishInvoices.flatMap((invoice) => 
                    (invoice as any).lines?.filter((line: any) => line.item?.category === 'fish').map((line: any) => (
                      <tr key={`${invoice.invoice_id}-${line.invoice_line_id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.invoice_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(invoice as any).customer?.pond?.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.species?.name || 'Mixed'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(toNumber(line.total_weight || line.qty), 1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{toNumber(line.fish_count || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(toNumber(line.total_weight || line.qty) > 0 ? toNumber(line.amount) / toNumber(line.total_weight || line.qty) : 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(toNumber(line.amount))}</td>
                      </tr>
                    )) || []
                  )}
                  {revenueCalculations.fishInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No harvests found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FCR Impact Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feed Conversion Ratio (FCR) Impact Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <p className="font-medium text-gray-900">Total Feed Used</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(totalFeedUsed, 1)} kg</p>
                <p className="text-sm text-gray-600">Feed consumed</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Fish className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-gray-900">Fish Produced</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatNumber(totalHarvested, 1)} kg</p>
                <p className="text-sm text-gray-600">Fish harvested</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Scale className="h-5 w-5 text-purple-600" />
                  <p className="font-medium text-gray-900">FCR Efficiency</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">{fcr.toFixed(4)}</p>
                <p className="text-sm text-gray-600">kg feed per kg fish</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">FCR Analysis</h4>
              <p className="text-sm text-gray-600">
                {fcr < 1.5 ? 'Excellent FCR - Very efficient feed conversion' : 
                 fcr < 2.0 ? 'Good FCR - Efficient feed conversion' : 
                 fcr < 2.5 ? 'Average FCR - Room for improvement' : 
                 'Poor FCR - Needs optimization'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Target FCR for fish farming is typically 1.2-1.8. Lower FCR indicates better feed efficiency.
              </p>
            </div>
          </div>
        </div>
      ) : filters.reportType === 'comparative' ? (
        <div className="space-y-6">
          {/* Comparative KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue Growth</p>
                  <p className={`text-2xl font-semibold ${pnlCalculations.totalRevenue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pnlCalculations.totalRevenue > 0 ? '+' : ''}{formatCurrency(pnlCalculations.totalRevenue)}
                  </p>
                  <p className="text-sm text-gray-600">Period revenue</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost Efficiency</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {totalHarvested > 0 ? (expenseCalculations.totalExpenses / totalHarvested).toFixed(2) : 0}
                  </p>
                  <p className="text-sm text-gray-600">Cost per kg</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Calculator className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Profitability</p>
                  <p className={`text-2xl font-semibold ${pnlCalculations.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pnlCalculations.netProfit >= 0 ? '+' : ''}{formatCurrency(pnlCalculations.netProfit)}
                  </p>
                  <p className="text-sm text-gray-600">Net profit</p>
                </div>
                <div className={`rounded-full p-3 ${pnlCalculations.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={`h-6 w-6 ${pnlCalculations.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cash Flow</p>
                  <p className={`text-2xl font-semibold ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cashFlowCalculations.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlowCalculations.netCashFlow)}
                  </p>
                  <p className="text-sm text-gray-600">Net cash flow</p>
                </div>
                <div className={`rounded-full p-3 ${cashFlowCalculations.netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Wallet className={`h-6 w-6 ${cashFlowCalculations.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Pond Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pond Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pond</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area (Decimal)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Decimal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ponds.map((pond) => {
                    const pondRevenue = revenueCalculations.fishInvoices
                      .filter(invoice => (invoice as any).customer?.pond?.pond_id === pond.pond_id)
                      .reduce((sum, invoice) => sum + toNumber(invoice.total_amount), 0);
                    
                    const pondExpenses = filteredBills
                      .filter(bill => (bill as any).lines?.some((line: any) => line.pond === pond.pond_id))
                      .reduce((sum, bill) => sum + toNumber(bill.total_amount), 0);
                    
                    const pondProfit = pondRevenue - pondExpenses;
                    const pondArea = toNumber((pond as any).area_decimal || 0);
                    const profitPerDecimal = pondArea > 0 ? pondProfit / pondArea : 0;
                    
                    return (
                      <tr key={pond.pond_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pond.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pondArea.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(pondRevenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(pondExpenses)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${pondProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(pondProfit)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${profitPerDecimal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profitPerDecimal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            pondProfit >= 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {pondProfit >= 0 ? 'Profitable' : 'Loss'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Scale className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Feed Conversion Ratio</span>
                  </div>
                  <span className="font-semibold text-blue-600">{fcr.toFixed(4)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Profit Margin</span>
                  </div>
                  <span className="font-semibold text-green-600">{profitMargin.toFixed(1)}%</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Cost per Kg</span>
                  </div>
                  <span className="font-semibold text-purple-600">{formatCurrency(totalHarvested > 0 ? expenseCalculations.totalExpenses / totalHarvested : 0)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-gray-900">Revenue per Kg</span>
                  </div>
                  <span className="font-semibold text-orange-600">{formatCurrency(totalHarvested > 0 ? pnlCalculations.totalRevenue / totalHarvested : 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Revenue Trend</h4>
                  <p className="text-sm text-gray-600">
                    {revenueCalculations.totalFishValue > 0 ? 'Positive revenue trend observed' : 'No revenue recorded for this period'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Expense Trend</h4>
                  <p className="text-sm text-gray-600">
                    Total expenses: {formatCurrency(expenseCalculations.totalExpenses)} across {Object.keys(expensesByType).length} categories
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Profitability Trend</h4>
                  <p className="text-sm text-gray-600">
                    {pnlCalculations.netProfit >= 0 ? 'Profitable operations' : 'Loss-making period - review costs and pricing'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Cash Flow Trend</h4>
                  <p className="text-sm text-gray-600">
                    {cashFlowCalculations.netCashFlow >= 0 ? 'Positive cash flow' : 'Negative cash flow - monitor liquidity'}
                  </p>
                </div>
              </div>
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
                  {filteredBills.map((bill) => (
                    bill.lines?.map((line: any) => (
                      <tr key={`${bill.bill_id}-${line.bill_line_id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(bill.bill_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {line.pond?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {line.item?.category || 'Direct Expense'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {line.item?.name || line.description || 'No description'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                          {formatCurrency(toNumber(line.line_amount || line.amount))}
                        </td>
                      </tr>
                    ))
                  )).flat()}
                  {filteredBills.length === 0 && (
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
                  {filteredInvoices.map((invoice) => (
                    invoice.lines?.map((line: any) => (
                      <tr key={`${invoice.invoice_id}-${line.invoice_line_id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(invoice as any).customer?.pond?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {line.item?.category || 'Service'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {line.item?.name || line.description || 'No description'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(toNumber(line.amount))}
                        </td>
                      </tr>
                    ))
                  )).flat()}
                  {filteredInvoices.length === 0 && (
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

          {/* Detailed Bills */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Bills</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBills.map((bill) => (
                    <tr key={bill.bill_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(bill.bill_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.vendor_name || 'Unknown Vendor'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.bill_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(toNumber(bill.total_amount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        {formatCurrency(toNumber(bill.balance_due))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                          bill.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredBills.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No bills found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Invoices */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Invoices</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.invoice_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.customer_name || 'Unknown Customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(toNumber(invoice.total_amount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(toNumber(invoice.balance_due))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No invoices found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
