# Settings Page Fix

## Issue
The Settings page in the admin portal was throwing an error:
```
TypeError: response is not iterable
```

## Root Cause
The backend API endpoint `/api/v1/automations` returns:
```json
{
  "automations": [
    { "id": 1, "type": "Welcome", "template": "...", "enabled": false },
    { "id": 2, "type": "Rejection", "template": "...", "enabled": false },
    { "id": 3, "type": "Shortlist", "template": "...", "enabled": false }
  ]
}
```

But the API client was expecting the response to be directly iterable (an array), not an object with an `automations` property.

## Solution
Updated the `automationsApi.list()` method in `frontend/portal/src/services/api.ts` to:
1. Accept the correct response type: `{ automations: Array<...> }`
2. Extract and return just the `automations` array

### Code Change
```typescript
// Before
export const automationsApi = {
  list: () =>
    request<Array<{ type: string; template: string; enabled: boolean }>>('/automations'),
  // ...
};

// After
export const automationsApi = {
  list: async () => {
    const response = await request<{ automations: Array<{ type: string; template: string; enabled: boolean }> }>('/automations');
    return response.automations;
  },
  // ...
};
```

## Files Modified
- `frontend/portal/src/services/api.ts`

## Testing
1. Login as admin user
2. Navigate to Settings page
3. Verify automations load without errors
4. Edit automation templates
5. Toggle enabled/disabled checkboxes
6. Click "Update" button to save changes
7. Verify changes are reflected in the UI

## Status
✅ Fixed - Settings page now loads correctly for admin users
