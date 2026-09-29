import { useState, useEffect, useCallback } from "react";
import {
  getSyncState,
  subscribeSyncState,
  runSync,
  retryOutboxItem,
  discardOutboxItem,
} from "../services/syncEngine.js";
import { getOutboxItems } from "../db/indexedDb.js";

export function useSync() {
  const [syncState, setSyncState] = useState(getSyncState());
  const [outboxList, setOutboxList] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((newState) => {
      setSyncState(newState);
    });

    return unsubscribe;
  }, []);

  const refreshOutbox = useCallback(async () => {
    const items = await getOutboxItems();
    setOutboxList(items);
  }, []);

  const syncNow = useCallback(() => {
    return runSync(true);
  }, []);

  const retry = useCallback(async (id) => {
    await retryOutboxItem(id);
    await refreshOutbox();
  }, [refreshOutbox]);

  const discard = useCallback(async (id) => {
    await discardOutboxItem(id);
    await refreshOutbox();
  }, [refreshOutbox]);

  return {
    ...syncState,
    syncNow,
    retry,
    discard,
    outboxList,
    refreshOutbox,
  };
}

export default useSync;
