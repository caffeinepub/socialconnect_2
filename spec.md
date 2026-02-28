# SocialConnect

## Current State
The app has a full social network with profile editing. The `EditProfileModal` in `ProfilePage.tsx` handles profile updates by calling `saveProfile.mutateAsync(...)`. The `useSaveProfile` mutation passes the profile object directly to `actor.saveCallerUserProfile(profile)`.

## Requested Changes (Diff)

### Add
- Nothing new to add.

### Modify
- Fix `EditProfileModal.handleSave` so `professionalTitle: undefined` is replaced with the correct optional handling (omit field or set to `null`) to prevent Candid serialization errors.
- Add error logging in the catch block so we can surface the real error message via toast instead of just "Failed to update profile".
- Fix `ProfileSetupModal` to not call `markAccountVerified()` on every profile save -- it throws if already verified, causing the success to still show but potentially masking issues.

### Remove
- Nothing to remove.

## Implementation Plan
1. In `ProfilePage.tsx`, fix `EditProfileModal.handleSave`: change `professionalTitle: professionalTitle.trim() || undefined` to use a proper optional pattern that Candid encoding accepts.
2. Improve error handling in `handleSave` to log the actual error and show a more informative toast.
3. In `useSaveProfile` in `useQueries.ts`, ensure the mutation properly handles optional fields.
