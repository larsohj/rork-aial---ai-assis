import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  Pressable,
  RefreshControl,
  Animated,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  CalendarDays,
  Calendar,
  ChevronDown,
  Check,
  MapPin,
  Ticket,
  Film,
  Music,
  Palette,
  Mountain,
  Baby,
  Laugh,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { EventData } from "@/types/event";
import { fetchEvents, fetchAllTags } from "@/lib/events";
import { EventCard } from "@/components/EventCard";
import { EventCardCarousel, CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_GAP } from "@/components/EventCardCarousel";
import { SkeletonFeed } from "@/components/SkeletonLoader";
import { TAG_HIERARCHY } from "@/constants/tagHierarchy";
import { AREAS, getEventArea } from "@/constants/areaMapping";
import { groupEventsByDate } from "@/lib/dateUtils";

type DateFilterType = "all" | "today" | "weekend" | "custom";

interface DateRange {
  from: Date | null;
  to: Date | null;
}

function getWeekendRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  let fridayOffset: number;
  if (day === 0) {
    fridayOffset = -2;
  } else if (day === 6) {
    fridayOffset = -1;
  } else {
    fridayOffset = 5 - day;
  }
  const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + fridayOffset, 0, 0, 0, 0);
  const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2, 23, 59, 59, 999);
  return { start: friday, end: sunday };
}

