// Redux Store 配置
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './features/user/userSlice';
import settingsReducer from './features/settings/settingsSlice';
import pluginsReducer from './features/plugins/pluginsSlice';
import liveDataReducer from './features/liveData/liveDataSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    settings: settingsReducer,
    plugins: pluginsReducer,
    liveData: liveDataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
        ignoredPaths: ['liveData.lastUpdated'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;