import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Animated,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, X, Clock, TrendingUp, ArrowRight } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { fetchEvents } from "@/lib/events";
import { EventCard } from "@/components/EventCard";
import { EventData } from "@/types/event";

const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT = 8;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [search, setSearch] = useState<string>("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setRecentSearches(parsed);
            }
          } catch {
            console.log("[Search] Failed to parse recent searches");
          }
        }
      })
      .catch((err) => console.log("[Search] Failed to load recent:", err));
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const saveRecent = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
      const next = [term, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeRecent = useCallback((term: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearAllRecent = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = search.trim();
    if (trimmed.length > 0) {
      saveRecent(trimmed);
      Keyboard.dismiss();
    }
  }, [search, saveRecent]);

  const selectRecent = useCallback((term: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearch(term);
    saveRecent(term);
    Keyboard.dismiss();
  }, [saveRecent]);

  const clearSearch = useCallback(() => {
    setSearch("");
    inputRef.current?.focus();
  }, []);

  const searchResults = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location_name?.toLowerCase().includes(q) ||
        e.organizer?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
    );
  }, [eventsQuery.data, search]);

  const suggestions = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const q = search.toLowerCase().trim();
    if (q.length < 2) return [];

    const titleMatches = new Set<string>();
    const locationMatches = new Set<string>();
    const organizerMatches = new Set<string>();

    for (const e of events) {
      if (e.title.toLowerCase().includes(q) && titleMatches.size < 3) {
        titleMatches.add(e.title);
      }
      if (e.location_name?.toLowerCase().includes(q) && locationMatches.size < 2) {
        locationMatches.add(e.location_name);
      }
      if (e.organizer?.toLowerCase().includes(q) && organizerMatches.size < 2) {
        organizerMatches.add(e.organizer);
      }
    }

    return [
      ...Array.from(titleMatches).map((t) => ({ type: "event" as const, text: t })),
      ...Array.from(locationMatches).map((t) => ({ type: "location" as const, text: t })),
      ...Array.from(organizerMatches).map((t) => ({ type: "organizer" as const, text: t })),
    ].slice(0, 6);
  }, [eventsQuery.data, search]);

  const popularLocations = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      if (e.location_name) {
        counts[e.location_name] = (counts[e.location_name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [eventsQuery.data]);

  const isShowingResults = search.trim().length > 0 && !isFocused;
  const isShowingSuggestions = search.trim().length >= 2 && isFocused && suggestions.length > 0;
  const isShowingIdle = search.trim().length < 2 || (!isFocused && search.trim().length === 0);

  const renderResultItem = useCallback(
    ({ item }: { item: EventData }) => <EventCard event={item} />,
    []
  );

  const resultKeyExtractor = useCallback((item: EventData) => item.source_id, []);

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background, opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Søk</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.searchBar, borderColor: isFocused ? colors.accent : colors.cardBorder }]}>
          <Search size={20} color={isFocused ? colors.accent : colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Søk arrangementer, steder, artister..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCorrect={false}
            testID="search-input"
          />
          {search.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8} testID="search-clear">
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {isShowingSuggestions && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {suggestions.map((s, i) => (
            <Pressable
              key={`${s.type}-${s.text}-${i}`}
              style={[styles.suggestionItem, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]}
              onPress={() => {
                setSearch(s.text);
                saveRecent(s.text);
                Keyboard.dismiss();
                setIsFocused(false);
              }}
            >
              <Search size={14} color={colors.textMuted} />
              <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={1}>
                {s.text}
              </Text>
              <Text style={[styles.suggestionType, { color: colors.textMuted }]}>
                {s.type === "event" ? "" : s.type === "location" ? "Sted" : "Arrangør"}
              </Text>
              <ArrowRight size={14} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {isShowingResults ? (
        <FlatList
          data={searchResults}
          renderItem={renderResultItem}
          keyExtractor={resultKeyExtractor}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                {searchResults.length} {searchResults.length === 1 ? "treff" : "treff"} for «{search.trim()}»
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Search size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Ingen treff</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Prøv et annet søkeord eller en kortere frase
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.idleContent}
          ListHeaderComponent={
            <View>
              {recentSearches.length > 0 && isShowingIdle && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <Clock size={16} color={colors.textSecondary} />
                      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Nylige søk</Text>
                    </View>
                    <Pressable onPress={clearAllRecent} hitSlop={8}>
                      <Text style={[styles.clearText, { color: colors.accent }]}>Tøm</Text>
                    </Pressable>
                  </View>
                  <View style={styles.recentList}>
                    {recentSearches.map((term) => (
                      <View key={term} style={[styles.recentItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <Pressable
                          style={styles.recentItemContent}
                          onPress={() => selectRecent(term)}
                        >
                          <Clock size={14} color={colors.textMuted} />
                          <Text style={[styles.recentText, { color: colors.text }]} numberOfLines={1}>
                            {term}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => removeRecent(term)}
                          hitSlop={8}
                          style={styles.recentRemove}
                        >
                          <X size={14} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {popularLocations.length > 0 && isShowingIdle && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <TrendingUp size={16} color={colors.textSecondary} />
                      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Populære steder</Text>
                    </View>
                  </View>
                  <View style={styles.popularGrid}>
                    {popularLocations.map((loc) => (
                      <Pressable
                        key={loc.name}
                        style={[styles.popularChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                        onPress={() => {
                          setSearch(loc.name);
                          saveRecent(loc.name);
                          setIsFocused(false);
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={[styles.popularName, { color: colors.primary }]} numberOfLines={1}>
                          {loc.name}
                        </Text>
                        <Text style={[styles.popularCount, { color: colors.textMuted }]}>
                          {loc.count}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  suggestionsContainer: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
  },
  suggestionType: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  resultsList: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center" as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  idleContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  section: {
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  recentList: {
    paddingHorizontal: 16,
    gap: 6,
  },
  recentItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden" as const,
  },
  recentItemContent: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
  },
  recentRemove: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  popularGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 16,
    gap: 8,
  },
  popularChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  popularName: {
    fontSize: 14,
    fontWeight: "600" as const,
    maxWidth: 160,
  },
  popularCount: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
});
