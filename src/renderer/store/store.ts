// Redux Store 配置
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './features/user/userSlice';
import settingsReducer from './features/settings/settingsSlice';
import pluginsReducer from './features/plugins/pluginsSlice';
import danmakuReducer from './features/danmakuSlice';
import softwareReducer from './features/softwareSlice';
import { danmakuMiddleware } from './danmakuMiddleware';

export const store = configureStore({
  reducer: {
    user: userReducer,
    settings: settingsReducer,
    plugins: pluginsReducer,
    danmaku: danmakuReducer,
    software: softwareReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // You might need to ignore certain actions from the danmaku slice if they are non-serializable
        ignoredActions: ['persist/PERSIST', 'danmaku/connect', 'danmaku/disconnect'],
      },
    }).concat(danmakuMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;