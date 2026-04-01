import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Clock, Film, Music, Palette, Mountain, Baby, Laugh, Ticket, Calendar, Heart } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { EventData } from "@/types/event";
import { formatEventTime, formatEventDate } from "@/lib/dateUtils";
import { getParentCategory } from "@/constants/tagHierarchy";
import { useBookmarks } from "@/context/BookmarksContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
export const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.72;
export const CAROUSEL_CARD_GAP = 12;

const CATEGORY_CONFIG: Record<string, { color: string }> = {
  kino: { color: "#8E44AD" },
  konsert: { color: "#C0392B" },
  kultur: { color: "#2980B9" },
  sport: { color: "#27AE60" },
  barn: { color: "#E67E22" },
  humor: { color: "#D4AC0D" },
};

function getCategoryForEvent(tags: string[]): { key: string; color: string } | null {
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

interface EventCardCarouselProps {
  event: EventData;
}

function EventCardCarouselComponent({ event }: EventCardCarouselProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const bookmarked = isBookmarked(event.source_id);

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const handleBookmark = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(event.source_id);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 80, bounciness: 12 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 8 }),
    ]).start();
  }, [toggleBookmark, event.source_id, heartScale]);

  const category = getCategoryForEvent(event.tags ?? []);
  const dateStr = formatEventDate(event.start_at);
  const timeStr = formatEventTime(event.start_at, event.end_at);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.card, { backgroundColor: colors.card }]}
        testID={`carousel-card-${event.source_id}`}
      >
        <View style={styles.imageContainer}>
          {event.image_url ? (
            <Image
              source={{ uri: event.image_url }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: category?.color ?? colors.primary }]}>
              <CategoryIcon
                categoryKey={category?.key ?? "default"}
                size={36}
                color="rgba(255,255,255,0.25)"
              />
            </View>
          )}

          {event.is_free === true && (
            <View style={[styles.freeBadge, { backgroundColor: colors.free }]}>
              <Ticket size={9} color="#FFF" />
              <Text style={styles.freeBadgeText}>Gratis</Text>
            </View>
          )}

          {category && (
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
          )}

          <Pressable
            onPress={handleBookmark}
            style={styles.bookmarkBtn}
            hitSlop={8}
            testID={`carousel-bookmark-${event.source_id}`}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                size={16}
                color={bookmarked ? "#E74C3C" : "#FFFFFF"}
                fill={bookmarked ? "#E74C3C" : "transparent"}
              />
            </Animated.View>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
          <View style={styles.metaRow}>
            <Clock size={11} color={colors.accent} />
            <Text style={[styles.metaText, { color: colors.accent }]} numberOfLines={1}>
              {dateStr}{timeStr ? ` · ${timeStr}` : ""}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const EventCardCarousel = React.memo(EventCardCarouselComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: CAROUSEL_CARD_WIDTH,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    width: "100%" as const,
    aspectRatio: 16 / 10,
    position: "relative" as const,
  },
  image: {
    width: "100%" as const,
    height: "100%" as const,
  },
  placeholder: {
    width: "100%" as const,
    height: "100%" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  freeBadge: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#FFF",
  },
  bookmarkBtn: {
    position: "absolute" as const,
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  categoryDot: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700" as const,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600" as const,
    flex: 1,
  },
});
