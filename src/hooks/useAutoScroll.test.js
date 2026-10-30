import { act, renderHook } from '@testing-library/react';
import useAutoScroll from './useAutoScroll';

beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = jest.fn(() => ({ matches: false }));
});
afterEach(() => jest.useRealTimers());

const attach = result => {
  const calls = [];
  result.current.scrollContainerRef.current = { scrollWidth: 2000, clientWidth: 400, scrollLeft: 0,
    scrollTo: options => calls.push({ time: Date.now(), ...options }) };
  return calls;
};

test('rows have distinct first movements and cadence, and timers stop on unmount', () => {
  // Mount disabled to attach the viewport before enabling its effect.
  const first = renderHook(({ enabled }) => useAutoScroll({ enabled }), { initialProps: { enabled:false } });
  const second = renderHook(({ enabled }) => useAutoScroll({ enabled }), { initialProps: { enabled:false } });
  const a = attach(first.result), b = attach(second.result);
  first.rerender({ enabled:true });second.rerender({ enabled:true });
  act(() => jest.advanceTimersByTime(14000));
  expect(a.length).toBeGreaterThanOrEqual(2);expect(b.length).toBeGreaterThanOrEqual(2);
  expect(a[0].time).not.toBe(b[0].time);
  expect(a[1].time-a[0].time).not.toBe(b[1].time-b[0].time);
  expect(a[0].left).toBe(200);
  first.unmount();second.unmount();
  const previous=a.length+b.length;
  act(() => jest.advanceTimersByTime(30000));
  expect(a.length+b.length).toBe(previous);
});

test.each(['phone','reduced motion','hidden'])('respects %s browsing without automatic movement', mode => {
  const hook=renderHook(({ enabled }) => useAutoScroll({ enabled }),{initialProps:{enabled:false}});
  const calls=attach(hook.result);
  window.matchMedia=jest.fn(query=>({matches:mode==='phone'?query.includes('max-width'):mode==='reduced motion' && query.includes('reduced-motion')}));
  if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});
  hook.rerender({enabled:true});act(()=>jest.advanceTimersByTime(20000));
  expect(calls).toHaveLength(0);hook.unmount();
  if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:false});
});

test('manual scrolling followed by hover still resumes after leaving the row', () => {
  const hook=renderHook(({ enabled }) => useAutoScroll({ enabled }),{initialProps:{enabled:false}});
  const calls=attach(hook.result);hook.rerender({enabled:true});
  act(()=>{hook.result.current.handleUserScroll();hook.result.current.handleMouseEnter();});
  act(()=>jest.advanceTimersByTime(3000));
  act(()=>hook.result.current.handleMouseLeave());
  act(()=>jest.advanceTimersByTime(8000));
  expect(calls.length).toBeGreaterThan(0);hook.unmount();
});
