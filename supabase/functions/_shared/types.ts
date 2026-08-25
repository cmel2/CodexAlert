export type ResetState = "yes" | "no" | "unknown";

export interface ParsedStatus {
  state: ResetState;
  resetIdentifier: string | null;
  resetAt: string | null;
}

export interface ClaimedDelivery {
  deliveryId: number;
  subscriptionId: string;
  webhookCiphertext: string;
  webhookIv: string;
  failureCount: number;
}

export interface ClaimResetResult {
  isNewReset: boolean;
  deliveries: ClaimedDelivery[];
}

export interface DiscordDeliveryResult {
  ok: boolean;
  status: number | null;
  category: string | null;
  permanent: boolean;
}
