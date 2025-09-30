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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Receipt, Calendar, DollarSign, FileText } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

// UOM options for different item categories
const UOM_OPTIONS = {
  feed: ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'],
  medicine: ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'],
  equipment: ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'],
  chemical: ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'],
  supplies: ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'],
  maintenance: ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'],
  other: ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'],
};

interface Bill {
  bill_id: number;
  vendor: number; // This is the vendor ID from the ForeignKey
  vendor_id?: number; // Keep for backward compatibility
  vendor_name?: string;
  bill_no: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  open_balance: number;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue';
  memo: string;
  created_at: string;
  updated_at: string;
  user: number; // User foreign key
  user_username: string; // Username for display
  terms?: number | null; // Payment terms
}

interface BillLine {
  bill_line_id: number;
  bill: number; // Foreign key referencing bill_id from Bill table
  is_item: boolean;
  // Item mode fields
  item?: number; // Foreign key to item
  item_name?: string;
  description?: string;
  qty?: number; // Quantity field name from API
  unit?: string; // Unit of measurement
  packet_size?: number; // Packet size in kg
  cost?: number; // Cost field name from API
  line_amount?: number; // Line amount field name from API
  // Fish-specific
  species?: number;
  total_weight?: number;
  fish_count?: number;
  body_weight_per_fish?: number;
  line_number?: number;
  // Expense mode fields
  expense_account?: number; // Foreign key to expense account
  expense_account_name?: string;
  amount?: number;
  line_memo?: string; // Memo field name from API
  pond?: number; // Foreign key to pond
  created_at: string;
}

interface Vendor {
  vendor_id: number;
  name: string;
}

interface Item {
  item_id: number;
  name: string;
  item_type: string;
  category?: string | null;
}

