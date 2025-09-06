import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { setAuthingState } from '../store/features/authingSlice';

export default function useAuthingInit() {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    let off: (() => void) | null = null;
    (async () => {
      try {
        const s = await window.electronAPI.getAuthingStatus();
        dispatch(setAuthingState(s));
        off = window.electronAPI.onAuthingUpdated?.((payload) => {
          dispatch(setAuthingState(payload));
        }) || null;
      } catch {}
    })();
    return () => { try { off && off(); } catch {} };
  }, [dispatch]);
}

