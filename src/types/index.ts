export interface SteamGame {
  id: number;
  title: string;
  discounted: boolean;
  discount_percent: number;
  original_price: number;
  final_price: number;
  currency: string;
  large_capsule_image: string;
  small_capsule_image: string;
  window_discount_url: string;
  header_image: string;
  is_free: boolean;
  platform_windows?: boolean;
  platform_mac?: boolean;
  platform_linux?: boolean;
  streamingvideo?: boolean;
  controller_support?: string;
}

export interface FreeGame extends SteamGame {
  timestamp_detected: number;
  notified: boolean;
  end_time?: number | null;
}

export interface User {
  id: number;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  subscribed: boolean;
  created_at: number;
  updated_at: number;
}

export interface NotificationLog {
  id: number;
  game_id: number;
  user_id: number;
  sent_at: number;
  success: boolean;
}

export interface PromotionHistory {
  id: number;
  game_id: number;
  start_time: number;
  end_time?: number | null;
  is_active: boolean;
}
