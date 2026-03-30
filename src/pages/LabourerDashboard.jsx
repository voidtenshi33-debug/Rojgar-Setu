import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { createNotification } from '../utils/notifications';

const LabourerDashboard = () => {
  const { user, updateProfile, t, language, selectLanguage } = useContext(AppContext);
  const [available, setAvailable] = useState(user?.available ?? true);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [scoreData, setScoreData] = useState({ score: 100, jobs: 0, avgRating: 'New' });

  useEffect(() => {
    // Sync local state with context if it changes
    if (user && user.available !== undefined) {
      setAvailable(user.available);
    }
    
    // Fetch latest score from DB
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
        
        setScoreData({
          score: Math.max(0, Math.min(100, Math.round(score))),
          jobs: completed,
          avgRating: dbUser.ratingsCount ? avgRating.toFixed(1) + " ⭐" : "New"
        });
      }
    }
  }, [user]);

  const loadJobs = () => {
    const jobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
    
    const available = jobs.filter(j => 
      j.status !== 'assigned' && j.status !== 'deleted' && j.status !== 'completed' &&
      !(j.rejectedBy || []).includes(user?.phone) && 
      !(j.assignedWorkers || []).some(w => w.phone === user?.phone)
    );
    
    const accepted = jobs.filter(j => 
      j.status !== 'deleted' && j.status !== 'completed' &&
      (j.assignedWorkers || []).some(w => w.phone === user?.phone)
    );

    const requests = JSON.parse(localStorage.getItem('rozgaar_job_requests_db')) || [];
    const myPendingRequests = requests.filter(r => r.workerId === user?.phone && r.status === 'pending');
    
    const requestsWithDetails = myPendingRequests.map(req => {
      const job = jobs.find(j => j.id === req.jobId) || {};
      return { ...req, jobDetails: job };
    });

    setAvailableJobs(available);
    setAcceptedJobs(accepted);
    setJobRequests(requestsWithDetails);
  };

  useEffect(() => {
    loadJobs();
  }, [user]);

  const handleToggle = () => {
    const newVal = !available;
    setAvailable(newVal);
    updateProfile({ available: newVal });
  };

  const handleJobAction = (jobId, action) => {
    const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
    const jobIndex = allJobs.findIndex(j => j.id === jobId);
    
    if (jobIndex > -1) {
      if (action === 'accept') {
        const workers = allJobs[jobIndex].assignedWorkers || [];
        if (!workers.some(w => w.phone === user.phone)) {
          workers.push({ phone: user.phone, name: user.name });
        }
        allJobs[jobIndex].assignedWorkers = workers;
        
        const requiredCount = parseInt(allJobs[jobIndex].count) || 1;
        if (workers.length >= requiredCount) {
          allJobs[jobIndex].status = 'assigned';
        }
        // Legacy fallback just in case
        allJobs[jobIndex].assignedTo = user.phone;
        allJobs[jobIndex].assignedToName = user.name;
      } else if (action === 'reject') {
        const rejectedBy = allJobs[jobIndex].rejectedBy || [];
        allJobs[jobIndex].rejectedBy = [...rejectedBy, user.phone];
      }
      
      localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
      
      // Update local state
      loadJobs();
    }
  };

  const handleRequestAction = (requestId, action, jobId) => {
    const requests = JSON.parse(localStorage.getItem('rozgaar_job_requests_db')) || [];
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex > -1) {
      const contractorId = requests[reqIndex].contractorId;
      requests[reqIndex].status = action === 'accept' ? 'accepted' : 'rejected';
      localStorage.setItem('rozgaar_job_requests_db', JSON.stringify(requests));
      
      const message = action === 'accept' 
        ? (t('workerAcceptedJob') || 'Worker has accepted your job.') 
        : (t('workerRejectedJob') || 'Worker has rejected your job.');
      createNotification(contractorId, message, 'request');
    }

    if (action === 'accept') {
      const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
      const jobIndex = allJobs.findIndex(j => j.id === jobId);
      if (jobIndex > -1) {
        const workers = allJobs[jobIndex].assignedWorkers || [];
        if (!workers.some(w => w.phone === user.phone)) {
          workers.push({ phone: user.phone, name: user.name });
        }
        allJobs[jobIndex].assignedWorkers = workers;
        
        const requiredCount = parseInt(allJobs[jobIndex].count) || 1;
        if (workers.length >= requiredCount) {
          allJobs[jobIndex].status = 'assigned';
        }
        // Legacy fallback
        allJobs[jobIndex].assignedTo = user.phone;
        allJobs[jobIndex].assignedToName = user.name;
        localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
      }
    }
    
    loadJobs();
  };

  return (
    <div className="app-container">
      <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Hi, {user?.name?.split(' ')[0]}!</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            {user?.hasRojgarCard && user?.rojgarCardStatus === 'govt_verified' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', height: 'fit-content', width: 'fit-content' }}>
                  <ShieldCheck size={14} /> {t('govtVerified')}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.2rem' }}>
                  {t('verifiedDoc')}
                </span>
              </div>
            )}
            <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold', height: 'fit-content' }}>
              {t('score')}: {scoreData.score} ⭐
            </span>
            <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
              {t('jobs')}: {scoreData.jobs}
            </span>
            <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
              {t('rating')}: {scoreData.avgRating}
            </span>
          </div>
        </div>
        <select 
          className="form-select" 
          style={{ width: 'auto', padding: '0.2rem 1rem 0.2rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}
          value={language}
          onChange={(e) => selectLanguage(e.target.value)}
        >
          <option value="en" style={{color: 'black'}}>English</option>
          <option value="hi" style={{color: 'black'}}>हिंदी</option>
        </select>
      </div>

      <div className="screen-padding">
        
        {/* Availability Toggle Card */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>{t('available')}</h3>
          </div>
          
          <label className="switch">
            <input 
              type="checkbox" 
              checked={available} 
              onChange={handleToggle} 
            />
            <span className="slider round"></span>
          </label>
        </div>

        {/* Status Indicator */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {available ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: '600' }}>
              <CheckCircle /> {t('statusAvailable')}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              <XCircle /> {t('statusUnavailable')}
            </div>
          )}
        </div>

        {/* Job Requests */}
        {jobRequests.length > 0 && (
          <div className="mb-6">
            <h3>{t('jobRequests')}</h3>
            {jobRequests.map((req) => (
              <div className="card" key={req.id} style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb' }}>
                <h4 style={{ color: '#b45309', marginBottom: '0.25rem' }}>
                  {req.jobDetails?.count ? t('jobTitle', { count: req.jobDetails.count, skills: req.jobDetails.requiredSkills }) : req.jobDetails?.title || t('jobTitle', { count: 1, skills: req.jobDetails?.requiredSkills || 'worker' })}
                </h4>
                <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{t('wage')}: ₹{req.jobDetails?.wage} {t('perDay')}</p>
                <p style={{ margin: '0.25rem 0' }}>{t('location')}: {req.jobDetails?.location}</p>
                <p style={{ margin: '0.25rem 0', fontWeight: 'bold' }}>{t('contractorLabel')} {req.contractorName} ({req.contractorId})</p>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.5rem', backgroundColor: '#b45309', borderColor: '#b45309' }}
                    onClick={() => handleRequestAction(req.id, 'accept', req.jobId)}
                  >
                    {t('accept')}
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, padding: '0.5rem', color: '#b45309', borderColor: '#b45309' }}
                    onClick={() => handleRequestAction(req.id, 'reject', req.jobId)}
                  >
                    {t('reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accepted Jobs */}
        {acceptedJobs.length > 0 && (
          <div className="mb-6">
            <h3>{t('acceptedJobs')}</h3>
            {acceptedJobs.map((job) => (
               <div className="card" key={job.id} style={{ borderLeft: '4px solid var(--success)'}}>
                 <h4 style={{ color: 'var(--success)' }}>{job.count ? t('jobTitle', { count: job.count, skills: job.requiredSkills }) : job.title || t('jobTitle', { count: 1, skills: job.requiredSkills || 'worker' })} ✓</h4>
                 <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{t('wage')}: ₹{job.wage} {t('perDay')}</p>
                 <p style={{ margin: '0.25rem 0' }}>{t('location')}: {job.location}</p>
                 <p style={{ margin: '0.25rem 0', fontWeight: 'bold' }}>{t('contractorLabel')} {job.postedBy} ({job.phone})</p>
               </div>
            ))}
          </div>
        )}

        {/* Recent Jobs */}
        <h3 className="mt-4">{t('newJobs')}</h3>
        {availableJobs.length > 0 ? (
           availableJobs.map((job) => (
             <div className="card" key={job.id}>
               <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{job.count ? t('jobTitle', { count: job.count, skills: job.requiredSkills }) : job.title || t('jobTitle', { count: 1, skills: job.requiredSkills || 'worker' })}</h3>
               <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{t('wage')}: ₹{job.wage} {t('perDay')}</p>
               <p style={{ margin: '0.25rem 0' }}>{t('location')}: {job.location}</p>
               <p style={{ margin: '0.25rem 0' }}>{t('contractorLabel')} {job.postedBy}</p>
               
               <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                 <button 
                   className="btn btn-secondary" 
                   style={{ flex: 1, padding: '0.75rem' }}
                   onClick={() => handleJobAction(job.id, 'accept')}
                 >
                   {t('accept')}
                 </button>
                 <button 
                   className="btn btn-outline" 
                   style={{ flex: 1, padding: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                   onClick={() => handleJobAction(job.id, 'reject')}
                 >
                   {t('reject')}
                 </button>
               </div>
             </div>
           ))
        ) : (
          <div className="card text-center" style={{ color: 'var(--text-muted)' }}>
            <p>{t('noNewJobs')}</p>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
};

export default LabourerDashboard;
