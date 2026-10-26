import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityRequest as api } from '../utils/communityService';
import { LoginPopup } from './VisitorLogin';
import CommunityIcon from './CommunityIcon';
import './Community.css';

export default function TitleCommunity(props) {
  return <TitlePanel key={props.type + ':' + props.id} {...props} />;
}
function TitlePanel({ type, id, title, posterPath }) {
  const [session, setSession] = useState(null), [lists, setLists] = useState([]);
  const [busy, setBusy] = useState(null), [checking, setChecking] = useState(true);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [loginAction, setLoginAction] = useState(null);
  const closeLogin = useCallback(() => setLoginAction(null), []);
  const query = 'type=' + type + '&id=' + id;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const value = await api('session', { signal: controller.signal });
        if (value.user) {
          const saved = await api('title?' + query, { signal: controller.signal });
          if (!controller.signal.aborted) setLists(saved.lists);
        }
        if (!controller.signal.aborted) setSession(value);
      } catch (e) { /* Browsing remains available; explicit actions provide login/retry. */ }
      finally { if (!controller.signal.aborted) setChecking(false); }
    }
    load(); return () => controller.abort();
  }, [query]);
  const write = (list, method, value) => api('library', { method, csrf: value.csrf, data: { type, id, list, title, poster_path: posterPath || null } });
  const toggle = async list => {
    if (!session?.user) { setLoginAction(list); return; }
    setBusy(list); setError(''); setNotice('');
    const saved = lists.includes(list), name = list === 'favorite' ? 'favorites' : 'watchlist';
    try {
      await write(list, saved ? 'DELETE' : 'PUT', session);
      setLists(previous => saved ? previous.filter(value => value !== list) : [...previous, list]);
      setNotice((saved ? 'Removed from your ' : 'Added to your ') + name + '.');
    } catch (e) {
      if (e.status === 401) { setSession(null); setLists([]); setLoginAction(list); }
      else setError('Could not update your ' + name + '. Please try again.');
    } finally { setBusy(null); }
  };
  const loggedIn = async value => {
    const action = loginAction; setSession(value); setLoginAction(null); setBusy(action); setError('');
    try {
      const saved = await api('title?' + query);
      let next = saved.lists;
      if (action && !next.includes(action)) {
        await write(action, 'PUT', value); next = [...next, action];
        setNotice('Added to your ' + (action === 'watchlist' ? 'watchlist.' : 'favorites.'));
      }
      setLists(next);
    } catch (e) { setError('You are signed in. Please try saving this title again.'); }
    finally { setBusy(null); }
  };
  return <section className="community title-collection" aria-label="Save to your library">
    <div className="collection-controls">
      {['favorite', 'watchlist'].map(list => {
        const selected = lists.includes(list), label = list === 'favorite' ? selected ? 'Favorited' : 'Add favorite' : selected ? 'In watchlist' : 'Add to watchlist';
        return <button key={list} type="button" className="collection-toggle" disabled={Boolean(busy) || checking} aria-pressed={selected} aria-busy={busy === list} aria-label={label} onClick={() => toggle(list)}>
          <CommunityIcon name={list === 'favorite' ? 'heart' : 'bookmark'} filled={selected} />
          <span>{busy === list ? 'Saving...' : label}</span>
          {selected && <CommunityIcon name="check" className="collection-check" width="15" height="15" />}
        </button>;
      })}
      {session?.user && <Link className="collection-profile-link" to="/profile">My profile <CommunityIcon name="arrow" width="16" height="16" /></Link>}
    </div>
    <div className="collection-feedback">{error ? <span role="alert">{error}</span> : <span role="status" aria-live="polite">{notice}</span>}</div>
    {loginAction && <LoginPopup onClose={closeLogin} onSuccess={loggedIn} />}
  </section>;
}
