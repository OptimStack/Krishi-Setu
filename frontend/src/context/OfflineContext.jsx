import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OfflineContext = createContext();

const QUEUE_STORAGE_KEY = 'krishisetu_offline_queue_v1';
const LOCATION_STORAGE_KEY = 'krishisetu_farm_location_v1';

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => {
    try {
      const saved = localStorage.getItem('krishisetu_online_status');
      if (saved !== null) return saved === 'true';
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    } catch {
      return true;
    }
  });

  const [lastSavedLocation, setLastSavedLocation] = useState(() => {
    try {
      return localStorage.getItem(LOCATION_STORAGE_KEY) || 'Baramati Cluster, Pune';
    } catch {
      return 'Baramati Cluster, Pune';
    }
  });

  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [syncToast, setSyncToast] = useState(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('krishisetu_online_status', String(isOnline));
    } catch {}
  }, [isOnline]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, lastSavedLocation);
    } catch {}
  }, [lastSavedLocation]);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(offlineQueue));
    } catch {}
  }, [offlineQueue]);

  // Handle actual browser offline/online events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // When returning online, flush offline queue
  const syncQueue = useCallback(() => {
    if (offlineQueue.length === 0) return;

    try {
      const mockRaw = localStorage.getItem('krishisetu_mock_state_v3');
      if (mockRaw) {
        const state = JSON.parse(mockRaw);
        offlineQueue.forEach((item) => {
          if (item.type === 'listing_draft' && item.payload) {
            state.listings = state.listings || [];
            state.listings.unshift({
              ...item.payload,
              status: 'open',
              synced_at: new Date().toISOString(),
            });
          }
        });
        localStorage.setItem('krishisetu_mock_state_v3', JSON.stringify(state));
      }
    } catch (e) {
      console.warn('Failed to merge offline queue into state:', e);
    }

    const count = offlineQueue.length;
    setOfflineQueue([]);
    setSyncToast(`Connection restored! Synchronized ${count} offline item${count > 1 ? 's' : ''} to live market.`);
    setTimeout(() => setSyncToast(null), 5000);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('krishisetu_sync', { detail: { type: 'offline_queue_synced', count } }));
    }
  }, [offlineQueue]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncQueue();
    }
  }, [isOnline, offlineQueue, syncQueue]);

  const toggleOnline = () => {
    setIsOnline((prev) => {
      const next = !prev;
      if (next && offlineQueue.length > 0) {
        setTimeout(syncQueue, 300);
      }
      return next;
    });
  };

  const queueItem = (type, payload) => {
    const newItem = {
      id: `off_${Date.now()}`,
      type,
      payload,
      queued_at: new Date().toISOString(),
      location: lastSavedLocation,
    };
    setOfflineQueue((prev) => [newItem, ...prev]);
    return newItem;
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        setIsOnline,
        toggleOnline,
        offlineQueue,
        queueItem,
        syncQueue,
        lastSavedLocation,
        setLastSavedLocation,
        syncToast,
        setSyncToast,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
