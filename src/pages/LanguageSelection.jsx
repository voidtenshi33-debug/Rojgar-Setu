import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const LanguageSelection = () => {
  const { selectLanguage } = useContext(AppContext);
  const navigate = useNavigate();

  const handleSelect = (lang) => {
    selectLanguage(lang);
    navigate('/login');
  };

  return (
    <div className="screen-padding" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="text-center mb-6">
        <h2>Choose Your Language</h2>
        <p>अपनी भाषा चुनें / तुमची भाषा निवडा</p>
      </div>

      <div className="card" style={{ cursor: 'pointer', textAlign: 'center', marginBottom: '1rem', border: '2px solid var(--primary)' }} onClick={() => handleSelect('en')}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>English</h3>
      </div>
      
      <div className="card" style={{ cursor: 'pointer', textAlign: 'center', marginBottom: '1rem', border: '2px solid var(--primary)' }} onClick={() => handleSelect('hi')}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>हिंदी (Hindi)</h3>
      </div>

      <div className="card" style={{ cursor: 'pointer', textAlign: 'center', marginBottom: '1rem', border: '2px solid var(--primary)' }} onClick={() => handleSelect('mr')}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>मराठी (Marathi)</h3>
      </div>
    </div>
  );
};

export default LanguageSelection;
