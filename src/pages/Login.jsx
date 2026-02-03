import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TermsAndConditions from '../components/TermsAndConditions';
import logo from '../assets/—Pngtree—black quill feather pen with_5157648.png';
import '../styles/Auth.css';
import '../styles/Terms.css';

const PASSWORD_RULES = {
  minLength: { regex: /.{8,}/, label: 'At least 8 characters' },
  uppercase: { regex: /[A-Z]/, label: 'At least one uppercase letter' },
  lowercase: { regex: /[a-z]/, label: 'At least one lowercase letter' },
  number: { regex: /[0-9]/, label: 'At least one number' },
  special: { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, label: 'At least one special character' },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Validate password against all rules
  const getPasswordValidation = (pwd) => {
    return {
      minLength: PASSWORD_RULES.minLength.regex.test(pwd),
      uppercase: PASSWORD_RULES.uppercase.regex.test(pwd),
      lowercase: PASSWORD_RULES.lowercase.regex.test(pwd),
      number: PASSWORD_RULES.number.regex.test(pwd),
      special: PASSWORD_RULES.special.regex.test(pwd),
    };
  };

  const passwordValidation = getPasswordValidation(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password && confirmPassword === password;
  const isSignupValid = isPasswordValid && passwordsMatch && agreedToTerms && email && firstName && lastName;

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
        // Validate password before signup
        if (!isPasswordValid) {
          throw new Error('Password does not meet all requirements');
        }
        if (!passwordsMatch) {
          throw new Error('Passwords do not match');
        }

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
          setConfirmPassword('');
          setFirstName('');
          setLastName('');
          setAgreedToTerms(false);
          setShowPassword(false);
          setShowConfirmPassword(false);
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
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setAgreedToTerms(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
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

          {/* Password Field */}
          <div className="password-field">
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isLogin}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            
            {/* Password validation messages (signup only) */}
            {!isLogin && password && (
              <div className="password-validation">
                {Object.entries(PASSWORD_RULES).map(([key, rule]) => (
                  <div
                    key={key}
                    className={`validation-item ${passwordValidation[key] ? 'valid' : 'invalid'}`}
                  >
                    <span className="validation-icon">
                      {passwordValidation[key] ? '✓' : '○'}
                    </span>
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password Field (signup only) */}
          {!isLogin && (
            <div className="password-field">
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <div className="error-message">Passwords do not match</div>
              )}
              {confirmPassword && passwordsMatch && (
                <div className="success-message">Passwords match</div>
              )}
            </div>
          )}

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
            disabled={loading || (!isLogin && !isSignupValid)}
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
