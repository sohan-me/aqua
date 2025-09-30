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
import { Plus, Search, Edit, Trash2, FileText, Calendar, DollarSign, User } from 'lucide-react';
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

interface Invoice {
  invoice_id: number;
  customer_id: number;
  customer_name?: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  open_balance: number;
  memo: string;
  created_at: string;
  updated_at: string;
  lines?: InvoiceLine[];
}

interface InvoiceLine {
  invoice_line_id: number;
  invoice_id: number;
  item_id: number;
  item_name?: string;
  item_category?: string;
  description?: string;
  qty: number;
  unit?: string; // Unit of measurement
  packet_size?: number; // Packet size in kg
  gallon_size?: number; // Gallon size in litres
  rate: number;
  amount: number;
  // Fish-specific fields
  pond_id?: number;
  species_id?: number;
  total_weight?: number;
  line_number?: number;
  fish_count?: number;
  pond_name?: string;
  species_name?: string;
}


interface Customer {
  customer_id: number;
  name: string;
  type?: string; // e.g., 'internal_pond' for internal customers
  pond?: number; // internal customer's pond id
  pond_name?: string;
}

interface Item {
  item_id: number;
  name: string;
  item_type: string;
  category?: string | null;
  uom: string;
  current_stock: number;
  total_stock_kg?: number;
  total_stock_in_unit?: number; // Stock in the item's primary unit
  selling_price?: number;
  income_account?: number;
  unit?: string;
  // Fish aggregate fields
  fish_total_weight_kg?: number;
  fish_count?: number;
  stock_entries?: Array<{
    entry_id: number;
    quantity: number;
    unit: string;
    packet_size?: number;
    kg_equivalent?: number;
  }>;
}

interface Pond {
  pond_id?: number;
  id?: number;
  name: string;
  water_area_decimal: number;
  depth_ft: number;
  volume_m3: number;
  location?: string;
  is_active: boolean;
}

