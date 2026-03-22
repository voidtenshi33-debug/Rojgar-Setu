import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Phone, CheckCircle } from 'lucide-react';

const Login = () => {
  const { login, t } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setStep(2);
    } else {
      alert("Please enter a valid 10-digit mobile number");
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp.length >= 4) {
      // Login with phone number
      login(phone);
    } else {
      alert("Please enter valid OTP (Any 4 digits for now)");
    }
  };

  return (
    <div className="screen-padding flex flex-col justify-center" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      <div className="text-center mb-6">
        <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', marginBottom: '0.25rem' }}>रोजगार Setu</h1>
        <p>{t('appDesc')}</p>
      </div>

      <div className="card">
        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <h2>{t('loginTitle')}</h2>
            <div className="form-group">
              <label className="form-label">{t('phoneNum')}</label>
              <div style={{ position: 'relative' }}>
                <Phone size={20} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder={t('enter10Digit')}
                  style={{ paddingLeft: '2.5rem' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-4 w-full">
              {t('sendOtp')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <h2>{t('verifyOtp')}</h2>
            <p>{t('otpSentTo')} {phone}</p>
            <div className="form-group">
              <label className="form-label">{t('enterOtp')}</label>
              <input 
                type="text" 
                className="form-input text-center" 
                placeholder="____" 
                style={{ fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>{t('hintOtp')}</small>
            </div>
            <button type="submit" className="btn btn-primary mt-4 w-full">
              <CheckCircle size={20} style={{ display: 'inline', marginRight: '0.5rem' }} /> {t('verifyLoginBtn')}
            </button>
            <button 
              type="button" 
              className="btn btn-outline mt-4 w-full" 
              onClick={() => setStep(1)}
            >
              {t('changePhone')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
