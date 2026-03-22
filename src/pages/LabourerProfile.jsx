import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const LabourerProfile = () => {
  const { user, updateProfile, t } = useContext(AppContext);
  const navigate = useNavigate();
  
  const [scoreData, setScoreData] = useState({ score: 100 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.phone) {
      const users = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
      const dbUser = users[user.phone];
      if (dbUser) {
        let base = 50;
        let completed = dbUser.jobsCompleted || 0;
        let presents = dbUser.attendancePresent || 0;
        let absents = dbUser.attendanceAbsent || 0;
        let avgRating = dbUser.ratingsCount ? (dbUser.ratingsTotal / dbUser.ratingsCount) : 3;
        let score = base + (completed * 5) + (presents * 2) - (absents * 5) + ((avgRating - 3) * 10);
        setScoreData({ score: Math.max(0, Math.min(100, Math.round(score))) });
      }
    }
  }, [user]);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    skills: user?.skills || '',
    experience: user?.experience || '',
    wage: user?.wage || '',
    location: user?.location || '',
    hasRojgarCard: user?.hasRojgarCard || false,
    rojgarCardNumber: user?.rojgarCardNumber || '',
    rojgarCardImage: user?.rojgarCardImage || '',
    rojgarCardStatus: user?.rojgarCardStatus || ''
  });

  const handleChange = (e) => {
    setError(''); // clear error when typing
    if (e.target.name === 'rojgarCardNumber') {
      // numeric only logic
      const val = e.target.value.replace(/\D/g, '');
      setFormData({ ...formData, rojgarCardNumber: val.slice(0, 12) });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, rojgarCardImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalStatus = formData.rojgarCardStatus;
    
    if (formData.hasRojgarCard) {
      if (formData.rojgarCardNumber.length !== 12) {
        setError('Rojgar Card Number must be exactly 12 digits.');
        return;
      }
      
      // Basic format validation (no all identical digits, cannot start with 0)
      const allSame = /^(\d)\1{11}$/.test(formData.rojgarCardNumber);
      if (allSame || formData.rojgarCardNumber.startsWith('0')) {
        setError('Invalid Rojgar Card format sequence.');
        return;
      }
      
      if (!formData.rojgarCardImage) {
        setError('Please upload a photo of your Rojgar Card to verify.');
        return;
      }
      // If card changed or previously not verified, mark as govt_verified upon valid submission
      if (formData.rojgarCardNumber !== user?.rojgarCardNumber || !finalStatus || finalStatus !== 'govt_verified') {
        finalStatus = 'govt_verified';
      }
    } else {
      finalStatus = '';
    }
    
    updateProfile({ ...formData, rojgarCardStatus: finalStatus, available: user?.available !== undefined ? user.available : true });
    navigate('/labourer-dashboard');
  };

  return (
    <div className="app-container">
      <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t('completeProfile')}</h2>
        {user?.name && (
          <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold' }}>
            {t('score')}: {scoreData.score} ⭐
          </span>
        )}
      </div>
      
      <div className="screen-padding">
        <p>Please fill your details to get jobs.</p>
        
        <form onSubmit={handleSubmit} className="card">
          <div className="form-group">
            <label className="form-label">{t('fullName')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Ramesh Kumar"
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">{t('primarySkill')}</label>
            <select 
              className="form-select" 
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              required
            >
              <option value="">Select a skill</option>
              <option value="Mason (मिस्त्री)">Mason (मिस्त्री)</option>
              <option value="Helper (मज़दूर)">Helper (मज़दूर)</option>
              <option value="Plumber (प्लंबर)">Plumber (प्लंबर)</option>
              <option value="Electrician (बिजली मिस्त्री)">Electrician (बिजली मिस्त्री)</option>
              <option value="Painter (पेंटर)">Painter (पेंटर)</option>
              <option value="Carpenter (बढ़ई)">Carpenter (बढ़ई)</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">{t('experience')}</label>
            <input 
              type="number" 
              className="form-input" 
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="e.g. 5"
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">{t('expectedWage')}</label>
            <input 
              type="number" 
              className="form-input" 
              name="wage"
              value={formData.wage}
              onChange={handleChange}
              placeholder="e.g. 500"
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">{t('location')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Delhi"
              required 
            />
          </div>

          <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <div>
              <label className="form-label" style={{ marginBottom: 0 }}>{t('hasRojgarCard')}</label>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                name="hasRojgarCard"
                checked={formData.hasRojgarCard} 
                onChange={(e) => setFormData({...formData, hasRojgarCard: e.target.checked})} 
              />
              <span className="slider round"></span>
            </label>
          </div>
          
          {formData.hasRojgarCard && (
            <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#166534' }}>{t('cardNumber')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="rojgarCardNumber"
                  value={formData.rojgarCardNumber}
                  onChange={handleChange}
                  placeholder="e.g. 123456789012"
                  required={formData.hasRojgarCard} 
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label" style={{ color: '#166534' }}>{t('uploadPhoto')}</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="form-input" 
                  onChange={handleImageUpload}
                  style={{ backgroundColor: 'white' }}
                  required={formData.hasRojgarCard && !formData.rojgarCardImage} 
                />
                {formData.rojgarCardImage && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#166534', fontWeight: 'bold' }}>✓ Image uploaded successfully</p>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '0.75rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
              <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.875rem', fontWeight: '600' }}>Error: {error}</p>
            </div>
          )}
          
          <button type="submit" className="btn btn-primary mt-4">
            <Save size={20} /> {t('saveProfile')}
          </button>
        </form>
      </div>
      {/* If coming to edit profile, show bottom nav */}
      {user?.name && <BottomNav />}
    </div>
  );
};

export default LabourerProfile;
