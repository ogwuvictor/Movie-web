import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { communityRequest } from '../utils/communityService';

// Record visible navigation/interaction through an authenticated server request.
// No background timer: leaving an idle tab open must not generate active days.
export default function useVisitorActivity() {
  const { key } = useLocation();
  const last = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    const record = force => {
      if (document.hidden || (!force && Date.now()-last.current < 300000)) return;
      last.current=Date.now();
      communityRequest('activity',{signal:controller.signal}).catch(() => {});
    };
    const interact = () => record(false);
    const visible = () => { if(!document.hidden) record(false); };
    record(true);
    for(const event of ['pointerup','keydown','scroll']) window.addEventListener(event,interact,{passive:true});
    document.addEventListener('visibilitychange',visible);
    return () => {
      controller.abort();
      for(const event of ['pointerup','keydown','scroll']) window.removeEventListener(event,interact);
      document.removeEventListener('visibilitychange',visible);
    };
  },[key]);
}
