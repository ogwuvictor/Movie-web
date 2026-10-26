import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityRequest as api } from '../utils/communityService';
import { AuthScreen } from './VisitorLogin';
import CommunityIcon from './CommunityIcon';
import './Community.css';

function LibraryCard({ item, busy, onRemove }) {
  const [failed, setFailed] = useState(false);
  const to = (item.media_type === 'movie' ? '/moviedetails/' : '/tv/') + item.tmdb_id;
  return <article className="profile-title-card">
    <Link to={to} aria-label={item.title} className="profile-card-link"><div className="profile-poster">
        {item.poster_path && !failed ? <img src={'https://image.tmdb.org/t/p/w342' + item.poster_path} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span className="profile-poster-fallback"><CommunityIcon name="film" width="36" height="36" /><span>No poster available</span></span>}
        <span className="profile-media-badge">{item.media_type === 'movie' ? 'Movie' : 'TV series'}</span>
    </div><span className="profile-title-name">{item.title}</span></Link>
    <button className="profile-remove" type="button" disabled={busy} aria-label={'Remove ' + item.title + ' from ' + item.list} title="Remove from this list" onClick={() => onRemove(item)}><CommunityIcon name="trash" width="17" height="17" /></button>
  </article>;
}
export default function Account() {
  const [session, setSession] = useState(null), [sessionError, setSessionError] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState(null), [loading, setLoading] = useState(false);
  const [list, setList] = useState('watchlist'), [type, setType] = useState(''), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const loadedQuery = useRef('');
  useEffect(() => {
    const controller = new AbortController();
    api('session', { signal: controller.signal }).then(setSession).catch(e => { if (e.name !== 'AbortError') setSessionError(e.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!session?.user) return;
    const controller = new AbortController(), query = 'library?list=' + list + '&page=' + page + (type ? '&type=' + type : '');
    if (loadedQuery.current !== query) setLibrary(previous => previous ? { ...previous, items: [], total: null } : null);
    setLoading(true); setError('');
    api(query, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      if (!result.items.length && page > 1) { setPage(page - 1); return; }
      loadedQuery.current = query; setLibrary(result);
    }).catch(e => {
      if (e.name === 'AbortError') return;
      if (e.status === 401) { setSession({ user: null }); setLibrary(null); }
      else setError('Your library could not be loaded. Please try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, list, type, page, revision]);
  const logout = async () => {
    setBusy(true); setError('');
    try { await api('logout', { method: 'POST', csrf: session.csrf }); setLibrary(null); setSession(await api('session')); }
    catch (e) { setError('Could not sign out. Please try again.'); } finally { setBusy(false); }
  };
  const remove = async item => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api('library', { method: 'DELETE', csrf: session.csrf, data: { type: item.media_type, id: item.tmdb_id, list: item.list } });
      setLibrary(previous => ({ ...previous, items: previous.items.filter(value => !(value.tmdb_id === item.tmdb_id && value.media_type === item.media_type)), total: Math.max(0, previous.total - 1), counts: { ...previous.counts, [item.list]: Math.max(0, previous.counts[item.list] - 1) } }));
      setNotice('Removed ' + item.title + ' from your ' + (item.list === 'favorite' ? 'favorites.' : 'watchlist.'));
      setRevision(value => value + 1);
    } catch (e) { setError('Could not remove this title. Please try again.'); } finally { setBusy(false); }
  };
  const chooseList = value => { setList(value); setPage(1); setNotice(''); };
  if (!session && !sessionError) return <main className="community profile-shell"><div className="profile-loading" role="status"><span className="community-spinner" /> Loading your profile...</div></main>;
  if (!session?.user) return <AuthScreen initialSession={session?.csrf ? session : undefined} onSuccess={value => { setSession(value); setPage(1); setSessionError(''); setError(''); }} />;
  const counts = library?.counts, selectedName = list === 'favorite' ? 'Favorites' : 'Watchlist';
  return <main className="community profile-shell">
    <header className="profile-heading"><div><span className="community-eyebrow">YOUR CINEHUB</span><h1>My profile</h1><p>Your next watch. Your all-time favorites. All in one place.</p></div><Link to="/" className="community-button community-button-secondary">Explore titles <CommunityIcon name="arrow" width="17" height="17" /></Link></header>
    <div className="profile-layout">
      <aside className="profile-identity" aria-label="Account details">
        <div className="profile-avatar" aria-hidden="true">{session.user.username.slice(0, 2).toUpperCase()}</div>
        <span className="profile-member-label">CineHub member</span>
        <h2>{session.user.username}</h2>
        <dl className="profile-details"><div><dt>Email address</dt><dd>{session.user.email}</dd></div></dl>
        <p className="profile-private"><CommunityIcon name="lock" width="14" height="14" /> Only visible to you</p>
        <div className="profile-counts"><div><strong>{counts?.watchlist ?? '—'}</strong><span>Watchlist</span></div><div><strong>{counts?.favorite ?? '—'}</strong><span>Favorites</span></div></div>
        <button className="community-button community-button-secondary profile-signout" disabled={busy} onClick={logout}><CommunityIcon name="logout" width="17" height="17" /> Sign out</button>
      </aside>
      <section className="profile-library" aria-label="Your saved library">
        <div className="profile-library-top"><div><h2>Your library</h2><p>Keep the titles you love close.</p></div><CommunityIcon name="bookmark" width="26" height="26" /></div>
        <div className="profile-library-toolbar">
          <div className="profile-tabs" role="tablist" aria-label="Saved collections">{['watchlist', 'favorite'].map(value => <button key={value} id={'tab-' + value} type="button" role="tab" aria-selected={list === value} aria-controls="profile-collection" tabIndex={list === value ? 0 : -1} onClick={() => chooseList(value)} onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'watchlist' : event.key === 'End' ? 'favorite' : value === 'watchlist' ? 'favorite' : 'watchlist'; chooseList(next); document.getElementById('tab-' + next)?.focus(); }
          }}><CommunityIcon name={value === 'favorite' ? 'heart' : 'bookmark'} width="17" height="17" /><span>{value === 'favorite' ? 'Favorites' : 'Watchlist'}</span><span className="profile-tab-count">{counts?.[value] ?? '—'}</span></button>)}</div>
          <label className="profile-type-filter"><span className="visually-hidden">Filter saved titles</span><select value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">All titles</option><option value="movie">Movies</option><option value="tv">TV series</option></select></label>
        </div>
        {error && <div className="community-notice community-notice-error" role="alert">{error} <button className="community-text-button" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
        <div className="profile-live-message" role="status" aria-live="polite">{notice}</div>
        <div id="profile-collection" role="tabpanel" aria-labelledby={'tab-' + list} aria-busy={loading}>
          {loading && !library?.items.length ? <div className="profile-loading" role="status"><span className="community-spinner" /> Loading your titles...</div> : !error && !library?.items.length ? <div className="profile-empty">
            <span className="profile-empty-icon"><CommunityIcon name={list === 'favorite' ? 'heart' : 'bookmark'} width="30" height="30" /></span>
            <h3>{type ? 'No ' + (type === 'movie' ? 'movies' : 'series') + ' here yet' : list === 'favorite' ? 'Make room for your favorites' : 'Your next watch starts here'}</h3>
            <p>{type ? 'Try another filter, or discover something new.' : 'Find a movie or series, then tap ' + (list === 'favorite' ? 'the heart' : 'the bookmark') + ' on its details page to save it here.'}</p>
            {type ? <button className="community-button community-button-primary" onClick={() => setType('')}>Show all titles</button> : <Link className="community-button community-button-primary" to="/">Discover movies <CommunityIcon name="arrow" width="17" height="17" /></Link>}
          </div> : <div className="profile-title-grid">{library?.items.map(item => <LibraryCard key={item.media_type + ':' + item.tmdb_id + ':' + list} item={item} busy={busy} onRemove={remove} />)}</div>}
          {library?.total > 50 && <nav className="profile-pagination" aria-label={selectedName + ' pages'}><button className="community-button community-button-secondary" disabled={busy || loading || page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(library.total / 50)}</span><button className="community-button community-button-secondary" disabled={busy || loading || !library.hasMore} onClick={() => setPage(page + 1)}>Next</button></nav>}
        </div>
      </section>
    </div>
  </main>;
}
