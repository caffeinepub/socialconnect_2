# SocialConnect

## Current State
The app uses Internet Identity (ICP's decentralized auth) for login -- a single "Sign In" button on the login page. There are no username/password credentials. User profiles store `displayName`, `bio`, `avatar`, `coverPhoto`, `isProfessional`, `professionalTitle`. The backend has full social features: posts, comments, likes, friends, followers, messages, groups, reels, shop listings.

## Requested Changes (Diff)

### Add
- Username/password credential storage in the backend (username mapped to hashed password and principal)
- `registerWithCredentials(username, password)` backend function -- creates a credential record tied to the caller's principal
- `loginWithCredentials(username, password)` backend query -- returns true/false for validation (actual session still uses Internet Identity; credentials are verified on-chain)
- Login page redesign: show two tabs -- "Log In" (username + password fields) and "Create Account" (username + password + confirm password fields)
- On "Create Account": calls Internet Identity login first (to get principal), then registers credentials
- On "Log In": calls Internet Identity login (to get principal), then validates credentials against stored record
- If logged-in principal has no credentials registered, prompt to set a username/password

### Modify
- `LoginPage.tsx` -- replace single Sign In button with tabbed username/password form
- `ProfileSetupModal.tsx` -- after credential setup, redirect to profile setup if no profile exists

### Remove
- Nothing removed

## Implementation Plan
1. Add `UserCredential` type and credential map to backend (`main.mo`)
2. Add `registerWithCredentials(username, password)` -- stores username -> {principal, passwordHash} mapping; traps if username taken
3. Add `loginWithCredentials(username, password)` query -- validates username+password, returns the associated principal as text (or traps if invalid)
4. Add `getMyUsername()` query -- returns the username for the caller's principal if one exists
5. Regenerate backend bindings
6. Update `LoginPage.tsx` with tabbed UI: "Log In" tab (username + password) and "Create Account" tab (username + password + confirm)
7. Auth flow: Internet Identity handles the cryptographic session; username/password is an additional layer verified on-chain
