'use client';

import { Bell, Search, Menu, LogOut, User } from 'lucide-react';
import { useAlerts } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: alertsData } = useAlerts();
  const auth = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Array<{name: string; href: string; description: string; keywords: string[]}>>([]);
  const activeAlerts = alertsData?.data?.filter(alert => !alert.is_resolved) || [];

  // Search suggestions data - memoized to prevent infinite re-renders
  const searchSuggestions = useMemo(() => [
    { name: 'Ponds', href: '/ponds', description: 'Manage fish ponds', keywords: ['pond', 'ponds', 'tank', 'tanks'] },
    { name: 'Stocking', href: '/stocking', description: 'View stocking records', keywords: ['stock', 'stocking', 'fish', 'fry', 'fingerling'] },
    { name: 'Feeding', href: '/feeding', description: 'Manage feeding records', keywords: ['feed', 'feeding', 'food', 'nutrition'] },
    { name: 'Harvest', href: '/harvest', description: 'View harvest records', keywords: ['harvest', 'harvesting', 'catch', 'production'] },
    { name: 'Water Quality', href: '/water-quality', description: 'Monitor water quality', keywords: ['water', 'quality', 'ph', 'temperature', 'oxygen'] },
    { name: 'Expenses', href: '/expenses', description: 'Track expenses', keywords: ['expense', 'expenses', 'cost', 'costs', 'spending'] },
    { name: 'Income', href: '/income', description: 'Track income', keywords: ['income', 'revenue', 'earnings', 'money'] },
    { name: 'Alerts', href: '/alerts', description: 'View system alerts', keywords: ['alert', 'alerts', 'warning', 'warnings', 'notification'] },
    { name: 'Reports', href: '/reports', description: 'Generate reports', keywords: ['report', 'reports', 'analytics', 'analysis'] },
    { name: 'Daily Logs', href: '/daily-logs', description: 'Record daily activities', keywords: ['daily', 'log', 'logs', 'activity', 'activities'] },
    { name: 'Analytics', href: '/analytics', description: 'View analytics dashboard', keywords: ['analytics', 'dashboard', 'statistics', 'stats'] },
  ], []);

  // Filter suggestions based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = searchSuggestions.filter(suggestion =>
        suggestion.name.toLowerCase().includes(query) ||
        suggestion.description.toLowerCase().includes(query) ||
        suggestion.keywords.some(keyword => keyword.includes(query))
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, searchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Safety check for auth context
  if (!auth) {
    return null;
  }
  
  const { user, logout } = auth;

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle suggestion click
  const handleSuggestionClick = (href: string) => {
    setSearchQuery('');
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    router.push(href);
  };

  // Handle form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && filteredSuggestions.length > 0) {
      // Navigate to first suggestion
      handleSuggestionClick(filteredSuggestions[0].href);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-2xl font-semibold text-gray-900">Fish Farming Dashboard</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative ">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full md:w-64 rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              />
            </form>
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.href)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{suggestion.name}</div>
                    <div className="text-sm text-gray-500">{suggestion.description}</div>
                  </button>
                ))}
              </div>
            )}
            
            {/* No Results Message */}
            {showSuggestions && filteredSuggestions.length === 0 && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="px-4 py-3 text-center text-gray-500">
                  No pages found for &quot;{searchQuery}&quot;
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <Link href="/alerts">
            <button className="relative rounded-full bg-white p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <Bell className="h-6 w-6" />
              {activeAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {activeAlerts.length}
                </span>
              )}
            </button>
            </Link>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2"
            >
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
