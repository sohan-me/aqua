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
import { Plus, Search, Edit, Trash2, Package, Calendar, Stethoscope, Activity } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface MedicineEvent {
  medicine_id: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  memo: string;
  created_at: string;
  total_cost: number;
}

interface MedicineLine {
  medicine_line_id: number;
  medicine_id: number;
  item_id: number;
  medicine_name?: string;
  dosage: string;
  qty_used: number;
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
  });
  const [lineItems, setLineItems] = useState<Partial<MedicineLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

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
      dosage: '',
      qty_used: 0,
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
            dosage: line.dosage || '',
            qty_used: line.qty_used || 0,
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
    });
    setLineItems([]);
  };

  const filteredMedicineEvents = medicineEvents.filter(event =>
    event.pond_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medicine Events</h1>
          <p className="text-gray-600 mt-1">Record fish treatment and medicine application activities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingMedicine(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Medicine Event
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMedicine ? 'Edit Medicine Event' : 'Add New Medicine Event'}</DialogTitle>
              <DialogDescription>
                {editingMedicine ? 'Update medicine event information' : 'Record a new fish treatment event'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pond_id">Pond *</Label>
                  <Select
                    value={formData.pond_id}
                    onValueChange={(value) => setFormData({ ...formData, pond_id: value })}
                  >
                    <SelectTrigger className="h-12">
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
                  <Label htmlFor="event_date">Event Date *</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
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
                  placeholder="Additional notes about the medicine event"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Medicine Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Medicine Lines</Label>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6">
                      <div className="grid grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Medicine</Label>
                          <Select
                            value={line.medicine_id?.toString() || ''}
                            onValueChange={(value) => updateLineItem(index, 'medicine_id', parseInt(value))}
                          >
                            <SelectTrigger className="h-12">
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
                          <Label>Dosage</Label>
                          <Input
                            type="text"
                            value={line.dosage || ''}
                            onChange={(e) => updateLineItem(index, 'dosage', e.target.value)}
                            placeholder="Dosage information"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Quantity Used</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.qty_used || ''}
                            onChange={(e) => updateLineItem(index, 'qty_used', parseFloat(e.target.value) || 0)}
                            placeholder="Quantity used"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Unit Cost</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_cost || ''}
                            onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                            placeholder="Cost per unit"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Total Cost</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={line.total_cost || 0}
                              readOnly
                              className="bg-gray-50 h-12"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-700 h-12 px-3"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 text-center">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      ৳{calculateTotals().totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-red-600">Total Cost</div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMedicine ? 'Update' : 'Create'} Medicine Event
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
            placeholder="Search medicine events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Medicine Events Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading medicine events...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pond</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicineEvents.map((event) => (
                <TableRow key={event.medicine_id}>
                  <TableCell className="font-medium">{event.pond_name}</TableCell>
                  <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>৳{event.total_cost ? Number(event.total_cost).toFixed(2) : '0.00'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(event)}
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
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(event.medicine_id)}
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

      {filteredMedicineEvents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No medicine events found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No medicine events match your search criteria.' : 'Get started by recording your first medicine event.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Medicine Event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