function formatShortDate(date: Date): string {
  const d = date.getDate();
  const months = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
  return `${d}. ${months[date.getMonth()]}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(date: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const t = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return d > f && d < t;
}

interface CategoryTab {
  key: string;
  label: string;
  icon: string;
}

const ALL_TAB: CategoryTab = { key: "all", label: "Alt", icon: "sparkles" };

function TabIcon({ icon, size, color }: { icon: string; size: number; color: string }) {
  switch (icon) {
    case "sparkles": return <Sparkles size={size} color={color} />;
    case "film": return <Film size={size} color={color} />;
    case "music": return <Music size={size} color={color} />;
    case "palette": return <Palette size={size} color={color} />;
    case "mountain": return <Mountain size={size} color={color} />;
    case "baby": return <Baby size={size} color={color} />;
    case "laugh": return <Laugh size={size} color={color} />;
    default: return <Sparkles size={size} color={color} />;
  }
}

export default function EventsFeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubTags, setSelectedSubTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [customRange, setCustomRange] = useState<DateRange>({ from: null, to: null });
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(false);
  const [showFilterSheet, setShowFilterSheet] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const [pickingField, setPickingField] = useState<"from" | "to">("from");
  const [tempRange, setTempRange] = useState<DateRange>({ from: null, to: null });
  const scrollY = useRef(new Animated.Value(0)).current;

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 5,
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: fetchAllTags,
    staleTime: 1000 * 60 * 10,
  });

  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);

  const availableAreas = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const areaSet = new Set<string>();
    events.forEach((e) => {
      areaSet.add(getEventArea(e.location_name));
    });
    return AREAS.filter((a) => areaSet.has(a.key));
  }, [eventsQuery.data]);

  const availableTagsSet = useMemo(() => new Set(tags), [tags]);

  const categoryTabs = useMemo((): CategoryTab[] => {
    const tabs: CategoryTab[] = [ALL_TAB];
    for (const cat of TAG_HIERARCHY) {
      const hasAvailable = cat.children.some((t) => availableTagsSet.has(t));
      if (hasAvailable) {
        tabs.push({ key: cat.key, label: cat.label, icon: cat.icon });
      }
    }
    return tabs;
  }, [availableTagsSet]);

  const selectedCategoryObj = useMemo(() => {
    if (selectedCategory === "all") return null;
    return TAG_HIERARCHY.find((c) => c.key === selectedCategory) ?? null;
  }, [selectedCategory]);

  const availableSubTags = useMemo(() => {
    if (!selectedCategoryObj) return [];
    return selectedCategoryObj.children.filter((t) => availableTagsSet.has(t));
  }, [selectedCategoryObj, availableTagsSet]);

  const filteredEvents = useMemo(() => {
    const events = eventsQuery.data ?? [];
    let filtered = events;

    if (selectedCategory !== "all") {
      const cat = TAG_HIERARCHY.find((c) => c.key === selectedCategory);
      if (cat) {
        const catTags = cat.children;
        if (selectedSubTags.length > 0) {
          filtered = filtered.filter((e) =>
            selectedSubTags.some((tag) => e.tags?.includes(tag))
          );
        } else {
          filtered = filtered.filter((e) =>
            catTags.some((tag) => e.tags?.includes(tag))
          );
        }
      }
    }

    if (selectedAreas.length > 0) {
      filtered = filtered.filter((e) =>
        selectedAreas.includes(getEventArea(e.location_name))
      );
    }

    if (showFreeOnly) {
      filtered = filtered.filter((e) => e.is_free === true);
    }

    if (dateFilter === "today") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      const MAX_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((e) => {
        if (!e.start_at) return false;
        const start = new Date(e.start_at);
        const end = e.end_at ? new Date(e.end_at) : start;
        if (end.getTime() - start.getTime() > MAX_DURATION_MS) return false;
        return start <= todayEnd && end >= todayStart;
      });
    } else if (dateFilter === "weekend") {
      const { start: weekendStart, end: weekendEnd } = getWeekendRange();
      const MAX_DURATION_MS = 4 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((e) => {
        if (!e.start_at) return false;
        const start = new Date(e.start_at);
        const end = e.end_at ? new Date(e.end_at) : start;
        if (end.getTime() - start.getTime() > MAX_DURATION_MS) return false;
        return start <= weekendEnd && end >= weekendStart;
      });
    } else if (dateFilter === "custom" && customRange.from && customRange.to) {
      const rangeStart = new Date(customRange.from.getFullYear(), customRange.from.getMonth(), customRange.from.getDate());
      const rangeEnd = new Date(customRange.to.getFullYear(), customRange.to.getMonth(), customRange.to.getDate(), 23, 59, 59, 999);
      filtered = filtered.filter((e) => {
        if (!e.start_at) return false;
        const start = new Date(e.start_at);
        const end = e.end_at ? new Date(e.end_at) : start;
        return start <= rangeEnd && end >= rangeStart;
      });
    }

    return filtered;
  }, [eventsQuery.data, selectedCategory, selectedSubTags, selectedAreas, showFreeOnly, dateFilter, customRange]);

  const selectCategory = useCallback((key: string) => {
    setSelectedCategory(key);
    setSelectedSubTags([]);
  }, []);

  const toggleSubTag = useCallback((tag: string) => {
    setSelectedSubTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleArea = useCallback((areaKey: string) => {
    setSelectedAreas((prev) =>
      prev.includes(areaKey) ? prev.filter((a) => a !== areaKey) : [...prev, areaKey]
    );
  }, []);

  const toggleFreeOnly = useCallback(() => {
    setShowFreeOnly((prev) => !prev);
  }, []);

  const onRefresh = useCallback(() => {
    void eventsQuery.refetch();
    void tagsQuery.refetch();
  }, [eventsQuery, tagsQuery]);

  const selectDateFilter = useCallback((type: DateFilterType) => {
    if (type === "custom") {
      setTempRange(customRange);
      setPickingField("from");
      setPickerMonth(new Date().getMonth());
      setPickerYear(new Date().getFullYear());
      setShowDatePicker(true);
    } else {
      setDateFilter((prev) => (prev === type ? "all" : type));
    }
  }, [customRange]);

  const handleDayPress = useCallback((day: number) => {
    const selected = new Date(pickerYear, pickerMonth, day);
    if (pickingField === "from") {
      setTempRange({ from: selected, to: null });
      setPickingField("to");
    } else {
      const from = tempRange.from;
      if (from && selected < from) {
        setTempRange({ from: selected, to: from });
      } else {
        setTempRange((prev) => ({ ...prev, to: selected }));
      }
    }
  }, [pickerYear, pickerMonth, pickingField, tempRange.from]);

  const confirmDateRange = useCallback(() => {
    if (tempRange.from && tempRange.to) {
      setCustomRange(tempRange);
      setDateFilter("custom");
    }
    setShowDatePicker(false);
  }, [tempRange]);

  const clearDateRange = useCallback(() => {
    setTempRange({ from: null, to: null });
    setPickingField("from");
  }, []);

  const goNextMonth = useCallback(() => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  }, [pickerMonth]);

  const goPrevMonth = useCallback(() => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  }, [pickerMonth]);

  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (selectedAreas.length > 0) count += selectedAreas.length;
    if (dateFilter === "custom") count += 1;
    return count;
  }, [selectedAreas, dateFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count += 1;
    if (selectedSubTags.length > 0) count += selectedSubTags.length;
    if (selectedAreas.length > 0) count += selectedAreas.length;
    if (showFreeOnly) count += 1;
    if (dateFilter !== "all") count += 1;
    return count;
  }, [selectedCategory, selectedSubTags, selectedAreas, showFreeOnly, dateFilter]);

  const clearAllFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedSubTags([]);
    setSelectedAreas([]);
    setShowFreeOnly(false);
    setDateFilter("all");
    setCustomRange({ from: null, to: null });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return selectedCategory !== "all" || selectedSubTags.length > 0 || selectedAreas.length > 0 || showFreeOnly || dateFilter !== "all";
  }, [selectedCategory, selectedSubTags, selectedAreas, showFreeOnly, dateFilter]);

  const tonightEvents = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return events.filter((e) => {
      if (!e.start_at) return false;
      const start = new Date(e.start_at);
      return start >= todayStart && start < tomorrowStart;
    }).slice(0, 10);
  }, [eventsQuery.data]);

  const weekendEvents = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const { start: weekendStart, end: weekendEnd } = getWeekendRange();
    const MAX_DURATION_MS = 4 * 24 * 60 * 60 * 1000;
    const weekend = events.filter((e) => {
      if (!e.start_at) return false;
      const start = new Date(e.start_at);
      const end = e.end_at ? new Date(e.end_at) : start;
      if (end.getTime() - start.getTime() > MAX_DURATION_MS) return false;
      return start <= weekendEnd && end >= weekendStart;
    });
    const paid = weekend.filter((e) => e.is_free !== true);
    const free = weekend.filter((e) => e.is_free === true);
    return [...paid, ...free].slice(0, 10);
  }, [eventsQuery.data]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  const sectionData = useMemo(() => {
    return groupEventsByDate(filteredEvents);
  }, [filteredEvents]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; data: EventData[] } }) => (
      <View style={[styles.sectionHeaderContainer, { backgroundColor: colors.background, borderTopColor: colors.cardBorder }]}>
        <View style={[styles.sectionHeaderAccent, { backgroundColor: colors.accent }]} />
        <View style={styles.sectionHeaderContent}>
          <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{section.title}</Text>
          <Text style={[styles.sectionHeaderCount, { color: colors.textMuted }]}>
            {section.data.length} {section.data.length === 1 ? "arrangement" : "arrangementer"}
          </Text>
        </View>
      </View>
    ),
    [colors]
  );

  const renderItem = useCallback(
    ({ item }: { item: EventData }) => <EventCard event={item} />,
    []
  );

  const keyExtractor = useCallback((item: EventData) => item.source_id, []);

  const dateFilterLabel = useMemo(() => {
    if (dateFilter === "custom" && customRange.from && customRange.to) {
      return `${formatShortDate(customRange.from)} – ${formatShortDate(customRange.to)}`;
    }
    return null;
  }, [dateFilter, customRange]);

  const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
  const dayLabels = ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"];

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(pickerYear, pickerMonth);
    const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [pickerYear, pickerMonth]);

  const todayLabel = useMemo(() => {
    const now = new Date();
    const options = { weekday: "long" as const, day: "numeric" as const, month: "long" as const };
    const formatted = now.toLocaleDateString("nb-NO", options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  const renderHeader = useMemo(
    () => (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsContent}
          style={styles.categoryTabsScroll}
        >
          {categoryTabs.map((tab) => {
            const isActive = selectedCategory === tab.key;
            const colorSet = tab.key === "all"
              ? { bg: colors.accentMuted, text: colors.accent, activeBg: colors.accent }
              : (colors.categoryColors[tab.key] ?? colors.categoryColors.annet);
            return (
              <Pressable
                key={tab.key}
                onPress={() => selectCategory(tab.key)}
                style={[
                  styles.categoryTab,
                  {
                    backgroundColor: isActive ? colorSet.activeBg : colors.chipBg,
                    borderColor: isActive ? colorSet.activeBg : colors.cardBorder,
                  },
                ]}
                testID={`tab-${tab.key}`}
              >
                <TabIcon
                  icon={tab.icon}
                  size={15}
                  color={isActive ? colors.white : colorSet.text}
                />
                <Text
                  style={[
                    styles.categoryTabText,
                    { color: isActive ? colors.white : colorSet.text },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {availableSubTags.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subTagsScrollContent}
            style={styles.subTagsScroll}
          >
            {availableSubTags.map((tag) => {
              const isSelected = selectedSubTags.includes(tag);
              const colorSet = colors.categoryColors[selectedCategory] ?? colors.categoryColors.annet;
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleSubTag(tag)}
                  style={[
                    styles.subTagChip,
                    {
                      backgroundColor: isSelected ? colorSet.activeBg : colorSet.bg,
                      borderColor: isSelected ? colorSet.activeBg : "transparent",
                    },
                  ]}
                  testID={`subtag-${tag}`}
                >
                  <Text
                    style={[
                      styles.subTagChipText,
                      { color: isSelected ? colors.white : colorSet.text },
                    ]}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.quickFiltersRow}>
          <Pressable
            onPress={() => selectDateFilter("today")}
            style={[styles.quickChip, { backgroundColor: colors.chipBg, borderColor: colors.cardBorder }, dateFilter === "today" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            testID="filter-today"
          >
            <Text style={[styles.quickChipText, { color: dateFilter === "today" ? colors.white : colors.primary }]}>I dag</Text>
          </Pressable>
          <Pressable
            onPress={() => selectDateFilter("weekend")}
            style={[styles.quickChip, { backgroundColor: colors.chipBg, borderColor: colors.cardBorder }, dateFilter === "weekend" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            testID="filter-weekend"
          >
            <Text style={[styles.quickChipText, { color: dateFilter === "weekend" ? colors.white : colors.primary }]}>I helgen</Text>
          </Pressable>
          <Pressable
            onPress={toggleFreeOnly}
            style={[styles.quickChip, { backgroundColor: colors.chipBg, borderColor: colors.cardBorder }, showFreeOnly && { backgroundColor: colors.free, borderColor: colors.free }]}
            testID="filter-free"
          >
            <Ticket size={13} color={showFreeOnly ? colors.white : colors.free} />
            <Text style={[styles.quickChipText, { color: showFreeOnly ? colors.white : colors.free }]}>Gratis</Text>
          </Pressable>

          {dateFilter === "custom" && dateFilterLabel && (
            <View style={[styles.quickChip, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Calendar size={12} color={colors.white} />
              <Text style={[styles.quickChipText, { color: colors.white }]}>{dateFilterLabel}</Text>
              <Pressable onPress={() => { setDateFilter("all"); setCustomRange({ from: null, to: null }); }} hitSlop={8}>
                <X size={12} color={colors.white} />
              </Pressable>
            </View>
          )}

          {dateFilter !== "all" && dateFilter !== "custom" && (
            <Pressable onPress={() => setDateFilter("all")} style={[styles.clearChipBtn, { backgroundColor: colors.cardBorder }]} hitSlop={6}>
              <X size={13} color={colors.textSecondary} />
            </Pressable>
          )}

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => setShowFilterSheet(true)}
            style={[styles.filterBtn, { backgroundColor: colors.chipBg, borderColor: colors.cardBorder }, advancedFilterCount > 0 && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            testID="filter-advanced"
          >
            <SlidersHorizontal size={16} color={advancedFilterCount > 0 ? colors.white : colors.primary} />
            {advancedFilterCount > 0 && (
              <View style={[styles.filterBtnBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.filterBtnBadgeText}>{advancedFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {!hasActiveFilters && tonightEvents.length > 0 && (
          <View style={styles.carouselSection}>
            <View style={styles.carouselHeader}>
              <View style={styles.carouselTitleRow}>
                <View style={[styles.carouselDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.carouselTitle, { color: colors.primary }]}>I dag</Text>
              </View>
              <Text style={[styles.carouselCount, { color: colors.textMuted }]}>{tonightEvents.length}</Text>
            </View>
            <FlatList
              data={tonightEvents}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              keyExtractor={(item) => `tonight-${item.source_id}`}
              renderItem={({ item }) => <EventCardCarousel event={item} />}
              ItemSeparatorComponent={() => <View style={{ width: CAROUSEL_CARD_GAP }} />}
              snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_GAP}
              decelerationRate="fast"
            />
          </View>
        )}

        {!hasActiveFilters && weekendEvents.length > 0 && (
          <View style={styles.carouselSection}>
            <View style={styles.carouselHeader}>
              <View style={styles.carouselTitleRow}>
                <View style={[styles.carouselDot, { backgroundColor: colors.primaryLight }]} />
                <Text style={[styles.carouselTitle, { color: colors.primary }]}>I helgen</Text>
              </View>
              <Text style={[styles.carouselCount, { color: colors.textMuted }]}>{weekendEvents.length}</Text>
            </View>
            <FlatList
              data={weekendEvents}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              keyExtractor={(item) => `weekend-${item.source_id}`}
              renderItem={({ item }) => <EventCardCarousel event={item} />}
              ItemSeparatorComponent={() => <View style={{ width: CAROUSEL_CARD_GAP }} />}
              snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_GAP}
              decelerationRate="fast"
            />
          </View>
        )}

        <View style={styles.resultRow}>
          <View style={styles.resultRowLeft}>
            <View style={[styles.resultAccent, { backgroundColor: colors.accent }]} />
            <Text style={[styles.resultCountText, { color: colors.primary }]}>
              {hasActiveFilters ? `${filteredEvents.length} ${filteredEvents.length === 1 ? "treff" : "treff"}` : "Alle arrangementer"}
            </Text>
          </View>
          {activeFiltersCount > 0 && (
            <Pressable onPress={clearAllFilters} hitSlop={6}>
              <Text style={[styles.clearAllText, { color: colors.accent }]}>Nullstill filtre</Text>
            </Pressable>
          )}
        </View>
      </View>
    ),
    [categoryTabs, selectedCategory, selectedSubTags, availableSubTags, showFreeOnly, filteredEvents.length, dateFilter, dateFilterLabel, activeFiltersCount, advancedFilterCount, hasActiveFilters, tonightEvents, weekendEvents, selectCategory, toggleSubTag, toggleFreeOnly, selectDateFilter, clearAllFilters, colors]
  );

  const renderEmpty = useMemo(() => {
    if (eventsQuery.isError) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>!!!</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Kunne ikke laste data</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {eventsQuery.error?.message ?? "Ukjent feil"}
          </Text>
          <Pressable style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Prøv igjen</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <CalendarDays size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ingen treff</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {selectedCategory !== "all" || dateFilter !== "all"
            ? "Prøv å endre filteret ditt"
            : "Det er ingen kommende arrangementer akkurat nå"}
        </Text>
      </View>
    );
  }, [eventsQuery.isError, eventsQuery.error, selectedCategory, dateFilter, onRefresh, colors]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Ålesund - Hva skjer?</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{todayLabel}</Text>
      </Animated.View>

      {eventsQuery.isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonFeed />
        </ScrollView>
      ) : (
      <SectionList
        sections={sectionData}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isFetching && !eventsQuery.isLoading}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />
      )}

      <Modal
        visible={showFilterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <Pressable style={[styles.sheetOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowFilterSheet(false)}>
          <View />
        </Pressable>
        <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.sheetBg }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.sheetTitle, { color: colors.primary }]}>Filtre</Text>

          <Text style={[styles.sheetSectionLabel, { color: colors.textSecondary }]}>Område</Text>
          <View style={styles.sheetChipsRow}>
            {availableAreas.map((area) => {
              const isSelected = selectedAreas.includes(area.key);
              return (
                <Pressable
                  key={area.key}
                  onPress={() => toggleArea(area.key)}
                  style={[styles.sheetChip, { backgroundColor: colors.chipBg, borderColor: colors.cardBorder }, isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}
                  testID={`filter-area-${area.key}`}
                >
                  <MapPin size={14} color={isSelected ? colors.white : colors.primaryLight} />
                  <Text style={[styles.sheetChipText, { color: colors.primary }, isSelected && { color: colors.white }]}>{area.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sheetSectionLabel, { color: colors.textSecondary }]}>Dato</Text>
          <View style={styles.sheetChipsRow}>
            <Pressable
              onPress={() => selectDateFilter("custom")}
              style={[styles.sheetChip, { backgroundColor: colors.chipBg, borderColor: colors.cardBorder }, dateFilter === "custom" && { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}
              testID="filter-custom-date"
            >
              <Calendar size={14} color={dateFilter === "custom" ? colors.white : colors.primary} />
              <Text style={[styles.sheetChipText, { color: colors.primary }, dateFilter === "custom" && { color: colors.white }]}>
                {dateFilterLabel ?? "Velg datoperiode"}
              </Text>
              <ChevronDown size={12} color={dateFilter === "custom" ? colors.white : colors.textMuted} />
            </Pressable>
            {dateFilter === "custom" && (
              <Pressable
                onPress={() => { setDateFilter("all"); setCustomRange({ from: null, to: null }); }}
                style={[styles.clearChipBtn, { backgroundColor: colors.cardBorder }]}
                hitSlop={6}
              >
                <X size={14} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => {
                setSelectedAreas([]);
                if (dateFilter === "custom") {
                  setDateFilter("all");
                  setCustomRange({ from: null, to: null });
                }
              }}
              style={[styles.sheetSecondaryBtn, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.sheetSecondaryBtnText, { color: colors.textSecondary }]}>Nullstill</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowFilterSheet(false)}
              style={[styles.sheetPrimaryBtn, { backgroundColor: colors.accent }]}
            >
              <Check size={16} color={colors.white} />
              <Text style={styles.sheetPrimaryBtnText}>Vis resultater</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowDatePicker(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.modalBg }, Platform.OS === "web" && { maxWidth: 400 }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Velg datoperiode</Text>

            <View style={styles.rangeDisplay}>
              <Pressable
                style={[styles.rangeField, { backgroundColor: colors.background, borderColor: "transparent" }, pickingField === "from" && { borderColor: colors.accent }]}
                onPress={() => setPickingField("from")}
              >
                <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>Fra</Text>
                <Text style={[styles.rangeValue, { color: colors.primary }, !tempRange.from && { color: colors.textMuted }]}>
                  {tempRange.from ? formatShortDate(tempRange.from) : "Velg dato"}
                </Text>
              </Pressable>
              <View style={[styles.rangeDivider, { backgroundColor: colors.textMuted }]} />
              <Pressable
                style={[styles.rangeField, { backgroundColor: colors.background, borderColor: "transparent" }, pickingField === "to" && { borderColor: colors.accent }]}
                onPress={() => setPickingField("to")}
              >
                <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>Til</Text>
                <Text style={[styles.rangeValue, { color: colors.primary }, !tempRange.to && { color: colors.textMuted }]}>
                  {tempRange.to ? formatShortDate(tempRange.to) : "Velg dato"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.calendarNav}>
              <Pressable onPress={goPrevMonth} style={[styles.calNavBtn, { backgroundColor: colors.background }]}>
                <Text style={[styles.calNavText, { color: colors.primary }]}>‹</Text>
              </Pressable>
              <Text style={[styles.calMonthLabel, { color: colors.primary }]}>{monthNames[pickerMonth]} {pickerYear}</Text>
              <Pressable onPress={goNextMonth} style={[styles.calNavBtn, { backgroundColor: colors.background }]}>
                <Text style={[styles.calNavText, { color: colors.primary }]}>›</Text>
              </Pressable>
            </View>

            <View style={styles.calDayLabels}>
              {dayLabels.map((l) => (
                <Text key={l} style={[styles.calDayLabel, { color: colors.textMuted }]}>{l}</Text>
              ))}
            </View>

            <View style={styles.calGrid}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.calCell} />;
                }
                const cellDate = new Date(pickerYear, pickerMonth, day);
                const isFrom = tempRange.from ? isSameDay(cellDate, tempRange.from) : false;
                const isTo = tempRange.to ? isSameDay(cellDate, tempRange.to) : false;
                const isEdge = isFrom || isTo;
                const inBetween = isInRange(cellDate, tempRange.from, tempRange.to);
                const isToday = isSameDay(cellDate, new Date());

                return (
                  <Pressable
                    key={`day-${day}`}
                    style={[
                      styles.calCell,
                      inBetween && { backgroundColor: colors.accentMuted },
                      isEdge && { backgroundColor: colors.accent, borderRadius: 20 },
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        { color: colors.text },
                        isToday && !isEdge && { color: colors.accent, fontWeight: "700" as const },
                        isEdge && { color: colors.white, fontWeight: "700" as const },
                        inBetween && { color: colors.primary, fontWeight: "600" as const },
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={clearDateRange} style={[styles.modalSecondaryBtn, { backgroundColor: colors.background }]}>
                <Text style={[styles.modalSecondaryBtnText, { color: colors.textSecondary }]}>Nullstill</Text>
              </Pressable>
              <Pressable
                onPress={confirmDateRange}
                style={[styles.modalPrimaryBtn, { backgroundColor: colors.accent }, (!tempRange.from || !tempRange.to) && styles.modalPrimaryBtnDisabled]}
                disabled={!tempRange.from || !tempRange.to}
              >
                <Check size={16} color={colors.white} />
                <Text style={styles.modalPrimaryBtnText}>Bruk</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  categoryTabsScroll: {
    marginBottom: 4,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingRight: 40,
    gap: 8,
    paddingVertical: 6,
  },
  categoryTab: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  subTagsScroll: {
    marginBottom: 4,
  },
  subTagsScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingVertical: 4,
  },
  subTagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  subTagChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  quickFiltersRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  quickChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  clearChipBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
  },
  filterBtnBadge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
  },
  filterBtnBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  carouselSection: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  carouselHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  carouselTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  carouselTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    letterSpacing: -0.2,
  },
  carouselCount: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  resultRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 16,
  },
  resultRowLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  resultAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  resultCountText: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionHeaderContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 0,
    borderTopWidth: 1,
    marginTop: 4,
  },
  sectionHeaderAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 40,
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
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  sheetOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center" as const,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    marginBottom: 20,
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  sheetChipsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 16,
  },
  sheetChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  sheetChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  sheetActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 8,
  },
  sheetSecondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
  },
  sheetSecondaryBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  sheetPrimaryBtn: {
    flex: 2,
    flexDirection: "row" as const,
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sheetPrimaryBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: "100%" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  rangeDisplay: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 20,
  },
  rangeField: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  rangeDivider: {
    width: 12,
    alignSelf: "center" as const,
    height: 2,
    borderRadius: 1,
  },
  calendarNav: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  calNavText: {
    fontSize: 22,
    fontWeight: "600" as const,
    marginTop: -2,
  },
  calMonthLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  calDayLabels: {
    flexDirection: "row" as const,
    marginBottom: 4,
  },
  calDayLabel: {
    flex: 1,
    textAlign: "center" as const,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  calGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  calCell: {
    width: "14.285%" as const,
    aspectRatio: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  calDayText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  modalActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 16,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center" as const,
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  modalPrimaryBtn: {
    flex: 1,
    flexDirection: "row" as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.4,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
});
