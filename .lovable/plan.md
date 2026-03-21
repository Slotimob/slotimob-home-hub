

## Fix: Presentation page 404

**Root cause**: In `App.tsx` line 95, the route is `path="/apresentacao"` but the user (and likely other links) expects `/presentation`.

**Solution**: Add a second route for `/presentation` pointing to the same `Presentation` component, keeping `/apresentacao` as well for backward compatibility.

### Changes

**File: `src/App.tsx`**
- Add `<Route path="/presentation" element={<Presentation />} />` next to the existing `/apresentacao` route.

This is a one-line addition that fixes the 404 immediately.

