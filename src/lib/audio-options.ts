export type AudioQuality = "v0" | "320" | "256" | "192" | "128";

export interface AudioOptions {
  quality: AudioQuality;
  addMetadata: boolean;
  embedThumbnail: boolean;
}

export const AUDIO_QUALITIES: AudioQuality[] = ["v0", "320", "256", "192", "128"];

export const DEFAULT_AUDIO_OPTIONS: AudioOptions = {
  quality: "v0",
  addMetadata: true,
  embedThumbnail: true,
};

export function sanitizeAudioOptions(input: unknown): AudioOptions {
  const record = (
    typeof input === "object" && input !== null ? input : {}
  ) as Record<string, unknown>;

  const quality = AUDIO_QUALITIES.includes(record.quality as AudioQuality)
    ? (record.quality as AudioQuality)
    : DEFAULT_AUDIO_OPTIONS.quality;

  return {
    quality,
    addMetadata:
      typeof record.addMetadata === "boolean"
        ? record.addMetadata
        : DEFAULT_AUDIO_OPTIONS.addMetadata,
    embedThumbnail:
      typeof record.embedThumbnail === "boolean"
        ? record.embedThumbnail
        : DEFAULT_AUDIO_OPTIONS.embedThumbnail,
  };
}
