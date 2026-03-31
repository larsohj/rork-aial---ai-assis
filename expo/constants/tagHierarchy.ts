export interface TagCategory {
  key: string;
  label: string;
  icon: string;
  children: string[];
}

export const TAG_HIERARCHY: TagCategory[] = [
  {
    key: "kino",
    label: "Kino",
    icon: "film",
    children: [
      "action",
      "animasjon",
      "barnefilm",
      "biografi",
      "dokumentar",
      "drama",
      "eventyr",
      "familiefilm",
      "komedie",
      "musikkfilm",
      "romantikk",
      "sci-fi",
      "skrekkfilm",
      "superheltfilm",
      "thriller",
      "isense",
      "luxe",
    ],
  },
  {
    key: "konsert",
    label: "Konserter",
    icon: "music",
    children: ["jazz", "klassisk", "populaermusikk", "julekonsert"],
  },
  {
    key: "kultur",
    label: "Kultur",
    icon: "palette",
    children: ["teater", "dans", "kunst", "foredrag", "historie"],
  },
  {
    key: "fotball",
    label: "Fotball",
    icon: "circle-dot",
    children: ["fotball"],
  },
  {
    key: "sport",
    label: "Sport & Friluft",
    icon: "mountain",
    children: ["friluftsliv", "tur", "kyst", "natur"],
  },
  {
    key: "barn",
    label: "Barn",
    icon: "baby",
    children: ["barn"],
  },
  {
    key: "humor",
    label: "Humor",
    icon: "laugh",
    children: ["humor"],
  },
];

export const CINEMA_SUBTAGS = TAG_HIERARCHY.find((c) => c.key === "kino")?.children ?? [];

export function getParentCategory(tag: string): TagCategory | null {
  for (const cat of TAG_HIERARCHY) {
    if (cat.children.includes(tag) || cat.key === tag) {
      return cat;
    }
  }
  return null;
}

export function getAllChildTags(categoryKey: string): string[] {
  const cat = TAG_HIERARCHY.find((c) => c.key === categoryKey);
  if (!cat) return [categoryKey];
  return [cat.key, ...cat.children];
}

export function isOrphanTag(tag: string): boolean {
  if (tag === "annet" || tag === "få billetter igjen" || tag === "utsolgt") return true;
  for (const cat of TAG_HIERARCHY) {
    if (cat.key === tag || cat.children.includes(tag)) return false;
  }
  return true;
}
