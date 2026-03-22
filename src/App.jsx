import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './context/AppContext.jsx';

// Pages
import LanguageSelection from './pages/LanguageSelection.jsx';
import Login from './pages/Login.jsx';
import RoleSelection from './pages/RoleSelection.jsx';
import LabourerProfile from './pages/LabourerProfile.jsx';
import LabourerDashboard from './pages/LabourerDashboard.jsx';
import ContractorProfile from './pages/ContractorProfile.jsx';
import ContractorDashboard from './pages/ContractorDashboard.jsx';
import Notifications from './pages/Notifications.jsx';

const App = () => {
  const { user, language } = useContext(AppContext);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={!language ? <LanguageSelection /> : <Navigate to="/login" />} />
          <Route path="/login" element={!language ? <Navigate to="/" /> : (!user ? <Login /> : <Navigate to="/role-selection" />)} />
          
          <Route path="/role-selection" element={
            user ? (user.role ? <Navigate to={`/${user.role}-dashboard`} /> : <RoleSelection />) : <Navigate to="/login" />
          } />

          {/* Labourer Routes */}
          <Route path="/labourer-profile" element={user && user.role === 'labourer' ? <LabourerProfile /> : <Navigate to="/login" />} />
          <Route path="/labourer-dashboard" element={user && user.role === 'labourer' ? (user.name ? <LabourerDashboard /> : <Navigate to="/labourer-profile" />) : <Navigate to="/login" />} />

          {/* Contractor Routes */}
          <Route path="/contractor-profile" element={user && user.role === 'contractor' ? <ContractorProfile /> : <Navigate to="/login" />} />
          <Route path="/contractor-dashboard" element={user && user.role === 'contractor' ? (user.name ? <ContractorDashboard /> : <Navigate to="/contractor-profile" />) : <Navigate to="/login" />} />

          {/* Notifications */}
          <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" />} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
