#!/usr/bin/env node

/**
 * Frontend Integration Test Script
 * Tests the Next.js frontend integration with the Django backend
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/ fish-farming';
const FRONTEND_URL = 'http://localhost:8000';

async function testBackendAPI() {
  console.log('🧪 Testing Backend API...');
  
  try {
    // Test public endpoints
    const endpoints = [
      '/species/',
      '/expense-types/',
      '/income-types/',
      '/feed-types/',
      '/feeding-bands/',
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`);
        console.log(`✅ ${endpoint} - ${response.data.length} items`);
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
    
    // Test authenticated endpoints (should return 403 without auth)
    const authEndpoints = [
      '/ponds/',
      '/stocking/',
      '/expenses/',
      '/incomes/',
      '/alerts/',
    ];
    
    for (const endpoint of authEndpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`);
        console.log(`✅ ${endpoint} - ${response.data.length} items`);
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(`✅ ${endpoint} - Properly protected (403)`);
        } else {
          console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Backend API Error: ${error.message}`);
  }
}

async function testFrontend() {
  console.log('\n🌐 Testing Frontend...');
  
  try {
    const response = await axios.get(FRONTEND_URL);
    if (response.status === 200) {
      console.log('✅ Frontend is running on http://localhost:8000');
    }
  } catch (error) {
    console.log(`❌ Frontend Error: ${error.message}`);
    console.log('Make sure to run: npm run dev');
  }
}

async function testAPIEndpoints() {
  console.log('\n📊 API Endpoints Summary:');
  
  const endpoints = [
    { path: '/species/', description: 'Fish species management' },
    { path: '/ponds/', description: 'Pond management (auth required)' },
    { path: '/stocking/', description: 'Fish stocking records (auth required)' },
    { path: '/daily-logs/', description: 'Daily operation logs (auth required)' },
    { path: '/feeds/', description: 'Feed management (auth required)' },
    { path: '/sampling/', description: 'Water/fish sampling (auth required)' },
    { path: '/mortality/', description: 'Mortality tracking (auth required)' },
    { path: '/harvest/', description: 'Harvest records (auth required)' },
    { path: '/expenses/', description: 'Expense tracking (auth required)' },
    { path: '/incomes/', description: 'Income tracking (auth required)' },
    { path: '/expense-types/', description: 'Expense categories' },
    { path: '/income-types/', description: 'Income categories' },
    { path: '/inventory-feed/', description: 'Feed inventory' },
    { path: '/treatments/', description: 'Treatment records (auth required)' },
    { path: '/alerts/', description: 'Alert system (auth required)' },
    { path: '/settings/', description: 'User settings (auth required)' },
    { path: '/feeding-bands/', description: 'Feeding schedules' },
    { path: '/env-adjustments/', description: 'Environmental adjustments (auth required)' },
    { path: '/kpi-dashboard/', description: 'Key performance indicators (auth required)' },
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`  ${endpoint.path} - ${endpoint.description}`);
  });
}

async function main() {
  console.log('🐟 Fish Farming Frontend Integration Test');
  console.log('=' .repeat(50));
  
  await testBackendAPI();
  await testFrontend();
  await testAPIEndpoints();
  
  console.log('\n🎉 Integration Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Open http://localhost:8000 in your browser');
  console.log('2. Navigate through the dashboard');
  console.log('3. Test the pond management features');
  console.log('4. Try the expense and income tracking');
  console.log('5. Check the alert system');
  console.log('\n💡 Note: Some features require authentication');
  console.log('   Use the Django admin panel to create a user account');
  console.log('   Admin Panel: http://localhost:8000/admin/');
  console.log('   Username: admin, Password: admin123');
}

main().catch(console.error);
