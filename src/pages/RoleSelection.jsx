import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { HardHat, Briefcase } from 'lucide-react';

const RoleSelection = () => {
  const { updateProfile, t } = useContext(AppContext);
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    updateProfile({ role });
    navigate(`/${role}-profile`);
  };

  return (
    <div className="screen-padding flex flex-col justify-center" style={{ minHeight: '100vh' }}>
      <div className="text-center mb-6">
        <h2>{t('chooseRole')}</h2>
      </div>

      <div 
        className="role-card card mb-4 text-center"
        style={{ cursor: 'pointer', border: '2px solid var(--primary)' }}
        onClick={() => handleSelectRole('labourer')}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
          <HardHat size={64} />
        </div>
        <h3 style={{ color: 'var(--primary)' }}>{t('roleLabourer')}</h3>
        <p className="mt-2 text-muted" style={{ margin: 0 }}>{t('roleLabourerDesc')}</p>
      </div>

      <div 
        className="role-card card text-center"
        style={{ cursor: 'pointer', border: '2px solid var(--secondary)' }}
        onClick={() => handleSelectRole('contractor')}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--secondary)' }}>
          <Briefcase size={64} />
        </div>
        <h3 style={{ color: 'var(--secondary)' }}>{t('roleContractor')}</h3>
        <p className="mt-2 text-muted" style={{ margin: 0 }}>{t('roleContractorDesc')}</p>
      </div>
    </div>
  );
};

export default RoleSelection;
