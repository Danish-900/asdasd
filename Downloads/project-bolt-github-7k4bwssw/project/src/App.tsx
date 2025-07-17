import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { ExamCreation } from './pages/ExamCreation';
import { OMRManagement } from './pages/OMRManagement';
import { ResultsReport } from './pages/ResultsReport';
import { Settings } from './pages/Settings';
import { ApiProvider } from './context/ApiContext';

function App() {
  return (
    <ApiProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/exam-creation" element={<ExamCreation />} />
              <Route path="/omr-management" element={<OMRManagement />} />
              <Route path="/results-report" element={<ResultsReport />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ApiProvider>
  );
}

export default App;