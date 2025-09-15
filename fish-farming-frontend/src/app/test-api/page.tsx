'use client';

import { useState } from 'react';
import { apiService } from '@/lib/api';

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testFcrApi = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('Testing FCR API...');
      const response = await apiService.getFcrAnalysis();
      console.log('FCR API Response:', response);
      setResult(response);
    } catch (err: any) {
      console.error('FCR API Error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testAuth = () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('userData');
    console.log('Auth Token:', token);
    console.log('User Data:', user);
    setResult({
      token: token ? 'Present' : 'Missing',
      user: user ? 'Present' : 'Missing'
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="space-y-4">
        <button
          onClick={testAuth}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Authentication
        </button>
        
        <button
          onClick={testFcrApi}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test FCR API'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-100 border border-gray-400 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
