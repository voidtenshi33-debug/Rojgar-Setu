import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { PlusCircle, Megaphone, ShieldCheck, XCircle, Trash2, Edit } from 'lucide-react';
import { createNotification } from '../utils/notifications';

const ContractorDashboard = () => {
  const { user, t, language, selectLanguage } = useContext(AppContext);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [ratingFormVisibility, setRatingFormVisibility] = useState(null); // stores jobId
  const [ratingValue, setRatingValue] = useState(5);
  const [viewCardImage, setViewCardImage] = useState(null);
  const [filterLocationNearby, setFilterLocationNearby] = useState(false);
  const [filterSkillMatch, setFilterSkillMatch] = useState(false);
  const [selectedWorkerForJob, setSelectedWorkerForJob] = useState(null);

  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineWorkerForm, setOfflineWorkerForm] = useState({ name: '', skills: '', wage: '', location: '', experience: '' });
  const [myOfflineWorkers, setMyOfflineWorkers] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);

  // Mock available labourers
  const [availableLabourers, setAvailableLabourers] = useState([]);

  // Utility to calculate score dynamically
  const getScore = (w) => {
    let base = 50;
    let completed = w.jobsCompleted || 0;
    let presents = w.attendancePresent || 0;
    let absents = w.attendanceAbsent || 0;
    let avgRating = w.ratingsCount ? (w.ratingsTotal / w.ratingsCount) : 3;

    let score = base + (completed * 5) + (presents * 2) - (absents * 5) + ((avgRating - 3) * 10);
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  useEffect(() => {
    const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
    // Only show jobs posted by this contractor
    setJobs(allJobs.filter(j => j.phone === user?.phone && j.status !== 'deleted'));

    // Get labourers
    const allUsers = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
    let labourers = Object.values(allUsers).filter(u => u.role === 'labourer' && u.available && !u.isOfflineWorker);

    // Offline Workers
    const customOffline = Object.values(allUsers).filter(u => u.isOfflineWorker && u.createdBy === user?.phone);
    setMyOfflineWorkers(customOffline);

    // Load Requests
    const reqs = JSON.parse(localStorage.getItem('rozgaar_job_requests_db')) || [];
    setJobRequests(reqs);

    // Compute match score and sort
    const activeJobs = allJobs.filter(j => j.phone === user?.phone && j.status !== 'completed');
    const neededSkills = activeJobs.map(j => (j.requiredSkills || '').toLowerCase());

    labourers.forEach(l => {
      // Deterministic distance calculation
      let hash = 0;
      if (l.phone) {
        for (let i = 0; i < l.phone.length; i++) {
          hash = l.phone.charCodeAt(i) + ((hash << 5) - hash);
        }
      }
      l.distance = Math.abs(hash) % 15 + 1;

      let match = getScore(l); // Base performance score (max ~100)
      
      // Skill Match: Bonus if labourer's skills match any needed skills of contractor's active jobs
      if (l.skills && neededSkills.some(skill => skill.includes(l.skills.toLowerCase()) || l.skills.toLowerCase().includes(skill))) {
        match += 60; // Huge boost for having the right skills
      }
      
      // Verified Status Bonus
      if (l.hasRojgarCard && l.rojgarCardStatus === 'govt_verified') {
        match += 30; // Verified workers get a priority boost
      }

      // Fairness logic (Days since last job)
      const myCompleted = allJobs.filter(j => j.status === 'completed' && j.assignedTo === l.phone && j.completedAt);
      if (myCompleted.length > 0) {
        // Find most recent completed job
        const lastJob = myCompleted.sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
        const daysSince = Math.floor((new Date() - new Date(lastJob.completedAt)) / (1000 * 60 * 60 * 24));
        // Up to 30 points for waiting 30 days
        match += Math.min(daysSince, 30);
      } else {
        // Never had a job tracked with completedAt, give them a max newbie boost
        match += 30;
      }
      
      // Penalty for currently busy workers
      const activeAssignments = allJobs.filter(j => j.status === 'assigned' && j.assignedTo === l.phone).length;
      match -= (activeAssignments * 50); // Pushes busy workers to the bottom
      
      l.matchScore = match;
    });

    // Sort descending by matchScore
    labourers.sort((a, b) => b.matchScore - a.matchScore);

    // Apply Filters
    if (filterLocationNearby) {
      labourers = labourers.filter(l => l.distance <= 5);
    }
    if (filterSkillMatch) {
      labourers = labourers.filter(l => 
        l.skills && neededSkills.some(skill => skill.includes(l.skills.toLowerCase()) || l.skills.toLowerCase().includes(skill))
      );
    }

    setAvailableLabourers(labourers);
  }, [user?.phone, showJobForm, filterLocationNearby, filterSkillMatch]);

  const [jobForm, setJobForm] = useState({
    count: '', requiredSkills: '', wage: '', location: '', duration: '', startDate: '', endDate: ''
  });
  const [editingJobId, setEditingJobId] = useState(null);

  const handleEditJob = (job) => {
    let sDate = '', eDate = '';
    if (job.duration && job.duration.includes(' to ')) {
       const parts = job.duration.split(' to ');
       sDate = parts[0];
       eDate = parts[1];
    }
    setJobForm({
      count: job.count || '',
      requiredSkills: job.requiredSkills || '',
      wage: job.wage || '',
      location: job.location || '',
      duration: job.duration || '',
      startDate: sDate,
      endDate: eDate
    });
    setEditingJobId(job.id);
    setShowJobForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostJob = (e) => {
    e.preventDefault();
    const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
    
    const finalDuration = (jobForm.startDate && jobForm.endDate) 
        ? `${jobForm.startDate} to ${jobForm.endDate}`
        : jobForm.duration;

    if (editingJobId) {
      // Update existing job
      const jobIndex = allJobs.findIndex(j => j.id === editingJobId);
      if (jobIndex > -1) {
        const oldJob = allJobs[jobIndex];
        allJobs[jobIndex] = { ...oldJob, ...jobForm, duration: finalDuration };
        localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
        
        // Notifications
        if (oldJob.status === 'assigned' && oldJob.assignedTo) {
          createNotification(oldJob.assignedTo, t('jobUpdated') || 'Job details have been updated', 'job');
        } else if (oldJob.status !== 'completed' && oldJob.status !== 'deleted' && oldJob.status !== 'assigned') {
          const allRequests = JSON.parse(localStorage.getItem('rozgaar_job_requests_db')) || [];
          const interestedWorkers = allRequests.filter(r => r.jobId === editingJobId && r.status === 'pending').map(r => r.workerId);
          interestedWorkers.forEach(wId => {
            createNotification(wId, t('jobUpdated') || 'Job details have been updated', 'job');
          });
        }
      }
      setEditingJobId(null);
      setJobs(allJobs.filter(j => j.phone === user.phone && j.status !== 'deleted'));
    } else {
      // Create new job
      const newJob = {
        ...jobForm,
        duration: finalDuration,
        id: Date.now(),
        phone: user.phone,
        postedBy: user.name || user.company || 'Contractor',
        lastAttendanceDate: null
      };
      allJobs.unshift(newJob);
      localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
      
      // Find matching workers & notify
      const allUsers = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
      const onlineLabourers = Object.values(allUsers).filter(u => u.role === 'labourer' && u.available && !u.isOfflineWorker);
      const neededSkill = (jobForm.requiredSkills || '').toLowerCase();
      
      onlineLabourers.forEach(l => {
        const skillMatches = l.skills && (neededSkill.includes(l.skills.toLowerCase()) || l.skills.toLowerCase().includes(neededSkill));
        if (skillMatches) {
          createNotification(l.phone, t('newJobNearYou') || 'New job available near your location.', 'job');
        }
      });
      setJobs(allJobs.filter(j => j.phone === user.phone && j.status !== 'deleted'));
    }
    
    setJobForm({ count: '', requiredSkills: '', wage: '', location: '', duration: '', startDate: '', endDate: '' });
    setShowJobForm(false);
  };

  const handleCreateOfflineWorker = (e) => {
    e.preventDefault();
    const offlineId = `offline_${Date.now()}`;
    const newWorker = {
      ...offlineWorkerForm,
      phone: offlineId,
      role: 'labourer',
      available: false, // hidden from public boards
      isOfflineWorker: true,
      createdBy: user.phone,
      jobsCompleted: 0,
      attendancePresent: 0,
      attendanceAbsent: 0
    };
    const allUsers = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
    allUsers[offlineId] = newWorker;
    localStorage.setItem('rozgaar_users_db', JSON.stringify(allUsers));
    
    setOfflineWorkerForm({ name: '', skills: '', wage: '', location: '', experience: '' });
    setShowOfflineForm(false);
    setMyOfflineWorkers([...myOfflineWorkers, newWorker]);
  };

  const handleAssignOfflineWorker = (jobId, worker) => {
    const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
    const jobIndex = allJobs.findIndex(j => j.id === jobId);
    if (jobIndex > -1) {
      const workers = allJobs[jobIndex].assignedWorkers || [];
      if (!workers.some(w => w.phone === worker.phone)) {
        workers.push({ phone: worker.phone, name: worker.name });
      }
      allJobs[jobIndex].assignedWorkers = workers;
      
      const requiredCount = parseInt(allJobs[jobIndex].count) || 1;
      if (workers.length >= requiredCount) {
        allJobs[jobIndex].status = 'assigned';
      }
      // legacy fallback
      allJobs[jobIndex].assignedTo = worker.phone;
      allJobs[jobIndex].assignedToName = worker.name;
      localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
      setJobs(allJobs.filter(j => j.phone === user.phone));
    }
  };

  const handleRequestWorker = (jobId, worker) => {
    const requests = JSON.parse(localStorage.getItem('rozgaar_job_requests_db')) || [];
    
    const exists = requests.some(r => r.jobId === jobId && r.workerId === worker.phone);
    if (exists) {
      alert(t('requestAlreadySent') || 'Request already sent to this worker.');
      return;
    }

    const newRequest = {
      id: Date.now(),
      jobId: jobId,
      workerId: worker.phone,
      contractorId: user.phone,
      contractorName: user.name || user.company || 'Contractor',
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    const updatedRequests = [...requests, newRequest];
    localStorage.setItem('rozgaar_job_requests_db', JSON.stringify(updatedRequests));
    setJobRequests(updatedRequests);
    
    // Notify worker
    createNotification(worker.phone, t('selectedForJob') || 'You have been selected for a job.', 'request');
    
    alert(t('requestSent') || 'Job request sent successfully!');
  };

  const handleMarkAttendance = (jobId, workerPhone, isPresent) => {
    const today = new Date().toLocaleDateString();
    
    // Update Job DB to prevent multiple markings in a single day
    const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
    const jobIndex = allJobs.findIndex(j => j.id === jobId);
    
    if (jobIndex > -1) {
      allJobs[jobIndex].attendanceMarks = allJobs[jobIndex].attendanceMarks || {};
      if (allJobs[jobIndex].attendanceMarks[workerPhone] === today) {
        alert("Attendance already marked for today!");
        return;
      }
      
      allJobs[jobIndex].attendanceMarks[workerPhone] = today;
      // legacy
      allJobs[jobIndex].lastAttendanceDate = today;
      localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
      setJobs(allJobs.filter(j => j.phone === user.phone));
    }

    // Update User DB (Score)
    const allUsers = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
    if (allUsers[workerPhone]) {
      const w = allUsers[workerPhone];
      w.attendancePresent = (w.attendancePresent || 0) + (isPresent ? 1 : 0);
      w.attendanceAbsent = (w.attendanceAbsent || 0) + (!isPresent ? 1 : 0);
      
      // Keep legacy for safety but recalculate elsewhere
      const currentScore = w.attendanceScore || 100;
      w.attendanceScore = currentScore + (isPresent ? 5 : -5);
      
      allUsers[workerPhone] = w;
      localStorage.setItem('rozgaar_users_db', JSON.stringify(allUsers));
      // Re-fetch labourers
      const labourers = Object.values(allUsers).filter(u => u.role === 'labourer' && u.available);
      setAvailableLabourers(labourers);
      
      // Notify worker
      createNotification(workerPhone, isPresent ? (t('markedPresent') || 'You were marked present') : (t('markedAbsent') || 'You were marked absent'), 'attendance');
    }
  };

  const handleCompleteJob = (jobId) => {
    const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
    const jobIndex = allJobs.findIndex(j => j.id === jobId);
    
    if (jobIndex > -1) {
      const workers = allJobs[jobIndex].assignedWorkers || [];
      if (workers.length === 0 && allJobs[jobIndex].assignedTo) {
          workers.push({ phone: allJobs[jobIndex].assignedTo, name: allJobs[jobIndex].assignedToName });
      }

      allJobs[jobIndex].status = 'completed';
      allJobs[jobIndex].rating = ratingValue;
      allJobs[jobIndex].completedAt = new Date().toISOString();
      localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
      setJobs(allJobs.filter(j => j.phone === user.phone && j.status !== 'deleted'));

      // Update User Stats
      const allUsers = JSON.parse(localStorage.getItem('rozgaar_users_db')) || {};
      workers.forEach(worker => {
        if (allUsers[worker.phone]) {
          const w = allUsers[worker.phone];
          w.jobsCompleted = (w.jobsCompleted || 0) + 1;
          w.ratingsTotal = (w.ratingsTotal || 0) + parseInt(ratingValue);
          w.ratingsCount = (w.ratingsCount || 0) + 1;
          allUsers[worker.phone] = w;
          createNotification(worker.phone, `${user.name || user.company || 'Your contractor'} completed the job and rated you ${ratingValue} ⭐.`, 'job');
        }
      });
      localStorage.setItem('rozgaar_users_db', JSON.stringify(allUsers));
      
      const labourers = Object.values(allUsers).filter(u => u.role === 'labourer' && u.available);
      setAvailableLabourers(labourers);
    }

    setRatingFormVisibility(null);
    setRatingValue(5);
  };

  const handleDeleteJob = (jobId) => {
    if (window.confirm(t('confirmDeleteJob') || "Are you sure you want to delete this job?")) {
      // 1. Soft Delete job
      const allJobs = JSON.parse(localStorage.getItem('rozgaar_jobs_db')) || [];
      const jobIndex = allJobs.findIndex(j => j.id === jobId);
      if (jobIndex > -1) {
        const deletedJob = allJobs[jobIndex];
        
        // Ensure to notify assigned worker before unassigning
        if (deletedJob.status === 'assigned' && deletedJob.assignedTo) {
           createNotification(deletedJob.assignedTo, t('jobCancelledByContractor') || 'Job has been cancelled by contractor', 'job');
           // Remove assignment references
           deletedJob.assignedTo = null;
           deletedJob.assignedToName = null;
        }

        deletedJob.status = 'deleted';
        localStorage.setItem('rozgaar_jobs_db', JSON.stringify(allJobs));
        setJobs(allJobs.filter(j => j.phone === user.phone && j.status !== 'deleted'));
      }
      
      // 2. Clear related requests (cancels them implicitly by removal)
      const requests = JSON.parse(localStorage.getItem('rozgaar_job_requests_db')) || [];
      const updatedRequests = requests.filter(r => r.jobId !== jobId);
      localStorage.setItem('rozgaar_job_requests_db', JSON.stringify(updatedRequests));
      setJobRequests(updatedRequests);
    }
  };

  return (
    <div className="app-container">
      <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{user?.company || user?.name || 'Contractor'}</h2>
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
        
        {showJobForm ? (
          <form className="card" onSubmit={handlePostJob}>
            <h3>{editingJobId ? (t('editJob') || 'Edit Job') : t('postNewJobBtn')}</h3>
            <div className="form-group">
              <label className="form-label">{t('workersNeededLabel')}</label>
              <input type="number" className="form-input" placeholder={t('placeholderWorkers')} required
                value={jobForm.count} onChange={e => setJobForm({...jobForm, count: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('requiredSkills')}</label>
              <input type="text" className="form-input" placeholder={t('placeholderSkill') || "e.g. Masonry, Plastering"} required
                value={jobForm.requiredSkills} onChange={e => setJobForm({...jobForm, requiredSkills: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('wageOffered')}</label>
              <input type="number" className="form-input" placeholder={t('placeholderWage') || "e.g. 600"} required
                value={jobForm.wage} onChange={e => setJobForm({...jobForm, wage: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('location')}</label>
              <input type="text" className="form-input" placeholder="e.g. Metro Pillar 52, Noida" required
                value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('duration')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="date" className="form-input" required title="Start Date"
                  value={jobForm.startDate} onChange={e => setJobForm({...jobForm, startDate: e.target.value})} />
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>-</span>
                <input type="date" className="form-input" required title="End Date"
                  value={jobForm.endDate} onChange={e => setJobForm({...jobForm, endDate: e.target.value})} />
              </div>
            </div>
            <button className="btn btn-secondary mt-2 text-center w-full" type="submit">
              {editingJobId ? (t('updateJob') || 'Update Job') : t('publishJob')}
            </button>
            <button className="btn btn-outline mt-2 text-center w-full" type="button" onClick={() => { setShowJobForm(false); setEditingJobId(null); setJobForm({ count: '', requiredSkills: '', wage: '', location: '', duration: '', startDate: '', endDate: '' }); }}>{t('cancel')}</button>
          </form>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary w-full" onClick={() => setShowJobForm(true)}>
              <PlusCircle size={20} /> {t('postJob')}
            </button>
            <button className="btn btn-outline w-full" onClick={() => setShowOfflineForm(true)}>
              + {t('addOffline')}
            </button>
          </div>
        )}

        {showOfflineForm && (
          <form className="card mb-6" onSubmit={handleCreateOfflineWorker} style={{ border: '2px dashed var(--primary)' }}>
            <h3 style={{ color: 'var(--primary)' }}>{t('addOffline')}</h3>
            <div className="form-group">
              <label className="form-label">{t('workerName')}</label>
              <input type="text" className="form-input" required value={offlineWorkerForm.name} onChange={e => setOfflineWorkerForm({...offlineWorkerForm, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('primarySkill')}</label>
              <input type="text" className="form-input" placeholder={t('placeholderSkill') || "e.g. Helper"} required value={offlineWorkerForm.skills} onChange={e => setOfflineWorkerForm({...offlineWorkerForm, skills: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('expectedWage')}</label>
              <input type="number" className="form-input" placeholder={t('placeholderWage') || "e.g. 500"} required value={offlineWorkerForm.wage} onChange={e => setOfflineWorkerForm({...offlineWorkerForm, wage: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('location')}</label>
              <input type="text" className="form-input" required value={offlineWorkerForm.location} onChange={e => setOfflineWorkerForm({...offlineWorkerForm, location: e.target.value})} />
            </div>
            <button className="btn btn-primary w-full mt-2" type="submit">{t('saveOffline')}</button>
            <button className="btn btn-outline w-full mt-2" type="button" onClick={() => setShowOfflineForm(false)}>{t('cancel')}</button>
          </form>
        )}

        <div className="mb-6">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Megaphone size={18} /> {t('postedJobs')}</h3>
          {jobs.length > 0 ? jobs.map(j => (
            <div className="card" key={j.id} style={{ borderLeft: j.status === 'assigned' ? '4px solid var(--success)' : '4px solid var(--secondary)'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4>{j.count ? t('jobTitle', { count: j.count, skills: j.requiredSkills }) : j.title || t('jobTitle', { count: 1, skills: j.requiredSkills || 'worker' })}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {j.status === 'assigned' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontWeight: '600' }}>
                      {t('assigned')}
                    </span>
                  )}
                  {j.status === 'completed' && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontWeight: '600' }}>
                      {t('completed')}
                    </span>
                  )}
                  <button onClick={() => handleEditJob(j)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('editJob') || 'Edit Job'}>
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDeleteJob(j.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('deleteJob') || 'Delete Job'}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>{t('location')}: {j.location} | {t('wage')}: ₹{j.wage}</p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>{t('duration')}: {j.duration} | {t('skills')}: {j.requiredSkills}</p>
              
              {jobRequests.filter(r => r.jobId === j.id && r.status === 'pending').map(req => (
                <div key={req.id} style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', backgroundColor: '#fffbeb', borderRadius: '0.375rem', border: '1px solid #fde68a', fontSize: '0.85rem', color: '#b45309' }}>
                   ⏳ {t('pendingRequestSentTo') || 'Pending request sent to worker'} {req.workerId}
                </div>
              ))}

              {jobRequests.filter(r => r.jobId === j.id && r.status === 'rejected').map(req => (
                <div key={req.id} style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', backgroundColor: '#fef2f2', borderRadius: '0.375rem', border: '1px solid #fca5a5', fontSize: '0.85rem', color: '#dc2626' }}>
                   ❌ {t('rejectedByWorker') || 'Rejected by worker'} {req.workerId}
                </div>
              ))}
              
              {j.status !== 'assigned' && j.status !== 'completed' && !jobRequests.some(r => r.jobId === j.id && r.status === 'pending') && myOfflineWorkers.length > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>{t('assignOfflineWorker')}</label>
                  <select 
                    className="form-select" 
                    style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                    onChange={(e) => {
                      if (e.target.value) {
                         const worker = myOfflineWorkers.find(w => w.phone === e.target.value);
                         handleAssignOfflineWorker(j.id, worker);
                      }
                    }}
                    value=""
                  >
                    <option value="">{t('selectSubProfile')}</option>
                    {myOfflineWorkers.map(w => (
                      <option key={w.phone} value={w.phone}>{w.name} ({w.skills})</option>
                    ))}
                  </select>
                </div>
              )}
              
              {j.status === 'completed' && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                    {t('completedBy')} {(j.assignedWorkers || (j.assignedToName ? [{name: j.assignedToName}] : [])).map(w => w.name).join(', ')} | {t('ratingGiven')} {j.rating}⭐
                  </p>
                </div>
              )}
              
              {(j.status === 'assigned' || (j.status !== 'completed' && j.assignedWorkers && j.assignedWorkers.length > 0)) && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', border: '1px solid #bbf7d0' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534', fontWeight: '500', marginBottom: '0.5rem' }}>
                    {t('assignedWorker')} ({j.assignedWorkers?.length || (j.assignedTo ? 1 : 0)}/{j.count || 1})
                  </p>
                  
                  {(j.assignedWorkers || (j.assignedTo ? [{phone: j.assignedTo, name: j.assignedToName}] : [])).map(worker => {
                     const isMarked = (j.attendanceMarks && j.attendanceMarks[worker.phone] === new Date().toLocaleDateString()) || (!j.attendanceMarks && j.lastAttendanceDate === new Date().toLocaleDateString() && worker.phone === j.assignedTo);
                     
                     return (
                      <div key={worker.phone} style={{ borderBottom: '1px solid #bbf7d0', paddingBottom: '0.5rem', marginBottom: '0.5rem'}}>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>{worker.name} ({worker.phone})</p>
                          {isMarked ? (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>✓ {t('attendanceMarked')}</p>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <button 
                                className="btn" 
                                style={{ flex: 1, padding: '0.25rem', fontSize:'0.75rem', backgroundColor: 'var(--success)', color: 'white' }} 
                                onClick={() => handleMarkAttendance(j.id, worker.phone, true)}
                              >
                                {t('present')}
                              </button>
                              <button 
                                className="btn" 
                                style={{ flex: 1, padding: '0.25rem', fontSize:'0.75rem', backgroundColor: 'var(--danger)', color: 'white' }} 
                                onClick={() => handleMarkAttendance(j.id, worker.phone, false)}
                              >
                                {t('absent')}
                              </button>
                            </div>
                          )}
                      </div>
                     );
                  })}

                  {(j.status === 'assigned') && (
                    ratingFormVisibility === j.id ? (
                      <div style={{ marginTop: '1rem', borderTop: '1px solid #bbf7d0', paddingTop: '1rem' }}>
                        <label className="form-label" style={{ color: '#166534' }}>{t('rateWork')}</label>
                        <select className="form-select mb-2" value={ratingValue} onChange={e => setRatingValue(e.target.value)}>
                          <option value="5">5 - Excellent (बहुत अच्छा)</option>
                          <option value="4">4 - Good (अच्छा)</option>
                          <option value="3">3 - Average (ठीक है)</option>
                          <option value="2">2 - Poor (ख़राब)</option>
                          <option value="1">1 - Very Poor (बहुत ख़राब)</option>
                        </select>
                        <button 
                          className="btn btn-secondary w-full" 
                          onClick={() => handleCompleteJob(j.id)}
                        >
                          {t('submitComplete')}
                        </button>
                        <button 
                          className="btn btn-outline w-full mt-2" 
                          onClick={() => setRatingFormVisibility(null)}
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="btn" 
                        style={{ width: '100%', padding: '0.5rem', backgroundColor: '#3730a3', color: 'white', marginTop: '0.5rem' }}
                        onClick={() => setRatingFormVisibility(j.id)}
                      >
                        {t('markCompleted')}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )) : <p className="text-muted">{t('noPostedJobs')}</p>}
        </div>

        <div>
          <h3>{t('availableLabourers')}</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={filterLocationNearby} onChange={e => setFilterLocationNearby(e.target.checked)} />
              {t('locationNearby')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={filterSkillMatch} onChange={e => setFilterSkillMatch(e.target.checked)} />
              {t('skillMatch')}
            </label>
          </div>
          {availableLabourers.length > 0 ? availableLabourers.map((l, i) => (
            <div className="card" key={i} style={{ borderLeft: l.matchScore > 100 ? '4px solid var(--primary)' : '4px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {l.name}
                    {l.matchScore > 100 && (
                      <span style={{ fontSize: '0.65rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.4rem', borderRadius: '1rem', fontWeight: 'bold' }}>{t('topMatch')}</span>
                    )}
                  </h4>
                  {l.hasRojgarCard && l.rojgarCardStatus === 'govt_verified' && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', width: 'fit-content' }}>
                          <ShieldCheck size={12} /> {t('govtVerified')}
                        </span>
                        {l.rojgarCardImage && (
                          <button 
                            style={{ border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '1rem', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => setViewCardImage(l.rojgarCardImage)}
                          >
                            {t('viewCard')}
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {t('verifiedDoc')}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: getScore(l) >= 60 ? 'var(--success)' : 'var(--danger)' }}>
                    {t('score')}: {getScore(l)} ⭐
                  </span>
                  {l.jobsCompleted > 0 && (
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                       {l.jobsCompleted} Jobs • {(l.ratingsTotal / l.ratingsCount).toFixed(1)} Avg Rating
                     </span>
                  )}
                </div>
              </div>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', marginTop: '0.5rem' }}>{t('skills')}: {l.skills} | {t('experience')}: {l.experience}</p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>{t('expectedWage')}: ₹{l.wage} | {t('distance')}: {l.distance} {t('kmAway')} ({l.location})</p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}>{t('phoneNum')}: {l.phone}</p>
              {selectedWorkerForJob === l.phone ? (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>{t('assignToJob')}</label>
                  <select 
                    className="form-select mb-2" 
                    onChange={(e) => {
                      if (e.target.value) {
                         handleRequestWorker(parseInt(e.target.value), l);
                         setSelectedWorkerForJob(null);
                      }
                    }}
                    value=""
                  >
                    <option value="">{t('selectSubProfile')}</option>
                    {jobs.filter(j => j.status !== 'completed' && j.status !== 'assigned' && !jobRequests.some(r => r.jobId === j.id && r.status === 'pending')).map(j => (
                      <option key={j.id} value={j.id}>{j.count ? t('jobTitle', { count: j.count, skills: j.requiredSkills }) : j.title || j.requiredSkills}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline w-full" style={{ padding: '0.25rem', fontSize: '0.8rem' }} onClick={() => setSelectedWorkerForJob(null)}>{t('cancel')}</button>
                </div>
              ) : (
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem' }}
                  onClick={() => setSelectedWorkerForJob(l.phone)}
                >
                  {t('selectWorker')}
                </button>
              )}
            </div>
          )) : <p className="text-muted">{t('noLabourers')}</p>}
        </div>

        {myOfflineWorkers.length > 0 && (
          <div className="mt-6 mb-6">
            <h3>{t('myOfflineWorkers')}</h3>
            {myOfflineWorkers.map((w, index) => (
              <div className="card" key={index} style={{ borderLeft: '4px solid #64748b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>{w.name}</h4>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold' }}>{t('offlineProfile')}</span>
                </div>
                <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', marginTop: '0.5rem' }}>{t('skills')}: {w.skills} | {t('wage')}: ₹{w.wage}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('score')}: {getScore(w)} ⭐</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('jobsDone')}: {w.jobsCompleted || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal for viewing card */}
      {viewCardImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }} onClick={() => setViewCardImage(null)}>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{t('rojgarCardDocument')}</h3>
              <button style={{ padding: '0.2rem', backgroundColor: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer' }} onClick={() => setViewCardImage(null)}>
                <XCircle size={24} />
              </button>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <img src={viewCardImage} alt="Verification Doc" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '0.25rem' }} />
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ContractorDashboard;
