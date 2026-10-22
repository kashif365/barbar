import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';

/**
 * Calls `onChange` whenever the server says the queue changed, and again after every (re)connect,
 * so a device that was offline reconciles with the database. A slow poll is a safety net if the
 * websocket is blocked. Returns whether the live connection is currently up.
 */
export function useLiveQueue(onChange: () => void, pollMs = 30000): boolean {
  const [connected, setConnected] = useState(false);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const socket = getSocket();
    let timer: number | undefined;
    const fire = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => cb.current(), 250); // coalesce bursts of events
    };
    const onConnect = () => {
      setConnected(true);
      fire(); // authoritative refetch after (re)connecting
    };
    const onDisconnect = () => setConnected(false);

    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('queue:updated', fire);
    const poll = window.setInterval(() => cb.current(), pollMs);
    const onVisible = () => document.visibilityState === 'visible' && cb.current();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('queue:updated', fire);
    };
  }, [pollMs]);

  return connected;
}
