// OJT Master v2.9.0 - Component Exports
// Block Agent System v1.1.0 - Shared components only

// Shared Layout Components
export { default as Header } from './Header';
export { default as ErrorBoundary } from './ErrorBoundary';

// UI Components
export { Spinner } from './ui/Spinner';
export { EmptyState } from './ui/EmptyState';

// Feature-based components are now in @features/*
// - RoleSelectionPage → @features/auth
// - AdminDashboard → @features/admin
// - MentorDashboard → @features/content/create
// - MenteeList, MenteeStudy → @features/learning/study
