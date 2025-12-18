import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useCollection } from '../hooks';
import { getDaysDiff } from '../utils';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { data: deployments } = useCollection('deployments');
  const { data: products } = useCollection('products');
  const { data: clients } = useCollection('clients');

  // Read dismissed notifications from localStorage
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissedNotifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save dismissed notifications to localStorage
  useEffect(() => {
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  // Generate notifications based on current data
  const notifications = useMemo(() => {
    const notifs = [];
    const now = new Date();

    // Check for upcoming deadlines (within 7 days)
    deployments.forEach(d => {
      if (d.status === 'Released' || !d.nextDeliveryDate) return;

      const daysLeft = getDaysDiff(d.nextDeliveryDate);

      if (daysLeft <= 7 && daysLeft >= 0) {
        const product = products.find(p => p.id === d.productId);
        const client = clients.find(c => c.id === d.clientId);
        let clientName = client?.name;
        if (!clientName) {
          if (d.deploymentType === 'ga') clientName = 'GA Release';
          else if (d.deploymentType === 'generic') clientName = 'Generic';
          else clientName = 'Unknown';
        }

        notifs.push({
          id: `deadline-${d.id}`,
          type: 'deadline',
          severity: daysLeft <= 2 ? 'critical' : daysLeft <= 5 ? 'warning' : 'info',
          title: daysLeft === 0 ? 'Due Today!' : daysLeft === 1 ? 'Due Tomorrow' : `${daysLeft} days left`,
          message: `${product?.name || 'Unknown'} for ${clientName}`,
          deploymentId: d.id,
          productId: d.productId,
          date: d.nextDeliveryDate,
          daysLeft,
          timestamp: now.toISOString()
        });
      }

      // Overdue deployments
      if (daysLeft < 0) {
        const product = products.find(p => p.id === d.productId);
        const client = clients.find(c => c.id === d.clientId);
        let clientName = client?.name;
        if (!clientName) {
          if (d.deploymentType === 'ga') clientName = 'GA Release';
          else if (d.deploymentType === 'generic') clientName = 'Generic';
          else clientName = 'Unknown';
        }

        notifs.push({
          id: `overdue-${d.id}`,
          type: 'overdue',
          severity: 'critical',
          title: `Overdue by ${Math.abs(daysLeft)} days`,
          message: `${product?.name || 'Unknown'} for ${clientName}`,
          deploymentId: d.id,
          productId: d.productId,
          date: d.nextDeliveryDate,
          daysLeft,
          timestamp: now.toISOString()
        });
      }
    });

    // Check for blocked deployments
    deployments.forEach(d => {
      if (d.status === 'Blocked') {
        const product = products.find(p => p.id === d.productId);
        const client = clients.find(c => c.id === d.clientId);
        let clientName = client?.name;
        if (!clientName) {
          if (d.deploymentType === 'ga') clientName = 'GA Release';
          else if (d.deploymentType === 'generic') clientName = 'Generic';
          else clientName = 'Unknown';
        }

        notifs.push({
          id: `blocked-${d.id}`,
          type: 'blocked',
          severity: 'warning',
          title: 'Deployment Blocked',
          message: `${product?.name || 'Unknown'} for ${clientName}`,
          deploymentId: d.id,
          productId: d.productId,
          timestamp: now.toISOString()
        });
      }
    });

    // Sort by severity (critical first) then by daysLeft (most urgent first)
    return notifs.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const aSeverity = severityOrder[a.severity] ?? 3;
      const bSeverity = severityOrder[b.severity] ?? 3;
      if (aSeverity !== bSeverity) return aSeverity - bSeverity;
      return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
    });
  }, [deployments, products, clients]);

  // Filter out dismissed notifications
  const activeNotifications = useMemo(() =>
    notifications.filter(n => !dismissedIds.includes(n.id)),
    [notifications, dismissedIds]
  );

  const dismissNotification = useCallback((id) => {
    setDismissedIds(prev => [...prev, id]);
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds(notifications.map(n => n.id));
  }, [notifications]);

  const clearDismissed = useCallback(() => {
    setDismissedIds([]);
  }, []);

  // Count by severity
  const counts = useMemo(() => ({
    total: activeNotifications.length,
    critical: activeNotifications.filter(n => n.severity === 'critical').length,
    warning: activeNotifications.filter(n => n.severity === 'warning').length,
    info: activeNotifications.filter(n => n.severity === 'info').length,
  }), [activeNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications: activeNotifications,
      allNotifications: notifications,
      counts,
      dismissNotification,
      dismissAll,
      clearDismissed
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
