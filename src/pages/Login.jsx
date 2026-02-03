import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TermsAndConditions from '../components/TermsAndConditions';
import logo from '../assets/—Pngtree—black quill feather pen with_5157648.png';
import '../styles/Auth.css';
import '../styles/Terms.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        // Signup errors that are not about email confirmation
        if (error && error.message && !error.message.includes('email')) {
          throw error;
        }
        // Account was created (ignore email confirmation warnings)
        if (data?.user) {
          // Store first and last name in user metadata
          await supabase.auth.updateUser({
            data: { first_name: firstName, last_name: lastName }
          });
          setSuccess('Account created successfully. Please log in.');
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
          setAgreedToTerms(false);
          setTimeout(() => setIsLogin(true), 2000);
        } else {
          throw error || new Error('Failed to create account');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setAgreedToTerms(false);
    setIsLogin(!isLogin);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logo} alt="afterThoughts" />
          <h1 className="app-name">afterThoughts</h1>
          <p className="app-tagline">For thoughts that return</p>
        </div>
        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </>
          )}

          {!isLogin && (
            <div className="terms-section">
              <TermsAndConditions />
              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                I agree to the Terms and Conditions
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && !agreedToTerms)}
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button
          type="button"
          className="toggle-btn"
          onClick={handleToggleMode}
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
