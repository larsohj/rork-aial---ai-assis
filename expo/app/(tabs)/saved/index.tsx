import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { Heart } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useBookmarks } from "@/context/BookmarksContext";
import { fetchEvents } from "@/lib/events";
import { EventCard } from "@/components/EventCard";
import { EventData } from "@/types/event";

export default function SavedScreen() {
  const { colors } = useTheme();
  const { bookmarkedIds, isLoaded } = useBookmarks();

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 5,
  });

  const savedEvents = useMemo(() => {
    if (!eventsQuery.data) return [];
    return bookmarkedIds
      .map((id) => eventsQuery.data!.find((e: EventData) => e.source_id === id))
      .filter((e): e is EventData => !!e);
  }, [eventsQuery.data, bookmarkedIds]);

  const renderItem = useCallback(
    ({ item }: { item: EventData }) => <EventCard event={item} />,
    []
  );

  const keyExtractor = useCallback((item: EventData) => item.source_id, []);

  const renderEmpty = useMemo(() => {
    if (!isLoaded || eventsQuery.isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentMuted }]}>
          <Heart size={40} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ingen lagrede arrangementer</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Trykk på hjertet på et arrangement for å lagre det her
        </Text>
      </View>
    );
  }, [isLoaded, eventsQuery.isLoading, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {savedEvents.length > 0 && (
        <View style={styles.countRow}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {savedEvents.length} {savedEvents.length === 1 ? "lagret arrangement" : "lagrede arrangementer"}
          </Text>
        </View>
      )}
      <FlatList
        data={savedEvents}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  countRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 40,
    gap: 14,
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
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
});
