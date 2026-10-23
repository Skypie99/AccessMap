// Loaders for the screens and sheets the navigator renders through React.lazy.
// Native ships one bundle, so these stay the dynamic imports they always were.
// Web resolves deferredScreens.web.ts instead; it explains why.
export const loadSettingsScreen = () => import('@/screens/SettingsScreen');
export const loadAdminScreen = () => import('@/screens/AdminScreen');
export const loadReportFlagModal = () => import('@/screens/ReportFlagModal');
export const loadFlagDetailModal = () => import('@/components/FlagDetailModal');