interface Account {
  account_id: number;
  name: string;
  account_type: string;
  parent?: number;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [billLines, setBillLines] = useState<BillLine[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showBillLines, setShowBillLines] = useState<number | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [currentBillLines, setCurrentBillLines] = useState<BillLine[]>([]);
  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_no: '',
    bill_date: new Date().toISOString().split('T')[0], // Today's date
    due_date: new Date().toISOString().split('T')[0], // Today's date
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<BillLine>[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'items'>('expenses');

  const { get, post, put, delete: del } = useApi();

  // Auto-calc helper for fish: when any two of (fish_count, body_weight_per_fish, total_weight) are provided, compute the third
  const updateFishLineFields = (index: number, updates: Partial<BillLine>) => {
    const li = { ...(lineItems[index] || {}), ...updates } as any;
    
    // Get current values, handling empty strings and null values
    const fishCount = li.fish_count !== '' && li.fish_count !== null ? Number(li.fish_count) : 0;
    const lineNumber = li.line_number !== '' && li.line_number !== null ? Number(li.line_number) : 0;
    const totalWeight = li.total_weight !== '' && li.total_weight !== null ? Number(li.total_weight) : 0;
    
    const hasCount = fishCount > 0;
    const hasLn = lineNumber > 0; // pcs per kg
    const hasTw = totalWeight > 0;

    // Determine which field was just updated
    const updatedField = Object.keys(updates)[0];
    
    // Auto-calculate based on which field was updated and what other values are available
    if (updatedField === 'fish_count' || updatedField === 'line_number') {
      // If species number or line number changed, calculate total weight
      if (hasCount && hasLn) {
        li.total_weight = fishCount / lineNumber;
      } else if (!hasCount || !hasLn) {
        // If one of the inputs is cleared, clear total weight
        li.total_weight = '';
      }
    } else if (updatedField === 'total_weight') {
      // If total weight was manually changed, check if we can calculate line number
      const newTotalWeight = li.total_weight !== '' && li.total_weight !== null ? Number(li.total_weight) : 0;
      const currentFishCount = li.fish_count !== '' && li.fish_count !== null ? Number(li.fish_count) : 0;
      
      if (newTotalWeight > 0 && currentFishCount > 0) {
        // Calculate line number when both species number and total weight are provided
        li.line_number = currentFishCount / newTotalWeight;
      } else if (newTotalWeight === 0 || currentFishCount === 0) {
        // If one of the inputs is cleared, clear line number
        li.line_number = '';
      }
    }

    // Keep qty/unit aligned for fish: qty mirrors total_weight in kg
    const finalTotalWeight = li.total_weight !== '' && li.total_weight !== null ? Number(li.total_weight) : 0;
    if (finalTotalWeight > 0) {
      li.qty = finalTotalWeight;
      li.unit = 'kg';
    } else {
      li.qty = '';
    }

    // Auto compute line_amount for fish using total_weight (effective quantity)
    const cost = Number(li.cost) || 0;
    const effectiveQty = finalTotalWeight;
    if (cost && effectiveQty) {
      li.line_amount = cost * effectiveQty;
    } else {
      li.line_amount = '';
    }

    const updated = [...lineItems];
    updated[index] = li;
    setLineItems(updated);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchNextBillNumber = async () => {
    try {
      const response = await get('/bills/next_bill_number/');
      if (response.next_bill_number) {
        setFormData(prev => ({ ...prev, bill_no: response.next_bill_number }));
      }
    } catch (error) {
      console.error('Error fetching next bill number:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsResponse, vendorsResponse, itemsResponse, accountsResponse] = await Promise.all([
        get('/bills/'),
        get('/vendors/'),
        get('/items/'),
        get('/accounts/').catch(err => {
          console.error('Error fetching accounts:', err);
          return { results: [] };
        }),
      ]);
      
      setBills(billsResponse.results || billsResponse);
      setVendors(vendorsResponse.results || vendorsResponse);
      setItems(itemsResponse.results || itemsResponse);
      setAccounts(accountsResponse.results || accountsResponse);
      
      // Debug logging
      console.log('Accounts response:', accountsResponse);
      console.log('Accounts data:', accountsResponse.results || accountsResponse);
      console.log('Accounts count:', (accountsResponse.results || accountsResponse).length);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillLines = async (billId: number) => {
    try {
      console.log('Fetching bill lines for bill ID:', billId);
      const response = await get(`/bill-lines/?bill=${billId}`);
      const lines = response.results || response;
      console.log('Fetched bill lines:', lines);
      setBillLines(lines);
      setCurrentBillLines(lines);
    } catch (error) {
      console.error('Error fetching bill lines:', error);
      setBillLines([]);
      setCurrentBillLines([]);
    }
  };

  const calculateTotals = () => {
    const totalAmount = lineItems.reduce((sum, line) => {
      if (line.is_item) {
        return sum + (Number(line.line_amount) || 0);
      } else {
        return sum + (Number(line.amount) || 0);
      }
    }, 0);
    return { totalAmount: Number(totalAmount) || 0 };
  };

  const addLineItem = () => {
    const newLineItem: Partial<BillLine> = {
      is_item: activeTab === 'items',
    };
    
    if (activeTab === 'items') {
      newLineItem.item = 0;
      newLineItem.qty = 0;
      newLineItem.unit = 'kg'; // Default unit
      newLineItem.packet_size = 0;
      newLineItem.cost = 0;
      newLineItem.line_amount = 0;
    } else {
      newLineItem.expense_account = 0;
      newLineItem.amount = 0;
    }
    
    setLineItems([...lineItems, newLineItem]);
  };

  const getUomOptionsForItem = (itemId: number) => {
    // Return the comprehensive list of UOM options for all items
    return ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'];
  };

  const updateLineItem = (index: number, field: keyof BillLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // If item changes, reset unit to first available option for that category
    if (field === 'item' && updated[index].is_item) {
      const uomOptions = getUomOptionsForItem(value);
      updated[index].unit = uomOptions[0] || 'kg';
      updated[index].packet_size = 0;
    }
    
    // Calculate total cost for item mode
    if (updated[index].is_item && (field === 'qty' || field === 'cost')) {
      const quantity = updated[index].qty || 0;
      const cost = updated[index].cost || 0;
      updated[index].line_amount = quantity * cost;
    }
    
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.vendor_id) {
      toast.error('Please select a vendor');
      return;
    }
    
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    
    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      if (line.is_item) {
        if (!line.item || line.item === 0) {
          toast.error(`Please select an item for line ${i + 1}`);
          return;
        }
        // Determine if fish item
        const selectedItem = items.find(it => it.item_id === line.item);
        const isFish = selectedItem?.category === 'fish';
        if (isFish) {
          if (!line.total_weight || line.total_weight <= 0) {
            toast.error(`Please enter a valid total weight for line ${i + 1}`);
            return;
          }
        } else {
          if (!line.qty || line.qty <= 0) {
            toast.error(`Please enter a valid quantity for line ${i + 1}`);
            return;
          }
        }
        if (!line.cost || line.cost <= 0) {
          toast.error(`Please enter a valid unit cost for line ${i + 1}`);
          return;
        }
      } else {
        if (!line.expense_account || line.expense_account === 0) {
          toast.error(`Please select an expense account for line ${i + 1}`);
          return;
        }
        if (!line.amount || line.amount <= 0) {
          toast.error(`Please enter a valid amount for line ${i + 1}`);
          return;
        }
      }
    }
    
    try {
      const totals = calculateTotals();
      const { vendor_id, ...formDataWithoutVendorId } = formData;
      const billData = {
        ...formDataWithoutVendorId,
        vendor: parseInt(vendor_id),
        total_amount: totals.totalAmount,
        open_balance: totals.totalAmount,
      };
      
      console.log('Bill data being sent:', billData);

      if (editingBill) {
        await put(`/bills/${editingBill.bill_id}/`, billData);
        
        // Delete existing bill lines
        const existingLines = await get(`/bill-lines/?bill=${editingBill.bill_id}`);
        const linesToDelete = existingLines.results || existingLines;
        for (const line of linesToDelete) {
          await del(`/bill-lines/${line.bill_line_id}/`);
        }
        
        // Create new bill lines
        for (const line of lineItems) {
          const billLineData: any = {
            bill: editingBill.bill_id,
            is_item: line.is_item || false,
          };
          
          if (line.is_item) {
            const selectedItem = items.find(it => it.item_id === line.item);
            const isFish = selectedItem?.category === 'fish';
            billLineData.item = line.item || null;
            billLineData.description = line.description || '';
            billLineData.qty = isFish ? (line.total_weight || 0) : (line.qty || 0);
            billLineData.unit = isFish ? 'kg' : (line.unit || 'kg');
            billLineData.packet_size = isFish ? null : (line.packet_size || null);
            billLineData.cost = line.cost || 0;
            billLineData.line_amount = line.line_amount || 0;
            if (isFish) {
              billLineData.total_weight = line.total_weight || 0;
              billLineData.fish_count = line.fish_count || null;
              billLineData.body_weight_per_fish = line.body_weight_per_fish || null;
            }
          } else {
            billLineData.expense_account = line.expense_account || null;
            billLineData.amount = line.amount || 0;
            billLineData.line_memo = line.line_memo || '';
            billLineData.pond = line.pond || null;
          }
          
          await post('/bill-lines/', billLineData);
        }
        
        toast.success('Bill updated successfully');
      } else {
        const response = await post('/bills/', billData);
        
        // Create bill lines
        for (const line of lineItems) {
          const billLineData: any = {
            bill: response.bill_id,
            is_item: line.is_item || false,
          };
          
          if (line.is_item) {
            const selectedItem = items.find(it => it.item_id === line.item);
            const isFish = selectedItem?.category === 'fish';
            billLineData.item = line.item || null;
            billLineData.description = line.description || '';
            billLineData.qty = isFish ? (line.total_weight || 0) : (line.qty || 0);
            billLineData.unit = isFish ? 'kg' : (line.unit || 'kg');
            billLineData.packet_size = isFish ? null : (line.packet_size || null);
            billLineData.cost = line.cost || 0;
            billLineData.line_amount = line.line_amount || 0;
            if (isFish) {
              billLineData.total_weight = line.total_weight || 0;
              billLineData.fish_count = line.fish_count || null;
              billLineData.body_weight_per_fish = line.body_weight_per_fish || null;
            }
          } else {
            billLineData.expense_account = line.expense_account || null;
            billLineData.amount = line.amount || 0;
            billLineData.line_memo = line.line_memo || '';
            billLineData.pond = line.pond || null;
          }
          
          await post('/bill-lines/', billLineData);
        }
        
        toast.success('Bill created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingBill(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving bill:', error);
      if (error.response?.data?.error && error.response.data.error.includes('already exists')) {
        toast.error(`Bill number '${formData.bill_no}' already exists. Please use a different number.`);
      } else {
        toast.error('Failed to save bill');
      }
    }
  };

  const handleEdit = async (bill: Bill) => {
    console.log('Edit button clicked for bill:', bill);
    console.log('Bill vendor_id:', bill.vendor_id);
    console.log('Bill vendor:', bill.vendor);
    
    // Get the vendor ID from either field - prioritize vendor field
    const vendorId = bill.vendor || bill.vendor_id;
    if (!vendorId) {
      console.error('No vendor ID found in bill:', bill);
      toast.error('Invalid bill data: missing vendor information');
      return;
    }
    
    // Reset form first to ensure clean state
    resetForm();
    
    // Set the specific bill being edited
    setEditingBill(bill);
    setFormData({
      vendor_id: vendorId.toString(),
      bill_no: bill.bill_no || '',
      bill_date: bill.bill_date || new Date().toISOString().split('T')[0],
      due_date: bill.due_date || new Date().toISOString().split('T')[0],
      memo: bill.memo || '',
    });
    
    // Load existing bill lines for this specific bill only
    try {
      const response = await get(`/bill-lines/?bill=${bill.bill_id}`);
      const existingLines = response.results || response;
      
      // Convert existing lines to our format
      const formattedLines = existingLines.map((line: any) => ({
        bill_line_id: line.bill_line_id,
        bill: line.bill, // Foreign key to bill
        is_item: line.is_item,
        // Item mode fields
        item: line.item || null,
        item_name: line.item_name || '',
        description: line.description || '',
        qty: line.qty || 0,
        unit: line.unit || 'kg',
        packet_size: line.packet_size || 0,
        cost: line.cost || 0,
        line_amount: line.line_amount || 0,
        // Expense mode fields
        expense_account: line.expense_account || null,
        expense_account_name: line.expense_account_name || '',
        amount: line.amount || 0,
        line_memo: line.line_memo || '',
        pond: line.pond || null,
        created_at: line.created_at,
      }));
      
      setLineItems(formattedLines);
      
      // Set the active tab based on the first line item type, or default to expenses
      if (formattedLines.length > 0) {
        setActiveTab(formattedLines[0].is_item ? 'items' : 'expenses');
      } else {
        setActiveTab('expenses');
      }
    } catch (error) {
      console.error('Error loading bill lines:', error);
      setLineItems([]);
      setActiveTab('expenses');
    }
    
    // Open dialog for this specific bill
    setIsDialogOpen(true);
  };

  const handleDelete = async (billId: number) => {
    if (confirm('Are you sure you want to delete this bill?')) {
      try {
        await del(`/bills/${billId}/`);
        toast.success('Bill deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting bill:', error);
        toast.error('Failed to delete bill');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      bill_no: '',
      bill_date: new Date().toISOString().split('T')[0], // Today's date
      due_date: new Date().toISOString().split('T')[0], // Today's date
      memo: '',
    });
    setLineItems([]);
    setActiveTab('expenses');
    setEditingBill(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bills (Accounts Payable)</h1>
          <p className="text-gray-600 mt-1">Manage vendor bills and accounts payable</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          } else if (!editingBill) {
            // Fetch next bill number when opening for new bill
            fetchNextBillNumber();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingBill(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBill ? `Edit Bill #${editingBill.bill_no}` : 'Add New Bill'}
              </DialogTitle>
              <DialogDescription>
                {editingBill ? `Update information for bill #${editingBill.bill_no}` : 'Create a new vendor bill. Bill number will be auto-generated but can be customized.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {editingBill && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Edit className="h-4 w-4" />
                    <span className="font-medium">Editing Bill #{editingBill.bill_no}</span>
                    <span className="text-sm text-blue-600">
                      ({editingBill.vendor_name || 'Unknown Vendor'})
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_id">Vendor *</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.vendor_id} value={vendor.vendor_id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill_no">Bill Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bill_no"
                      value={formData.bill_no}
                      onChange={(e) => setFormData({ ...formData, bill_no: e.target.value })}
                      placeholder="Auto-generated"
                      className="h-12"
                    />
                    {!editingBill && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchNextBillNumber}
                        className="h-12 px-3"
                        title="Get next auto-generated number"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill_date">Bill Date *</Label>
                  <Input
                    id="bill_date"
                    type="date"
                    value={formData.bill_date}
                    onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes about the bill"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Bill Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Bill Lines</Label>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'expenses' | 'items')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="items">Items</TabsTrigger>
                  </TabsList>

                  <TabsContent value="expenses">
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {lineItems.filter(line => !line.is_item).map((line, originalIndex) => {
                        // Find the original index in the full lineItems array
                        const actualIndex = lineItems.findIndex(item => item === line);
                        return (
                        <Card key={actualIndex} className="p-6">
                          <div className="grid grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                              <Label>Chart of Account</Label>
                              <Select
                                value={line.expense_account?.toString() || ''}
                                onValueChange={(value) => updateLineItem(actualIndex, 'expense_account', parseInt(value))}
                              >
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {loading ? (
                                    <SelectItem value="loading" disabled>
                                      Loading accounts...
                                    </SelectItem>
                                  ) : accounts.length > 0 ? (
                                    accounts.map((account) => (
                                      <SelectItem key={account.account_id} value={account.account_id.toString()}>
                                        {account.name} ({account.account_type})
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-accounts" disabled>
                                      No accounts available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Amount</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={line.amount || ''}
                                onChange={(e) => updateLineItem(actualIndex, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="Amount"
                                className="h-12"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Memo</Label>
                              <Input
                                value={line.line_memo || ''}
                                onChange={(e) => updateLineItem(actualIndex, 'line_memo', e.target.value)}
                                placeholder="Memo"
                                className="h-12"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Actions</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLineItem(actualIndex)}
                                className="text-red-600 hover:text-red-700 h-12 px-3"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="items">
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {lineItems.filter(line => line.is_item).map((line, originalIndex) => {
                        // Find the original index in the full lineItems array
                        const actualIndex = lineItems.findIndex(item => item === line);
                        return (
                        <Card key={actualIndex} className="p-6">
                          <div className="space-y-4">
                            {/* First row - Item and Description */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Item List</Label>
                                <Select
                                  value={line.item?.toString() || ''}
                                  onValueChange={(value) => updateLineItem(actualIndex, 'item', parseInt(value))}
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select item" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {items.map((item) => (
                                      <SelectItem key={item.item_id} value={item.item_id.toString()}>
                                        {item.name} ({item.category || 'No Category'})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                  value={line.description || ''}
                                  onChange={(e) => updateLineItem(actualIndex, 'description', e.target.value)}
                                  placeholder="Description"
                                  className="h-12"
                                />
                              </div>
                            </div>
                            
                            {/* Conditional block: standard fields for non-fish items; fish block otherwise */}
                            {(() => {
                              const selectedItem = items.find(i => i.item_id === line.item);
                              const isFish = selectedItem?.category === 'fish';
                              if (!isFish) {
                                return (
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label>Quantity</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={line.qty || ''}
                                        onChange={(e) => updateLineItem(actualIndex, 'qty', parseFloat(e.target.value) || 0)}
                                        placeholder="Quantity"
                                        className="h-12"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Unit of Measure</Label>
                                      <Select
                                        value={line.unit || 'kg'}
                                        onValueChange={(value) => updateLineItem(actualIndex, 'unit', value)}
                                      >
                                        <SelectTrigger className="h-12">
                                          <SelectValue placeholder="Select unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getUomOptionsForItem(line.item || 0).map((uom) => (
                                            <SelectItem key={uom} value={uom}>
                                              {uom}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {line.unit === 'packet' && (
                                      <div className="space-y-2">
                                        <Label>Packet Size (kg)</Label>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          value={line.packet_size || ''}
                                          onChange={(e) => updateLineItem(actualIndex, 'packet_size', parseFloat(e.target.value) || 0)}
                                          placeholder="e.g., 10, 25"
                                          className="h-12"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label>Species Number</Label>
                                      <Input
                                        type="number"
                                        value={line.fish_count || ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          updateFishLineFields(actualIndex, { fish_count: value === '' ? '' : parseInt(value) || 0 });
                                        }}
                                        placeholder="Number of fish (pcs)"
                                        className="h-12"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Line Number (pcs per kg)</Label>
                                      <Input
                                        type="number"
                                        step="1"
                                        value={line.line_number || ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          updateFishLineFields(actualIndex, { line_number: value === '' ? '' : parseFloat(value) || 0 });
                                        }}
                                        placeholder="e.g., 4 (pcs/kg)"
                                        className="h-12"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Total Weight (kg)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={line.total_weight || ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          updateFishLineFields(actualIndex, { total_weight: value === '' ? '' : parseFloat(value) || 0 });
                                        }}
                                        placeholder="Auto/Manual total"
                                        className="h-12"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* Third row - Cost, Amount, and Actions */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Cost per Unit</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={line.cost || ''}
                                  onChange={(e) => {
                                    const cost = parseFloat(e.target.value) || 0;
                                    const selectedItem = items.find(i => i.item_id === line.item);
                                    if (selectedItem?.category === 'fish') {
                                      updateFishLineFields(actualIndex, { cost });
                                    } else {
                                      updateLineItem(actualIndex, 'cost', cost);
                                    }
                                  }}
                                  placeholder="Cost per unit"
                                  className="h-12"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Total Amount</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={line.line_amount || 0}
                                  readOnly
                                  className="bg-gray-50 h-12"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Actions</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeLineItem(actualIndex)}
                                  className="text-red-600 hover:text-red-700 h-12 px-3 w-full"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-1 gap-4 text-center">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ৳{(calculateTotals().totalAmount || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">Total Amount</div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBill ? `Update Bill #${editingBill.bill_no}` : 'Create Bill'}
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
            placeholder="Search bills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Bills Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bills...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Bill Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.bill_id}>
                  <TableCell className="font-medium">{bill.bill_no}</TableCell>
                  <TableCell>{bill.vendor_name || '-'}</TableCell>
                  <TableCell>
                    {bill.lines && bill.lines.length > 0 ? (
                      <div className="space-y-1 max-w-xs">
                        {bill.lines.map((line: any) => (
                          <div key={line.bill_line_id} className="text-xs">
                            <div className="font-medium">
                              {line.is_item ? (line.item_name || 'Item') : (line.expense_account_name || 'Expense')}
                            </div>
                            <div className="text-gray-500">
                              {line.is_item ? (
                                `${line.description || ''} ${line.qty ? `• Qty: ${line.qty}` : ''} ${line.unit ? ` ${line.unit}` : ''} ${line.cost ? `• ৳${Number(line.cost).toFixed(2)}` : ''}`
                              ) : (
                                `${line.description || line.line_memo || ''} ${line.amount ? `• ৳${Number(line.amount).toFixed(2)}` : ''}`
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No items</span>
                    )}
                  </TableCell>
                  <TableCell>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>৳{bill.total_amount ? Number(bill.total_amount).toFixed(2) : '0.00'}</TableCell>
                  <TableCell>৳{bill.paid_amount ? Number(bill.paid_amount).toFixed(2) : '0.00'}</TableCell>
                  <TableCell className="font-medium">৳{bill.open_balance ? Number(bill.open_balance).toFixed(2) : '0.00'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(bill)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Details button clicked for bill:', bill.bill_id);
                          if (showBillLines === bill.bill_id) {
                            setShowBillLines(null);
                            setSelectedBill(null);
                            setCurrentBillLines([]);
                          } else {
                            setShowBillLines(bill.bill_id);
                            setSelectedBill(bill);
                            fetchBillLines(bill.bill_id);
                          }
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(bill.bill_id)}
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

      {/* Bill Details Display */}
      {showBillLines && selectedBill && (
        <div className="space-y-6">
          {/* Bill Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Bill Details - #{selectedBill.bill_no}
                  </CardTitle>
                  <CardDescription>
                    Complete information for this bill
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(selectedBill.status || '')}>
                  {selectedBill.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Vendor</p>
                  <p className="text-sm">{selectedBill.vendor_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Bill Date</p>
                  <p className="text-sm">{selectedBill.bill_date ? new Date(selectedBill.bill_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p className="text-sm">{selectedBill.due_date ? new Date(selectedBill.due_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-sm font-semibold text-green-600">৳{selectedBill.total_amount ? Number(selectedBill.total_amount).toFixed(2) : '0.00'}</p>
                </div>
              </div>
              {selectedBill.memo && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-2">Memo</p>
                  <p className="text-sm text-gray-700">{selectedBill.memo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill Lines Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Line Items
              </CardTitle>
              <CardDescription>
                Detailed breakdown of all line items
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentBillLines.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Item/Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentBillLines.map((line) => (
                        <TableRow key={line.bill_line_id}>
                          <TableCell>
                            <Badge variant={line.is_item ? "default" : "secondary"} className="w-fit">
                              {line.is_item ? "Item" : "Expense"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {line.is_item ? line.item_name : line.expense_account_name}
                          </TableCell>
                          <TableCell>
                            {line.is_item ? line.description : line.line_memo}
                          </TableCell>
                          <TableCell>{line.qty || '-'}</TableCell>
                          <TableCell>{line.unit || '-'}</TableCell>
                          <TableCell>{line.cost ? `৳${Number(line.cost).toFixed(2)}` : '-'}</TableCell>
                          <TableCell className="font-medium text-right">
                            ৳{line.is_item ? (Number(line.line_amount || 0).toFixed(2)) : (Number(line.amount || 0).toFixed(2))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Summary */}
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right space-y-1">
                      <div className="text-sm text-gray-600">Total Amount</div>
                      <div className="text-xl font-bold text-green-600">
                        ৳{currentBillLines.reduce((sum, line) => sum + (line.is_item ? (Number(line.line_amount) || 0) : (Number(line.amount) || 0)), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No line items found for this bill</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {filteredBills.length === 0 && !loading && (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No bills match your search criteria.' : 'Get started by creating your first bill.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          )}
        </div>
      )}

      {/* Total Accounts Payable Summary */}
      {!loading && bills.length > 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Total Accounts Payable</h3>
                  <p className="text-sm text-gray-600">Outstanding balance across all bills</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600">
                  ৳{bills.reduce((sum, bill) => sum + (Number(bill.open_balance) || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  {bills.filter(bill => (Number(bill.open_balance) || 0) > 0).length} bills with outstanding balance
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}