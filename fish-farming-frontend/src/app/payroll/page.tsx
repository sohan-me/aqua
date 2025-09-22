'use client';

import { useState, useEffect } from 'react';
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

interface PayrollRun {
  payroll_run_id: number;
  run_date: string;
  pay_period_start: string;
  pay_period_end: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: 'draft' | 'processed' | 'paid';
  created_at: string;
}

interface Employee {
  employee_id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  position: string;
  salary: number;
}

export default function PayrollPage() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRun | null>(null);
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
      const [payrollResponse, employeesResponse] = await Promise.all([
        get('/payroll-runs/'),
        get('/employees/'),
      ]);
      
      setPayrollRuns(payrollResponse.results || payrollResponse);
      setEmployees(employeesResponse.results || employeesResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payrollData = {
        ...formData,
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
      };

      if (editingPayroll) {
        await put(`/payroll-runs/${editingPayroll.payroll_run_id}/`, payrollData);
        toast.success('Payroll run updated successfully');
      } else {
        await post('/payroll-runs/', payrollData);
        toast.success('Payroll run created successfully');
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
      run_date: payroll.run_date,
      pay_period_start: payroll.pay_period_start,
      pay_period_end: payroll.pay_period_end,
      status: payroll.status,
    });
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'processed':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPayrollRuns = payrollRuns.filter(payroll =>
    payroll.run_date.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payroll.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
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
              ${payrollRuns.reduce((sum, run) => sum + run.total_gross, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Gross</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              ${payrollRuns.reduce((sum, run) => sum + run.total_deductions, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Deductions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${payrollRuns.reduce((sum, run) => sum + run.total_net, 0).toFixed(2)}
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
                <TableRow key={payroll.payroll_run_id}>
                  <TableCell>{new Date(payroll.run_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${payroll.total_gross.toFixed(2)}</TableCell>
                  <TableCell>${payroll.total_deductions.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${payroll.total_net.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payroll.status)}>
                      {payroll.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
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
