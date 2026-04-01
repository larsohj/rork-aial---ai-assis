import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MapPin,
  Clock,
  User,
  ExternalLink,
  Tag,
  Banknote,
  ArrowLeft,
  Calendar,
  Heart,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { EventData } from "@/types/event";
import { fetchEvents } from "@/lib/events";
import { formatFullDate, formatEventTime } from "@/lib/dateUtils";
import { useBookmarks } from "@/context/BookmarksContext";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 5,
  });

  const event = eventsQuery.data?.find((e: EventData) => e.source_id === id);

  const openLink = useCallback(() => {
    if (event?.url) {
      void Linking.openURL(event.url);
    }
  }, [event?.url]);

  const onButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [buttonScale]);

  const onButtonPressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [buttonScale]);

  const handleBookmark = useCallback(() => {
    if (!id) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(id);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 80, bounciness: 12 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 8 }),
    ]).start();
  }, [id, toggleBookmark, heartScale]);

  const bookmarked = id ? isBookmarked(id) : false;

  const openMaps = useCallback(() => {
    if (!event) return;
    const query = event.location_name ?? "";
    if (!query) return;
    const url =
      Platform.OS === "ios"
        ? `maps:?q=${encodeURIComponent(query)}`
        : `geo:0,0?q=${encodeURIComponent(query)}`;
    void Linking.openURL(url).catch(() => {
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      );
    });
  }, [event]);

  if (eventsQuery.isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Arrangementet ble ikke funnet</Text>
        <Pressable style={[styles.backButton, { backgroundColor: colors.accent }]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Gå tilbake</Text>
        </Pressable>
      </View>
    );
  }

  const dateStr = formatFullDate(event.start_at);
  const timeStr = formatEventTime(event.start_at, event.end_at);
  const tags = event.tags ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {event.image_url ? (
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: event.image_url }}
              style={styles.heroImage}
              contentFit="cover"
              transition={400}
            />
            <View style={styles.heroOverlay} />
          </View>
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.accentMuted }]}>
            <Tag size={40} color={colors.accentLight} />
          </View>
        )}

        <Pressable
          style={[styles.backNav, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={colors.white} />
        </Pressable>

        <Pressable
          style={[styles.bookmarkNav, { top: insets.top + 8 }]}
          onPress={handleBookmark}
          hitSlop={12}
          testID="detail-bookmark"
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Heart
              size={22}
              color={bookmarked ? "#E74C3C" : colors.white}
              fill={bookmarked ? "#E74C3C" : "transparent"}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.contentContainer}>
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.accent }]}>{dateStr}</Text>
            {event.is_free && (
              <View style={[styles.freeBadge, { backgroundColor: colors.freeLight }]}>
                <Text style={[styles.freeBadgeText, { color: colors.free }]}>Gratis</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: colors.primary }]}>{event.title}</Text>

          <View style={[styles.detailsSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {timeStr && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.accentMuted }]}>
                  <Clock size={18} color={colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Tidspunkt</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{timeStr}</Text>
                </View>
              </View>
            )}

            {event.location_name && (
              <Pressable style={styles.detailRow} onPress={openMaps}>
                <View style={[styles.detailIcon, { backgroundColor: colors.accentMuted }]}>
                  <MapPin size={18} color={colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Sted</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{event.location_name}</Text>
                </View>
              </Pressable>
            )}

            {event.organizer && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.accentMuted }]}>
                  <User size={18} color={colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Arrangør</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{event.organizer}</Text>
                </View>
              </View>
            )}

            {event.price_text && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.accentMuted }]}>
                  <Banknote size={18} color={colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Pris</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{event.price_text}</Text>
                </View>
              </View>
            )}

            {event.start_at && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.accentMuted }]}>
                  <Calendar size={18} color={colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Dato</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{dateStr}</Text>
                </View>
              </View>
            )}
          </View>

          {tags.length > 0 && (
            <View style={styles.tagsSection}>
              {tags.map((tag, i) => {
                const colorSet = colors.tagColors[i % colors.tagColors.length];
                return (
                  <View
                    key={tag}
                    style={[styles.tagChip, { backgroundColor: colorSet.bg }]}
                  >
                    <Text style={[styles.tagText, { color: colorSet.text }]}>
                      {tag}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Om arrangementet</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{event.description}</Text>
            </View>
          )}

          {event.source && (
            <Text style={[styles.sourceText, { color: colors.textMuted }]}>Kilde: {event.source}</Text>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {event.url && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
          <Animated.View style={{ transform: [{ scale: buttonScale }], flex: 1 }}>
            <Pressable
              style={[styles.linkButton, { backgroundColor: colors.accent }]}
              onPress={openLink}
              onPressIn={onButtonPressIn}
              onPressOut={onButtonPressOut}
              testID="open-link-button"
            >
              <ExternalLink size={18} color={colors.white} />
              <Text style={styles.linkButtonText}>Åpne arrangement</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  heroContainer: {
    width: "100%" as const,
    height: 280,
    position: "relative" as const,
  },
  heroImage: {
    width: "100%" as const,
    height: "100%" as const,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(27, 58, 75, 0.15)",
  },
  heroPlaceholder: {
    width: "100%" as const,
    height: 180,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  backNav: {
    position: "absolute" as const,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(27, 58, 75, 0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 10,
  },
  bookmarkNav: {
    position: "absolute" as const,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(27, 58, 75, 0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 10,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  dateRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  title: {
    fontSize: 24,
    fontWeight: "800" as const,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  detailsSection: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  detailContent: {
    flex: 1,
    gap: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  tagsSection: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  descriptionSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  sourceText: {
    fontSize: 12,
    fontStyle: "italic" as const,
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  linkButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
});