interface Species {
  species_id?: number;
  id?: number;
  name: string;
  scientific_name?: string;
  description?: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  // Cache of pond -> customer stock list
  const [pondStockByPond, setPondStockByPond] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showInvoiceLines, setShowInvoiceLines] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [currentInvoiceLines, setCurrentInvoiceLines] = useState<InvoiceLine[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0], // Today's date
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<InvoiceLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  // Auto-apply pond for internal customer (customer linked to a pond)
  useEffect(() => {
    const customer = customers.find(c => String(c.customer_id) === String(formData.customer_id));
    if (!customer) return;
    if (customer.type === 'internal_pond' && customer.pond) {
      // Set pond on all line items (fish and non-fish) to customer's pond, hide selector in UI
      setLineItems(prev => prev.map(li => ({ ...li, pond_id: customer.pond })));
    } else {
      // External customer: do not force pond, allow manual selection
      setLineItems(prev => prev.map(li => ({ ...li, pond_id: li.pond_id })));
    }
  }, [formData.customer_id, customers]);

  // Prefetch customer stocks for any ponds referenced in lines or by the customer
  useEffect(() => {
    const customer = customers.find(c => String(c.customer_id) === String(formData.customer_id));
    const pondIds = new Set<number>();
    if (customer?.pond) pondIds.add(customer.pond);
    lineItems.forEach(li => { if (li.pond_id) pondIds.add(li.pond_id as number); });

    const fetchFor = Array.from(pondIds).filter(pid => !(pid in pondStockByPond));
    if (fetchFor.length === 0) return;

    (async () => {
      try {
        const results: Record<number, any[]> = {};
        for (const pid of fetchFor) {
          const resp = await get(`/customer-stocks/?pond=${pid}`);
          results[pid] = resp.results || resp || [];
        }
        setPondStockByPond(prev => ({ ...prev, ...results }));
      } catch (e) {
        // ignore fetch errors for hints
      }
    })();
  }, [lineItems, formData.customer_id, customers]);

  const getPondStock = (itemId?: number, pondId?: number) => {
    if (!itemId || !pondId) return undefined;
    const list = pondStockByPond[pondId];
    if (!list) return undefined;
    return list.find((cs: any) => Number(cs.item) === Number(itemId));
  };

  // Auto-calc helper for fish: when any two of (fish_count, line_number [pcs/kg], total_weight) are provided, compute the third
  const updateFishInvLineFields = (index: number, updates: any) => {
    const li = { ...(lineItems[index] || {}) } as any;
    // Merge with careful coercion to allow blanks and decimals
    Object.entries(updates).forEach(([k, v]) => {
      if (typeof v === 'string') {
        if (v === '') {
          li[k] = undefined;
        } else {
          const num = Number(v);
          li[k] = isNaN(num) ? undefined : num;
        }
      } else {
        li[k] = v;
      }
    });
    const hasCount = typeof li.fish_count === 'number' && li.fish_count > 0;
    const hasLn = typeof li.line_number === 'number' && li.line_number > 0; // pcs per kg
    const hasTw = typeof li.total_weight === 'number' && li.total_weight > 0;

    // total_weight = fish_count / line_number
    if (hasCount && hasLn && !hasTw) {
      li.total_weight = Number(li.fish_count) / Number(li.line_number);
    } else if (hasCount && hasTw && !hasLn) {
      const denom = Number(li.total_weight);
      li.line_number = denom > 0 ? Number(li.fish_count) / denom : 0;
    } else if (hasLn && hasTw && !hasCount) {
      li.fish_count = Math.round(Number(li.line_number) * Number(li.total_weight));
    }

    // Auto compute amount for fish using total_weight (effective quantity)
    const rate = Number(li.rate || 0);
    const effectiveQty = Number(li.total_weight || 0);
    li.amount = rate && effectiveQty ? rate * effectiveQty : li.amount;

    const updated = [...lineItems];
    updated[index] = { ...(lineItems[index] || {}), ...li };
    setLineItems(updated);
  };

  // Calculate correct stock from stock entries - returns stock in the item's primary unit
  const calculateCorrectStock = (item: Item): number => {
    if (!item.stock_entries || item.stock_entries.length === 0) {
      // Use total_stock_in_unit if available, otherwise fall back to total_stock_kg
      return item.total_stock_in_unit || item.total_stock_kg || 0;
    }

    // Unit mapping for invalid units found in database
    const unitMapping: { [key: string]: string } = {
      'pcs': 'piece',
      'pack': 'packet',
      'pieces': 'piece',
      'packets': 'packet',
      'liters': 'litre',
      'kilograms': 'kg',
      'grams': 'gram',
      'milliliters': 'ml',
      'tons': 'ton',
      'boxes': 'box',
      'bags': 'bag',
      'bottles': 'bottle'
    };

    let totalStock = 0;
    for (const entry of item.stock_entries) {
      const quantity = parseFloat(entry.quantity.toString());
      const unit = unitMapping[entry.unit] || entry.unit;
      
      if (unit === 'kg') {
        totalStock += quantity;
      } else if (unit === 'litre') {
        totalStock += quantity;
      } else if (unit === 'piece') {
        totalStock += quantity;
      } else if (unit === 'packet') {
        if (entry.packet_size) {
          // Convert packets to the base unit using packet size
          totalStock += quantity * parseFloat(entry.packet_size.toString());
        } else {
          // If no packet size, assume 1 packet = 1 unit
          totalStock += quantity;
        }
      } else if (unit === 'gram') {
        // Convert grams to kg (divide by 1000)
        totalStock += quantity / 1000;
      } else if (unit === 'ml') {
        // Convert ml to litre (divide by 1000)
        totalStock += quantity / 1000;
      } else if (unit === 'ton') {
        // Convert tons to kg (multiply by 1000)
        totalStock += quantity * 1000;
      } else {
        // For other units (box, bag, bottle), treat as 1:1
        totalStock += quantity;
      }
    }
    
    // Round to avoid floating point precision issues
    return Math.round(totalStock * 100) / 100;
  };

  // Get the appropriate unit for display
  const getDisplayUnit = (item: Item): string => {
    console.log(item);
    // Define valid units (matching the items page options)
    const validUnits = ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'];
    
    // Unit mapping for invalid units found in database
    const unitMapping: { [key: string]: string } = {
      'pcs': 'piece',
      'pack': 'packet',
      'pieces': 'piece',
      'packets': 'packet',
      'liters': 'litre',
      'kilograms': 'kg',
      'grams': 'gram',
      'milliliters': 'ml',
      'tons': 'ton',
      'boxes': 'box',
      'bags': 'bag',
      'bottles': 'bottle'
    };
    
    console.log("item.stock_entries", item.stock_entries);
    
    // If no stock entries, use the item's default unit
    if (!item.stock_entries || item.stock_entries.length === 0) {
      console.log("item.unit");
      const itemUnit = item.unit || 'kg';
      console.log("itemUnit", itemUnit);
      return unitMapping[itemUnit] || (validUnits.includes(itemUnit) ? itemUnit : 'kg');
    }
    
    // Get the most common unit from stock entries
    const unitCounts: { [key: string]: number } = {};
    for (const entry of item.stock_entries) {
      const mappedUnit = unitMapping[entry.unit] || entry.unit;
      unitCounts[mappedUnit] = (unitCounts[mappedUnit] || 0) + 1;
    }
    
    // Return the most common valid unit, or the item's default unit
    const mostCommonUnit = Object.keys(unitCounts).reduce((a, b) => 
      unitCounts[a] > unitCounts[b] ? a : b
    );
    
    const finalUnit = mostCommonUnit || item.unit || 'kg';
    return unitMapping[finalUnit] || (validUnits.includes(finalUnit) ? finalUnit : 'kg');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await get('/invoices/next_invoice_number/');
      if (response.next_invoice_number) {
        setFormData(prev => ({ ...prev, invoice_no: response.next_invoice_number }));
      }
    } catch (error) {
      console.error('Error fetching next invoice number:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesResponse, customersResponse, itemsResponse, pondsResponse, speciesResponse] = await Promise.all([
        get('/invoices/'),
        get('/customers/'),
        get('/items/'),
        get('/ponds/'),
        get('/species/'),
      ]);
      
      console.log('Items data from API:', itemsResponse.results || itemsResponse);
      console.log('Sample item with category:', (itemsResponse.results || itemsResponse)?.[0]);
      
      setInvoices(invoicesResponse.results || invoicesResponse);
      setCustomers(customersResponse.results || customersResponse);
      setItems(itemsResponse.results || itemsResponse);
      setPonds(pondsResponse.results || pondsResponse);
      setSpecies(speciesResponse.results || speciesResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };
