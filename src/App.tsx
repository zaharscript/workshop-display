import React, { useState, useEffect } from 'react';
import { ViewMode } from './types';
import { useRealtimeQueue } from './lib/useRealtimeQueue';
import { HeaderNav } from './components/HeaderNav';
import { TVDisplayView } from './components/TVDisplayView';
import { MobileOperatorView } from './components/MobileOperatorView';
import { SettingsView } from './components/SettingsView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [overrideSettings, setOverrideSettings] = useState<boolean>(false);
  const [forcedView, setForcedView] = useState<'tv' | 'mobile' | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Track screen size changes automatically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleScreenChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsLargeScreen(e.matches);
    };

    setIsLargeScreen(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleScreenChange);
    } else {
      mediaQuery.addListener(handleScreenChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleScreenChange);
      } else {
        mediaQuery.removeListener(handleScreenChange);
      }
    };
  }, []);

  const {
    vehicles,
    mechanics,
    announcements,
    activityLogs,
    loading,
    connected,
    recentCompletedPlate,
    addVehicle,
    updateVehicleStatus,
    updateVehicleRecord,
    deleteVehicle,
    addAnnouncement,
    deleteAnnouncement,
    updateAnnouncement,
    resetData,
  } = useRealtimeQueue();

  // Detect standalone URL parameter (e.g. ?view=tv, ?view=mobile, or ?view=settings)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'settings') {
        setOverrideSettings(true);
      } else if (viewParam === 'tv') {
        setForcedView('tv');
      } else if (viewParam === 'mobile') {
        setForcedView('mobile');
      }
    }
  }, []);

  // Determine current active view mode:
  // If settings override is enabled -> 'settings'
  // Else if forced by URL param -> forcedView
  // Else auto-detect by screen breakpoint: large screen (>=1024px) -> 'tv', small screen (<1024px) -> 'mobile'
  const currentView: ViewMode = overrideSettings
    ? 'settings'
    : (forcedView ?? (isLargeScreen ? 'tv' : 'mobile'));

  const handleViewChange = (view: ViewMode) => {
    if (view === 'settings') {
      setOverrideSettings((prev) => !prev);
    } else {
      setOverrideSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-3 border-[#c45c3d] border-t-transparent animate-spin mb-4" />
        <h2 className="text-xl font-serif font-bold text-[#1c382f] dark:text-[#f3ede3] tracking-tight">QES FORD AUTOPARTS</h2>
        <p className="text-xs text-[#716152] dark:text-[#a3b8ad] mt-1 font-mono">Memuatkan sistem paparan bengkel & pangkalan data masa-nyata...</p>
      </div>
    );
  }

  const incomingCount = vehicles.filter((v) => v.status === 'incoming').length;
  const inProgressCount = vehicles.filter((v) => v.status === 'in_progress').length;
  const completedCount = vehicles.filter((v) => v.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col antialiased selection:bg-[#c45c3d]/20 selection:text-[#1c382f]">
      {/* Top Header Navigation */}
      <HeaderNav
        currentView={currentView}
        onViewChange={handleViewChange}
        connected={connected}
        incomingCount={incomingCount}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
        onResetData={resetData}
        isLargeScreen={isLargeScreen}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'tv' && (
          <TVDisplayView
            vehicles={vehicles}
            announcements={announcements}
            recentCompletedPlate={recentCompletedPlate}
          />
        )}

        {currentView === 'mobile' && (
          <MobileOperatorView
            vehicles={vehicles}
            mechanics={mechanics}
            activityLogs={activityLogs}
            onAddVehicle={addVehicle}
            onUpdateStatus={updateVehicleStatus}
            onUpdateRecord={updateVehicleRecord}
            onDeleteVehicle={deleteVehicle}
            onResetData={resetData}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            announcements={announcements}
            mechanics={mechanics}
            onAddAnnouncement={addAnnouncement}
            onUpdateAnnouncement={updateAnnouncement}
            onDeleteAnnouncement={deleteAnnouncement}
            onResetData={resetData}
          />
        )}
      </main>
    </div>
  );
}
