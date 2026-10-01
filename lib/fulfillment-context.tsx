'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { BranchId } from '@/lib/branches';
import {
  BRANCH_STORAGE_KEY,
  BROWSE_MENU_STORAGE_KEY,
  FULFILLMENT_STORAGE_KEY,
  readStoredBranch,
  type FulfillmentMode,
  isFulfillmentMode,
} from '@/lib/fulfillment';

type FulfillmentContextValue = {
  ready: boolean;
  mode: FulfillmentMode | null;
  browseOnly: boolean;
  branchId: BranchId | null;
  setMode: (mode: FulfillmentMode) => void;
  setBranch: (branchId: BranchId) => void;
  clearBranch: () => void;
  enableBrowseMenu: () => void;
};

const FulfillmentContext = createContext<FulfillmentContextValue | undefined>(undefined);

export function FulfillmentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<FulfillmentMode | null>(null);
  const [browseOnly, setBrowseOnly] = useState(false);
  const [branchId, setBranchId] = useState<BranchId | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(FULFILLMENT_STORAGE_KEY);
      if (isFulfillmentMode(stored)) setModeState(stored);
      setBrowseOnly(sessionStorage.getItem(BROWSE_MENU_STORAGE_KEY) === '1');
      setBranchId(readStoredBranch(sessionStorage.getItem(BRANCH_STORAGE_KEY)));
    } catch {
      // sessionStorage may be unavailable
    }
    setReady(true);
  }, []);

  const setMode = useCallback((next: FulfillmentMode) => {
    setModeState(next);
    setBrowseOnly(false);
    try {
      sessionStorage.setItem(FULFILLMENT_STORAGE_KEY, next);
      sessionStorage.removeItem(BROWSE_MENU_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const setBranch = useCallback((next: BranchId) => {
    setBranchId(next);
    try {
      sessionStorage.setItem(BRANCH_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const clearBranch = useCallback(() => {
    setBranchId(null);
    setModeState(null);
    try {
      sessionStorage.removeItem(BRANCH_STORAGE_KEY);
      sessionStorage.removeItem(FULFILLMENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const enableBrowseMenu = useCallback(() => {
    setBrowseOnly(true);
    try {
      sessionStorage.setItem(BROWSE_MENU_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  return (
    <FulfillmentContext.Provider
      value={{ ready, mode, browseOnly, branchId, setMode, setBranch, clearBranch, enableBrowseMenu }}
    >
      {children}
    </FulfillmentContext.Provider>
  );
}

export function useFulfillment() {
  const ctx = useContext(FulfillmentContext);
  if (!ctx) throw new Error('useFulfillment must be used within FulfillmentProvider');
  return ctx;
}
