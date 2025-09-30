'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Brain, Zap, Fish, MapPin, Edit3, Save, X, Search } from 'lucide-react';
import { usePonds } from '@/hooks/useApi';
import { Pond, MedicalDiagnostic } from '@/lib/api';
import { extractApiData } from '@/lib/utils';
import { api } from '@/lib/api';
import { medicalData } from '@/lib/medicalData';
import Link from 'next/link';

interface Diagnosis {
  disease: string;
  confidence: number;
  treatment: string;
  dosage: string;
}

export default function QuickDiagnosisPage() {
  const [selectedPond, setSelectedPond] = useState<Pond | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableDiagnosis, setEditableDiagnosis] = useState<Diagnosis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDiagnostic, setSavedDiagnostic] = useState<MedicalDiagnostic | null>(null);
  const [savedDiagnostics, setSavedDiagnostics] = useState<MedicalDiagnostic[]>([]);

  // Fetch real ponds data from API
  const { data: pondsData, isLoading: pondsLoading } = usePonds();
  const ponds = extractApiData<Pond>(pondsData?.data);

  // Get all possible symptoms from medical data
  const allSymptoms = [
    ...new Set([
      ...Object.values(medicalData.diseases).flatMap(condition => [
        ...condition.symptoms,
        // ...condition.unhealthy
      ])
    ])
  ].sort();

  // Filter symptoms based on search term
  const filteredSymptoms = allSymptoms.filter(symptom =>
    symptom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch saved diagnostics on component mount
  useEffect(() => {
    fetchSavedDiagnostics();
  }, []);

  const handleSymptomSelect = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const analyzeSymptoms = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      if (selectedSymptoms.length === 0) {
        setDiagnosis({
          disease: 'No symptoms selected',
          confidence: 0,
          treatment: 'Please select symptoms to proceed',
          dosage: ''
        });
        setIsAnalyzing(false);
        return;
      }

      // Check for healthy conditions only
      const healthySymptoms = selectedSymptoms.every(symptom => 
        Object.values(medicalData.conditions).some(condition => 
          condition.healthy.includes(symptom)
        )
      );

      if (healthySymptoms) {
        setDiagnosis({
          disease: 'Healthy Condition',
          confidence: 95,
          treatment: 'No treatment needed. Maintain good feeding and care.',
          dosage: 'Regular water changes and quality feed.'
        });
        setIsAnalyzing(false);
        return;
      }

      // Enhanced matching algorithm for symptoms
      const diseaseMatches = medicalData.diseases
        .filter(disease => disease.id !== 'healthy')
        .map(disease => {
          let score = 0;
          let exactMatches = 0;
          let partialMatches = 0;
          const symptomMatches = [];
          
          // Check each selected symptom against disease symptoms
          for (const symptom of selectedSymptoms) {
            // Check for exact symptom matches
            const exactMatch = disease.symptoms.some(diseaseSymptom => 
              symptom.toLowerCase() === diseaseSymptom.toLowerCase()
            );
            
            if (exactMatch) {
              exactMatches++;
              score += 20; // Higher score for exact matches
              symptomMatches.push({ symptom, match: 'exact' });
            } else {
              // Check for partial matches
              const partialMatch = disease.symptoms.some(diseaseSymptom => {
                const symptomLower = symptom.toLowerCase();
                const diseaseSymptomLower = diseaseSymptom.toLowerCase();
                
                // Direct substring match
                if (symptomLower.includes(diseaseSymptomLower) || diseaseSymptomLower.includes(symptomLower)) {
                  return true;
                }
                
                // Keyword matching
                const symptomWords = symptomLower.split(/[\s,;]+/).filter(w => w.length > 2);
                const diseaseWords = diseaseSymptomLower.split(/[\s,;]+/).filter(w => w.length > 2);
                
                const hasKeywordMatch = symptomWords.some(sw => 
                  diseaseWords.some(dw => 
                    sw.includes(dw) || dw.includes(sw)
                  )
                );
                
                return hasKeywordMatch;
              });
              
              if (partialMatch) {
                partialMatches++;
                score += 10; // Good score for partial matches
                symptomMatches.push({ symptom, match: 'partial' });
              }
            }
          }
          
          // Calculate confidence based on matches
          const totalSymptoms = disease.symptoms.length;
          const totalSelectedSymptoms = selectedSymptoms.length;
          
          let confidence = 0;
          if (exactMatches > 0) {
            confidence += (exactMatches / totalSelectedSymptoms) * 60;
          }
          if (partialMatches > 0) {
            confidence += (partialMatches / totalSelectedSymptoms) * 30;
          }
          
          // Bonus for diseases with fewer symptoms if many symptoms selected
          if (totalSymptoms < 3 && totalSelectedSymptoms > 5) {
            confidence = Math.max(0, confidence - 15);
          }
          
          // Ensure confidence is between 0 and 95
          confidence = Math.min(95, Math.max(0, Math.round(confidence)));
          
          return {
            disease,
            score,
            confidence,
            exactMatches,
            partialMatches,
            symptomMatches
          };
        })
        .filter(match => match.confidence > 0)
        .sort((a, b) => {
          if (b.confidence !== a.confidence) {
            return b.confidence - a.confidence;
          }
          if (b.exactMatches !== a.exactMatches) {
            return b.exactMatches - a.exactMatches;
          }
          return b.score - a.score;
        });

      if (diseaseMatches.length === 0) {
        setDiagnosis({
          disease: 'Unknown Disease/Condition',
          confidence: 0,
          treatment: 'Consult a veterinarian. Monitor symptoms more closely.',
          dosage: 'Check water quality and monitor fish behavior.'
        });
        setIsAnalyzing(false);
        return;
      }

      const bestMatch = diseaseMatches[0];
      
      // If confidence is very low, suggest multiple possibilities
      if (bestMatch.confidence < 30 && diseaseMatches.length > 1) {
        const topMatches = diseaseMatches.slice(0, 3);
        const diseaseNames = topMatches.map(m => m.disease.name).join(', ');
        
        setDiagnosis({
          disease: `Possible Diseases: ${diseaseNames}`,
          confidence: bestMatch.confidence,
          treatment: `Primary Treatment: ${bestMatch.disease.treatment}`,
          dosage: `Dosage: ${bestMatch.disease.dosage}. Other possibilities: ${topMatches.slice(1).map(m => m.disease.name).join(', ')}`
        });
      } else {
        // Add symptom matching info for debugging
        const symptomInfo = bestMatch.symptomMatches && bestMatch.symptomMatches.length > 0 ? 
          `\n\nMatching Symptoms:\n${bestMatch.symptomMatches.map(match => 
            `${match.symptom} (${match.match})`
          ).join('\n')}` : '';
        
        setDiagnosis({
          disease: bestMatch.disease.name,
          confidence: bestMatch.confidence,
          treatment: bestMatch.disease.treatment,
          dosage: bestMatch.disease.dosage + symptomInfo
        });
      }
      
      setIsAnalyzing(false);
    }, 2000);
  };

  const resetDiagnosis = () => {
    setSelectedPond(null);
    setSelectedSymptoms([]);
    setDiagnosis(null);
    setIsEditing(false);
    setEditableDiagnosis(null);
    setSavedDiagnostic(null);
    setSearchTerm('');
  };

  const startEditing = () => {
    if (diagnosis) {
      setEditableDiagnosis({ ...diagnosis });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditableDiagnosis(null);
  };

  const updateEditableDiagnosis = (field: keyof Diagnosis, value: string | number) => {
    if (editableDiagnosis) {
      setEditableDiagnosis({
        ...editableDiagnosis,
        [field]: value
      });
    }
  };

  const saveDiagnosticToDatabase = async () => {
    if (!selectedPond || !editableDiagnosis) return;
    
    setIsSaving(true);
    try {
      const diagnosticData = {
        pond: selectedPond.pond_id,
        disease_name: editableDiagnosis.disease,
        confidence_percentage: editableDiagnosis.confidence,
        recommended_treatment: editableDiagnosis.treatment,
        dosage_application: editableDiagnosis.dosage,
        selected_organs: [],
        selected_symptoms: selectedSymptoms,
        notes: '',
        is_applied: false
      };

      const response = await api.post('/medical-diagnostics/', diagnosticData);
      setSavedDiagnostic(response.data);
      setIsEditing(false);
      setEditableDiagnosis(null);
      
      // Refresh the diagnostics list
      fetchSavedDiagnostics();
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      alert('Error saving treatment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveWithoutEditing = async () => {
    if (!selectedPond || !diagnosis) return;
    
    setIsSaving(true);
    try {
      const diagnosticData = {
        pond: selectedPond.pond_id,
        disease_name: diagnosis.disease,
        confidence_percentage: diagnosis.confidence,
        recommended_treatment: diagnosis.treatment,
        dosage_application: diagnosis.dosage,
        selected_organs: [],
        selected_symptoms: selectedSymptoms,
        notes: '',
        is_applied: false
      };

      const response = await api.post('/medical-diagnostics/', diagnosticData);
      setSavedDiagnostic(response.data);
      
      // Refresh the diagnostics list
      fetchSavedDiagnostics();
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      alert('Error saving treatment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyTreatment = async () => {
    if (!savedDiagnostic) return;
    
    try {
      await api.post(`/medical-diagnostics/${savedDiagnostic.id}/apply_treatment/`);
      setSavedDiagnostic({
        ...savedDiagnostic,
        is_applied: true,
        applied_at: new Date().toISOString()
      });
      alert('Treatment applied successfully!');
    } catch (error) {
      console.error('Error applying treatment:', error);
      alert('Error applying treatment. Please try again.');
    }
  };

  const fetchSavedDiagnostics = async () => {
    try {
      const response = await api.get('/medical-diagnostics/');
      setSavedDiagnostics(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    }
  };

  return (
    <div className="container mx-auto text-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-900">
          🔍 Quick Fish Diagnosis
        </h1>
        <p className="text-center text-gray-600">
          Select a pond and choose symptoms for instant disease diagnosis
        </p>
        <div className="text-center mt-4">
          <Link href="/medical-diagnostics">
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 bg-blue-600 text-gray-800 w-full md:w-auto"
            >
              <Brain className="h-4 w-4" />
              View Saved Diagnostics
            </Button>
          </Link>
        </div>
      </div>

      {/* Pond Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🏞️</span>
            Select Pond
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pondsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading ponds...</span>
            </div>
          ) : ponds.length === 0 ? (
            <div className="text-center py-8">
              <Fish className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No ponds available</h3>
              <p className="mt-1 text-sm text-gray-500">Please create a pond first</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ponds.map(pond => (
                  <Button
                    key={pond.pond_id}
                    variant={selectedPond?.pond_id === pond.pond_id ? "default" : "outline"}
                    onClick={() => setSelectedPond(pond)}
                    className={`h-auto p-4 flex flex-col items-start gap-2 text-left ${
                      selectedPond?.pond_id === pond.pond_id 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                    }`}
                  >
                    <div className={`font-semibold ${selectedPond?.pond_id === pond.pond_id ? 'text-white' : 'text-gray-800'}`}>{pond.name}</div>
                    <div className={`text-sm flex items-center gap-1 ${selectedPond?.pond_id === pond.pond_id ? 'text-white opacity-90' : 'text-gray-700'}`}>
                      <Fish className="h-3 w-3" />
                      Area: {parseFloat(pond.water_area_decimal).toFixed(3)} decimal
                    </div>
                    <div className={`text-sm flex items-center gap-1 ${selectedPond?.pond_id === pond.pond_id ? 'text-white opacity-90' : 'text-gray-700'}`}>
                      <MapPin className="h-3 w-3" />
                      {pond.location || 'Location not specified'}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full text-blue-500 border`}>
                      {pond.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </Button>
                ))}
              </div>
              
              {selectedPond && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected Pond:</strong> {selectedPond.name} ({parseFloat(selectedPond.water_area_decimal).toFixed(3)} decimel) - {selectedPond.location || 'Location not specified'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Symptom Selection */}
      {selectedPond && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Select Symptoms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Symptoms Grid */}
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2">
                {filteredSymptoms.map(symptom => (
                  <Button
                    key={symptom}
                    variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSymptomSelect(symptom)}
                    className={`text-xs h-auto p-2 text-left justify-start ${
                      selectedSymptoms.includes(symptom) 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                    }`}
                  >
                    {symptom}
                  </Button>
                ))}
              </div>
            </div>

            {selectedSymptoms.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Selected Symptoms ({selectedSymptoms.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {selectedSymptoms.map(symptom => (
                    <span
                      key={symptom}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {symptom}
                      <button
                        onClick={() => handleSymptomSelect(symptom)}
                        className="ml-1 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Button */}
      {selectedPond && (
        <div className="mt-6 text-center">
          <Button
            onClick={analyzeSymptoms}
            disabled={selectedSymptoms.length === 0 || isAnalyzing}
            // size="lg"
            className="px-8 bg-blue-600 text-gray-800"
          >
            {isAnalyzing ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                {/* <Brain className="h-4 w-4 mr-2" /> */}
                Diagnose Disease
              </>
            )}
          </Button>
          
          {(selectedSymptoms.length > 0 || selectedPond) && (
            <Button
              variant="outline"
              onClick={resetDiagnosis}
              className="ml-4 bg-red-600 text-gray-800"
            >
              Reset
            </Button>
          )}
        </div>
      )}

      {!selectedPond && (
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-lg">
            Please select a pond first to start disease diagnosis
          </p>
        </div>
      )}

      {/* Diagnosis Results */}
      {diagnosis && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Diagnosis Results
              </CardTitle>
              {!isEditing && !savedDiagnostic && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveWithoutEditing()}
                    disabled={isSaving}
                    className="flex items-center gap-2 text-gray-800 w-full md:w-auto bg-blue-600"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="flex items-center gap-2 text-gray-800 w-full md:w-auto bg-amber-400 border-0"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPond && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Pond:</strong> {selectedPond.name} ({parseFloat(selectedPond.water_area_decimal).toFixed(3)} decimel) - {selectedPond.location || 'Location not specified'}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {isEditing ? (
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Disease Name:</label>
                  <input
                    type="text"
                    value={editableDiagnosis?.disease || ''}
                    onChange={(e) => updateEditableDiagnosis('disease', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              ) : (
                <h3 className="text-xl font-semibold text-gray-900">{diagnosis.disease}</h3>
              )}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommended Treatment:</strong>
                {isEditing ? (
                  <textarea
                    value={editableDiagnosis?.treatment || ''}
                    onChange={(e) => updateEditableDiagnosis('treatment', e.target.value)}
                    className="w-full mt-2 p-2 border rounded-md"
                    rows={3}
                  />
                ) : (
                  ` ${diagnosis.treatment}`
                )}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-gray-900">Dosage & Application:</h4>
              {isEditing ? (
                <textarea
                  value={editableDiagnosis?.dosage || ''}
                  onChange={(e) => updateEditableDiagnosis('dosage', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-line">{diagnosis.dosage}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Button
                  onClick={() => saveDiagnosticToDatabase()}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}

            {savedDiagnostic && !isEditing && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-medium">Treatment saved successfully</p>
                    <p className="text-sm text-green-600">
                      Saved at: {new Date(savedDiagnostic.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={applyTreatment}
                    disabled={savedDiagnostic.is_applied}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {savedDiagnostic.is_applied ? 'Treatment Applied' : 'Apply Treatment'}
                  </Button>
                </div>
                {savedDiagnostic.is_applied && savedDiagnostic.applied_at && (
                  <p className="text-sm text-green-600 mt-2">
                    Applied at: {new Date(savedDiagnostic.applied_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg">
              <strong>Warning:</strong> This is a preliminary diagnostic tool. Consult a veterinarian for serious cases.
            </div>
            
            {diagnosis.confidence < 50 && (
              <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg mt-2">
                <strong>Advice:</strong> For accurate diagnosis, perform microscopic examination, water quality testing, and consult a veterinarian.
              </div>
            )}
            
            {diagnosis.confidence > 80 && (
              <div className="text-xs text-green-600 bg-green-50 p-3 rounded-lg mt-2">
                <strong>Recommendation:</strong> Follow the treatment method above for this disease. Re-examine if no improvement is seen.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
