import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Settings, Bell } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { getUnreadCount } from '../utils/notifications';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, t } = useContext(AppContext);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user?.phone) {
      // Simple notification audio file
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      
      let isInitialLoad = true;

      const updateCount = () => {
        const currentCount = getUnreadCount(user.phone);
        setUnread(prev => {
          if (!isInitialLoad && currentCount > prev && currentCount > 0) {
            audio.play().catch(e => console.log('Audio play blocked by browser:', e));
          }
          return currentCount;
        });
        isInitialLoad = false;
      };
      
      updateCount();
      
      window.addEventListener('notificationsUpdated', updateCount);
      const timer = setInterval(updateCount, 3000);
      
      return () => {
        window.removeEventListener('notificationsUpdated', updateCount);
        clearInterval(timer);
      };
    }
  }, [user]);

  const isLabourer = user?.role === 'labourer';
  const dashboardPath = isLabourer ? '/labourer-dashboard' : '/contractor-dashboard';
  const profilePath = isLabourer ? '/labourer-profile' : '/contractor-profile';
  
  return (
    <div className="bottom-nav">
      <div 
        className={`nav-item ${location.pathname === dashboardPath ? 'active' : ''}`}
        onClick={() => navigate(dashboardPath)}
        style={{ cursor: 'pointer' }}
      >
        <Home size={24} />
        <span>{t('dashboard')}</span>
      </div>

      <div 
        className={`nav-item ${location.pathname === '/notifications' ? 'active' : ''}`}
        onClick={() => navigate('/notifications')}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ position: 'relative' }}>
          <Bell size={24} />
          {unread > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, backgroundColor: 'var(--danger)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <span>{t('notifications') || 'Alerts'}</span>
      </div>

      <div 
        className={`nav-item ${location.pathname === profilePath ? 'active' : ''}`}
        onClick={() => navigate(profilePath)}
        style={{ cursor: 'pointer' }}
      >
        <User size={24} />
        <span>{t('profile')}</span>
      </div>
      <div 
        className="nav-item"
        onClick={() => {
          localStorage.removeItem('rozgaar_user');
          window.location.href = '/';
        }}
        style={{ cursor: 'pointer' }}
      >
        <Settings size={24} />
        <span>{t('logout')}</span>
      </div>
    </div>
  );
};

export default BottomNav;
