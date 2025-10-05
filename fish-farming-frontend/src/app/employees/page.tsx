'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, UserCheck, Calendar, DollarSign, Phone, Mail, FileText, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface Employee {
  employee_id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  hire_date: string;
  salary: number;
  status: 'active' | 'inactive' | 'terminated';
  notes: string;
  created_at: string;
}

interface EmployeeLedgerEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'payroll' | 'bonus' | 'deduction' | 'other';
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Employee ledger state
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<EmployeeLedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);


  // Helper function to safely format salary
  const formatSalary = (salary: any) => {
    if (salary === null || salary === undefined || salary === '') return '$0.00';
    const numSalary = typeof salary === 'string' ? parseFloat(salary) : salary;
    if (isNaN(numSalary)) return '$0.00';
    return `$${numSalary.toFixed(2)}`;
  };

  // Helper function to safely format date
  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };
  const [formData, setFormData] = useState({
    employee_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    hire_date: '',
    salary: '',
    status: 'active',
    notes: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await get('/employees/');
      setEmployees(response.results || response);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const employeeData = {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
        employee_number: formData.employee_number || `EMP-${Date.now()}`,
      };

      if (editingEmployee) {
        await put(`/employees/${editingEmployee.employee_id}/`, employeeData);
        toast.success('Employee updated successfully');
      } else {
        await post('/employees/', employeeData);
        toast.success('Employee created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Failed to save employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_number: employee.employee_number || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      hire_date: employee.hire_date || '',
      salary: employee.salary?.toString() || '',
      status: employee.status,
      notes: employee.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (employeeId: number) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await del(`/employees/${employeeId}/`);
        toast.success('Employee deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error('Failed to delete employee');
      }
    }
  };

  const fetchEmployeeLedger = async (employee: Employee) => {
    try {
      setLoadingLedger(true);
      setSelectedEmployee(employee);
      setIsLedgerOpen(true);
      
      const entries: EmployeeLedgerEntry[] = [];
      
      // Fetch payroll runs for this employee
      const payrollRunsResponse = await get('/payroll-runs/');
      const payrollRuns = payrollRunsResponse.results || payrollRunsResponse;
      
      // Filter payroll runs that include this employee
      const employeePayrollRuns = payrollRuns.filter((run: any) => 
        run.lines && run.lines.some((line: any) => line.employee === employee.employee_id)
      );
      
      // Create ledger entries from payroll runs
      employeePayrollRuns.forEach((run: any) => {
        const employeeLine = run.lines.find((line: any) => line.employee === employee.employee_id);
        if (employeeLine) {
          // Add earnings entries
          if (employeeLine.full_salary > 0) {
            entries.push({
              id: `salary-${run.payroll_run_id}`,
              date: run.pay_date,
              description: `Salary - ${run.period_start} to ${run.period_end}`,
              reference: `PR-${run.payroll_run_id}`,
              debit: parseFloat(employeeLine.full_salary || '0'),
              credit: 0,
              balance: 0, // Will be calculated later
              type: 'payroll'
            });
          }
          
          if (employeeLine.overtime_pay > 0) {
            entries.push({
              id: `overtime-${run.payroll_run_id}`,
              date: run.pay_date,
              description: `Overtime Pay (${employeeLine.overtime_hours}h)`,
              reference: `PR-${run.payroll_run_id}`,
              debit: parseFloat(employeeLine.overtime_pay || '0'),
              credit: 0,
              balance: 0, // Will be calculated later
              type: 'payroll'
            });
          }
          
          if (employeeLine.harvest_incentive > 0) {
            entries.push({
              id: `harvest-${run.payroll_run_id}`,
              date: run.pay_date,
              description: 'Harvest Incentive',
              reference: `PR-${run.payroll_run_id}`,
              debit: parseFloat(employeeLine.harvest_incentive || '0'),
              credit: 0,
              balance: 0, // Will be calculated later
              type: 'bonus'
            });
          }
          
          if (employeeLine.festival_bonus > 0) {
            entries.push({
              id: `festival-${run.payroll_run_id}`,
              date: run.pay_date,
              description: 'Festival Bonus',
              reference: `PR-${run.payroll_run_id}`,
              debit: parseFloat(employeeLine.festival_bonus || '0'),
              credit: 0,
              balance: 0, // Will be calculated later
              type: 'bonus'
            });
          }
          
          if (employeeLine.performance_bonus > 0) {
            entries.push({
              id: `performance-${run.payroll_run_id}`,
              date: run.pay_date,
              description: 'Performance Bonus',
              reference: `PR-${run.payroll_run_id}`,
              debit: parseFloat(employeeLine.performance_bonus || '0'),
              credit: 0,
              balance: 0, // Will be calculated later
              type: 'bonus'
            });
          }
          
          // Add deduction entries
          if (employeeLine.absent_deduction > 0) {
            entries.push({
              id: `absent-${run.payroll_run_id}`,
              date: run.pay_date,
              description: `Absent Deduction (${employeeLine.absent_days} days)`,
              reference: `PR-${run.payroll_run_id}`,
              debit: 0,
              credit: parseFloat(employeeLine.absent_deduction || '0'),
              balance: 0, // Will be calculated later
              type: 'deduction'
            });
          }
          
          if (employeeLine.loan_advance > 0) {
            entries.push({
              id: `loan-${run.payroll_run_id}`,
              date: run.pay_date,
              description: 'Loan/Advance Deduction',
              reference: `PR-${run.payroll_run_id}`,
              debit: 0,
              credit: parseFloat(employeeLine.loan_advance || '0'),
              balance: 0, // Will be calculated later
              type: 'deduction'
            });
          }
          
          if (employeeLine.pf_employee > 0) {
            entries.push({
              id: `pf-${run.payroll_run_id}`,
              date: run.pay_date,
              description: 'Provident Fund (Employee)',
              reference: `PR-${run.payroll_run_id}`,
              debit: 0,
              credit: parseFloat(employeeLine.pf_employee || '0'),
              balance: 0, // Will be calculated later
              type: 'deduction'
            });
          }
          
          if (employeeLine.tax_paye > 0) {
            entries.push({
              id: `tax-${run.payroll_run_id}`,
              date: run.pay_date,
              description: 'Tax (PAYE)',
              reference: `PR-${run.payroll_run_id}`,
              debit: 0,
              credit: parseFloat(employeeLine.tax_paye || '0'),
              balance: 0, // Will be calculated later
              type: 'deduction'
            });
          }
        }
      });
      
      // Sort entries by date (oldest first for proper balance calculation)
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate running balance
      let runningBalance = 0;
      entries.forEach(entry => {
        runningBalance += entry.debit - entry.credit;
        entry.balance = runningBalance;
      });
      
      // Sort back to newest first for display
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setLedgerEntries(entries);
    } catch (error: any) {
      console.error('Error fetching employee ledger:', error);
      toast.error('Failed to fetch employee ledger');
      setLedgerEntries([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_number: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      hire_date: '',
      salary: '',
      status: 'active',
      notes: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEmployees = employees.filter(employee =>
    `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.employee_number && employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.position && employee.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage employee information and records</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEmployee(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee information' : 'Add a new employee to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_number">Employee Number</Label>
                  <Input
                    id="employee_number"
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    placeholder="Employee number"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Job position"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="First name"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Last name"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Hire Date *</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="Monthly salary"
                    className="h-12"
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the employee"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'Update' : 'Create'} Employee
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Employees Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employees...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.employee_id}>
                  <TableCell className="font-medium">{employee.employee_number}</TableCell>
                  <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>{formatDate(employee.hire_date)}</TableCell>
                  <TableCell>{formatSalary(employee.salary)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(employee.status)}>
                      {employee.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchEmployeeLedger(employee)}
                        className="text-blue-600 hover:text-blue-700"
                        title="View Employee Ledger"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(employee.employee_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filteredEmployees.length === 0 && !loading && (
        <div className="text-center py-12">
          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No employees match your search criteria.' : 'Get started by adding your first employee.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>
      )}

      {/* Employee Ledger Modal */}
      <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Employee Ledger - {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Transaction history for {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''} - {selectedEmployee?.position}
            </DialogDescription>
          </DialogHeader>
          
          {loadingLedger ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading employee ledger...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Employee Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}</h3>
                    <p className="text-sm text-gray-600">{selectedEmployee?.position}</p>
                    <p className="text-sm text-gray-600">Employee ID: {selectedEmployee?.employee_number}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Current Balance</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${ledgerEntries.length > 0 ? 
                        ledgerEntries[ledgerEntries.length - 1].balance.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              {ledgerEntries.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                        <TableHead className="text-right">Deductions</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                className={
                                  entry.type === 'payroll' ? 'bg-blue-100 text-blue-800' :
                                  entry.type === 'bonus' ? 'bg-green-100 text-green-800' :
                                  entry.type === 'deduction' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {entry.type.toUpperCase()}
                              </Badge>
                              <span>{entry.description}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{entry.reference}</TableCell>
                          <TableCell className="text-right">
                            {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ${entry.balance.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                  <p className="text-gray-600">
                    No payroll transactions found for {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLedgerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
