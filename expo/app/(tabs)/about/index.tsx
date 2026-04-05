import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Heart, Globe, MapPin } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

const DATA_SOURCES = [
  "Friskus",
  "Viti museene",
  "Tikkio",
  "Parken kulturhus",
  "Ålesund bibliotek",
  "Ticketmaster",
  "Bypatrioten",
  "Visit Ålesund",
];

export default function AboutScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.heroEmoji}>🏔️</Text>
        <Text style={styles.heroTitle}>Hva skjer i Ålesund?</Text>
        <Text style={[styles.heroSubtitle, { color: colors.accentLight }]}>
          Alt som skjer i Ålesund-regionen, samlet på ett sted.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Heart size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Om appen</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
          Ålesund - Hva skjer? er en app som samler kulturarrangementer fra Ålesund, Ørskog, Sula og Giske i én enkel oversikt. Vi ønsker å gjøre det lettere å finne ut hva som skjer i regionen.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Globe size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Datakilder</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
          Arrangementene hentes automatisk fra flere kilder:
        </Text>
        <View style={styles.sourcesList}>
          {DATA_SOURCES.map((source) => (
            <View key={source} style={styles.sourceRow}>
              <View style={[styles.sourceDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.sourceText, { color: colors.text }]}>{source}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <MapPin size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Dekningsområde</Text>
        </View>
        <View style={styles.citiesRow}>
          {["Ålesund", "Ørskog", "Sula", "Giske"].map((city) => (
            <View key={city} style={[styles.cityChip, { backgroundColor: colors.accentMuted }]}>
              <Text style={[styles.cityChipText, { color: colors.accent }]}>{city}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.footerText, { color: colors.textMuted }]}>
        Laget med ❤️ for Ålesund-regionen
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  heroCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center" as const,
    gap: 10,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  section: {
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  sourcesList: {
    gap: 8,
  },
  sourceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  citiesRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  cityChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start" as const,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center" as const,
    marginTop: 8,
  },
});
