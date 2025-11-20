# Quote Options Dialog Audit & Fixes

## Issues Identified

### 1. **Nested Dialog Stacking Conflicts**
**Problem**: When opening nested dialogs (QuoteOptionsTab → TailCreateDialog → ModelCreateDialog), multiple dialogs with the same z-index (z-50) were stacking incorrectly, especially in production environments.

**Root Cause**:
- All Dialog components used default z-50
- No proper z-index hierarchy for nested dialogs
- Radix Dialog modal system needed explicit z-index management for nested scenarios

**Fix**:
- Added explicit z-index values using inline styles for nested dialogs:
  - Base dialogs: z-50 (default)
  - First level nested (ModelCreateDialog, Create Operator): z-60
  - Second level nested (Create Size, Create Manufacturer): z-70
- Changed from Tailwind z-index classes to inline styles for better override control

### 2. **Popover Modal Conflicts Inside Dialogs**
**Problem**: Popovers with `modal={true}` inside Dialogs created overlay conflicts, blocking interactions and causing focus trap issues.

**Root Cause**:
- Popovers were using `modal={true}` inside Dialog contexts
- This created competing modal layers and overlay stacking issues
- Focus management conflicts between Popover and Dialog modals

**Fix**:
- Changed all Popovers inside Dialogs from `modal={true}` to `modal={false}`
- Updated Popovers in:
  - `tail-create-dialog.tsx`: Model combobox and Operator combobox
  - `model-create-dialog.tsx`: Size combobox and Manufacturer combobox
- This allows Popovers to work correctly within Dialog contexts without modal conflicts

### 3. **Pending Model ID Race Condition**
**Problem**: After creating a model in `ModelCreateDialog`, the `pendingModelId` useEffect in `TailCreateDialog` would fail to find the newly created model, especially in production with slower network conditions.

**Root Cause**:
- Single check without retry logic
- Models list might not be refreshed when the effect runs
- No handling for async model list updates in production environments
- Timing issues between model creation and list refresh

**Fix**:
- Implemented retry logic with exponential backoff (up to 10 attempts, 200ms intervals)
- Added automatic refetch if model not found after initial attempts
- Added proper error handling with user feedback
- Falls back to manual selection if model still not found after retries
- Better handles production network latency

### 4. **Dialog State Management Conflicts**
**Problem**: Multiple dialogs opening simultaneously without proper state coordination, causing:
- Multiple overlays stacking
- Auto-focus conflicts
- Dialog not closing when nested dialog opens
- State cleanup issues

**Root Cause**:
- No coordination between Dialog open states
- Auto-focus happening even when nested dialogs are open
- Comboboxes staying open when their related dialogs open

**Fix**:
- Added explicit state management for `ModelCreateDialog` in `TailCreateDialog`
- Close related comboboxes when their dialogs open:
  - Close model combobox when ModelCreateDialog opens
  - Close operator combobox when Create Operator dialog opens
  - Close size/manufacturer comboboxes when their dialogs open
- Added `onOpenAutoFocus` handlers to prevent auto-focus conflicts
- Improved dialog close timing for better UX

### 5. **Dialog Close Timing Issues**
**Problem**: TailCreateDialog was staying open after tail creation, preventing proper flow completion.

**Root Cause**:
- Dialog stayed open after successful creation to allow image management
- This caused confusion about workflow completion
- The `onCreated` callback might not complete before dialog interactions

**Fix**:
- Added delayed close (100ms) after successful tail creation
- Ensures `onCreated` callback completes before closing
- Better user feedback flow

## Production-Specific Considerations

### SSR/Hydration
- All `typeof window` checks are already in place
- Client-side only operations properly guarded
- No hydration mismatches expected

### Network Latency
- Retry logic handles slow network conditions
- Timeout-based fallbacks prevent infinite waiting
- User feedback provided if operations take too long

### Z-Index Stacking
- Explicit z-index hierarchy prevents overlay conflicts
- Works correctly in production environments with various browser stacking contexts
- Inline styles ensure z-index values are not overridden by CSS specificity

## Files Modified

1. **components/aircraft/tail-create-dialog.tsx**
   - Added `modelCreateDialogOpen` state
   - Fixed Popover modal props (model={false})
   - Improved pendingModelId retry logic
   - Added dialog state coordination
   - Fixed dialog close timing
   - Added z-index for nested dialogs

2. **components/aircraft/model-create-dialog.tsx**
   - Fixed Popover modal props (model={false})
   - Added dialog state coordination
   - Added z-index for nested dialogs
   - Added auto-focus prevention

3. **components/ui/dialog.tsx**
   - Updated DialogOverlay to support className overrides for z-index

## Testing Recommendations

1. **Nested Dialog Flow**:
   - Open TailCreateDialog from QuoteOptionsTab
   - Open ModelCreateDialog from TailCreateDialog
   - Verify dialogs stack correctly (z-60 appears above z-50)
   - Verify overlays don't block interactions

2. **Popover Inside Dialog**:
   - Open model combobox inside TailCreateDialog
   - Verify it works correctly without overlay conflicts
   - Test operator combobox similarly

3. **Model Creation Race Condition**:
   - Create a new model from TailCreateDialog
   - Verify it appears in the model list automatically
   - Test with simulated slow network (throttle in DevTools)
   - Verify fallback message appears if model not found

4. **Dialog State Management**:
   - Verify comboboxes close when their dialogs open
   - Verify no multiple overlays stacking
   - Verify focus management works correctly

5. **Production Deployment**:
   - Test on production environment
   - Verify z-index stacking works across browsers
   - Test with slow network conditions
   - Verify no console errors or warnings

## Key Improvements

✅ Fixed nested dialog stacking with explicit z-index hierarchy
✅ Resolved Popover modal conflicts inside Dialogs
✅ Added robust retry logic for model creation race conditions
✅ Improved dialog state coordination and cleanup
✅ Better error handling and user feedback
✅ Production-ready with network latency handling
