'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Calendar, 
  Stethoscope, 
  Activity, 
  Pill, 
  Syringe, 
  Shield, 
  Zap, 
  Droplets, 
  Scale, 
  DollarSign,
  Clock,
  MapPin,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface MedicineEvent {
  medicine_id: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  memo: string;
  create_invoice: boolean;
  invoice_status: string;
  created_at: string;
  total_cost: number;
}

interface MedicineLine {
  medicine_line_id: number;
  medicine_id: number;
  item_id: number;
  medicine_name?: string;
  medicine_type: string;
  treatment_type: string;
  state_type: string;
  dosage: string;
  prescribed_dosage?: number;
  dosage_unit?: string;
  qty_used: number;
  unit_of_measure: string;
  unit_cost: number;
}

interface Pond {
  pond_id: number;
  name: string;
}

interface Medicine {
  item_id: number;
  name: string;
  item_type: string;
  is_medicine: boolean;
}

export default function MedicineEventsPage() {
  const [medicineEvents, setMedicineEvents] = useState<MedicineEvent[]>([]);
  const [medicineLines, setMedicineLines] = useState<MedicineLine[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineEvent | null>(null);
  const [showMedicineLines, setShowMedicineLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    pond_id: '',
    event_date: '',
    memo: '',
    create_invoice: false,
    invoice_status: 'draft',
  });
  const [lineItems, setLineItems] = useState<Partial<MedicineLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  // Dosage unit choices
  const dosageUnitChoices = [
    { value: 'mg', label: 'Milligrams (mg)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (L)' },
    { value: 'pieces', label: 'Pieces' },
    { value: 'tablets', label: 'Tablets' },
    { value: 'capsules', label: 'Capsules' },
    { value: 'drops', label: 'Drops' },
    { value: 'units', label: 'Units' },
    { value: 'iu', label: 'International Units (IU)' },
    { value: 'ppm', label: 'Parts Per Million (ppm)' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medicineResponse, pondsResponse, itemsResponse] = await Promise.all([
        get('/medicine-events/'),
        get('/ponds/'),
        get('/items/'),
      ]);
      
      setMedicineEvents(medicineResponse.results || medicineResponse);
      setPonds(pondsResponse.results || pondsResponse);
      
      console.log('Medicine Events Debug:', {
        medicineEvents: medicineResponse.results || medicineResponse,
        count: (medicineResponse.results || medicineResponse).length
      });
      
      // Filter for medicine items only
      const allItems = itemsResponse.results || itemsResponse;
      const medicineItems = allItems.filter((item: any) => item.is_medicine === true);
      console.log('Medicine Items Debug:', {
        allItems: allItems.length,
        medicineItems: medicineItems.length,
        medicineItemsData: medicineItems
      });
      setMedicines(medicineItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicineLines = async (medicineId: number) => {
    try {
      const response = await get(`/medicine-lines/?medicine_event=${medicineId}`);
      setMedicineLines(response.results || response);
    } catch (error) {
      console.error('Error fetching medicine lines:', error);
    }
  };

  const calculateTotals = () => {
    const totalCost = lineItems.reduce((sum, line) => sum + (line.total_cost || 0), 0);
    return { totalCost };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      medicine_id: 0,
      medicine_type: 'other',
      treatment_type: 'therapeutic',
      state_type: 'liquid',
      dosage: '',
      prescribed_dosage: 0,
      dosage_unit: '',
      qty_used: 0,
      unit_of_measure: 'ml',
      unit_cost: 0,
    }]);
  };

  const updateLineItem = (index: number, field: keyof MedicineLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate total cost
    if (field === 'qty_used' || field === 'unit_cost') {
      const qty = updated[index].qty_used || 0;
      const cost = updated[index].unit_cost || 0;
      updated[index].total_cost = qty * cost;
    }
    
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totals = calculateTotals();
      const medicineData = {
        ...formData,
        pond: parseInt(formData.pond_id),
        memo: `৳${totals.totalCost.toFixed(2)} total cost`,
        create_invoice: formData.create_invoice,
        invoice_status: formData.invoice_status,
      };
      
      console.log('Medicine event data being sent:', medicineData);

      if (editingMedicine) {
        await put(`/medicine-events/${editingMedicine.medicine_id}/`, medicineData);
        toast.success('Medicine event updated successfully');
      } else {
        const response = await post('/medicine-events/', medicineData);
        
        // Create medicine lines
        for (const line of lineItems) {
          await post('/medicine-lines/', {
            medicine_event: response.medicine_id,
            item: line.medicine_id,
            medicine_type: line.medicine_type || 'other',
            treatment_type: line.treatment_type || 'therapeutic',
            state_type: line.state_type || 'liquid',
            dosage: line.dosage || '',
            prescribed_dosage: line.prescribed_dosage || null,
            dosage_unit: line.dosage_unit || '',
            qty_used: line.qty_used || 0,
            unit_of_measure: line.unit_of_measure || 'ml',
            unit_cost: line.unit_cost || 0,
          });
        }
        
        toast.success('Medicine event created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingMedicine(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving medicine event:', error);
      toast.error('Failed to save medicine event');
    }
  };

  const handleEdit = (medicine: MedicineEvent) => {
    setEditingMedicine(medicine);
    setFormData({
      pond_id: medicine.pond_id.toString(),
      event_date: medicine.event_date,
      memo: medicine.memo,
    });
    setLineItems([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (medicineId: number) => {
    if (confirm('Are you sure you want to delete this medicine event?')) {
      try {
        await del(`/medicine-events/${medicineId}/`);
        toast.success('Medicine event deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting medicine event:', error);
        toast.error('Failed to delete medicine event');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      pond_id: '',
      event_date: '',
      memo: '',
      create_invoice: false,
      invoice_status: 'draft',
    });
    setLineItems([]);
  };

  const filteredMedicineEvents = medicineEvents.filter(event =>
    event.pond_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
      <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Stethoscope className="h-8 w-8 text-blue-600" />
            </div>
        <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                Medicine Events
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <Pill className="h-3 w-3 mr-1" />
                  Treatment Management
                </Badge>
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Record fish treatment and medicine application activities
              </p>
            </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
              <Button 
                onClick={() => { setEditingMedicine(null); resetForm(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
              Add Medicine Event
            </Button>
          </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Search Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search medicine events by pond or memo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Activity className="h-4 w-4" />
            <span>{filteredMedicineEvents.length} events found</span>
          </div>
        </div>
      </div>

      {/* Dialog Content */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 -m-6 mb-6 border-b border-blue-100">
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                </div>
                {editingMedicine ? 'Edit Medicine Event' : 'Add New Medicine Event'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                {editingMedicine ? 'Update medicine event information' : 'Record a new fish treatment event with detailed medicine information'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {/* Basic Information Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="pond_id" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Pond *
                    </Label>
                  <Select
                    value={formData.pond_id}
                    onValueChange={(value) => setFormData({ ...formData, pond_id: value })}
                  >
                      <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select pond" />
                    </SelectTrigger>
                    <SelectContent>
                      {ponds.map((pond) => (
                        <SelectItem key={pond.pond_id} value={pond.pond_id.toString()}>
                          {pond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="event_date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Event Date *
                    </Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
                <div className="mt-4">
                  <Label htmlFor="memo" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Additional Notes
                  </Label>
                  <Textarea
                    id="memo"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    placeholder="Additional notes about the medicine event..."
                    rows={3}
                    className="min-h-[80px] mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Invoice Options Section */}
              <div className="bg-green-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Invoice & Billing Options
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Generate Invoice
                    </Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="create_invoice"
                        checked={formData.create_invoice}
                        onChange={(e) => setFormData({ ...formData, create_invoice: e.target.checked })}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <Label htmlFor="create_invoice" className="text-sm text-gray-600">
                        Create invoice for this medicine event
                      </Label>
                    </div>
                  </div>
                  
                  {formData.create_invoice && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Invoice Status
                      </Label>
                      <Select
                        value={formData.invoice_status}
                        onValueChange={(value) => setFormData({ ...formData, invoice_status: value })}
                      >
                        <SelectTrigger className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500">
                          <SelectValue placeholder="Select invoice status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {formData.create_invoice && (
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Invoice will be automatically generated for the pond's customer when medicine is used.
                    </p>
                  </div>
                )}
              </div>

              {/* Medicine Lines Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-600" />
                    <Label className="text-lg font-semibold text-gray-900">Medicine Lines</Label>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {lineItems.length} medicines
                    </Badge>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addLineItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medicine
                  </Button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6 border-2 border-blue-100 hover:border-blue-200 transition-colors duration-200">
                      <div className="space-y-6">
                        {/* Header with medicine number and delete button */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Pill className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-semibold text-gray-900">Medicine #{index + 1}</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* First Row - Medicine Selection */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Medicine *
                            </Label>
                            <Select
                              value={line.medicine_id?.toString() || ''}
                              onValueChange={(value) => updateLineItem(index, 'medicine_id', parseInt(value))}
                            >
                              <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select medicine" />
                              </SelectTrigger>
                              <SelectContent>
                                {medicines.length === 0 ? (
                                  <div className="p-4 text-center text-gray-500">
                                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No medicines available</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Go to Master Data → Items & Services to add medicines
                                    </p>
                                  </div>
                                ) : (
                                  medicines.map((medicine) => (
                                    <SelectItem key={medicine.item_id} value={medicine.item_id.toString()}>
                                      {medicine.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Medicine Type *
                            </Label>
                            <Select
                              value={line.medicine_type || 'other'}
                              onValueChange={(value) => updateLineItem(index, 'medicine_type', value)}
                            >
                              <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select medicine type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="antibiotic">Antibiotic</SelectItem>
                                <SelectItem value="antifungal">Antifungal</SelectItem>
                                <SelectItem value="antiparasitic">Antiparasitic</SelectItem>
                                <SelectItem value="vitamin">Vitamin</SelectItem>
                                <SelectItem value="mineral">Mineral</SelectItem>
                                <SelectItem value="probiotic">Probiotic</SelectItem>
                                <SelectItem value="disinfectant">Disinfectant</SelectItem>
                                <SelectItem value="hormone">Hormone</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Second Row - Treatment and State Type */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Treatment Type *
                            </Label>
                            <Select
                              value={line.treatment_type || 'therapeutic'}
                              onValueChange={(value) => updateLineItem(index, 'treatment_type', value)}
                            >
                              <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select treatment type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="preventive">Preventive</SelectItem>
                                <SelectItem value="therapeutic">Therapeutic</SelectItem>
                                <SelectItem value="curative">Curative</SelectItem>
                                <SelectItem value="prophylactic">Prophylactic</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                                <SelectItem value="routine">Routine</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Droplets className="h-4 w-4" />
                              State Type *
                            </Label>
                            <Select
                              value={line.state_type || 'liquid'}
                              onValueChange={(value) => updateLineItem(index, 'state_type', value)}
                            >
                              <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select state type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="liquid">Liquid</SelectItem>
                                <SelectItem value="powder">Powder</SelectItem>
                                <SelectItem value="tablet">Tablet</SelectItem>
                                <SelectItem value="capsule">Capsule</SelectItem>
                                <SelectItem value="injection">Injection</SelectItem>
                                <SelectItem value="topical">Topical</SelectItem>
                                <SelectItem value="granule">Granule</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Third Row - Dosage Information */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Syringe className="h-4 w-4" />
                            Dosage Information
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Dosage Description</Label>
                              <Input
                                type="text"
                                value={line.dosage || ''}
                                onChange={(e) => updateLineItem(index, 'dosage', e.target.value)}
                                placeholder="e.g., 2ml per 100L water"
                                className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Prescribed Amount</Label>
                              <Input
                                type="number"
                                step="0.001"
                                value={line.prescribed_dosage || ''}
                                onChange={(e) => updateLineItem(index, 'prescribed_dosage', parseFloat(e.target.value) || 0)}
                                placeholder="0.000"
                                className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Dosage Unit</Label>
                              <Select
                                value={line.dosage_unit || 'ml'}
                                onValueChange={(value) => updateLineItem(index, 'dosage_unit', value)}
                              >
                                <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                  <SelectValue placeholder="Select dosage unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {dosageUnitChoices.map((unit) => (
                                    <SelectItem key={unit.value} value={unit.value}>
                                      {unit.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Fourth Row - Quantity and Cost */}
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            Quantity & Cost Information
                          </h4>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Quantity Used *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={line.qty_used || ''}
                                onChange={(e) => updateLineItem(index, 'qty_used', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Unit of Measure *</Label>
                              <Select
                                value={line.unit_of_measure || 'ml'}
                                onValueChange={(value) => updateLineItem(index, 'unit_of_measure', value)}
                              >
                                <SelectTrigger className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500">
                                  <SelectValue placeholder="Select unit of measure" />
                                </SelectTrigger>
                                <SelectContent>
                                  {dosageUnitChoices.map((unit) => (
                                    <SelectItem key={unit.value} value={unit.value}>
                                      {unit.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Unit Cost</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={line.unit_cost || ''}
                                onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Total Cost</Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={line.total_cost || 0}
                                  readOnly
                                  className="bg-gray-100 h-12 border-gray-300 font-semibold text-green-700"
                                />
                                <div className="text-xs text-gray-500 text-center">
                                  <DollarSign className="h-3 w-3 mx-auto mb-1" />
                                  Auto
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Total Cost Summary */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-700">
                        ৳{calculateTotals().totalCost.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-600 font-medium">Total Medicine Cost</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {lineItems.length} medicine{lineItems.length !== 1 ? 's' : ''} • Auto-calculated
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-gray-50 p-6 -m-6 mt-6 border-t border-gray-200">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Info className="h-4 w-4" />
                    <span>All fields marked with * are required</span>
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {editingMedicine ? 'Update' : 'Create'} Medicine Event
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Medicine Events Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading medicine events...</p>
            <p className="text-gray-400 text-sm mt-1">Please wait while we fetch your data</p>
          </div>
        </div>
      ) : (
        <Card className="shadow-lg border-0">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Medicine Events Overview
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage and track all your fish treatment activities
            </p>
          </div>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Pond</TableHead>
                <TableHead className="font-semibold text-gray-700">Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Medicine Count</TableHead>
                <TableHead className="font-semibold text-gray-700">Total Cost</TableHead>
                <TableHead className="font-semibold text-gray-700">Invoice</TableHead>
                <TableHead className="font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicineEvents.map((event) => (
                <React.Fragment key={event.medicine_id}>
                  <TableRow className="hover:bg-blue-50 transition-colors duration-200">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        {event.pond_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        <Pill className="h-3 w-3 mr-1" />
                        {medicineLines.filter(line => line.medicine_id === event.medicine_id).length} medicines
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          ৳{event.total_cost ? Number(event.total_cost).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.create_invoice ? (
                        <Badge 
                          variant="secondary" 
                          className={`${
                            event.invoice_status === 'paid' ? 'bg-green-100 text-green-700' :
                            event.invoice_status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            event.invoice_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          {event.invoice_status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          No Invoice
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                          className="hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (showMedicineLines === event.medicine_id) {
                              setShowMedicineLines(null);
                            } else {
                              setShowMedicineLines(event.medicine_id);
                              fetchMedicineLines(event.medicine_id);
                            }
                          }}
                          className="hover:bg-green-50 hover:border-green-300"
                        >
                          {showMedicineLines === event.medicine_id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(event.medicine_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Medicine Lines Detail View */}
                  {showMedicineLines === event.medicine_id && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-t border-blue-200">
                          <div className="flex items-center gap-2 mb-4">
                            <Pill className="h-5 w-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-800">Medicine Details</h4>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {medicineLines.filter(line => line.medicine_id === event.medicine_id).length} items
                            </Badge>
                          </div>
                          <div className="space-y-4">
                            {medicineLines
                              .filter(line => line.medicine_id === event.medicine_id)
                              .map((line, index) => (
                                <div key={index} className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                      <Pill className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <span className="font-semibold text-gray-900">Medicine #{index + 1}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {line.medicine_type}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        Medicine:
                                      </span>
                                      <p className="text-gray-900 font-medium">{line.medicine_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        Type:
                                      </span>
                                      <p className="text-gray-900">{line.medicine_type}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        Treatment:
                                      </span>
                                      <p className="text-gray-900">{line.treatment_type}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Droplets className="h-3 w-3" />
                                        State:
                                      </span>
                                      <p className="text-gray-900">{line.state_type}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Syringe className="h-3 w-3" />
                                        Dosage:
                                      </span>
                                      <p className="text-gray-900">{line.dosage}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Scale className="h-3 w-3" />
                                        Prescribed:
                                      </span>
                                      <p className="text-gray-900">
                                        {line.prescribed_dosage} {line.dosage_unit}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <Activity className="h-3 w-3" />
                                        Quantity:
                                      </span>
                                      <p className="text-gray-900">{line.qty_used} {line.unit_of_measure}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium text-gray-600 flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        Cost:
                                      </span>
                                      <p className="font-semibold text-green-700">
                                        ৳{Number(line.unit_cost || 0).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
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

      {filteredMedicineEvents.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="bg-blue-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Stethoscope className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No medicine events found</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm ? 'No medicine events match your search criteria. Try adjusting your search terms.' : 'Get started by recording your first medicine event to track fish treatments and medications.'}
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Medicine Event
            </Button>
          )}
          {searchTerm && (
            <Button 
              onClick={() => setSearchTerm('')}
              variant="outline"
              className="mt-2"
            >
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