console.log("ponds", ponds);
  const fetchInvoiceLines = async (invoiceId: number) => {
    try {
      console.log('Fetching invoice lines for invoice ID:', invoiceId);
      const response = await get(`/invoice-lines/?invoice=${invoiceId}`);
      const lines = response.results || response;
      console.log('Fetched invoice lines:', lines);
      setInvoiceLines(lines);
      setCurrentInvoiceLines(lines);
    } catch (error) {
      console.error('Error fetching invoice lines:', error);
      setInvoiceLines([]);
      setCurrentInvoiceLines([]);
    }
  };

  const calculateTotals = () => {
    const totalAmount = lineItems.reduce((sum, line) => sum + (line.amount || 0), 0);
    return { totalAmount };
  };

  const getUomOptionsForItem = (itemId: number) => {
    // Return the comprehensive list of UOM options for all items
    return ['kg', 'litre', 'piece', 'gram', 'ml', 'ton', 'box', 'bag', 'bottle', 'packet'];
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_id: 0,
      description: '',
      qty: 0,
      unit: 'kg', // Default unit
      packet_size: 0,
      gallon_size: 0,
      rate: 0,
      amount: 0,
      // Fish-specific fields
      pond_id: 0,
      species_id: 0,
      total_weight: 0,
      line_number: 0,
    }]);
  };

  const updateLineItem = (index: number, field: keyof InvoiceLine, value: any) => {
    const updated = [...lineItems];
    const next: any = { ...updated[index] };

    const numericFields = new Set(['qty','rate','amount','packet_size','gallon_size','total_weight','line_number','fish_count']);
    if (numericFields.has(field as string)) {
      if (typeof value === 'string') {
        if (value === '') {
          next[field] = undefined;
        } else {
          const num = Number(value);
          if (!isNaN(num)) next[field] = num;
        }
      } else {
        next[field] = value;
      }
    } else {
      next[field] = value;
    }
    
    // If item changes, reset unit to first available option for that category
    if (field === 'item_id' && value) {
      const uomOptions = getUomOptionsForItem(value);
      next.unit = uomOptions[0] || 'kg';
      next.packet_size = undefined;
      next.gallon_size = undefined;
      
      // Auto-fill unit price when item is selected
      const selectedItem = items.find(item => item.item_id === value);
      if (selectedItem && selectedItem.selling_price) {
        next.rate = selectedItem.selling_price;
      }
    // For fish items, do not prefill editable fields; keep inputs blank.
    }
    
    // Calculate total price
    if (field === 'qty' || field === 'rate' || field === 'total_weight') {
      const selectedItem = items.find(item => item.item_id === next.item_id);
      const isFishItem = selectedItem?.category === 'fish'
      let quantity = 0;
      if (isFishItem) {
        // For fish items, use total weight
        quantity = Number(next.total_weight) || 0;
      } else {
        // For non-fish items, use qty
        quantity = Number(next.qty) || 0;
      }
      
      const price = Number(next.rate) || 0;
      next.amount = quantity && price ? quantity * price : undefined;
    }
    
    updated[index] = next;
    setLineItems(updated);
  };

  const checkStockAvailability = (itemId: number, quantity: number, unit: string = 'kg', packetSize: number = 0) => {
    const item = items.find(i => i.item_id === itemId);
    if (!item) return { available: false, message: 'Item not found' };
    
    const availableStock = calculateCorrectStock(item);
    const displayUnit = getDisplayUnit(item);
    
    // Convert required quantity to kg for feed items (same logic as backend)
    let requiredQtyInKg = quantity;
    if (item.category === 'feed') {
      if (unit === 'packet' && packetSize > 0) {
        requiredQtyInKg = quantity * packetSize;
      } else if (unit === 'gram') {
        requiredQtyInKg = quantity / 1000;
      } else if (unit === 'ton') {
        requiredQtyInKg = quantity * 1000;
      }
      // For kg, litre, piece, ml, box, bag, bottle - use as is
    }
    
    if (availableStock <= 0) {
      return { 
        available: false, 
        message: `Item is out of stock. Current stock: ${availableStock} ${displayUnit}` 
      };
    }
    
    if (availableStock < requiredQtyInKg) {
      return { 
        available: false, 
        message: `Insufficient stock. Available: ${availableStock} ${displayUnit}, Required: ${requiredQtyInKg} kg (${quantity} ${unit})` 
      };
    }
    
    return { available: true, message: `Stock available: ${availableStock} ${displayUnit}` };
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    
    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      if (!line.item_id || line.item_id === 0) {
        toast.error(`Please select an item for line ${i + 1}`);
        return;
      }
      
      // Check if it's a fish item
      const selectedItem = items.find(item => item.item_id === line.item_id);
      const isFishItem = selectedItem?.category === 'fish' || 
                        (selectedItem?.name && selectedItem.name.toLowerCase().includes('fish')) ||
                        (selectedItem?.name && selectedItem.name.toLowerCase().includes('tilapia')) ||
                        (selectedItem?.name && selectedItem.name.toLowerCase().includes('carp')) ||
                        (selectedItem?.name && selectedItem.name.toLowerCase().includes('catfish'));
      
      if (isFishItem) {
        // For fish items, validate total weight instead of quantity
        if (!line.total_weight || line.total_weight <= 0) {
          toast.error(`Please enter a valid total weight for line ${i + 1}`);
          return;
        }
      } else {
        // For non-fish items, validate quantity
        if (!line.qty || line.qty <= 0) {
          toast.error(`Please enter a valid quantity for line ${i + 1}`);
          return;
        }
      }
      
      if (!line.rate || line.rate <= 0) {
        toast.error(`Please enter a valid unit price for line ${i + 1}`);
        return;
      }
    }
    
    // Check stock availability for all line items (skip for fish items)
    const stockChecks = lineItems.map(line => {
      if (line.item_id) {
        const selectedItem = items.find(item => item.item_id === line.item_id);
        const isFishItem = selectedItem?.category === 'fish' || 
                          (selectedItem?.name && selectedItem.name.toLowerCase().includes('fish')) ||
                          (selectedItem?.name && selectedItem.name.toLowerCase().includes('tilapia')) ||
                          (selectedItem?.name && selectedItem.name.toLowerCase().includes('carp')) ||
                          (selectedItem?.name && selectedItem.name.toLowerCase().includes('catfish'));
        
        if (isFishItem) {
          // Skip stock check for fish items - they don't have traditional inventory
          return { available: true, message: 'Fish items - no stock check required' };
        } else {
          // For non-fish items, use quantity
          if (line.qty) {
            return checkStockAvailability(line.item_id, line.qty, line.unit || 'kg', line.packet_size || 0);
          }
        }
      }
      return { available: true, message: '' };
    });
    
    const insufficientStock = stockChecks.find(check => !check.available);
    if (insufficientStock) {
      toast.error(insufficientStock.message);
      return;
    }
    
    try {
      const totals = calculateTotals();
      const invoiceData = {
        ...formData,
        customer: parseInt(formData.customer_id),
        invoice_no: formData.invoice_no || `INV-${Date.now()}`,
        total_amount: totals.totalAmount,
        open_balance: totals.totalAmount,
      };
      
      console.log('Invoice data being sent:', invoiceData);

      if (editingInvoice) {
        await put(`/invoices/${editingInvoice.invoice_id}/`, invoiceData);
        
        // Delete existing invoice lines
        const existingLines = await get(`/invoice-lines/?invoice=${editingInvoice.invoice_id}`);
        const linesToDelete = existingLines.results || existingLines;
        for (const line of linesToDelete) {
          await del(`/invoice-lines/${line.invoice_line_id}/`);
        }
        
        // Create new invoice lines
        for (const line of lineItems) {
          const selectedItem = items.find(item => item.item_id === line.item_id);
          const isFish = selectedItem?.category === 'fish';
          await post('/invoice-lines/', {
            invoice: editingInvoice.invoice_id,
            item: line.item_id || null,
            description: line.description || '',
            qty: isFish ? (Number(line.total_weight?.toFixed?.(2) ?? line.total_weight) || 0) : (Number(line.qty?.toFixed?.(2) ?? line.qty) || 0),
            unit: isFish ? 'kg' : (line.unit || 'kg'),
            packet_size: isFish ? null : (line.packet_size || null),
            gallon_size: line.gallon_size || null,
            rate: Number(line.rate?.toFixed?.(2) ?? line.rate) || 0,
            amount: Number(line.amount?.toFixed?.(2) ?? line.amount) || 0,
            // Fish-specific fields
            pond: line.pond_id || null,
            species: line.species_id || null,
            total_weight: Number(line.total_weight?.toFixed?.(2) ?? line.total_weight) || null,
            line_number: line.line_number ?? null,
          });
        }
        
        toast.success('Invoice updated successfully');
      } else {
        const response = await post('/invoices/', invoiceData);
        
        // Create invoice lines
        for (const line of lineItems) {
          const selectedItem = items.find(item => item.item_id === line.item_id);
          const isFish = selectedItem?.category === 'fish';
          await post('/invoice-lines/', {
            invoice: response.invoice_id,
            item: line.item_id || null,
            description: line.description || '',
            qty: isFish ? (Number(line.total_weight?.toFixed?.(2) ?? line.total_weight) || 0) : (Number(line.qty?.toFixed?.(2) ?? line.qty) || 0),
            unit: isFish ? 'kg' : (line.unit || 'kg'),
            packet_size: isFish ? null : (line.packet_size || null),
            gallon_size: line.gallon_size || null,
            rate: Number(line.rate?.toFixed?.(2) ?? line.rate) || 0,
            amount: Number(line.amount?.toFixed?.(2) ?? line.amount) || 0,
            // Fish-specific fields
            pond: line.pond_id || null,
            species: line.species_id || null,
            total_weight: Number(line.total_weight?.toFixed?.(2) ?? line.total_weight) || null,
            line_number: line.line_number ?? null,
            fish_count: line.fish_count || null,
          });
        }
        
        toast.success('Invoice created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingInvoice(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      if (error.response?.data?.error && error.response.data.error.includes('already exists')) {
        toast.error(`Invoice number '${formData.invoice_no}' already exists. Please use a different number.`);
      } else {
        toast.error('Failed to save invoice');
      }
    }
  };

  const handleEdit = async (invoice: Invoice) => {
    console.log('Edit button clicked for invoice:', invoice);
    
    // Reset form first to ensure clean state
    resetForm();
    
    // Set the specific invoice being edited
    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.customer_id.toString(),
      invoice_no: invoice.invoice_no,
      invoice_date: invoice.invoice_date,
      memo: invoice.memo,
    });
    
    // Load existing invoice lines for this specific invoice only
    try {
      // First try to use lines data from the invoice if available
      let existingLines = invoice.lines || [];
      
      // If no lines data in invoice, fetch separately
      if (!existingLines || existingLines.length === 0) {
        const response = await get(`/invoice-lines/?invoice=${invoice.invoice_id}`);
        existingLines = response.results || response;
      }
      
      // Convert existing lines to our format
      console.log('Raw invoice line data:', existingLines);
      const formattedLines = existingLines.map((line: any) => {
        console.log('Processing line:', line);
        console.log('total_weight:', line.total_weight);
        console.log('pond:', line.pond);
        console.log('species:', line.species);
        console.log('line_number:', line.line_number);
        
        return {
          invoice_line_id: line.invoice_line_id,
          invoice_id: line.invoice_id,
          item_id: line.item_id || null,
          item_name: line.item_name || '',
          item_category: line.item_category || '',
          description: line.description || '',
          qty: line.qty || 0,
          unit: line.unit || 'kg',
          packet_size: line.packet_size || 0,
          gallon_size: line.gallon_size || 0,
          rate: line.rate || 0,
          amount: Number(line.amount) || 0,
          // Fish-specific fields
          pond_id: line.pond || null,
          species_id: line.species || null,
          total_weight: line.total_weight || null,
          line_number: line.line_number || null,
          pond_name: line.pond_name || '',
          species_name: line.species_name || '',
        };
      });
      
      setLineItems(formattedLines);
    } catch (error) {
      console.error('Error loading invoice lines:', error);
      setLineItems([]);
    }
    
    // Open dialog for this specific invoice
    setIsDialogOpen(true);
  };

  const handleDelete = async (invoiceId: number) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await del(`/invoices/${invoiceId}/`);
        toast.success('Invoice deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      invoice_no: '',
      invoice_date: new Date().toISOString().split('T')[0], // Today's date
      memo: '',
    });
    setLineItems([]);
    setEditingInvoice(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.memo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices (Accounts Receivable)</h1>
          <p className="text-gray-600 mt-1">Manage customer invoices and accounts receivable</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          } else if (!editingInvoice) {
            // Auto-generate invoice number immediately when opening for new invoice
            fetchNextInvoiceNumber();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { 
              setEditingInvoice(null); 
              setLineItems([]);
              // Auto-generate invoice number when button is clicked
              fetchNextInvoiceNumber();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? `Edit Invoice #${editingInvoice.invoice_no}` : 'Add New Invoice'}
              </DialogTitle>
              <DialogDescription>
                {editingInvoice ? `Update information for invoice #${editingInvoice.invoice_no}` : 'Create a new customer invoice. Invoice number will be auto-generated but can be customized.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {editingInvoice && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Edit className="h-4 w-4" />
                    <span className="font-medium">Editing Invoice #{editingInvoice.invoice_no}</span>
                    <span className="text-sm text-blue-600">
                      ({editingInvoice.customer_name || 'Unknown Customer'})
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.customer_id} value={customer.customer_id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_no">Invoice Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invoice_no"
                      value={formData.invoice_no}
                      onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                      placeholder="Auto-generated"
                      className="h-12"
                    />
                    {!editingInvoice && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchNextInvoiceNumber}
                        className="h-12 px-3"
                        title="Get next auto-generated number"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
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
                  placeholder="Additional notes about the invoice"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Invoice Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Invoice Lines</Label>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6">
                      <div className="space-y-4">
                        {/* First row - Item and Description */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Item List</Label>
                            <Select
                              value={line.item_id?.toString() || ''}
                              onValueChange={(value) => updateLineItem(index, 'item_id', parseInt(value))}
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((item) => {
                                  console.log(item);
                                  const isFishItem = item.category === 'fish';
                                  
                                  if (isFishItem) {
                                    // For fish items, don't show stock information
                                    return (
                                      <SelectItem key={item.item_id} value={item.item_id.toString()}>
                                        {item.name} ({item.category || 'No Category'})
                                        {item.selling_price && ` - $${item.selling_price}/${item.uom}`}
                                      </SelectItem>
                                    );
                                  } else {
                                    // For non-fish items, show stock information
                                    const correctStock = calculateCorrectStock(item);
                                    const displayUnit = getDisplayUnit(item);
                                    const stockDisplay = correctStock <= 0 ? 'Out of Stock' : `${correctStock} ${displayUnit}`;
                                    return (
                                      <SelectItem key={item.item_id} value={item.item_id.toString()}>
                                        {item.name} ({item.category || 'No Category'}) - Stock: {stockDisplay}
                                        {item.selling_price && ` - $${item.selling_price}/${item.uom}`}
                                      </SelectItem>
                                    );
                                  }
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={line.description || ''}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              placeholder="Description"
                              className="h-12"
                            />
                          </div>
                        </div>
                        
                        {/* Second row - Quantity, Unit, and Packet Size - Hide for fish items */}
                        {(() => {
                          const selectedItem = items.find(item => item.item_id === line.item_id);
                          const isFishItem = selectedItem?.category === 'fish' || 
                                            (selectedItem?.name && selectedItem.name.toLowerCase().includes('fish')) ||
                                            (selectedItem?.name && selectedItem.name.toLowerCase().includes('tilapia')) ||
                                            (selectedItem?.name && selectedItem.name.toLowerCase().includes('carp')) ||
                                            (selectedItem?.name && selectedItem.name.toLowerCase().includes('catfish'));
                          
                          if (!isFishItem) {
                            return (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Quantity</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={line.qty && line.qty > 0 ? line.qty : ''}
                                    onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                                    placeholder="Quantity"
                                    className="h-12"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Unit of Measure</Label>
                                  <Select
                                    value={line.unit || 'kg'}
                                    onValueChange={(value) => updateLineItem(index, 'unit', value)}
                                  >
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder="Select unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getUomOptionsForItem(line.item_id || 0).map((uom) => (
                                        <SelectItem key={uom} value={uom}>
                                          {uom}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* Conditional packet size field */}
                                {line.unit === 'packet' && (
                                  <div className="space-y-2">
                                    <Label>Packet Size (kg)</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={line.packet_size || ''}
                                      onChange={(e) => updateLineItem(index, 'packet_size', parseFloat(e.target.value) || 0)}
                                      placeholder="e.g., 10, 25"
                                      className="h-12"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Fish-specific fields - Show when item category is fish */}
                        {(() => {
                          const selectedItem = items.find(item => item.item_id === line.item_id);
                          const isFishItem = selectedItem?.category === 'fish' 
                          
                          if (isFishItem) {
                            return (
                              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-800 font-medium">
                                  <span>🐟</span>
                                  <span>Fish-Specific Details</span>
                                </div>
                                
                                {/* Fish fields row 1 - Pond (species is derived from item) */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Select Pond</Label>
                                    {(() => {
                                      const customer = customers.find(c => String(c.customer_id) === String(formData.customer_id));
                                      const isInternal = customer?.type === 'internal_pond' && customer?.pond;
                                      if (isInternal) {
                                        const pondObj = ponds.find(p => (p.pond_id || p.id) === customer?.pond);
                                        return (
                                          <div className="h-12 flex items-center px-3 border rounded bg-gray-50 text-gray-700">
                                            {pondObj ? `${pondObj.name} - ${pondObj.water_area_decimal} decimal` : 'Linked Pond'}
                                          </div>
                                        );
                                      }
                                      return (
                                        <Select
                                          value={line.pond_id?.toString() || ''}
                                          onValueChange={(value) => updateLineItem(index, 'pond_id', parseInt(value))}
                                        >
                                          <SelectTrigger className="h-12">
                                            <SelectValue placeholder="Select pond" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {ponds.filter(pond => pond.is_active).map((pond) => (
                                              <SelectItem key={pond.pond_id || pond.id} value={(pond.pond_id || pond.id)?.toString() || ''}>
                                                {pond.name} - {pond.water_area_decimal} decimal
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                                {/* Fish fields row 2 - Species Number, Body Weight per Fish, Total Weight */}
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label>Species Number</Label>
                                    <Input
                                      type="number"
                                      value={line.fish_count || ''}
                                      onChange={(e) => updateFishInvLineFields(index, { fish_count: e.target.value })}
                                      placeholder="Number of fish (pcs)"
                                      className="h-12"
                                    />
                                    {(() => {
                                      const cs = getPondStock(line.item_id, line.pond_id);
                                      const hint = cs?.fish_count ? `${cs.fish_count} pcs` : undefined;
                                      return hint ? (<div className="text-xs text-gray-500">Current (pond): {hint}</div>) : null;
                                    })()}
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Line Number (pcs per kg)</Label>
                                    <Input
                                      type="number"
                                      step="1"
                                      value={line.line_number || ''}
                                      onChange={(e) => updateFishInvLineFields(index, { line_number: e.target.value })}
                                      placeholder="e.g., 4 (pcs/kg)"
                                      className="h-12"
                                    />
                                    {(() => {
                                      const cs = getPondStock(line.item_id, line.pond_id);
                                      const ln = cs?.line_number;
                                      return ln ? (<div className="text-xs text-gray-500">Current (pond): {Number(ln).toFixed(2)} pcs/kg</div>) : null;
                                    })()}
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Total Weight (kg)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={line.total_weight && line.total_weight > 0 ? line.total_weight : ''}
                                      onChange={(e) => updateFishInvLineFields(index, { total_weight: e.target.value })}
                                      placeholder="Total weight in kg"
                                      className="h-12"
                                    />
                                    {(() => {
                                      const cs = getPondStock(line.item_id, line.pond_id);
                                      const hint = cs?.fish_total_weight_kg ?? cs?.current_stock;
                                      return hint ? (<div className="text-xs text-gray-500">Current (pond): {Number(hint).toFixed(2)} kg</div>) : null;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Third row - Rate, Amount, and Actions */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Rate per Unit</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.rate && line.rate > 0 ? line.rate : ''}
                              onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                              placeholder="Rate per unit"
                              className="h-12"
                            />
                            {(() => {
                              const item = items.find(it => it.item_id === line.item_id);
                              return item?.selling_price ? (
                                <div className="text-xs text-gray-500">Current: {Number(item.selling_price).toFixed(2)}</div>
                              ) : null;
                            })()}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.amount || 0}
                              readOnly
                              className="bg-gray-50 h-12"
                            />
                            {/* Helper: total_weight = fish_count / line_number */}
                            {(() => {
                              const item = items.find(it => it.item_id === line.item_id);
                              if (item?.category === 'fish' && line.fish_count && line.line_number && !line.total_weight) {
                                const tw = (line.fish_count || 0) / (line.line_number || 1);
                                return (
                                  <div className="text-xs text-blue-600">Suggested total weight: {tw.toFixed(2)} kg</div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Actions</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-700 h-12 px-3 w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 text-center">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${Number(calculateTotals().totalAmount || 0).toFixed(2)}
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
                  {editingInvoice ? `Update Invoice #${editingInvoice.invoice_no}` : 'Create Invoice'}
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
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Open Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.invoice_id}>
                  <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                  <TableCell>{invoice.customer_name}</TableCell>
                  <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                  <TableCell>${Number(invoice.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${Number(invoice.open_balance || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Details button clicked for invoice:', invoice.invoice_id);
                          if (showInvoiceLines === invoice.invoice_id) {
                            setShowInvoiceLines(null);
                            setSelectedInvoice(null);
                            setCurrentInvoiceLines([]);
                          } else {
                            setShowInvoiceLines(invoice.invoice_id);
                            setSelectedInvoice(invoice);
                            fetchInvoiceLines(invoice.invoice_id);
                          }
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(invoice.invoice_id)}
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

      {/* Invoice Details Display */}
      {showInvoiceLines && selectedInvoice && (
        <div className="space-y-6">
          {/* Invoice Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoice Details - #{selectedInvoice.invoice_no}
                  </CardTitle>
                  <CardDescription>
                    Complete information for this invoice
                  </CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  ACCOUNTS RECEIVABLE
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Customer</p>
                  <p className="text-sm">{selectedInvoice.customer_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Invoice Date</p>
                  <p className="text-sm">{selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p className="text-sm">{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-sm font-semibold text-green-600">${selectedInvoice.total_amount ? Number(selectedInvoice.total_amount).toFixed(2) : '0.00'}</p>
                </div>
              </div>
              {selectedInvoice.memo && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-2">Memo</p>
                  <p className="text-sm text-gray-700">{selectedInvoice.memo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Lines Card */}
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
              {currentInvoiceLines.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity/Weight</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Fish Details</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentInvoiceLines.map((line) => {
                        // Use item_category from the line data if available, otherwise fallback to items lookup
                        const isFishItem = line.item_category === 'fish'
                        // No need to lookup ponds and species - use data directly from line
                        
                        return (
                          <TableRow key={line.invoice_line_id}>
                            <TableCell className="font-medium">
                              <div>
                                {line.item_name || '-'}
                                {isFishItem && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    🐟 Fish Item
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {line.description || '-'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                // Use item_category directly from the line data
                                const isFishItem = line.item_category === 'fish';
                                
                                console.log('Line data:', line);
                                console.log('Item category:', line.item_category);
                                console.log('Is fish item:', isFishItem);
                                
                                console.log('Quantity/Weight display:', { 
                                  isFishItem, 
                                  total_weight: line.total_weight, 
                                  qty: line.qty,
                                  item_name: line.item_name,
                                  item_category: line.item_category 
                                });
                                
                                if (isFishItem) {
                                  return line.total_weight ? `${line.total_weight} kg` : '-';
                                }
                                return line.qty || '-';
                              })()}
                            </TableCell>
                            <TableCell>{line.unit || '-'}</TableCell>
                            <TableCell>
                              {(() => {
                                if (isFishItem) {
                                  console.log('Displaying fish item:', { isFishItem, total_weight: line.total_weight, line });
                                  return (
                                    <div className="text-sm space-y-1">
                                      {line.total_weight && (
                                        <div className="text-orange-600 font-semibold">
                                          <span className="font-medium">Weight:</span> {line.total_weight} kg
                                        </div>
                                      )}
                                      {line.pond_name && (
                                        <div className="text-blue-600">
                                          <span className="font-medium">Pond:</span> {line.pond_name}
                                        </div>
                                      )}
                                      {line.species_name && (
                                        <div className="text-green-600">
                                          <span className="font-medium">Species:</span> {line.species_name}
                                        </div>
                                      )}
                                      {line.line_number && (
                                        <div className="text-gray-600">
                                          <span className="font-medium">Line:</span> {line.line_number}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return <span className="text-gray-400">-</span>;
                                }
                              })()}
                            </TableCell>
                            <TableCell>{line.rate ? `$${Number(line.rate).toFixed(2)}` : '-'}</TableCell>
                            <TableCell className="font-medium text-right">
                              ${Number(line.amount || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {/* Summary */}
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right space-y-1">
                      <div className="text-sm text-gray-600">Total Amount</div>
                      <div className="text-xl font-bold text-green-600">
                        ${currentInvoiceLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No line items found for this invoice</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {filteredInvoices.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No invoices match your search criteria.' : 'Get started by creating your first invoice.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => {
              setEditingInvoice(null);
              setLineItems([]);
              setIsDialogOpen(true);
              fetchNextInvoiceNumber();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          )}
        </div>
      )}

      {/* Total Accounts Receivable Summary */}
      {!loading && invoices.length > 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Total Accounts Receivable</h3>
                  <p className="text-sm text-gray-600">Outstanding balance across all invoices</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  ${invoices.reduce((sum, invoice) => sum + (Number(invoice.open_balance) || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  {invoices.filter(invoice => (Number(invoice.open_balance) || 0) > 0).length} invoices with outstanding balance
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}