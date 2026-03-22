export const createNotification = (userId, message, type) => {
  const notifications = JSON.parse(localStorage.getItem('rozgaar_notifications_db')) || [];
  const newNotification = {
    id: Date.now(),
    userId,
    message,
    type, // 'job', 'request', 'attendance', 'system'
    read: false,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem('rozgaar_notifications_db', JSON.stringify([newNotification, ...notifications]));
  window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { userId } }));
};

export const getNotifications = (userId) => {
  const notifications = JSON.parse(localStorage.getItem('rozgaar_notifications_db')) || [];
  return notifications.filter(n => n.userId === userId);
};

export const getUnreadCount = (userId) => {
  return getNotifications(userId).filter(n => !n.read).length;
};

export const markAsRead = (notificationId) => {
  const notifications = JSON.parse(localStorage.getItem('rozgaar_notifications_db')) || [];
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index > -1) {
    notifications[index].read = true;
    localStorage.setItem('rozgaar_notifications_db', JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { userId: notifications[index].userId } }));
  }
};

export const markAllAsRead = (userId) => {
  const notifications = JSON.parse(localStorage.getItem('rozgaar_notifications_db')) || [];
  const updated = notifications.map(n => {
    if (n.userId === userId) {
      return { ...n, read: true };
    }
    return n;
  });
  localStorage.setItem('rozgaar_notifications_db', JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { userId } }));
};
