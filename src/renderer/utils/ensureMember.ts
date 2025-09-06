import { store } from '../store/store';
import { setAuthingState, fetchAuthingStatus } from '../store/features/authingSlice';

export async function ensureMemberOrPrompt(): Promise<boolean> {
  // pull current status first
  const status = await window.electronAPI.getAuthingStatus();
  store.dispatch(setAuthingState(status));

  if (!status.loggedIn) {
    // start interactive login
    await window.electronAPI.startAuthingLogin();
    const s2 = await window.electronAPI.getAuthingStatus();
    store.dispatch(setAuthingState(s2));
    if (!s2.loggedIn) return false;
    if (!s2.isMember) {
      alert('该功能需要会员权限');
      return false;
    }
    return true;
  }

  if (!status.isMember) {
    alert('该功能需要会员权限');
    return false;
  }

  return true;
}

