import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const [searchParams] = useSearchParams();
  const isDoctor = searchParams.get('role') === 'doctor';

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: isDoctor ? 'doctor' : 'patient',
    doctor_credentials: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register(form);
      navigate(user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-blue-700">ClinicalCoPilot</Link>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Create your account</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg" role="alert">{error}</div>
          )}

          {/* Role toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'patient' })}
              className={`flex-1 py-2 text-sm font-medium transition ${form.role === 'patient' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: 'doctor' })}
              className={`flex-1 py-2 text-sm font-medium transition ${form.role === 'doctor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Doctor
            </button>
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input id="full_name" type="text" required value={form.full_name} onChange={update('full_name')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" type="email" required value={form.email} onChange={update('email')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password (min 8 characters)</label>
            <input id="password" type="password" required minLength={8} value={form.password} onChange={update('password')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          {form.role === 'doctor' && (
            <div>
              <label htmlFor="credentials" className="block text-sm font-medium text-gray-700 mb-1">Medical Credentials / License</label>
              <input id="credentials" type="text" required value={form.doctor_credentials} onChange={update('doctor_credentials')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., MD, License #12345" />
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
