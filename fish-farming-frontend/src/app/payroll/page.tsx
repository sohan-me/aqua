'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, Users } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface PayrollLine {
  payroll_line_id: number;
  employee: number;
  employee_name: string;
  
  // Core Salary (Bangladesh Private Company)
  full_salary: number | string;
  
  // Additions (Earnings)
  overtime_hours: number | string;
  overtime_pay: number | string;
  harvest_incentive: number | string;
  festival_bonus: number | string;
  performance_bonus: number | string;
  
  // Deductions
  absent_days: number | string;
  absent_deduction: number | string;
  loan_advance: number | string;
  pf_employee: number | string;
  tax_paye: number | string;
  
  // Employer Contributions
  pf_employer: number | string;
  gratuity: number | string;
  insurance_welfare: number | string;
  
  // Calculated Fields
  total_earnings: number | string;
  total_deductions: number | string;
  net_pay: number | string;
  
  // Payment Details
  payment_account?: number;
  payment_account_name?: string;
  check_obj?: number;
  check_no?: string;
  notes?: string;
  created_at: string;
}

interface PayrollRun {
  payroll_run_id: number;
  run_date?: string;  // Frontend field name
  pay_date?: string;  // Backend field name
  pay_period_start?: string;  // Frontend field name
  pay_period_end?: string;    // Frontend field name
  period_start?: string;      // Backend field name
  period_end?: string;        // Backend field name
  total_gross?: number | string;
  total_deductions?: number | string;
  total_net?: number | string;
  status?: 'draft' | 'paid';
  created_at?: string;
  updated_at?: string;
  user_username?: string;
  memo?: string;
  total_benefits?: number | string;
  lines?: PayrollLine[];  // Employee payroll details
}

interface Employee {
  employee_id: number;
  employee_number: string;
  name: string;
  position: string;
  salary: number;
}

interface ChartAccount {
  account_id: number;
  code: string;
  name: string;
  account_type: string;
}

