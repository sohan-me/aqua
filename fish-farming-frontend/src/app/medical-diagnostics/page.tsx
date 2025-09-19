'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, ArrowLeft, Calendar, MapPin, Activity } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { MedicalDiagnostic } from '@/lib/api';

export default function MedicalDiagnosticsPage() {
  const [savedDiagnostics, setSavedDiagnostics] = useState<MedicalDiagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedDiagnostics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/medical-diagnostics/');
      setSavedDiagnostics(response.data.results || response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      setError('রোগ নির্ণয় লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const applyTreatment = async (diagnosticId: number) => {
    try {
      await api.post(`/medical-diagnostics/${diagnosticId}/apply_treatment/`);
      // Refresh the list after applying treatment
      fetchSavedDiagnostics();
    } catch (error) {
      console.error('Error applying treatment:', error);
      alert('চিকিৎসা প্রয়োগে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">রোগ নির্ণয় লোড হচ্ছে...</h3>
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">সমস্যা হয়েছে</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Button onClick={fetchSavedDiagnostics} className="mt-4">
            আবার চেষ্টা করুন
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
              ফিরে যান
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            🐟 সংরক্ষিত রোগ নির্ণয়ের তালিকা
          </h1>
        </div>
        <p className="text-gray-600">
          আপনার সংরক্ষিত সব রোগ নির্ণয়ের তালিকা এবং চিকিৎসা প্রয়োগের অবস্থা
        </p>
      </div>

      {/* Diagnostics List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            রোগ নির্ণয়ের তালিকা ({savedDiagnostics.length}টি)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {savedDiagnostics.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">কোনো সংরক্ষিত রোগ নির্ণয় নেই</h3>
              <p className="mt-2 text-sm text-gray-500">
                প্রথমে একটি রোগ নির্ণয় করুন এবং সংরক্ষণ করুন
              </p>
              <Link href="/medical-diagnostic">
                <Button className="mt-4">
                  নতুন রোগ নির্ণয় করুন
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {savedDiagnostics.map((diagnostic) => (
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
                          <span>পুকুর: {diagnostic.pond_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          <span>{parseFloat(diagnostic.pond_area).toFixed(3)} ডেসিমেল</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(diagnostic.created_at).toLocaleDateString('bn-BD')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={diagnostic.is_applied ? "default" : "secondary"}
                        className="mb-2"
                      >
                        {diagnostic.is_applied ? 'প্রয়োগ হয়েছে' : 'প্রয়োগ হয়নি'}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        {new Date(diagnostic.created_at).toLocaleString('bn-BD')}
                      </p>
                    </div>
                  </div>

                  {/* Treatment Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        সুপারিশকৃত চিকিৎসা:
                      </h5>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {diagnostic.recommended_treatment}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        ডোজ ও প্রয়োগ:
                      </h5>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {diagnostic.dosage_application}
                      </p>
                    </div>
                  </div>

                  {/* Selected Organs and Symptoms */}
                  {(diagnostic.selected_organs?.length > 0 || diagnostic.selected_symptoms?.length > 0) && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-gray-700 mb-2">নির্বাচিত অঙ্গ ও লক্ষণ:</h5>
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
                        <h6 className="font-semibold text-green-800">চিকিৎসা প্রয়োগ হয়েছে</h6>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        প্রয়োগের সময়: {new Date(diagnostic.applied_at).toLocaleString('bn-BD')}
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
                        চিকিৎসা প্রয়োগ করুন
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
