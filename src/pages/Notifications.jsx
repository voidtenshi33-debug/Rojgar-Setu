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
                gap: '1rem', 
                alignItems: 'center', 
                opacity: n.read ? 0.6 : 1,
                borderLeft: !n.read ? '4px solid var(--primary)' : '4px solid transparent',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '50%' }}>
                {getIcon(n.type)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: !n.read ? 'bold' : 'normal', color: 'var(--text-main)' }}>
                  {n.message}
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(n.timestamp).toLocaleString()}
                </p>
              </div>
              {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>}
            </div>
          ))
        ) : (
          <div className="text-center" style={{ marginTop: '2rem', color: 'var(--text-muted)' }}>
            <Bell size={48} opacity={0.2} style={{ margin: '0 auto 1rem auto', display: 'block' }} />
            <p>{t('noNotifications') || 'No notifications yet.'}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Notifications;
