// Redux Store 配置
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './features/user/userSlice';
import settingsReducer from './features/settings/settingsSlice';
import pluginsReducer from './features/plugins/pluginsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    settings: settingsReducer,
    plugins: pluginsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;