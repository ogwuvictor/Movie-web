import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { communityRequest as api } from '../utils/communityService';
import CommunityIcon from './CommunityIcon';
import './Community.css';

export function safeReturnTo(value) {
  return typeof value === 'string' && /^\/(?:moviedetails\/\d+|tv\/\d+|profile|account)$/.test(value) ? value : '/profile';
}
export function VisitorForm({ signup = false, onSuccess, initialSession }) {
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  const [session, setSession] = useState(initialSession || null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (initialSession) return;
    const controller = new AbortController(); setError('');
    api('session', { signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return;
      if (value.user) return successRef.current(value);
      setSession(value);
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [initialSession, attempt]);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const current = session || await api('session');
      const value = await api(signup ? 'register' : 'login', { method: 'POST', data, csrf: current.csrf });
      await onSuccess(value);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <form className="community-form" onSubmit={submit}>
    {error && <div className="community-notice community-notice-error" role="alert"><p>{error}</p>{!session && <button type="button" className="community-text-button" onClick={() => setAttempt(value => value + 1)}>Retry connection</button>}</div>}
    {signup && <label>Public username<input name="username" placeholder="Choose a username" required minLength={3} maxLength={32} autoComplete="username" pattern="[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}" /></label>}
    <label>Email<input name="email" type="email" placeholder="you@example.com" required maxLength={254} autoComplete={signup ? 'email' : 'username'} /></label>
    <div className="community-password-field"><label>Password<input name="password" type={showPassword ? 'text' : 'password'} placeholder={signup ? 'At least 12 characters' : 'Enter your password'} required minLength={signup ? 12 : undefined} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} /></label><button type="button" className="community-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
    {signup && <p className="community-form-help">Use a unique password of at least 12 characters. Email verification and password recovery are not available yet.</p>}
    <button className="community-button community-button-primary community-submit" disabled={busy || !session}>{busy ? 'Please wait...' : signup ? 'Create account' : 'Sign in'} {!busy && <CommunityIcon name="arrow" width="18" height="18" />}</button>
  </form>;
}
export function LoginPopup({ onClose, onSuccess }) {
  const dialog = useRef(null), overlay = useRef(null), location = useLocation();
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    const root = document.getElementById('root'), inert = root?.inert;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    const viewport = window.visualViewport;
    const fit = () => {
      if (!overlay.current || !dialog.current) return;
      const height = viewport?.height || window.innerHeight;
      overlay.current.style.top = (viewport?.offsetTop || 0) + 'px';
      overlay.current.style.height = height + 'px';
      overlay.current.style.bottom = 'auto';
      const padding = getComputedStyle(overlay.current);
      dialog.current.style.maxHeight = Math.max(0, height - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom)) + 'px';
    };
    fit();
    viewport?.addEventListener('resize', fit);
    viewport?.addEventListener('scroll', fit);
    window.addEventListener('resize', fit);
    dialog.current?.querySelector('input')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('a[href],input,button:not([disabled])')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; if (root) root.inert = inert; document.removeEventListener('keydown', keydown); viewport?.removeEventListener('resize', fit); viewport?.removeEventListener('scroll', fit); window.removeEventListener('resize', fit); previous?.focus(); };
  }, [onClose]);
  return createPortal(<div ref={overlay} className="visitor-login-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={dialog} className="community visitor-login-dialog" role="dialog" aria-modal="true" aria-labelledby="visitor-login-heading">
      <button type="button" className="visitor-login-close" aria-label="Close login" onClick={onClose}>&times;</button>
      <span className="auth-card-mark"><CommunityIcon name="film" /></span>
      <h2 id="visitor-login-heading">Sign in to CineHub</h2>
      <p className="auth-subtitle">Your next watch deserves a place. Save it to your personal library.</p>
      <VisitorForm onSuccess={onSuccess} />
      <p className="auth-switch">Don't have an account? <Link to={'/signup?returnTo=' + encodeURIComponent(location.pathname)} onClick={onClose}>Sign up</Link></p>
    </section>
  </div>, document.body);
}
export function Signup() {
  const location = useLocation(), navigate = useNavigate();
  const target = safeReturnTo(new URLSearchParams(location.search).get('returnTo'));
  return <AuthScreen signup onSuccess={() => navigate(target, { replace: true })} />;
}
export function AuthScreen({ signup = false, onSuccess, initialSession }) {
  return <main className="community auth-page"><div className="auth-layout">
    <section className="auth-intro" aria-label="Your CineHub account">
      <span className="community-eyebrow">YOUR OWN CORNER OF CINEHUB</span>
      <h2>Your movies.<br /><span>Your space.</span></h2>
      <p>Save what catches your eye. Come back when you're ready to watch.</p>
      <div className="auth-benefit"><span><CommunityIcon name="bookmark" width="23" height="23" /></span><div><h3>Never lose your next watch</h3><p>Keep movies and series together in your watchlist.</p></div></div>
      <div className="auth-benefit"><span><CommunityIcon name="heart" width="23" height="23" /></span><div><h3>A place for your favorites</h3><p>Build a collection of titles worth coming back to.</p></div></div>
    </section>
    <section className="auth-card" aria-labelledby="auth-heading"><span className="auth-card-mark"><CommunityIcon name="film" /></span>
      <span className="community-eyebrow">{signup ? 'JOIN CINEHUB' : 'YOUR CINEHUB ACCOUNT'}</span>
      <h1 id="auth-heading">{signup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="auth-subtitle">{signup ? 'A great watch starts with a list of your own.' : 'Sign in and pick up where you left off.'}</p>
      <VisitorForm signup={signup} initialSession={initialSession} onSuccess={onSuccess} />
      <p className="auth-switch">{signup ? <>Already have an account? <Link to="/profile">Sign in</Link></> : <>New to CineHub? <Link to="/signup">Sign up</Link></>}</p>
      <p className="auth-privacy"><CommunityIcon name="lock" width="13" height="13" /> Your email and saved lists stay private.</p>
    </section>
  </div></main>;
}
