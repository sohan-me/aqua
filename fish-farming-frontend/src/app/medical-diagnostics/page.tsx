'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, ArrowLeft, Calendar, MapPin, Activity, Filter, X, Search, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { MedicalDiagnostic, Pond } from '@/lib/api';
import { usePonds } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';

export default function MedicalDiagnosticsPage() {
  const [savedDiagnostics, setSavedDiagnostics] = useState<MedicalDiagnostic[]>([]);
  const [filteredDiagnostics, setFilteredDiagnostics] = useState<MedicalDiagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedPond, setSelectedPond] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch real ponds data from API
  const { data: pondsData, isLoading: pondsLoading } = usePonds();
  const ponds = extractApiData<Pond>(pondsData?.data);

  const fetchSavedDiagnostics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/medical-diagnostics/');
      const diagnostics = response.data.results || response.data;
      setSavedDiagnostics(diagnostics);
      setFilteredDiagnostics(diagnostics);
      setError(null);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      setError('Error loading medical diagnostics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter diagnostics based on current filter states
  const applyFilters = () => {
    let filtered = [...savedDiagnostics];

    // Pond filter
    if (selectedPond !== 'all') {
      filtered = filtered.filter(diagnostic => diagnostic.pond === parseInt(selectedPond));
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(diagnostic => new Date(diagnostic.created_at) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(diagnostic => new Date(diagnostic.created_at) <= toDate);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isApplied = statusFilter === 'applied';
      filtered = filtered.filter(diagnostic => diagnostic.is_applied === isApplied);
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(diagnostic => 
        diagnostic.disease_name.toLowerCase().includes(searchLower) ||
        diagnostic.pond_name.toLowerCase().includes(searchLower) ||
        diagnostic.recommended_treatment.toLowerCase().includes(searchLower) ||
        diagnostic.dosage_application.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDiagnostics(filtered);
  };

  // Apply filters whenever filter states change
  useEffect(() => {
    applyFilters();
  }, [selectedPond, dateFrom, dateTo, statusFilter, searchTerm, savedDiagnostics]);

  const clearFilters = () => {
    setSelectedPond('all');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setSearchTerm('');
  };

  const getFilterCount = () => {
    let count = 0;
    if (selectedPond !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (statusFilter !== 'all') count++;
    if (searchTerm) count++;
    return count;
  };

  const applyTreatment = async (diagnosticId: number) => {
    try {
      await api.post(`/medical-diagnostics/${diagnosticId}/apply_treatment/`);
      // Refresh the list after applying treatment
      fetchSavedDiagnostics();
    } catch (error) {
      console.error('Error applying treatment:', error);
      alert('Error applying treatment. Please try again.');
    }
  };

  useEffect(() => {
    fetchSavedDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Loading medical diagnostics...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-8">
          <Brain className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Something went wrong</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Button onClick={fetchSavedDiagnostics} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/medical-diagnostic">
            <Button variant="outline" size="sm" className="flex items-center gap-2 text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Diagnosis
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            🐟 Saved Medical Diagnostics
          </h1>
        </div>
        <p className="text-gray-600">
          View and manage all your saved medical diagnostics and treatment applications
        </p>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {getFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getFilterCount()} active
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-white"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              {getFilterCount() > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-white"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search diagnostics..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pond Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Pond</label>
                <select
                  value={selectedPond}
                  onChange={(e) => setSelectedPond(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Ponds</option>
                  {ponds.map(pond => (
                    <option key={pond.pond_id} value={pond.pond_id.toString()}>
                      {pond.name} ({parseFloat(pond.water_area_decimal).toFixed(3)} decimal)
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="applied">Applied</option>
                  <option value="not_applied">Not Applied</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    placeholder="From Date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    placeholder="To Date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Diagnostics List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Medical Diagnostics ({filteredDiagnostics.length} of {savedDiagnostics.length})
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Applied: {filteredDiagnostics.filter(d => d.is_applied).length}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Pending: {filteredDiagnostics.filter(d => !d.is_applied).length}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDiagnostics.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {savedDiagnostics.length === 0 ? 'No saved medical diagnostics' : 'No diagnostics match your filters'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {savedDiagnostics.length === 0 
                  ? 'Please create a medical diagnostic first and save it'
                  : 'Try adjusting your filter criteria or clear all filters'
                }
              </p>
              <div className="flex gap-2 justify-center mt-4">
                {savedDiagnostics.length === 0 ? (
                  <Link href="/medical-diagnostic">
                    <Button>
                      Create New Diagnosis
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button onClick={clearFilters} variant="outline" style={{color: "white"}}>
                      Clear Filters
                    </Button>
                    <Link href="/medical-diagnostic">
                      <Button>
                        Create New Diagnosis
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDiagnostics.map((diagnostic) => (
                <div key={diagnostic.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">
                        {diagnostic.disease_name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>Pond: {diagnostic.pond_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          <span>{parseFloat(diagnostic.pond_area).toFixed(3)} decimel</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(diagnostic.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={diagnostic.is_applied ? "default" : "secondary"}
                        className="mb-2"
                      >
                        {diagnostic.is_applied ? 'Applied' : 'Not Applied'}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        {new Date(diagnostic.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Treatment Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Recommended Treatment:
                      </h5>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {diagnostic.recommended_treatment}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Dosage & Application:
                      </h5>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {diagnostic.dosage_application}
                      </p>
                    </div>
                  </div>

                  {/* Selected Organs and Symptoms */}
                  {(diagnostic.selected_organs?.length > 0 || diagnostic.selected_symptoms?.length > 0) && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-gray-700 mb-2">Selected Organs & Symptoms:</h5>
                      <div className="flex flex-wrap gap-2 text-black">
                        {diagnostic.selected_organs?.map((organ: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-black">
                            {organ.name}
                          </Badge>
                        ))}
                        {diagnostic.selected_symptoms?.map((symptom: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-black">
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Applied Treatment Info */}
                  {diagnostic.is_applied && diagnostic.applied_at && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        <h6 className="font-semibold text-green-800">Treatment Applied</h6>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        Applied at: {new Date(diagnostic.applied_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  {!diagnostic.is_applied && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => applyTreatment(diagnostic.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Apply Treatment
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
