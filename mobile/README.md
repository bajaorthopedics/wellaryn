# Wellaryn Mobile App

React Native (Expo) mobile app for iOS and Android.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode 15+ (Mac only)
- Android: Android Studio with SDK 34+

## Setup

```bash
cd mobile
npm install
```

## Environment Variables

Create a `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=https://bahdtqwqwkyrpchftemh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Run

```bash
# Start dev server
npx expo start

# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android

# Scan QR code with Expo Go app on your phone
```

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Structure

```
mobile/
├── App.js                    # Entry point with navigation
├── app.json                  # Expo config
├── package.json
├── src/
│   ├── contexts/
│   │   └── AuthContext.js    # Auth state management
│   ├── lib/
│   │   └── supabase.js      # Supabase client (SecureStore)
│   ├── screens/
│   │   ├── LoginScreen.js    # Login UI
│   │   └── DashboardScreen.js # Main dashboard with score ring
│   └── theme.js              # Design tokens
└── shared/                   # Symlink to web's /src/lib for shared code
    └── wellaryn-score.js     # Score algorithm (shared with web)
```

## Screens

| Screen | Status | Description |
|--------|--------|-------------|
| ✅ Login | Complete | Email/password auth |
| ✅ Dashboard | Complete | Score ring, metrics grid, recommendations |
| 🔜 History | Placeholder | Performance charts over time |
| 🔜 Chat | Placeholder | Real-time messaging |
| 🔜 Profile | Placeholder | User settings, wearable connections |
| 🔜 Goals | Placeholder | Goal tracking with progress rings |
| 🔜 Injuries | Placeholder | Injury log with body map |

## Shared Code

The Wellaryn Score algorithm is shared between web and mobile.
Create a symlink to reuse it:

```bash
cd mobile
mkdir -p shared
ln -s ../../src/lib/wellaryn-score.js shared/wellaryn-score.js
```

## Notes

- Uses Supabase for backend (same as web app)
- Auth tokens stored in iOS Keychain / Android Keystore via `expo-secure-store`
- Dark theme matching web app design system
- Same Wellaryn Score algorithm as web + iOS native app
