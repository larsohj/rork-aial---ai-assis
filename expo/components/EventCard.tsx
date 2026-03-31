import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { MapPin, Clock, Tag } from "lucide-react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { EventData } from "@/types/event";
import { formatEventDate, formatEventTime } from "@/lib/dateUtils";

interface EventCardProps {
  event: EventData;
}

function EventCardComponent({ event }: EventCardProps) {
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

  const dateStr = formatEventDate(event.start_at);
  const timeStr = formatEventTime(event.start_at, event.end_at);
  const tags = event.tags?.slice(0, 2) ?? [];

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
        testID={`event-card-${event.source_id}`}
      >
        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Tag size={28} color={Colors.accentLight} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.date}>{dateStr}</Text>
            {event.is_free && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Gratis</Text>
              </View>
            )}
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>

          {event.location_name && (
            <View style={styles.infoRow}>
              <MapPin size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {event.location_name}
              </Text>
            </View>
          )}

          {timeStr && (
            <View style={styles.infoRow}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{timeStr}</Text>
            </View>
          )}

          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag, i) => {
                const colorSet = Colors.tagColors[i % Colors.tagColors.length];
                return (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: colorSet.bg }]}>
                    <Text style={[styles.tagText, { color: colorSet.text }]}>{tag}</Text>
                  </View>
                );
              })}
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
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  image: {
    width: "100%" as const,
    height: 170,
  },
  imagePlaceholder: {
    width: "100%" as const,
    height: 120,
    backgroundColor: Colors.accentMuted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  content: {
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  date: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: Colors.freeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.free,
  },
  title: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  tagsRow: {
    flexDirection: "row" as const,
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
});
