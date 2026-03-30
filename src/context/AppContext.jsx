import React, { createContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(localStorage.getItem('rozgaar_lang') || '');

  const selectLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('rozgaar_lang', lang);
    if (user) {
      updateProfile({ preferredLanguage: lang });
    }
  };

  const t = (key, params = {}) => {
    let str = translations['en'][key] || key;
    if (language && translations[language]?.[key]) {
      str = translations[language][key];
    }
    
    // Interpolate dynamic parameters
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        str = str.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      });
    }
    
    return str;
  };

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('rozgaar_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.preferredLanguage) {
        setLanguage(parsedUser.preferredLanguage);
        localStorage.setItem('rozgaar_lang', parsedUser.preferredLanguage);
      }
    }
  }, []);

  const login = (phone) => {
    // Check if user exists in local storage "db"
    const users = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
    let currentUser = users[phone];
    
    if (!currentUser) {
      // New user
      currentUser = { phone, role: null };
      users[phone] = currentUser;
      localStorage.setItem('rozgaar_users_db', JSON.stringify(users));
    } else if (currentUser.preferredLanguage) {
      // Load their preferred language
      setLanguage(currentUser.preferredLanguage);
      localStorage.setItem('rozgaar_lang', currentUser.preferredLanguage);
    }
    
    setUser(currentUser);
    localStorage.setItem('rozgaar_user', JSON.stringify(currentUser));
  };

  const updateProfile = (profileData) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...profileData };
    setUser(updatedUser);
    localStorage.setItem('rozgaar_user', JSON.stringify(updatedUser));
    
    // Update "db"
    const users = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
    users[user.phone] = updatedUser;
    localStorage.setItem('rozgaar_users_db', JSON.stringify(users));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rozgaar_user');
  };

  return (
    <AppContext.Provider value={{ user, language, selectLanguage, t, login, logout, updateProfile }}>
      {children}
    </AppContext.Provider>
  );
};
