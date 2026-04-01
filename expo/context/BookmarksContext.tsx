import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

const STORAGE_KEY = "bookmarked_events";

export const [BookmarksProvider, useBookmarks] = createContextHook(() => {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setBookmarkedIds(parsed);
            }
          } catch {
            console.log("[Bookmarks] Failed to parse stored bookmarks");
          }
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        console.log("[Bookmarks] Failed to load bookmarks:", err);
        setIsLoaded(true);
      });
  }, []);

  const persist = useCallback((ids: string[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids)).catch((err) =>
      console.log("[Bookmarks] Failed to persist bookmarks:", err)
    );
  }, []);

  const toggleBookmark = useCallback(
    (sourceId: string) => {
      setBookmarkedIds((prev) => {
        const next = prev.includes(sourceId)
          ? prev.filter((id) => id !== sourceId)
          : [...prev, sourceId];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isBookmarked = useCallback(
    (sourceId: string) => bookmarkedIds.includes(sourceId),
    [bookmarkedIds]
  );

  return useMemo(
    () => ({ bookmarkedIds, toggleBookmark, isBookmarked, isLoaded }),
    [bookmarkedIds, toggleBookmark, isBookmarked, isLoaded]
  );
});
