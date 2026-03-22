import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const ContractorProfile = () => {
  const { user, updateProfile, t } = useContext(AppContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    company: user?.company || '',
    location: user?.location || ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(formData);
    navigate('/contractor-dashboard');
  };

  return (
    <div className="app-container">
      <div className="top-bar">
        <h2>{t('completeProfile')}</h2>
      </div>
      
      <div className="screen-padding">
        <p>Enter details to start posting jobs.</p>
        
        <form onSubmit={handleSubmit} className="card">
          <div className="form-group">
            <label className="form-label">{t('fullName')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Suresh Patel"
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">{t('companyName')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g. Patel Constructions"
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
              placeholder="e.g. Mumbai"
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-secondary mt-4">
            <Save size={20} /> {t('saveProfile')}
          </button>
        </form>
      </div>

      {user?.name && <BottomNav />}
    </div>
  );
};

export default ContractorProfile;