export default function PayrollPage() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRun | null>(null);
  const [expandedPayroll, setExpandedPayroll] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [checkNo, setCheckNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Payroll line form data
  const [payrollLineData, setPayrollLineData] = useState({
    full_salary: 0,
    overtime_hours: 0,
    harvest_incentive: 0,
    festival_bonus: 0,
    performance_bonus: 0,
    absent_days: 0,
    loan_advance: 0,
    pf_employee: 0,
    tax_paye: 0,
    pf_employer: 0,
    gratuity: 0,
    insurance_welfare: 0,
  });

  // Helper functions for safe data handling
  const formatCurrency = (amount: any) => {
    if (amount === null || amount === undefined || amount === '') return '$0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '$0.00';
    return `$${numAmount.toFixed(2)}`;
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getDateValue = (payroll: PayrollRun) => {
    return payroll.run_date || payroll.pay_date || '';
  };

  const getPeriodStart = (payroll: PayrollRun) => {
    return payroll.pay_period_start || payroll.period_start || '';
  };

  const getPeriodEnd = (payroll: PayrollRun) => {
    return payroll.pay_period_end || payroll.period_end || '';
  };

  // Derive totals from lines when backend totals are zero/not set
  const getDerivedTotals = (payroll: PayrollRun) => {
    const hasLines = Array.isArray(payroll.lines) && payroll.lines.length > 0;
    if (!hasLines) {
      return {
        gross: typeof payroll.total_gross === 'string' ? parseFloat(payroll.total_gross) : (payroll.total_gross || 0),
        deductions: typeof payroll.total_deductions === 'string' ? parseFloat(payroll.total_deductions) : (payroll.total_deductions || 0),
        net: typeof payroll.total_net === 'string' ? parseFloat(payroll.total_net) : (payroll.total_net || 0),
      };
    }
    const lines = payroll.lines || [] as any[];
    const gross = lines.reduce((sum: number, line: any) => sum + parseFloat(line.total_earnings || 0), 0);
    const deductions = lines.reduce((sum: number, line: any) => sum + parseFloat(line.total_deductions || 0), 0);
    const net = lines.reduce((sum: number, line: any) => sum + parseFloat(line.net_pay || 0), 0);
    return { gross, deductions, net };
  };

  const toggleExpanded = (payrollId: number) => {
    setExpandedPayroll(expandedPayroll === payrollId ? null : payrollId);
  };

  const calculateTotal = (payrollRuns: PayrollRun[], field: 'total_gross' | 'total_deductions' | 'total_net') => {
    if (!payrollRuns || payrollRuns.length === 0) return 0;
    
    return payrollRuns.reduce((sum, run) => {
      let value = 0;
      
      // Always calculate from lines if they exist, regardless of direct values
      if (run.lines && Array.isArray(run.lines) && run.lines.length > 0) {
        switch (field) {
          case 'total_gross':
            value = run.lines.reduce((lineSum, line) => {
              const lineValue = parseFloat(String(line.total_earnings || '0'));
              return lineSum + (isNaN(lineValue) ? 0 : lineValue);
            }, 0);
            break;
          case 'total_deductions':
            value = run.lines.reduce((lineSum, line) => {
              const lineValue = parseFloat(String(line.total_deductions || '0'));
              return lineSum + (isNaN(lineValue) ? 0 : lineValue);
            }, 0);
            break;
          case 'total_net':
            value = run.lines.reduce((lineSum, line) => {
              const lineValue = parseFloat(String(line.net_pay || '0'));
              return lineSum + (isNaN(lineValue) ? 0 : lineValue);
            }, 0);
            break;
        }
      } else {
        // Fallback to direct values if no lines
        const directValue = run[field];
        if (directValue !== null && directValue !== undefined && directValue !== '') {
          const numValue = typeof directValue === 'string' ? parseFloat(directValue) : directValue;
          value = isNaN(numValue) ? 0 : numValue;
        }
      }
      
      return sum + value;
    }, 0);
  };
  const [formData, setFormData] = useState({
    run_date: '',
    pay_period_start: '',
    pay_period_end: '',
    status: 'draft',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);


  const fetchData = async () => {
    try {
      setLoading(true);
      const [payrollResponse, employeesResponse, accountsResponse] = await Promise.all([
        get('/payroll-runs/'),
        get('/employees/'),
        get('/accounts/'),
      ]);
      
      setPayrollRuns(payrollResponse.results || payrollResponse);
      setEmployees(employeesResponse.results || employeesResponse);
      setChartAccounts(accountsResponse.results || accountsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if employee is selected
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    
    try {
      const payrollData = {
        ...formData,
        status: formData.status,
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
      };

      let payrollRun;
      if (editingPayroll) {
        payrollRun = await put(`/payroll-runs/${editingPayroll.payroll_run_id}/`, payrollData);
        toast.success('Payroll run updated successfully');
      } else {
        payrollRun = await post('/payroll-runs/', payrollData);
        toast.success('Payroll run created successfully');
      }
      
      // Create or update payroll line for the selected employee
      if (payrollRun && selectedEmployee) {
        const payrollLinePayload = {
          payroll_run: payrollRun.payroll_run_id || payrollRun.id,
          employee: selectedEmployee.employee_id,
          full_salary: payrollLineData.full_salary,
          overtime_hours: payrollLineData.overtime_hours,
          overtime_pay: 0, // Will be calculated by backend
          harvest_incentive: payrollLineData.harvest_incentive,
          festival_bonus: payrollLineData.festival_bonus,
          performance_bonus: payrollLineData.performance_bonus,
          absent_days: payrollLineData.absent_days,
          absent_deduction: 0, // Will be calculated by backend
          loan_advance: payrollLineData.loan_advance,
          pf_employee: payrollLineData.pf_employee,
          tax_paye: payrollLineData.tax_paye,
          pf_employer: payrollLineData.pf_employer,
          gratuity: payrollLineData.gratuity,
          insurance_welfare: payrollLineData.insurance_welfare,
          payment_account: paymentAccountId ? parseInt(paymentAccountId, 10) : undefined,
          check_no: checkNo || undefined,
          notes: notes || `Payroll line for ${selectedEmployee.name}`,
        };
        
        if (editingPayroll && editingPayroll.lines && editingPayroll.lines.length > 0) {
          // Update existing payroll line
          const existingLine = editingPayroll.lines[0];
          await put(`/payroll-lines/${existingLine.payroll_line_id}/`, payrollLinePayload);
          toast.success('Payroll line updated successfully');
        } else {
          // Create new payroll line
          await post('/payroll-lines/', payrollLinePayload);
          toast.success('Employee added to payroll run');
        }
      }
      
      setIsDialogOpen(false);
      setEditingPayroll(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving payroll run:', error);
      toast.error('Failed to save payroll run');
    }
  };

  const handleEdit = (payroll: PayrollRun) => {
    setEditingPayroll(payroll);
    setFormData({
      run_date: payroll.run_date || payroll.pay_date || '',
      pay_period_start: payroll.pay_period_start || payroll.period_start || '',
      pay_period_end: payroll.pay_period_end || payroll.period_end || '',
      status: payroll.status || 'draft',
    });
    // Prefill employee/payment details from first line if available
    const firstLine: any = Array.isArray(payroll.lines) && payroll.lines.length > 0 ? payroll.lines[0] : null;
    if (firstLine) {
      const emp = employees.find(e => e.employee_id === firstLine.employee) || null;
      setSelectedEmployee(emp);
      setPaymentAccountId(firstLine.payment_account ? String(firstLine.payment_account) : '');
      setCheckNo(firstLine.check_no || '');
      setNotes(firstLine.notes || '');
      
      // Populate payroll line data with existing values
      setPayrollLineData({
        full_salary: parseFloat(firstLine.full_salary || '0'),
        overtime_hours: parseFloat(firstLine.overtime_hours || '0'),
        harvest_incentive: parseFloat(firstLine.harvest_incentive || '0'),
        festival_bonus: parseFloat(firstLine.festival_bonus || '0'),
        performance_bonus: parseFloat(firstLine.performance_bonus || '0'),
        absent_days: parseFloat(firstLine.absent_days || '0'),
        loan_advance: parseFloat(firstLine.loan_advance || '0'),
        pf_employee: parseFloat(firstLine.pf_employee || '0'),
        tax_paye: parseFloat(firstLine.tax_paye || '0'),
        pf_employer: parseFloat(firstLine.pf_employer || '0'),
        gratuity: parseFloat(firstLine.gratuity || '0'),
        insurance_welfare: parseFloat(firstLine.insurance_welfare || '0'),
      });
    } else {
      setSelectedEmployee(null);
      setPaymentAccountId('');
      setCheckNo('');
      setNotes('');
      // Reset payroll line data
      setPayrollLineData({
        full_salary: 0,
        overtime_hours: 0,
        harvest_incentive: 0,
        festival_bonus: 0,
        performance_bonus: 0,
        absent_days: 0,
        loan_advance: 0,
        pf_employee: 0,
        tax_paye: 0,
        pf_employer: 0,
        gratuity: 0,
        insurance_welfare: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (payrollId: number) => {
    if (confirm('Are you sure you want to delete this payroll run?')) {
      try {
        await del(`/payroll-runs/${payrollId}/`);
        toast.success('Payroll run deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting payroll run:', error);
        toast.error('Failed to delete payroll run');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      run_date: '',
      pay_period_start: '',
      pay_period_end: '',
      status: 'draft',
    });
    setSelectedEmployee(null);
    setPaymentAccountId('');
    setCheckNo('');
    setNotes('');
    setPayrollLineData({
      full_salary: 0,
      overtime_hours: 0,
      harvest_incentive: 0,
      festival_bonus: 0,
      performance_bonus: 0,
      absent_days: 0,
      loan_advance: 0,
      pf_employee: 0,
      tax_paye: 0,
      pf_employer: 0,
      gratuity: 0,
      insurance_welfare: 0,
    });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.employee_id.toString() === employeeId);
    setSelectedEmployee(employee || null);
    if (employee) {
      setPayrollLineData(prev => ({
        ...prev,
        full_salary: employee.salary || 0
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPayrollRuns = payrollRuns.filter(payroll => {
    const searchLower = searchTerm.toLowerCase();
    
    // Safe filtering with null/undefined checks
    const dateValue = getDateValue(payroll);
    const dateMatch = dateValue && dateValue.toLowerCase().includes(searchLower);
    const statusMatch = payroll.status && payroll.status.toLowerCase().includes(searchLower);
    const periodStartValue = getPeriodStart(payroll);
    const periodEndValue = getPeriodEnd(payroll);
    const periodStartMatch = periodStartValue && periodStartValue.toLowerCase().includes(searchLower);
    const periodEndMatch = periodEndValue && periodEndValue.toLowerCase().includes(searchLower);
    
    return dateMatch || statusMatch || periodStartMatch || periodEndMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-600 mt-1">Manage payroll runs and employee payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPayroll(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payroll Run
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPayroll ? 'Edit Payroll Run' : 'Add New Payroll Run'}</DialogTitle>
              <DialogDescription>
                {editingPayroll ? 'Update payroll run information' : 'Create a new payroll run'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {/* Basic Payroll Run Information */}
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="run_date">Run Date *</Label>
                  <Input
                    id="run_date"
                    type="date"
                    value={formData.run_date}
                    onChange={(e) => setFormData({ ...formData, run_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Backend accepts 'draft', 'approved', 'paid'; frontend 'processed' maps to 'approved' */}
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay_period_start">Pay Period Start *</Label>
                  <Input
                    id="pay_period_start"
                    type="date"
                    value={formData.pay_period_start}
                    onChange={(e) => setFormData({ ...formData, pay_period_start: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay_period_end">Pay Period End *</Label>
                  <Input
                    id="pay_period_end"
                    type="date"
                    value={formData.pay_period_end}
                    onChange={(e) => setFormData({ ...formData, pay_period_end: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
              </div>

              {/* Employee Selection */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Select Employee</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee *</Label>
                    <Select 
                      value={selectedEmployee?.employee_id?.toString() || ''} 
                      onValueChange={handleEmployeeSelect}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.length > 0 ? (
                          employees.map((employee) => (
                            <SelectItem key={employee.employee_id} value={employee.employee_id.toString()}>
                              {employee.name} - {employee.position}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-employees" disabled>
                            No employees available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Choose employee for this payroll run ({employees.length} employees loaded)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_salary">Current Salary (BDT)</Label>
                    <Input
                      id="employee_salary"
                      type="number"
                      step="0.01"
                      value={selectedEmployee?.salary || ''}
                      placeholder="20000.00"
                      className="h-12"
                      disabled
                    />
                    <p className="text-xs text-gray-500">Employee's current salary (auto-filled)</p>
                  </div>
                </div>
              </div>

              {/* Bangladesh Payroll Structure - Employee Details */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Employee Payroll Details (Bangladesh Structure)</h3>
                
                {/* Core Salary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_salary">Full Salary (BDT) *</Label>
                    <Input
                      id="full_salary"
                      type="number"
                      step="0.01"
                      value={payrollLineData.full_salary}
                      onChange={(e) => setPayrollLineData({...payrollLineData, full_salary: parseFloat(e.target.value) || 0})}
                      placeholder="20000.00"
                      className="h-12"
                    />
                    <p className="text-xs text-gray-500">Fixed monthly agreed salary (auto-filled from employee record)</p>
                  </div>
                </div>

                {/* Earnings Section */}
                <div className="bg-green-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    <span className="mr-2">💰</span> Earnings (Additions)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="overtime_hours">Overtime Hours</Label>
                      <Input
                        id="overtime_hours"
                        type="number"
                        step="0.01"
                        placeholder="15.00"
                        className="h-10"
                        value={payrollLineData.overtime_hours}
                        onChange={(e) => setPayrollLineData({...payrollLineData, overtime_hours: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Hours worked overtime</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="harvest_incentive">Harvest Incentive (BDT)</Label>
                      <Input
                        id="harvest_incentive"
                        type="number"
                        step="0.01"
                        placeholder="1200.00"
                        className="h-10"
                        value={payrollLineData.harvest_incentive}
                        onChange={(e) => setPayrollLineData({...payrollLineData, harvest_incentive: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Kg harvested × Rate per Kg</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="festival_bonus">Festival Bonus (BDT)</Label>
                      <Input
                        id="festival_bonus"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10"
                        value={payrollLineData.festival_bonus}
                        onChange={(e) => setPayrollLineData({...payrollLineData, festival_bonus: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Eid bonuses</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="performance_bonus">Performance Bonus (BDT)</Label>
                      <Input
                        id="performance_bonus"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10"
                        value={payrollLineData.performance_bonus}
                        onChange={(e) => setPayrollLineData({...payrollLineData, performance_bonus: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Attendance/Performance bonus</p>
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="bg-red-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                    <span className="mr-2">📉</span> Deductions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="absent_days">Absent Days</Label>
                      <Input
                        id="absent_days"
                        type="number"
                        step="0.01"
                        placeholder="1.00"
                        className="h-10"
                        value={payrollLineData.absent_days}
                        onChange={(e) => setPayrollLineData({...payrollLineData, absent_days: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Days absent from work</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loan_advance">Loan/Advance (BDT)</Label>
                      <Input
                        id="loan_advance"
                        type="number"
                        step="0.01"
                        placeholder="1000.00"
                        className="h-10"
                        value={payrollLineData.loan_advance}
                        onChange={(e) => setPayrollLineData({...payrollLineData, loan_advance: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Loan repayment or advance</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pf_employee">PF Employee %</Label>
                      <Input
                        id="pf_employee"
                        type="number"
                        step="0.01"
                        placeholder="10.00"
                        className="h-10"
                        value={payrollLineData.pf_employee}
                        onChange={(e) => setPayrollLineData({...payrollLineData, pf_employee: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Provident Fund employee contribution %</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_paye">Tax (PAYE) (BDT)</Label>
                      <Input
                        id="tax_paye"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10"
                        value={payrollLineData.tax_paye}
                        onChange={(e) => setPayrollLineData({...payrollLineData, tax_paye: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-gray-500">Tax as per NBR slab</p>
                    </div>
                  </div>
                </div>

                {/* Employer Contributions Section */}
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <span className="mr-2">🏢</span> Employer Contributions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pf_employer">PF Employer %</Label>
                      <Input
                        id="pf_employer"
                        type="number"
                        step="0.01"
                        placeholder="10.00"
                        className="h-10"
                      />
                      <p className="text-xs text-gray-500">Employer PF contribution %</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gratuity">Gratuity (BDT)</Label>
                      <Input
                        id="gratuity"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10"
                      />
                      <p className="text-xs text-gray-500">Service benefit (if not using PF)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_welfare">Insurance/Welfare (BDT)</Label>
                      <Input
                        id="insurance_welfare"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10"
                      />
                      <p className="text-xs text-gray-500">Insurance and welfare fund</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Payment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_account">Payment Account</Label>
                      <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select payment account" />
                        </SelectTrigger>
                        <SelectContent>
                          {chartAccounts
                            .filter(account => 
                              account.account_type === 'Bank' || 
                              account.account_type === 'Cash' ||
                              account.account_type === 'Other Current Asset'
                            )
                            .map((account) => (
                              <SelectItem key={account.account_id} value={account.account_id.toString()}>
                                {account.code} - {account.name} ({account.account_type})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Select from chart of accounts (Bank, Cash, Other Current Asset)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check_no">Check/Reference No</Label>
                      <Input
                        id="check_no"
                        type="text"
                        placeholder="CHK-001"
                        value={checkNo}
                        onChange={(e) => setCheckNo(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      className="w-full mt-2 p-3 border rounded-lg h-20 resize-none"
                      placeholder="Additional notes or comments..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayroll ? 'Update' : 'Create'} Payroll Run
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{payrollRuns.length}</div>
            <div className="text-sm text-gray-600">Total Runs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              ${calculateTotal(payrollRuns, 'total_gross').toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Gross</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              ${calculateTotal(payrollRuns, 'total_deductions').toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Deductions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${calculateTotal(payrollRuns, 'total_net').toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Net</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search payroll runs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Payroll Runs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payroll runs...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run Date</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Total Gross</TableHead>
                <TableHead>Total Deductions</TableHead>
                <TableHead>Total Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayrollRuns.map((payroll) => (
                <React.Fragment key={payroll.payroll_run_id}>
                  <TableRow>
                    <TableCell>{formatDate(getDateValue(payroll))}</TableCell>
                    <TableCell>
                      {formatDate(getPeriodStart(payroll))} - {formatDate(getPeriodEnd(payroll))}
                    </TableCell>
                    {(() => { const t = getDerivedTotals(payroll); return (
                      <>
                        <TableCell>{formatCurrency(t.gross)}</TableCell>
                        <TableCell>{formatCurrency(t.deductions)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(t.net)}</TableCell>
                      </>
                    ); })()}
                    <TableCell>
                      <Badge className={getStatusColor(payroll.status || 'draft')}>
                        {(payroll.status || 'draft').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpanded(payroll.payroll_run_id)}
                          title="View Employee Details"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(payroll)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(payroll.payroll_run_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {expandedPayroll === payroll.payroll_run_id && (
                    <TableRow key={`${payroll.payroll_run_id}-details`}>
                      <TableCell colSpan={7} className="bg-gray-50">
                        <div className="p-4">
                          {/* Header with dates and status */}
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                            <div className="flex items-center space-x-4">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Pay Date:</span> {formatDate(payroll.pay_date)}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Period:</span> {getPeriodStart(payroll)} - {getPeriodEnd(payroll)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(payroll.status || 'draft')}>
                                {(payroll.status || 'draft').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          <h4 className="font-semibold mb-3">Employee Details</h4>
                          {payroll.lines && payroll.lines.length > 0 ? (
                            <div className="space-y-4">
                              {payroll.lines.map((line) => (
                                <div key={line.payroll_line_id} className="bg-white rounded-lg border p-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <h5 className="font-semibold text-lg">{line.employee_name}</h5>
                                    <div className="text-right">
                                      <div className="text-sm text-gray-600">Net Pay</div>
                                      <div className="text-xl font-bold text-green-600">{formatCurrency(line.net_pay)}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Earnings Section */}
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                      <div className="flex items-center mb-3">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                                          <span className="text-green-600 text-sm">💰</span>
                                        </div>
                                        <h6 className="font-semibold text-green-800">Earnings</h6>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-700">Full Salary:</span>
                                          <span className="font-medium">{formatCurrency(line.full_salary)}</span>
                                        </div>
                                        {parseFloat(line.overtime_hours?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Overtime ({line.overtime_hours}h):</span>
                                            <span className="font-medium">{formatCurrency(line.overtime_pay)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.harvest_incentive?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Harvest Incentive:</span>
                                            <span className="font-medium">{formatCurrency(line.harvest_incentive)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.festival_bonus?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Festival Bonus:</span>
                                            <span className="font-medium">{formatCurrency(line.festival_bonus)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.performance_bonus?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Performance Bonus:</span>
                                            <span className="font-medium">{formatCurrency(line.performance_bonus)}</span>
                                          </div>
                                        )}
                                        <div className="border-t border-green-300 pt-2 mt-3">
                                          <div className="flex justify-between items-center font-semibold text-green-800">
                                            <span>Total Earnings:</span>
                                            <span>{formatCurrency(line.total_earnings)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Deductions Section */}
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                      <div className="flex items-center mb-3">
                                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-2">
                                          <span className="text-red-600 text-sm">📉</span>
                                        </div>
                                        <h6 className="font-semibold text-red-800">Deductions</h6>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        {parseFloat(line.absent_days?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Absent ({line.absent_days}d):</span>
                                            <span className="font-medium">{formatCurrency(line.absent_deduction)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.loan_advance?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Loan/Advance:</span>
                                            <span className="font-medium">{formatCurrency(line.loan_advance)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.pf_employee?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">PF Employee:</span>
                                            <span className="font-medium">{formatCurrency(line.pf_employee)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.tax_paye?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Tax (PAYE):</span>
                                            <span className="font-medium">{formatCurrency(line.tax_paye)}</span>
                                          </div>
                                        )}
                                        <div className="border-t border-red-300 pt-2 mt-3">
                                          <div className="flex justify-between items-center font-semibold text-red-800">
                                            <span>Total Deductions:</span>
                                            <span>{formatCurrency(line.total_deductions)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Employer Contributions Section */}
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                      <div className="flex items-center mb-3">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                          <span className="text-blue-600 text-sm">🏢</span>
                                        </div>
                                        <h6 className="font-semibold text-blue-800">Employer</h6>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        {parseFloat(line.pf_employer?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">PF Employer:</span>
                                            <span className="font-medium">{formatCurrency(line.pf_employer)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.gratuity?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Gratuity:</span>
                                            <span className="font-medium">{formatCurrency(line.gratuity)}</span>
                                          </div>
                                        )}
                                        {parseFloat(line.insurance_welfare?.toString() || '0') > 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Insurance:</span>
                                            <span className="font-medium">{formatCurrency(line.insurance_welfare)}</span>
                                          </div>
                                        )}
                                        <div className="border-t border-blue-300 pt-2 mt-3">
                                          <div className="text-xs text-gray-600 italic">
                                            Company expense/liability
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No employee details available for this payroll run.</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filteredPayrollRuns.length === 0 && !loading && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll runs found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No payroll runs match your search criteria.' : 'Get started by creating your first payroll run.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payroll Run
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
