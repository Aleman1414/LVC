import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Matches from './pages/Matches';
import Standings from './pages/Standings';
import MatchScorer from './pages/MatchScorer';
import Sanctions from './pages/Sanctions';
import Meetings from './pages/Meetings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Placeholder (to be implemented)
const Stats = () => <div className="card"><h1>Estadísticas</h1></div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="teams" element={<Teams />} />
            <Route path="players" element={<Players />} />
            <Route path="matches" element={<Matches />} />
            <Route path="standings" element={<Standings />} />
            <Route path="scorer/:id" element={<MatchScorer />} />
            <Route path="sanctions" element={<Sanctions />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="stats" element={<Stats />} />

            <Route
              path="admin"
              element={
                <PrivateRoute roles={['admin']}>
                  <div className="card"><h1>Panel Admin</h1></div>
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
