import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuthingUserSnapshot {
  loggedIn: boolean;
  isMember: boolean;
  isStale?: boolean;
  expiryTextCN?: string | null;
  membershipExpiryRaw?: string | null;
  membershipExpiryDate?: number | null;
  user?: {
    sub: string;
    email?: string;
    nicknameRaw?: string;
    website?: string;
    name?: string;
  } | null;
  lastSyncAt?: number;
}

export const fetchAuthingStatus = createAsyncThunk<AuthingUserSnapshot>(
  'authing/fetchStatus',
  async () => {
    const res = await window.electronAPI.getAuthingStatus();
    return res as AuthingUserSnapshot;
  }
);

interface AuthingState extends AuthingUserSnapshot {}

const initialState: AuthingState = {
  loggedIn: false,
  isMember: false,
  isStale: false,
  user: null,
};

const authingSlice = createSlice({
  name: 'authing',
  initialState,
  reducers: {
    setAuthingState: (state, action: PayloadAction<AuthingUserSnapshot>) => {
      return { ...state, ...action.payload };
    },
    clearAuthingState: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAuthingStatus.fulfilled, (_state, action) => {
      return { ...initialState, ...action.payload };
    });
  }
});

export const { setAuthingState, clearAuthingState } = authingSlice.actions;
export default authingSlice.reducer;

