export interface EventData {
  source: string;
  source_id: string;
  title: string;
  description?: string | null;
  start_at: string | null;
  end_at: string | null;
  is_free: boolean | null;
  price_text?: string | null;
  location_name?: string | null;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  organizer: string | null;
  image_url: string | null;
  url: string | null;
  tags: string[];
  age_groups?: string[];
  is_recurring?: boolean;
}

export interface EventsResponse {
  generated_at: string;
  total: number;
  failed_sources: string[];
  events: EventData[];
}
