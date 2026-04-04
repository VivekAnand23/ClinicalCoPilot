import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-blue-700">ClinicalCoPilot</h1>
        <div className="flex gap-3">
          {user ? (
            <Link
              to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition">
                Log in
              </Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          AI-Powered Blood Work Analysis
        </h2>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          Upload your blood work report and get instant AI-driven insights into chronic disease risks.
          Track trends over time and share results with your doctor.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-blue-700 transition"
          >
            Start Free Analysis
          </Link>
          <Link
            to="/register?role=doctor"
            className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg text-base font-medium hover:bg-blue-50 transition"
          >
            I'm a Doctor
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid sm:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="font-semibold text-gray-900">Upload Reports</h3>
            <p className="text-sm text-gray-500 mt-2">Upload PDF or image files of your blood work. We extract all lab values automatically.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="font-semibold text-gray-900">AI Risk Detection</h3>
            <p className="text-sm text-gray-500 mt-2">Claude AI analyzes your values against clinical reference ranges and flags chronic disease risks.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="font-semibold text-gray-900">Share with Doctors</h3>
            <p className="text-sm text-gray-500 mt-2">Share your results directly with your physician. They can add notes and review your trends.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
