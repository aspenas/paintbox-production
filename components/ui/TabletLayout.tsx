'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  KeyIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface TabletLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
  color?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  navigationItems: NavigationItem[];
}

interface HeaderProps {
  onMenuToggle: () => void;
  currentPageLabel: string;
  currentUser?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  currentPage, 
  onNavigate, 
  navigationItems 
}) => {
  const handleNavigation = (page: string) => {
    onNavigate(page);
    onClose(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:w-72 lg:shadow-none lg:border-r lg:border-gray-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-paintbox-text">Paintbox</h2>
              <p className="text-sm text-paintbox-text-muted">Deployment Center</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' 
                      : 'hover:bg-gray-50 text-paintbox-text hover:text-paintbox-primary'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color || 'text-gray-500'}`} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className={`
                      ml-auto px-2 py-1 text-xs font-bold rounded-full
                      ${isActive 
                        ? 'bg-white bg-opacity-20 text-white' 
                        : 'bg-red-100 text-red-600'
                      }
                    `}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* System Status Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-paintbox-text">All Systems Operational</span>
            </div>
            <button className="text-sm text-paintbox-text-muted hover:text-paintbox-primary">
              Status
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  currentPageLabel, 
  currentUser = 'Field Technician' 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-paintbox-text">
              {currentPageLabel}
            </h1>
            <p className="text-sm text-paintbox-text-muted">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Current Time - Useful for field technicians */}
          <div className="hidden sm:block text-right">
            <p className="text-lg font-mono font-semibold text-paintbox-text">
              {formatTime(currentTime)}
            </p>
            <p className="text-xs text-paintbox-text-muted">Local Time</p>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3 bg-gray-50 rounded-full px-4 py-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-paintbox-text">{currentUser}</p>
              <p className="text-xs text-paintbox-text-muted">Online</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const TabletLayout: React.FC<TabletLayoutProps> = ({ 
  children, 
  currentPage = 'dashboard',
  onNavigate = () => {} 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Navigation items with badges for error counts
  const navigationItems: NavigationItem[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: HomeIcon,
      color: 'text-blue-500'
    },
    { 
      id: 'deployments', 
      label: 'Deployments', 
      icon: ServerIcon,
      color: 'text-green-500'
    },
    { 
      id: 'health', 
      label: 'Health Monitor', 
      icon: HeartIcon,
      color: 'text-red-500'
    },
    { 
      id: 'errors', 
      label: 'Integration Errors', 
      icon: ExclamationTriangleIcon,
      badge: 3, // This would come from props
      color: 'text-orange-500'
    },
    { 
      id: 'secrets', 
      label: 'Secrets Manager', 
      icon: KeyIcon,
      color: 'text-purple-500'
    },
    { 
      id: 'metrics', 
      label: 'Performance', 
      icon: ChartBarIcon,
      color: 'text-indigo-500'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: CogIcon,
      color: 'text-gray-500'
    }
  ];

  const currentPageLabel = navigationItems.find(item => item.id === currentPage)?.label || 'Dashboard';

  // Touch gestures for mobile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    
    // Swipe right to open sidebar
    if (deltaX > 100 && touchStartX < 50) {
      setIsSidebarOpen(true);
    }
    // Swipe left to close sidebar
    else if (deltaX < -100 && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    
    setTouchStartX(null);
  };

  // Auto-close sidebar on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      className="min-h-screen bg-paintbox-background flex"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        navigationItems={navigationItems}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onMenuToggle={() => setIsSidebarOpen(true)}
          currentPageLabel={currentPageLabel}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TabletLayout;