# DestinyLens Dashboard - Goal Card Fixes

## Date: May 17, 2026
## Status: COMPLETE

---

## Issues Fixed

### 1. ✅ TEXT OVERLAYING IMAGES (Goal Cards)
**Problem:** Calculator question text was running over goal card images, making text unreadable.

**Root Cause:** The `.goal-info` overlay had insufficient background opacity (only `rgba(10, 10, 18, 0.95)`) and no proper z-index layering.

**Solution Applied:**
- Enhanced gradient background with multi-stop opacity:
  - `rgba(10, 10, 18, 0.98)` at bottom (strongest)
  - `rgba(10, 10, 18, 0.9)` at 40%
  - `rgba(10, 10, 18, 0.6)` at 70%
  - `transparent` at top
- Added `min-height: 80px` to ensure adequate text space
- Added `z-index: 2` to goal-info and `z-index: 3` to text elements
- Added `isolation: isolate` to goal-card for proper stacking context
- Enhanced text shadows for better readability

### 2. ✅ DELETE NOT WORKING
**Problem:** Clicking delete on a goal card did nothing.

**Root Cause:** The `deleteGoal()` function was calling `showDLConfirm()` which is an async custom dialog, but wasn't handling the case when it doesn't exist. Also lacked feedback after deletion.

**Solution Applied:**
- Added fallback to native `confirm()` when `showDLConfirm` unavailable
- Added explicit `localStorage.setItem()` after `goals.splice()`
- Added console logging for debugging
- Added success notification via `showDLSuccess()` or silent completion
- Added proper array bounds checking

### 3. ✅ IMAGES DISAPPEARING ON REFRESH
**Problem:** Uploaded images disappeared after page refresh.

**Root Cause:** Multiple issues:
1. Goals loaded from localStorage but then potentially overwritten by calculation defaults
2. Images stored as Supabase storage URLs which can expire or have CORS issues
3. No immediate localStorage persistence after goal modifications

**Solution Applied:**
- Changed loading logic to ONLY create defaults if `localStorage.getItem('destinylens_goals')` returns null
- Store images as base64 data URLs directly in localStorage (more reliable than Supabase URLs)
- Added `localStorage.setItem()` in three critical places:
  1. After deleting a goal
  2. After saving/updating a goal
  3. After creating default goals from calculation
- Added `createdAt` timestamp to goal objects for tracking

---

## Files Modified

### `/root/.openclaw/workspace/destinylens/dashboard.html`

**CSS Changes:**
1. `.goal-card` - Added `isolation: isolate` for stacking context
2. `.goal-card img` - Added absolute positioning with `z-index: 1`
3. `.goal-info` - Complete rewrite with stronger gradient, flex layout, z-index
4. `.goal-emoji`, `.goal-name`, `.goal-amt` - Added z-index and text shadows
5. `.goal-menu-btn` - Enhanced z-index and background opacity
6. `.goal-dropdown` - Enhanced styling with backdrop blur

**JavaScript Changes:**
1. `loadDashboardData()` - Fixed goals loading to preserve localStorage data
2. `renderGoals()` - Complete rewrite with HTML escaping and "Add Goal" card
3. `deleteGoal()` - Added fallback confirm, localStorage save, success feedback
4. `saveGoal()` - Store base64 images, immediate localStorage persistence
5. `closeModal()` - Reset temp state when closing modals
6. Added `resetGoalForm()` helper function
7. Added `escapeHtml()` helper function

---

## Testing Checklist

After deploying, verify:

- [ ] Upload an image to a goal card - image displays properly
- [ ] Text is clearly readable over uploaded images
- [ ] Delete a goal card - card removes immediately
- [ ] Refresh page after delete - deleted goal stays gone
- [ ] Images persist after page refresh
- [ ] Can add new goals after deleting (up to 4 max)
- [ ] Maximum 4 goals enforced
- [ ] Menu button (three dots) visible on hover
- [ ] Calculator text doesn't overlap goal cards

---

## Deployment Instructions

1. The file `/root/.openclaw/workspace/destinylens/dashboard.html` has been updated
2. Deploy to your hosting (Vercel, Netlify, etc.)
3. Clear browser cache: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
4. Test the checklist above

---

## Technical Notes

- Images are now stored as base64 data URLs in localStorage for maximum reliability
- localStorage key: `destinylens_goals`
- Maximum goals: 4 (enforced in UI and logic)
- All goal modifications immediately persist to localStorage
- Default goals only created on first visit (no existing localStorage data)

---

## Backup

Original file state preserved in git history. To rollback if needed:
```bash
cd /root/.openclaw/workspace/destinylens
git checkout dashboard.html
```
