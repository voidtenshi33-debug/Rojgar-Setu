import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { getNotifications, markAsRead, markAllAsRead } from '../utils/notifications';
import { Bell, Briefcase, Calendar } from 'lucide-react';

const Notifications = () => {
  const { user, t } = useContext(AppContext);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = () => {
    if (user?.phone) {
      setNotifications(getNotifications(user.phone));
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkRead = (id) => {
    markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    if(user?.phone) {
      markAllAsRead(user.phone);
      loadNotifications();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'job': return <Briefcase size={20} color="#3730a3" />;
      case 'request': return <Bell size={20} color="#b45309" />;
      case 'attendance': return <Calendar size={20} color="#166534" />;
      default: return <Bell size={20} />;
    }
  };

  return (
    <div className="app-container">
      <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t('notifications') || 'Notifications'}</h2>
        {notifications.some(n => !n.read) && (
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'white', borderColor: 'white' }}
            onClick={handleMarkAllRead}
          >
            {t('markAllRead') || 'Mark all as read'}
          </button>
        )}
      </div>
      <div className="screen-padding">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div 
              key={n.id} 
              className="card" 
              onClick={() => handleMarkRead(n.id)}
              style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                alignItems: 'flex-start', 
                backgroundColor: n.read ? '#ffffff' : '#f8fafc',
                border: '1px solid',
                borderColor: n.read ? '#e2e8f0' : '#cbd5e1',
                boxShadow: n.read ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '0.75rem',
                padding: '1rem',
                borderRadius: '0.5rem'
              }}
            >
              <div style={{ padding: '0.5rem', backgroundColor: n.read ? '#f1f5f9' : '#e0e7ff', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getIcon(n.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: !n.read ? '600' : '400', color: n.read ? '#475569' : '#0f172a', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {n.message}
                </p>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(n.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '0.5rem', flexShrink: 0 }}></div>}
            </div>
          ))
        ) : (
          <div className="text-center" style={{ marginTop: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Bell size={32} opacity={0.3} />
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>{t('noNotifications') || 'No notifications yet.'}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Notifications;
