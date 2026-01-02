import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Dashboard,
  Products,
  ProductDetail,
  Deployments,
  Clients,
  ClientDetail,
  Onboarding,
  SettingsPage,
  ReleaseNotes,
  EAPDashboard,
  Users as UsersPage,
  Login
} from './pages';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/products" element={<Products />} />
    <Route path="/products/:productId" element={<ProductDetail />} />
    <Route path="/clients" element={<Clients />} />
    <Route path="/clients/:clientId" element={<ClientDetail />} />
    <Route path="/deployments" element={<Deployments />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/release-notes" element={<ReleaseNotes />} />
    <Route path="/eap" element={<EAPDashboard />} />
    <Route path="/users" element={<UsersPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);
