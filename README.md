# VChat - Real-time Chat Application

A real-time messaging application built with React Native, Expo, and Firebase.

## Features

- Real-time messaging
- User authentication
- Create new conversations
- Reply to messages
- Swipe-to-reply functionality
- Beautiful WhatsApp-inspired UI

## Tech Stack

- React Native
- Expo Router for navigation
- Firebase Authentication
- Firebase Firestore for real-time data
- React Native Gifted Chat
- React Native Gesture Handler for swipe interactions

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Expo CLI
- Firebase account

### Installation

1. Clone the repository
2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Update firebase.ts with your credentials

4. Run the app
```bash
npm start
# or
yarn start
```

## Firebase Setup

1. Create a project in Firebase console
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Update the `firebase.ts` file with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## App Structure

- `/app` - Main application screens and routing
- `/components` - Reusable UI components
- `/hooks` - Custom React hooks for data fetching
- `/context` - React Context for state management
- `/constants` - App constants and styles
- `/assets` - Images, fonts, and other static assets

## License

MIT
