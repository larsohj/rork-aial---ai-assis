import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { MapPin, Clock, Film, Music, Palette, Mountain, Baby, Laugh, Ticket, Calendar } from "lucide-react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { EventData } from "@/types/event";
import { formatEventTime, getRelativeDateLabel, formatEventDate } from "@/lib/dateUtils";
import { getParentCategory } from "@/constants/tagHierarchy";

interface EventCardProps {
  event: EventData;
  compact?: boolean;
}

const CATEGORY_CONFIG: Record<string, { color: string; gradient: string[] }> = {
  kino: { color: "#8E44AD", gradient: ["#9B59B6", "#8E44AD"] },
  konsert: { color: "#C0392B", gradient: ["#E74C3C", "#C0392B"] },
  kultur: { color: "#2980B9", gradient: ["#3498DB", "#2980B9"] },
  sport: { color: "#27AE60", gradient: ["#2ECC71", "#27AE60"] },
  barn: { color: "#E67E22", gradient: ["#F39C12", "#E67E22"] },
  humor: { color: "#D4AC0D", gradient: ["#F1C40F", "#D4AC0D"] },
};

function getCategoryForEvent(tags: string[]): { key: string; color: string; gradient: string[] } | null {
  for (const tag of tags) {
    const parent = getParentCategory(tag);
    if (parent && CATEGORY_CONFIG[parent.key]) {
      return { key: parent.key, ...CATEGORY_CONFIG[parent.key] };
    }
  }
  return null;
}

function CategoryIcon({ categoryKey, size, color }: { categoryKey: string; size: number; color: string }) {
  switch (categoryKey) {
    case "kino": return <Film size={size} color={color} />;
    case "konsert": return <Music size={size} color={color} />;
    case "kultur": return <Palette size={size} color={color} />;
    case "sport": return <Mountain size={size} color={color} />;
    case "barn": return <Baby size={size} color={color} />;
    case "humor": return <Laugh size={size} color={color} />;
    default: return <Calendar size={size} color={color} />;
  }
}

function EventCardComponent({ event, compact: _compact }: EventCardProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    router.push({ pathname: "/event/[id]", params: { id: event.source_id } });
  }, [router, event.source_id]);

  const category = getCategoryForEvent(event.tags ?? []);
  const relativeDate = getRelativeDateLabel(event.start_at);
  const dateStr = formatEventDate(event.start_at);
  const timeStr = formatEventTime(event.start_at, event.end_at);

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
        testID={`event-card-${event.source_id}`}
      >
        <View style={styles.imageContainer}>
          {event.image_url ? (
            <Image
              source={{ uri: event.image_url }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[
              styles.imagePlaceholder,
              { backgroundColor: category?.color ?? Colors.primary },
            ]}>
              <View style={styles.placeholderPattern}>
                <CategoryIcon
                  categoryKey={category?.key ?? "default"}
                  size={48}
                  color="rgba(255,255,255,0.2)"
                />
              </View>
            </View>
          )}

          <View style={styles.imageOverlay} />

          {category && (
            <View style={[styles.categoryStripe, { backgroundColor: category.color }]}>
              <CategoryIcon categoryKey={category.key} size={12} color="#FFFFFF" />
            </View>
          )}

          {event.is_free === true && (
            <View style={styles.freeBadgeOverlay}>
              <Ticket size={10} color="#FFFFFF" />
              <Text style={styles.freeBadgeText}>Gratis</Text>
            </View>
          )}

          {relativeDate && (
            <View style={styles.relativeDateBadge}>
              <Text style={styles.relativeDateText}>{relativeDate}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.dateTimeWrap}>
              <Clock size={13} color={Colors.accent} />
              <Text style={styles.dateText}>
                {dateStr}{timeStr ? ` · ${timeStr}` : ""}
              </Text>
            </View>
          </View>

          {event.location_name && (
            <View style={styles.locationRow}>
              <MapPin size={13} color={Colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {event.location_name}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const EventCard = React.memo(EventCardComponent);

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  imageContainer: {
    width: "100%" as const,
    aspectRatio: 16 / 9,
    position: "relative" as const,
  },
  image: {
    width: "100%" as const,
    height: "100%" as const,
  },
  imagePlaceholder: {
    width: "100%" as const,
    height: "100%" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  placeholderPattern: {
    opacity: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  imageOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "transparent",
  },
  categoryStripe: {
    position: "absolute" as const,
    top: 12,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  freeBadgeOverlay: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    backgroundColor: Colors.free,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  relativeDateBadge: {
    position: "absolute" as const,
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  relativeDateText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  content: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  dateTimeWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.accent,
    letterSpacing: 0.1,
  },
  locationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
});
