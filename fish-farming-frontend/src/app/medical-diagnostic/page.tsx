'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Heart, Eye, Brain, Zap, Droplets, Activity, Fish, MapPin, Edit3, Save, X, Search } from 'lucide-react';
import { usePonds } from '@/hooks/useApi';
import { Pond, MedicalDiagnostic } from '@/lib/api';
import { extractApiData } from '@/lib/utils';
import { api } from '@/lib/api';
import { medicalData } from '@/lib/medicalData';
import Link from 'next/link';

interface SelectedOrgan {
  id: string;
  name: string;
  conditions: string[];
}

interface Diagnosis {
  disease: string;
  confidence: number;
  treatment: string;
  dosage: string;
}

export default function MedicalDiagnosticPage() {
  const [selectedPond, setSelectedPond] = useState<Pond | null>(null);
  const [selectedOrgans, setSelectedOrgans] = useState<SelectedOrgan[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableDiagnosis, setEditableDiagnosis] = useState<Diagnosis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDiagnostic, setSavedDiagnostic] = useState<MedicalDiagnostic | null>(null);
  const [savedDiagnostics, setSavedDiagnostics] = useState<MedicalDiagnostic[]>([]);

  // Fetch real ponds data from API
  const { data: pondsData, isLoading: pondsLoading } = usePonds();
  const ponds = extractApiData<Pond>(pondsData);

  // Fetch saved diagnostics on component mount
  useEffect(() => {
    fetchSavedDiagnostics();
  }, []);

  const handleOrganSelect = (organId: string) => {
    const organ = medicalData.organs.find(o => o.id === organId);
    if (!organ) return;

    const existingOrgan = selectedOrgans.find(o => o.id === organId);
    if (existingOrgan) {
      setSelectedOrgans(selectedOrgans.filter(o => o.id !== organId));
    } else {
      setSelectedOrgans([...selectedOrgans, { id: organId, name: organ.name, conditions: [] }]);
    }
  };

  const handleConditionSelect = (organId: string, condition: string) => {
    setSelectedOrgans(prev => prev.map(organ => {
      if (organ.id === organId) {
        const hasCondition = organ.conditions.includes(condition);
        return {
          ...organ,
          conditions: hasCondition 
            ? organ.conditions.filter(c => c !== condition)
            : [...organ.conditions, condition]
        };
      }
      return organ;
    }));
  };

  const analyzeSymptoms = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      const allConditions = selectedOrgans.flatMap(organ => organ.conditions);
      
      if (allConditions.length === 0) {
        setDiagnosis({
          disease: 'No symptoms selected',
          confidence: 0,
          treatment: 'Please select symptoms to continue',
          dosage: ''
        });
        setIsAnalyzing(false);
        return;
      }

      // Check for healthy conditions only
      const healthyConditions = selectedOrgans.every(organ => 
        organ.conditions.every(condition => 
          medicalData.conditions[organ.id as keyof typeof medicalData.conditions]?.healthy.includes(condition)
        )
      );

      if (healthyConditions) {
        setDiagnosis({
          disease: 'Healthy Condition',
          confidence: 95,
          treatment: 'No treatment needed. Maintain good feeding and care.',
          dosage: 'Regular water changes and quality feed.'
        });
        setIsAnalyzing(false);
        return;
      }

      // Enhanced matching algorithm that properly handles multiple organs
      const diseaseMatches = medicalData.diseases
        .filter(disease => disease.id !== 'healthy')
        .map(disease => {
          let score = 0;
          let exactMatches = 0;
          let partialMatches = 0;
          let organMatches = 0;
          const symptomMatches = [];
          
          // Check each selected organ's conditions against disease symptoms
          for (const organ of selectedOrgans) {
            let organHasMatch = false;
            const organSymptomMatches = [];
            
            for (const condition of organ.conditions) {
              // Check for exact symptom matches
              const exactMatch = disease.symptoms.some(symptom => 
                condition.toLowerCase() === symptom.toLowerCase()
              );
              
              if (exactMatch) {
                exactMatches++;
                score += 20; // Higher score for exact matches
                organHasMatch = true;
                organSymptomMatches.push({ condition, match: 'exact' });
              } else {
                // Check for partial matches with better keyword matching
                const partialMatch = disease.symptoms.some(symptom => {
                  const conditionLower = condition.toLowerCase();
                  const symptomLower = symptom.toLowerCase();
                  
                  // Direct substring match
                  if (conditionLower.includes(symptomLower) || symptomLower.includes(conditionLower)) {
                    return true;
                  }
                  
                  // Keyword matching
                  const conditionWords = conditionLower.split(/[\s,;]+/).filter(w => w.length > 2);
                  const symptomWords = symptomLower.split(/[\s,;]+/).filter(w => w.length > 2);
                  
                  const hasKeywordMatch = conditionWords.some(cw => 
                    symptomWords.some(sw => 
                      cw.includes(sw) || sw.includes(cw) ||
                      // Common medical terms
                      (cw === 'gill' && sw === 'gill') ||
                      (cw === 'eye' && sw === 'eye') ||
                      (cw === 'skin' && sw === 'skin') ||
                      (cw === 'liver' && sw === 'liver') ||
                      (cw === 'intestine' && sw === 'intestine') ||
                      (cw === 'spleen' && sw === 'spleen') ||
                      (cw === 'kidney' && sw === 'kidney') ||
                      (cw === 'brain' && sw === 'brain') ||
                      (cw === 'muscle' && sw === 'muscle')
                    )
                  );
                  
                  return hasKeywordMatch;
                });
                
                if (partialMatch) {
                  partialMatches++;
                  score += 10; // Good score for partial matches
                  organHasMatch = true;
                  organSymptomMatches.push({ condition, match: 'partial' });
                }
              }
            }
            
            if (organHasMatch) {
              organMatches++;
              symptomMatches.push({
                organ: organ.name,
                matches: organSymptomMatches
              });
            }
          }
          
          // Calculate confidence based on matches and organ involvement
          const totalSymptoms = disease.symptoms.length;
          const totalConditions = allConditions.length;
          
          // More sophisticated confidence calculation
          let confidence = 0;
          if (exactMatches > 0) {
            confidence += (exactMatches / totalConditions) * 60; // Exact matches are very important
          }
          if (partialMatches > 0) {
            confidence += (partialMatches / totalConditions) * 30; // Partial matches are good
          }
          
          // Organ involvement bonus
          if (organMatches > 1) {
            confidence += Math.min(20, (organMatches - 1) * 10); // Bonus for multi-organ involvement
          }
          
          // Penalty for diseases with very few symptoms if many conditions selected
          if (totalSymptoms < 3 && totalConditions > 5) {
            confidence = Math.max(0, confidence - 15);
          }
          
          // Bonus for diseases that typically affect multiple organs
          const multiOrganDiseases = ['bacterial_septicemia', 'systemic_infection', 'mixed_infection', 'tilv', 'iridovirus', 'streptococcus', 'edwardsiella'];
          if (multiOrganDiseases.includes(disease.id) && organMatches > 1) {
            confidence += 15;
          }
          
          // Ensure confidence is between 0 and 95
          confidence = Math.min(95, Math.max(0, Math.round(confidence)));
          
          return {
            disease,
            score,
            confidence,
            exactMatches,
            partialMatches,
            organMatches,
            symptomMatches
          };
        })
        .filter(match => match.confidence > 0)
        .sort((a, b) => {
          // Primary sort by confidence, secondary by exact matches, tertiary by organ matches
          if (b.confidence !== a.confidence) {
            return b.confidence - a.confidence;
          }
          if (b.exactMatches !== a.exactMatches) {
            return b.exactMatches - a.exactMatches;
          }
          if (b.organMatches !== a.organMatches) {
            return b.organMatches - a.organMatches;
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
        // Add organ involvement info for better diagnosis
        const organInfo = selectedOrgans.length > 1 ? 
          ` (${selectedOrgans.length} organs with symptoms: ${selectedOrgans.map(o => o.name).join(', ')})` : '';
        
        // Add symptom matching info for debugging
        const symptomInfo = bestMatch.symptomMatches && bestMatch.symptomMatches.length > 0 ? 
          `\n\nMatching Symptoms:\n${bestMatch.symptomMatches.map(organMatch => 
            `${organMatch.organ}: ${organMatch.matches.map(m => m.condition).join(', ')}`
          ).join('\n')}` : '';
        
        setDiagnosis({
          disease: bestMatch.disease.name + organInfo,
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
    setSelectedOrgans([]);
    setDiagnosis(null);
    setIsEditing(false);
    setEditableDiagnosis(null);
    setSavedDiagnostic(null);
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

  const saveDiagnosticToDatabase = async (diagnosisToSave?: Diagnosis) => {
    if (!selectedPond) return;

    const diagnosisData = diagnosisToSave || editableDiagnosis;
    if (!diagnosisData) return;

    setIsSaving(true);
    try {
      const diagnosticData = {
        pond: selectedPond.id,
        disease_name: diagnosisData.disease,
        confidence_percentage: diagnosisData.confidence.toString(),
        recommended_treatment: diagnosisData.treatment,
        dosage_application: diagnosisData.dosage,
        selected_organs: selectedOrgans.map(organ => ({
          id: organ.id,
          name: organ.name,
          conditions: organ.conditions
        })),
        selected_symptoms: selectedOrgans.flatMap(organ => organ.conditions),
        notes: ''
      };

      const response = await api.post('/medical-diagnostics/', diagnosticData);
      setSavedDiagnostic(response.data);
      
      if (editableDiagnosis) {
        setDiagnosis(editableDiagnosis);
        setIsEditing(false);
        setEditableDiagnosis(null);
      }
      
      // Refresh the diagnostics list
      fetchSavedDiagnostics();
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      alert('Error saving treatment. Please try again.');
    } finally {
      setIsSaving(false);
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

  const saveWithoutEditing = () => {
    if (diagnosis) {
      saveDiagnosticToDatabase(diagnosis);
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

  return (
    <div className="container mx-auto text-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-900">
          🐟 Fish Medical Diagnostic Assistant
        </h1>
        <p className="text-center text-gray-600">
          Select a pond, choose organs, and identify symptoms for disease diagnosis
        </p>
        <div className="text-center mt-4 flex">
          <Link href="/medical-diagnostics">
            <Button
              variant="outline"
              className="flex items-center bg-blue-600 gap-2 text-gray-800 mr-4"
            >
              <Brain className="h-4 w-4" />
              View Saved Diagnostics
            </Button>
          </Link>
          <Link href="/quick-diagnosis">
            <Button
              variant="outline"
              className="flex items-center bg-blue-600 gap-2 text-gray-800"
            >
              <Search className="h-4 w-4" />
              Quick Diagnosis
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
              <span className="ml-3 text-gray-600">Loading ponds list...</span>
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
                    key={pond.id}
                    variant={selectedPond?.id === pond.id ? "default" : "outline"}
                    onClick={() => setSelectedPond(pond)}
                    className={`h-auto p-4 flex flex-col items-start gap-2 text-left ${
                      selectedPond?.id === pond.id 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                    }`}
                  >
                    <div className={`font-semibold ${selectedPond?.id === pond.id ? 'text-white' : 'text-gray-800'}`}>{pond.name}</div>
                    <div className={`text-sm flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-white opacity-90' : 'text-gray-700'}`}>
                      <Droplets className="h-3 w-3" />
                      Size: {parseFloat(pond.area_decimal).toFixed(3)} decimel
                    </div>
                    <div className={`text-sm flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-white opacity-90' : 'text-gray-700'}`}>
                      <Activity className="h-3 w-3" />
                      Depth: {parseFloat(pond.depth_ft).toFixed(1)} ft
                    </div>
                    <div className={`text-sm flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-white opacity-90' : 'text-gray-700'}`}>
                      <Fish className="h-3 w-3" />
                      Volume: {parseFloat(pond.volume_m3).toFixed(1)} m³
                    </div>
                    {pond.location && (
                      <div className={`text-sm flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-white opacity-90' : 'text-gray-700'}`}>
                        <MapPin className="h-3 w-3" />
                        {pond.location}
                      </div>
                    )}
                    <div className={`text-xs px-2 py-1 rounded-full text-blue-500 border`}>
                      {pond.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </Button>
                ))}
              </div>
              
              {selectedPond && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected Pond:</strong> {selectedPond.name} ({parseFloat(selectedPond.area_decimal).toFixed(3)} decimel) - {selectedPond.location || 'No location specified'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>


      {selectedPond && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organ Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Heart className="h-5 w-5" />
                Select Organs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {medicalData.organs.map(organ => (
                  <Button
                    key={organ.id}
                    variant={selectedOrgans.some(o => o.id === organ.id) ? "default" : "outline"}
                    onClick={() => handleOrganSelect(organ.id)}
                    className={`h-auto p-4 flex flex-col items-center gap-2 ${
                      selectedOrgans.some(o => o.id === organ.id)
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{organ.icon}</span>
                    <span className={`text-sm text-center font-medium ${selectedOrgans.some(o => o.id === organ.id) ? 'text-white' : 'text-gray-800'}`}>{organ.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Condition Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Eye className="h-5 w-5" />
                Select Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedOrgans.map(organ => (
                  <div key={organ.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                      {medicalData.organs.find(o => o.id === organ.id)?.icon} {organ.name}
                    </h4>
                    
                    {/* Healthy Conditions */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Healthy Symptoms
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {medicalData.conditions[organ.id as keyof typeof medicalData.conditions]?.healthy.map(condition => (
                          <Button
                            key={condition}
                            variant={organ.conditions.includes(condition) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleConditionSelect(organ.id, condition)}
                            className={`text-xs ${
                              organ.conditions.includes(condition) 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                            }`}
                          >
                            {condition}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Unhealthy Conditions */}
                    <div>
                      <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Unhealthy/Abnormal Symptoms
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {medicalData.conditions[organ.id as keyof typeof medicalData.conditions]?.unhealthy.map(condition => (
                          <Button
                            key={condition}
                            variant={organ.conditions.includes(condition) ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleConditionSelect(organ.id, condition)}
                            className={`text-xs ${
                              organ.conditions.includes(condition) 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                            }`}
                          >
                            {condition}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedOrgans.length === 0 && (
                  <p className="text-center text-gray-600 py-8">
                    Please select organs first
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Button */}
      {selectedPond && (
        <div className="mt-6 text-center">
          <Button
            onClick={analyzeSymptoms}
            disabled={selectedOrgans.length === 0 || isAnalyzing}
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
          
          {(selectedOrgans.length > 0 || selectedPond) && (
            <Button
              variant="outline"
              onClick={resetDiagnosis}
              className="ml-4 text-gray-800 bg-red-600"
            >
              Reset
            </Button>
          )}
        </div>
      )}

      {!selectedPond && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-lg">
            Please select a pond first to begin disease diagnosis
          </p>
        </div>
      )}

      {/* Diagnosis Results */}
      {diagnosis && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Brain className="h-5 w-5 hidden md:block" />
                Diagnosis Results
              </CardTitle>
              {!isEditing && !savedDiagnostic && (
                <div className="md:flex gap-2">
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
                  <strong>Pond:</strong> {selectedPond.name} ({parseFloat(selectedPond.area_decimal).toFixed(3)} decimel) - {selectedPond.location || 'No location specified'}
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
              {/* <Badge variant={diagnosis.confidence > 70 ? "default" : "secondary"}>
                {diagnosis.confidence}% confident
              </Badge> */}
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
                <p className="text-sm text-gray-800">{diagnosis.dosage}</p>
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
                  {isSaving ? 'Saving...' : 'Save Changes'}
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
                      Saved at: {new Date(savedDiagnostic.created_at).toLocaleString('en-US')}
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
                    Applied at: {new Date(savedDiagnostic.applied_at).toLocaleString('en-US')}
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
