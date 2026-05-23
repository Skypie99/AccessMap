import { supabase } from './supabase';
import type {
  FlagCategory,
  FlagRow,
  FlagSeverity,
  FlagStatus,
} from '@/types/database';

export const FLAG_PHOTOS_BUCKET = 'flag-photos';

/**
 * Upload a local image (file:// URI from expo-image-picker) to the
 * flag-photos Supabase bucket and return its public URL.
 */
export async function uploadFlagPhoto(
  userId: string,
  localUri: string,
): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  // Pick an extension from the uri; default to jpg.
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(localUri);
  const ext = (match?.[1] ?? 'jpg').toLowerCase();
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export interface CreateFlagInput {
  lat: number;
  lng: number;
  category: FlagCategory;
  severity: FlagSeverity;
  description?: string | null;
  photo_url?: string | null;
}

export async function listFlags(statuses: FlagStatus[] = ['open', 'verified']) {
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .in('status', statuses)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

export async function createFlag(userId: string, input: CreateFlagInput) {
  const { data, error } = await supabase
    .from('flags')
    .insert({
      user_id: userId,
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      severity: input.severity,
      description: input.description ?? null,
      photo_url: input.photo_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FlagRow;
}

export async function updateFlagStatus(flagId: string, status: FlagStatus) {
  const { data, error } = await supabase
    .from('flags')
    .update({ status })
    .eq('id', flagId)
    .select()
    .single();
  if (error) throw error;
  return data as FlagRow;
}

export const CATEGORY_LABELS: Record<FlagCategory, string> = {
  no_ramp: 'No ramp',
  broken_sidewalk: 'Broken sidewalk',
  blocked_path: 'Blocked path',
  missing_signal: 'Missing signal',
  steep_grade: 'Steep grade',
  other: 'Other',
};

export const CATEGORY_ORDER: FlagCategory[] = [
  'no_ramp',
  'broken_sidewalk',
  'blocked_path',
  'missing_signal',
  'steep_grade',
  'other',
];
