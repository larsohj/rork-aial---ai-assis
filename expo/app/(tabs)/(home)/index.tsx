import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, X, CalendarDays, Calendar, ChevronDown, ChevronRight, Check, MapPin, Ticket, Film, Music, Palette, Mountain, Baby, Laugh } from "lucide-react-native";
import Colors from "@/constants/colors";
import { EventData } from "@/types/event";
import { fetchEvents, fetchAllTags } from "@/lib/events";
import { EventCard } from "@/components/EventCard";
import { TAG_HIERARCHY, TagCategory, isOrphanTag } from "@/constants/tagHierarchy";
import { AREAS, getEventArea } from "@/constants/areaMapping";

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

export default function EventsFeedScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [customRange, setCustomRange] = useState<DateRange>({ from: null, to: null });
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(false);
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

  const filteredEvents = useMemo(() => {
    const events = eventsQuery.data ?? [];
    let filtered = events;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location_name?.toLowerCase().includes(q) ||
          e.organizer?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((e) =>
        selectedTags.some((tag) => e.tags?.includes(tag))
      );
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
  }, [eventsQuery.data, search, selectedTags, selectedAreas, showFreeOnly, dateFilter, customRange]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleCategory = useCallback((cat: TagCategory) => {
    setExpandedCategories((prev) =>
      prev.includes(cat.key) ? prev.filter((k) => k !== cat.key) : [...prev, cat.key]
    );
  }, []);

  const toggleCategoryAll = useCallback((cat: TagCategory, availableChildren: string[]) => {
    setSelectedTags((prev) => {
      const allSelected = availableChildren.every((t) => prev.includes(t));
      if (allSelected) {
        return prev.filter((t) => !availableChildren.includes(t));
      } else {
        const newTags = new Set([...prev, ...availableChildren]);
        return [...newTags];
      }
    });
  }, []);

  const toggleArea = useCallback((areaKey: string) => {
    setSelectedAreas((prev) =>
      prev.includes(areaKey) ? prev.filter((a) => a !== areaKey) : [...prev, areaKey]
    );
  }, []);

  const toggleFreeOnly = useCallback(() => {
    setShowFreeOnly((prev) => !prev);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  const renderEvent = useCallback(
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedTags.length > 0) count += selectedTags.length;
    if (selectedAreas.length > 0) count += selectedAreas.length;
    if (showFreeOnly) count += 1;
    if (dateFilter !== "all") count += 1;
    if (search.trim()) count += 1;
    return count;
  }, [selectedTags, selectedAreas, showFreeOnly, dateFilter, search]);

  const clearAllFilters = useCallback(() => {
    setSelectedTags([]);
    setSelectedAreas([]);
    setShowFreeOnly(false);
    setDateFilter("all");
    setCustomRange({ from: null, to: null });
    setSearch("");
    setExpandedCategories([]);
  }, []);

  const categoryIcon = useCallback((iconName: string, color: string) => {
    const size = 16;
    switch (iconName) {
      case "film": return <Film size={size} color={color} />;
      case "music": return <Music size={size} color={color} />;
      case "palette": return <Palette size={size} color={color} />;
      case "mountain": return <Mountain size={size} color={color} />;
      case "baby": return <Baby size={size} color={color} />;
      case "laugh": return <Laugh size={size} color={color} />;
      default: return null;
    }
  }, []);

  const availableTagsSet = useMemo(() => new Set(tags), [tags]);

  const categoriesWithAvailable = useMemo(() => {
    return TAG_HIERARCHY.map((cat) => {
      const available = cat.children.filter((t) => availableTagsSet.has(t));
      return { ...cat, availableChildren: available };
    }).filter((cat) => cat.availableChildren.length > 0);
  }, [availableTagsSet]);

  const orphanTags = useMemo(() => {
    return tags.filter((t) => isOrphanTag(t) && t !== "utsolgt" && t !== "få billetter igjen");
  }, [tags]);

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

  const renderHeader = useMemo(
    () => (
      <View>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Søk etter arrangementer..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              testID="search-input"
            />
            {search.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={8}>
                <X size={18} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.quickFiltersRow}>
          <Pressable
            onPress={toggleFreeOnly}
            style={[styles.quickChip, showFreeOnly && styles.quickChipFreeActive]}
            testID="filter-free"
          >
            <Ticket size={14} color={showFreeOnly ? Colors.white : Colors.free} />
            <Text style={[styles.quickChipText, { color: showFreeOnly ? Colors.white : Colors.free }]}>Gratis</Text>
          </Pressable>

          {availableAreas.map((area) => {
            const isSelected = selectedAreas.includes(area.key);
            return (
              <Pressable
                key={area.key}
                onPress={() => toggleArea(area.key)}
                style={[styles.quickChip, isSelected && styles.quickChipCityActive]}
                testID={`filter-area-${area.key}`}
              >
                <MapPin size={14} color={isSelected ? Colors.white : Colors.primaryLight} />
                <Text style={[styles.quickChipText, { color: isSelected ? Colors.white : Colors.primaryLight }]}>{area.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dateFiltersRow}>
          <Pressable
            onPress={() => selectDateFilter("today")}
            style={[styles.dateChip, dateFilter === "today" && styles.dateChipActive]}
            testID="filter-today"
          >
            <Text style={[styles.dateChipText, dateFilter === "today" && styles.dateChipTextActive]}>I dag</Text>
          </Pressable>
          <Pressable
            onPress={() => selectDateFilter("weekend")}
            style={[styles.dateChip, dateFilter === "weekend" && styles.dateChipActive]}
            testID="filter-weekend"
          >
            <Text style={[styles.dateChipText, dateFilter === "weekend" && styles.dateChipTextActive]}>I helgen</Text>
          </Pressable>
          <Pressable
            onPress={() => selectDateFilter("custom")}
            style={[styles.dateChip, dateFilter === "custom" && styles.dateChipActive]}
            testID="filter-custom-date"
          >
            <Calendar size={14} color={dateFilter === "custom" ? Colors.white : Colors.primary} />
            <Text style={[styles.dateChipText, dateFilter === "custom" && styles.dateChipTextActive]}>
              {dateFilterLabel ?? "Velg dato"}
            </Text>
            <ChevronDown size={12} color={dateFilter === "custom" ? Colors.white : Colors.textMuted} />
          </Pressable>
          {dateFilter !== "all" && (
            <Pressable onPress={() => setDateFilter("all")} style={styles.clearDateChip} hitSlop={6}>
              <X size={14} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {categoriesWithAvailable.length > 0 && (
          <View style={styles.categoriesContainer}>
            {categoriesWithAvailable.map((cat) => {
              const isExpanded = expandedCategories.includes(cat.key);
              const colorSet = Colors.categoryColors[cat.key] ?? Colors.categoryColors.annet;
              const selectedChildCount = cat.availableChildren.filter((t) => selectedTags.includes(t)).length;
              const allChildrenSelected = selectedChildCount === cat.availableChildren.length && selectedChildCount > 0;

              return (
                <View key={cat.key} style={styles.categoryBlock}>
                  <Pressable
                    onPress={() => {
                      if (cat.availableChildren.length <= 1) {
                        toggleCategoryAll(cat, cat.availableChildren);
                      } else {
                        toggleCategory(cat);
                      }
                    }}
                    style={[
                      styles.categoryHeader,
                      {
                        backgroundColor: allChildrenSelected ? colorSet.activeBg : (selectedChildCount > 0 ? colorSet.bg : Colors.white),
                        borderColor: selectedChildCount > 0 ? colorSet.activeBg : Colors.cardBorder,
                      },
                    ]}
                    testID={`category-${cat.key}`}
                  >
                    {categoryIcon(cat.icon, allChildrenSelected ? Colors.white : colorSet.text)}
                    <Text
                      style={[
                        styles.categoryHeaderText,
                        { color: allChildrenSelected ? Colors.white : colorSet.text },
                      ]}
                    >
                      {cat.label}
                    </Text>
                    {selectedChildCount > 0 && !allChildrenSelected && (
                      <View style={[styles.categoryBadge, { backgroundColor: colorSet.activeBg }]}>
                        <Text style={styles.categoryBadgeText}>{selectedChildCount}</Text>
                      </View>
                    )}
                    {cat.availableChildren.length > 1 && (
                      <View style={styles.chevronWrap}>
                        {isExpanded ? (
                          <ChevronDown size={14} color={allChildrenSelected ? Colors.white : Colors.textMuted} />
                        ) : (
                          <ChevronRight size={14} color={allChildrenSelected ? Colors.white : Colors.textMuted} />
                        )}
                      </View>
                    )}
                  </Pressable>

                  {isExpanded && cat.availableChildren.length > 1 && (
                    <View style={styles.subTagsWrap}>
                      <Pressable
                        onPress={() => toggleCategoryAll(cat, cat.availableChildren)}
                        style={[
                          styles.subTagPill,
                          {
                            backgroundColor: allChildrenSelected ? colorSet.activeBg : colorSet.bg,
                            borderColor: colorSet.activeBg,
                            borderWidth: 1,
                          },
                        ]}
                        testID={`tag-${cat.key}-all`}
                      >
                        <Text style={[styles.subTagText, { color: allChildrenSelected ? Colors.white : colorSet.text }]}>
                          Alle
                        </Text>
                      </Pressable>
                      {cat.availableChildren.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <Pressable
                            key={tag}
                            onPress={() => toggleTag(tag)}
                            style={[
                              styles.subTagPill,
                              {
                                backgroundColor: isSelected ? colorSet.activeBg : colorSet.bg,
                              },
                            ]}
                            testID={`tag-${tag}`}
                          >
                            <Text style={[styles.subTagText, { color: isSelected ? Colors.white : colorSet.text }]}>
                              {tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {orphanTags.length > 0 && (
              <View style={styles.orphanTagsRow}>
                {orphanTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.subTagPill,
                        {
                          backgroundColor: isSelected ? Colors.categoryColors.annet.activeBg : Colors.categoryColors.annet.bg,
                        },
                      ]}
                      testID={`tag-${tag}`}
                    >
                      <Text style={[styles.subTagText, { color: isSelected ? Colors.white : Colors.categoryColors.annet.text }]}>
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={styles.resultRow}>
          <Text style={styles.resultCountText}>
            {filteredEvents.length} {filteredEvents.length === 1 ? "arrangement" : "arrangementer"}
          </Text>
          {activeFiltersCount > 0 && (
            <Pressable onPress={clearAllFilters} hitSlop={6}>
              <Text style={styles.clearAllText}>Nullstill filtre</Text>
            </Pressable>
          )}
        </View>
      </View>
    ),
    [search, categoriesWithAvailable, orphanTags, selectedTags, expandedCategories, availableAreas, selectedAreas, showFreeOnly, filteredEvents.length, dateFilter, dateFilterLabel, activeFiltersCount, clearSearch, toggleTag, toggleCategory, toggleCategoryAll, categoryIcon, toggleArea, toggleFreeOnly, selectDateFilter, clearAllFilters]
  );

  const renderEmpty = useMemo(() => {
    if (eventsQuery.isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.emptyText}>Laster arrangementer...</Text>
        </View>
      );
    }

    if (eventsQuery.isError) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>!!!</Text>
          <Text style={styles.emptyTitle}>Kunne ikke laste data</Text>
          <Text style={styles.emptyText}>
            {eventsQuery.error?.message ?? "Ukjent feil"}
          </Text>
          <Pressable style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Prøv igjen</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <CalendarDays size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Ingen treff</Text>
        <Text style={styles.emptyText}>
          {search || selectedTags.length > 0 || dateFilter !== "all"
            ? "Prøv å endre søket eller filteret ditt"
            : "Det er ingen kommende arrangementer akkurat nå"}

        </Text>
      </View>
    );
  }, [eventsQuery.isLoading, eventsQuery.isError, eventsQuery.error, search, selectedTags.length, dateFilter, onRefresh]);

  const todayLabel = useMemo(() => {
    const now = new Date();
    const options = { weekday: "long" as const, day: "numeric" as const, month: "long" as const };
    const formatted = now.toLocaleDateString("nb-NO", options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.headerTitle}>Hva skjer i Ålesund?</Text>
        <Text style={styles.headerSubtitle}>{todayLabel}</Text>
      </Animated.View>

      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isFetching && !eventsQuery.isLoading}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={[styles.modalContent, Platform.OS === "web" && { maxWidth: 400 }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>Velg datoperiode</Text>

            <View style={styles.rangeDisplay}>
              <Pressable
                style={[styles.rangeField, pickingField === "from" && styles.rangeFieldActive]}
                onPress={() => setPickingField("from")}
              >
                <Text style={styles.rangeLabel}>Fra</Text>
                <Text style={[styles.rangeValue, !tempRange.from && styles.rangePlaceholder]}>
                  {tempRange.from ? formatShortDate(tempRange.from) : "Velg dato"}
                </Text>
              </Pressable>
              <View style={styles.rangeDivider} />
              <Pressable
                style={[styles.rangeField, pickingField === "to" && styles.rangeFieldActive]}
                onPress={() => setPickingField("to")}
              >
                <Text style={styles.rangeLabel}>Til</Text>
                <Text style={[styles.rangeValue, !tempRange.to && styles.rangePlaceholder]}>
                  {tempRange.to ? formatShortDate(tempRange.to) : "Velg dato"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.calendarNav}>
              <Pressable onPress={goPrevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>‹</Text>
              </Pressable>
              <Text style={styles.calMonthLabel}>{monthNames[pickerMonth]} {pickerYear}</Text>
              <Pressable onPress={goNextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.calDayLabels}>
              {dayLabels.map((l) => (
                <Text key={l} style={styles.calDayLabel}>{l}</Text>
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
                      inBetween && styles.calCellInRange,
                      isEdge && styles.calCellSelected,
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        isToday && !isEdge && styles.calDayToday,
                        isEdge && styles.calDayTextSelected,
                        inBetween && styles.calDayTextInRange,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={clearDateRange} style={styles.modalSecondaryBtn}>
                <Text style={styles.modalSecondaryBtnText}>Nullstill</Text>
              </Pressable>
              <Pressable
                onPress={confirmDateRange}
                style={[styles.modalPrimaryBtn, (!tempRange.from || !tempRange.to) && styles.modalPrimaryBtnDisabled]}
                disabled={!tempRange.from || !tempRange.to}
              >
                <Check size={16} color={Colors.white} />
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
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  quickFiltersRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  quickChipFreeActive: {
    backgroundColor: Colors.free,
    borderColor: Colors.free,
  },
  quickChipCityActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  dateFiltersRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  dateChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dateChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  dateChipTextActive: {
    color: Colors.white,
  },
  clearDateChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cardBorder,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  categoryBlock: {
    marginBottom: 2,
  },
  categoryHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryHeaderText: {
    fontSize: 14,
    fontWeight: "700" as const,
    flex: 1,
  },
  categoryBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  chevronWrap: {
    width: 20,
    alignItems: "center" as const,
  },
  subTagsWrap: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingLeft: 12,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 6,
  },
  subTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subTagText: {
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "capitalize" as const,
  },
  orphanTagsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 2,
  },
  tagsWrap: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tagPillText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  resultRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  resultCountText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "500" as const,
  },
  clearAllText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: "600" as const,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
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
    color: Colors.text,
    textAlign: "center" as const,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
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
    color: Colors.primary,
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
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  rangeFieldActive: {
    borderColor: Colors.accent,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  rangePlaceholder: {
    color: Colors.textMuted,
  },
  rangeDivider: {
    width: 12,
    alignSelf: "center" as const,
    height: 2,
    backgroundColor: Colors.textMuted,
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
    backgroundColor: Colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  calNavText: {
    fontSize: 22,
    fontWeight: "600" as const,
    color: Colors.primary,
    marginTop: -2,
  },
  calMonthLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.primary,
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
    color: Colors.textMuted,
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
  calCellInRange: {
    backgroundColor: Colors.accentMuted,
  },
  calCellSelected: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
  },
  calDayText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  calDayToday: {
    color: Colors.accent,
    fontWeight: "700" as const,
  },
  calDayTextSelected: {
    color: Colors.white,
    fontWeight: "700" as const,
  },
  calDayTextInRange: {
    color: Colors.primary,
    fontWeight: "600" as const,
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
    backgroundColor: Colors.background,
    alignItems: "center" as const,
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  modalPrimaryBtn: {
    flex: 1,
    flexDirection: "row" as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.4,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.white,
  },
});
