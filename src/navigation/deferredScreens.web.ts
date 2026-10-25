// Web: Expo SDK 54's chunk serializer moves every module that two lazy chunks
// share into one `__common` chunk, and index.html loads that chunk with the
// entry, before the welcome cards (@expo/metro-config,
// build/serializer/serializeChunks.js). These four share most of their code
// with the navigator, so splitting them off put that shared code on the
// first-launch page instead of deferring it. Bundling them with the navigator,
// which App.tsx still loads lazily, keeps all of it off that page.
import FlagDetailModal from '@/components/FlagDetailModal';
import AdminScreen from '@/screens/AdminScreen';
import ReportFlagModal from '@/screens/ReportFlagModal';
import SettingsScreen from '@/screens/SettingsScreen';

export const loadSettingsScreen = () => Promise.resolve({ default: SettingsScreen });
export const loadAdminScreen = () => Promise.resolve({ default: AdminScreen });
export const loadReportFlagModal = () => Promise.resolve({ default: ReportFlagModal });
export const loadFlagDetailModal = () => Promise.resolve({ default: FlagDetailModal });
