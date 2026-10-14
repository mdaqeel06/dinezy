import React, { useState } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { LocationPickerModal } from './LocationPickerModal';
import { Lock, Mail, MapPin, Map } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onLoginSuccess,
  showToast,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locationAddress, setLocationAddress] = useState('Anna Nagar, Chennai, Tamil Nadu');
  const [locationLat, setLocationLat] = useState<number | undefined>(13.085);
  const [locationLon, setLocationLon] = useState<number | undefined>(80.2101);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = await api.login(email, password);
      showToast(`Welcome back, ${auth.user.name}!`, 'success');
      onLoginSuccess(auth.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = await api.register(
        name,
        email,
        password,
        phone,
        locationAddress,
        locationLat,
        locationLon
      );
      showToast(`Account created successfully! Welcome to Dinezy, ${auth.user.name}.`, 'success');
      onLoginSuccess(auth.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{ padding: '28px 28px 28px 28px', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), #ff8a00)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 4px 12px var(--primary-glow)',
            }}
          >
            <Lock size={22} />
          </div>
          <h3 style={{ fontSize: '1.4rem' }}>
            {mode === 'signin' ? 'Sign in to Dinezy' : 'Create an Account'}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            {mode === 'signin'
              ? 'Enter your email address and password to sign in'
              : 'Register your account (default role: Customer)'}
          </p>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-page)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              marginTop: '16px',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${mode === 'signin' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              style={{ flex: 1, border: 'none' }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'signup' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              style={{ flex: 1, border: 'none' }}
            >
              Create Account
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 28px 28px 28px' }}>
          {error && (
            <div
              style={{
                background: 'var(--danger-light)',
                border: '1px solid #fecaca',
                color: 'var(--danger)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@dinezy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} /> Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', marginTop: '6px', padding: '12px' }}
              >
                {loading ? 'Authenticating...' : 'Sign In with JWT'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'var(--info-light)',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                ✨ Note: All new sign-ups are registered with the <strong>Customer</strong> role by default. A Super Admin can promote your account later.
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+1 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Map Location Picker Input */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                    <MapPin size={14} color="var(--primary)" /> Your Chennai Location *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'var(--primary-light)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #fed7aa',
                    }}
                  >
                    <Map size={12} /> Select on Map
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  className="form-input"
                  placeholder="Street, locality, area..."
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', marginTop: '6px', padding: '12px' }}
              >
                {loading ? 'Creating Account...' : 'Register as Customer'}
              </button>
            </form>
          )}


        </div>
      </div>

      {/* Map Location Picker */}
      <LocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelectLocation={(picked, lat, lon) => {
          setLocationAddress(picked);
          setLocationLat(lat);
          setLocationLon(lon);
        }}
        initialAddress={locationAddress}
        title="Select Your Location on Chennai Map"
      />
    </div>
  );
};
