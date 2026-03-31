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
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { EventData } from "@/types/event";
import { fetchEvents } from "@/lib/events";
import { formatFullDate, formatEventTime } from "@/lib/dateUtils";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const buttonScale = useRef(new Animated.Value(1)).current;

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
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Arrangementet ble ikke funnet</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Gå tilbake</Text>
        </Pressable>
      </View>
    );
  }

  const dateStr = formatFullDate(event.start_at);
  const timeStr = formatEventTime(event.start_at, event.end_at);
  const tags = event.tags ?? [];

  return (
    <View style={styles.container}>
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
          <View style={styles.heroPlaceholder}>
            <Tag size={40} color={Colors.accentLight} />
          </View>
        )}

        <Pressable
          style={[styles.backNav, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={Colors.white} />
        </Pressable>

        <View style={styles.contentContainer}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{dateStr}</Text>
            {event.is_free && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Gratis</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.detailsSection}>
            {timeStr && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Clock size={18} color={Colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Tidspunkt</Text>
                  <Text style={styles.detailValue}>{timeStr}</Text>
                </View>
              </View>
            )}

            {event.location_name && (
              <Pressable style={styles.detailRow} onPress={openMaps}>
                <View style={styles.detailIcon}>
                  <MapPin size={18} color={Colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Sted</Text>
                  <Text style={styles.detailValue}>{event.location_name}</Text>
                </View>
              </Pressable>
            )}

            {event.organizer && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <User size={18} color={Colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Arrangør</Text>
                  <Text style={styles.detailValue}>{event.organizer}</Text>
                </View>
              </View>
            )}

            {event.price_text && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Banknote size={18} color={Colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Pris</Text>
                  <Text style={styles.detailValue}>{event.price_text}</Text>
                </View>
              </View>
            )}

            {event.start_at && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Calendar size={18} color={Colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Dato</Text>
                  <Text style={styles.detailValue}>{dateStr}</Text>
                </View>
              </View>
            )}
          </View>

          {tags.length > 0 && (
            <View style={styles.tagsSection}>
              {tags.map((tag, i) => {
                const colorSet = Colors.tagColors[i % Colors.tagColors.length];
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
              <Text style={styles.sectionTitle}>Om arrangementet</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {event.source && (
            <Text style={styles.sourceText}>Kilde: {event.source}</Text>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {event.url && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Animated.View style={{ transform: [{ scale: buttonScale }], flex: 1 }}>
            <Pressable
              style={styles.linkButton}
              onPress={openLink}
              onPressIn={onButtonPressIn}
              onPressOut={onButtonPressOut}
              testID="open-link-button"
            >
              <ExternalLink size={18} color={Colors.white} />
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
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.background,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.white,
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
    backgroundColor: Colors.accentMuted,
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
    color: Colors.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: Colors.freeLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.free,
  },
  title: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.primary,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  detailsSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    backgroundColor: Colors.accentMuted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  detailContent: {
    flex: 1,
    gap: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500" as const,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  detailSubvalue: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    color: Colors.primary,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  sourceText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: "italic" as const,
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  linkButton: {
    backgroundColor: Colors.accent,
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
    color: Colors.white,
  },
});
