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
  medicine_item?: number;
  medicine_name?: string;
  medicine_unit?: string;
  dosage_amount: number;
  event_date: string;
  memo: string;
  created_at: string;
  medicine_list?: MedicineItem[];
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

interface MedicineItem {
  item: number;
  item_name: string;
  current_stock: number;
  unit: string;
  unit_cost: number;
}

export default function MedicineEventsPage() {
  const [medicineEvents, setMedicineEvents] = useState<MedicineEvent[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [pondMedicines, setPondMedicines] = useState<MedicineItem[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineEvent | null>(null);
  const [formData, setFormData] = useState({
    pond_id: '',
    medicine_item: '',
    dosage_amount: '',
    event_date: '',
    memo: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medicineResponse, pondsResponse] = await Promise.all([
        get('/medicine-events/'),
        get('/ponds/'),
      ]);
      
      setMedicineEvents(medicineResponse.results || medicineResponse);
      setPonds(pondsResponse.results || pondsResponse);
      
      console.log('Medicine Events Debug:', {
        medicineEvents: medicineResponse.results || medicineResponse,
        count: (medicineResponse.results || medicineResponse).length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPondMedicines = async (pondId: number) => {
    try {
      const response = await get(`/customer-stocks/?pond=${pondId}`);
      const medicines = response.results || response;
      
      console.log('Raw customer stocks data for medicines:', {
        pondId,
        response,
        medicines,
        firstMedicine: medicines[0]
      });
      
      // Filter for medicine items only - more flexible filtering
      const medicineItems = medicines.filter((stock: any) => {
        const isInventoryPart = stock.item_type === 'inventory_part';
        const isMedicineCategory = stock.category === 'medicine';
        const hasStock = stock.current_stock > 0;
        const isMedicineByName = stock.item_name && stock.item_name.toLowerCase().includes('medicine');
        
        console.log('Filtering medicine stock:', {
          stock: stock.item_name,
          isInventoryPart,
          isMedicineCategory,
          hasStock,
          isMedicineByName,
          category: stock.category,
          item_type: stock.item_type,
          current_stock: stock.current_stock
        });
        
        return isInventoryPart && (isMedicineCategory || isMedicineByName) && hasStock;
      });
      
      setPondMedicines(medicineItems);
      console.log('Pond medicines (filtered):', medicineItems);
      console.log('First medicine item structure:', medicineItems[0]);
    } catch (error) {
      console.error('Error fetching pond medicines:', error);
      setPondMedicines([]);
    }
  };

  const handlePondChange = (pondId: string) => {
    setFormData({ ...formData, pond_id: pondId, medicine_item: '' });
    if (pondId) {
      fetchPondMedicines(parseInt(pondId));
    } else {
      setPondMedicines([]);
      setSelectedMedicine(null);
    }
  };

  const handleMedicineSelection = (medicine: MedicineItem) => {
    setSelectedMedicine(medicine);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const medicineData = {
        ...formData,
        pond: parseInt(formData.pond_id),
        medicine_item: parseInt(formData.medicine_item),
        dosage_amount: parseFloat(formData.dosage_amount),
      };
      
      console.log('Medicine event data being sent:', medicineData);

      if (editingMedicine) {
        await put(`/medicine-events/${editingMedicine.medicine_id}/`, medicineData);
        toast.success('Medicine event updated successfully');
      } else {
        await post('/medicine-events/', medicineData);
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
      medicine_item: medicine.medicine_item?.toString() || '',
      dosage_amount: medicine.dosage_amount.toString(),
      event_date: medicine.event_date,
      memo: medicine.memo,
    });
    setIsDialogOpen(true);
    // Fetch medicines for the pond
    if (medicine.pond_id) {
      fetchPondMedicines(medicine.pond_id);
    }
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
      medicine_item: '',
      dosage_amount: '',
      event_date: '',
      memo: '',
    });
    setPondMedicines([]);
    setSelectedMedicine(null);
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
                    onValueChange={handlePondChange}
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

              {/* Medicine Selection Section */}
              {formData.pond_id && (
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-600" />
                    Medicine Application
                  </h3>
                  {pondMedicines.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="medicine_selection" className="text-sm font-medium text-gray-700">
                          Select Medicine *
                        </Label>
                        <Select 
                          value={formData.medicine_item}
                          onValueChange={(value) => {
                            setFormData({ ...formData, medicine_item: value });
                            const medicine = pondMedicines.find(m => m.item.toString() === value);
                            if (medicine) handleMedicineSelection(medicine);
                          }}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select medicine from pond stock" />
                          </SelectTrigger>
                          <SelectContent>
                            {pondMedicines.filter(medicine => medicine && medicine.item).map((medicine) => (
                              <SelectItem key={medicine.item} value={medicine.item.toString()}>
                                {medicine.item_name} - {medicine.current_stock} {medicine.unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dosage_amount" className="text-sm font-medium text-gray-700">
                          Medicine Dosage Amount *
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="dosage_amount"
                            type="number"
                            step="0.001"
                            value={formData.dosage_amount}
                            onChange={(e) => setFormData({ ...formData, dosage_amount: e.target.value })}
                            placeholder="Enter dosage amount"
                            className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                          {selectedMedicine && (
                            <span className="text-sm text-gray-600 font-medium">
                              {selectedMedicine.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {selectedMedicine && (
                        <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{selectedMedicine.item_name}</h4>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {selectedMedicine.current_stock} {selectedMedicine.unit} available
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center justify-between">
                              <span>Unit Cost:</span>
                              <span className="font-medium">৳{(Number(selectedMedicine.unit_cost) || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm">
                        No medicine items available in this pond's stock. Please add medicine items to the pond first.
                      </p>
                    </div>
                  )}
                </div>
              )}


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
                <TableHead className="font-semibold text-gray-700">Medicine</TableHead>
                <TableHead className="font-semibold text-gray-700">Dosage</TableHead>
                <TableHead className="font-semibold text-gray-700">Date</TableHead>
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
                        <Pill className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{event.medicine_name || 'Not specified'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {event.dosage_amount} {event.medicine_unit || 'units'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </div>
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
                          onClick={() => handleDelete(event.medicine_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
