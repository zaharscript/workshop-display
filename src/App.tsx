import React, { useState, useEffect } from 'react';
import { ViewMode } from './types';
import { useRealtimeQueue } from './lib/useRealtimeQueue';
import { HeaderNav } from './components/HeaderNav';
import { TVDisplayView } from './components/TVDisplayView';
import { MobileOperatorView } from './components/MobileOperatorView';
import { SettingsView } from './components/SettingsView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('tv');

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
    resetData,
  } = useRealtimeQueue();

  // Detect standalone URL parameter (e.g. ?view=tv or ?view=mobile)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'tv' || viewParam === 'mobile' || viewParam === 'settings') {
        setCurrentView(viewParam);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <h2 className="text-lg font-extrabold tracking-tight">LOADING SPEEDPRO WORKSHOP SYSTEM...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting real-time display queue & mechanics database</p>
      </div>
    );
  }

  const incomingCount = vehicles.filter((v) => v.status === 'incoming').length;
  const inProgressCount = vehicles.filter((v) => v.status === 'in_progress').length;
  const completedCount = vehicles.filter((v) => v.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header Channel Switcher Bar */}
      <HeaderNav
        currentView={currentView}
        onViewChange={setCurrentView}
        connected={connected}
        incomingCount={incomingCount}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
        onResetData={resetData}
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
            onResetData={resetData}
          />
        )}
      </main>
    </div>
  );
}
