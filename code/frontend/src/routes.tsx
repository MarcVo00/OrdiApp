import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const ClientView = lazy(() => import('./views/ClientView'));
const ServerView = lazy(() => import('./views/WaiterView'));
const ManagerView = lazy(() => import('./views/ManagerView'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/client" element={<ClientView />} />
      <Route path="/server" element={<ServerView />} />
      <Route path="/manager" element={<ManagerView />} />
    </Routes>
  );
}