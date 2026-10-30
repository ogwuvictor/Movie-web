import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { communityRequest } from '../utils/communityService';

// Record visible navigation/interaction; the server separates accounts and guests.
// No background timer: leaving an idle tab open must not generate active days.
export default function useVisitorActivity() {
  const { key } = useLocation();
  const last = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    const record = force => {
      if (pending.current || document.hidden || (!force && Date.now()-last.current < 300000)) return;
      last.current=Date.now();
      pending.current=true;
      // Let a navigation-time check finish so its first-party cookie is received.
      // Concurrent route changes share this request instead of inventing guests.
      communityRequest('activity').catch(() => {}).finally(() => { pending.current=false; });
    };
    const interact = () => record(false);
    const visible = () => { if(!document.hidden) record(false); };
    record(true);
    for(const event of ['pointerup','keydown','scroll']) window.addEventListener(event,interact,{passive:true});
    document.addEventListener('visibilitychange',visible);
    return () => {
      for(const event of ['pointerup','keydown','scroll']) window.removeEventListener(event,interact);
      document.removeEventListener('visibilitychange',visible);
    };
  },[key]);
}
