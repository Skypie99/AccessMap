import { Bug, Heart, Lightbulb, MessageCircle, type LucideIcon } from 'lucide-react-native';
import type { FeedbackCategory } from '@/lib/feedback';

// Lucide glyphs that pair with the feedback-category labels in the UI
// (DESIGN.md §10 — SVG icons only, no emoji). Decorative only: the label is
// always read aloud, never the icon. Kept here (not in lib/feedback.ts) so the
// mailto-logic unit tests don't have to pull in react-native-svg.
export const FEEDBACK_CATEGORY_ICONS: Record<FeedbackCategory, LucideIcon> = {
  bug: Bug,
  idea: Lightbulb,
  love: Heart,
  other: MessageCircle,
};
