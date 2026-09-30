# Subject Management System - Unified Design Plan

## Problem Statement
The subject management system in Pixel Focus is fragmented:
- **Study Planner** and **Onboarding** pages correctly manage a master subject list in `settings.subjects`
- **Tasks** and **Pomodoro** components incorrectly derive their available subjects from existing tasks/sessions instead of using the master list
- This creates a chicken-and-egg problem: users cannot select a newly added subject until they've already created a task/session with that subject

## Root Cause
1. **Tasks.tsx** (line ~126): `const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);`
2. **Pomodoro.tsx** (line ~53): `const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);`
3. Both components derive subjects from tasks/sessions instead of reading from `settings.subjects`

## Solution Overview
Create a unified subject management system where:
- **Study Planner** and **Onboarding** remain the ONLY sources for **adding/managing subjects**
- **All other components** (Tasks, Pomodoro, Calendar, etc.) only provide **dropdowns/selectors** populated from the master subject list
- Single source of truth: `settings.subjects` (array of `{name: string, color: string}` objects)
- When a subject is selected, only the **subject name (string)** is stored in tasks/sessions/etc.

### Onboarding-Specific Changes
As part of unifying subject management, we will simplify the onboarding flow by removing unnecessary screens:
- Remove the screen that asks users to manage how many hours they plan to study
- Keep only the essential subject setup screens in onboarding
- This streamlines the user experience and focuses on what matters most: subject definition

## Component-Specific Changes

### 1. Tasks Component (`src/pages/Tasks.tsx`)
**Current Issues:**
- Line ~126: Derives subjects from tasks instead of settings
- Line ~235: Datalist for subject autocomplete uses incorrect subject format

**Changes Needed:**
```diff
- const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);
+ const subjects = settings.subjects ?? [];

- <datalist id="subjects-dl">{subjects.map(s => <option key={s} value={s} />)}</datalist>
+ <datalist id="subjects-dl">{subjects.map(s => <option key={s.name} value={s.name} />)}</datalist>
```

### 2. Pomodoro Component (`src/pages/Pomodoro.tsx`)
**Current Issues:**
- Line ~53: Derives subjects from tasks instead of settings
- Line ~293: Subject Select component doesn't display subject colors

**Changes Needed:**
```diff
- const subjects = Array.from(new Set(tasks.map(t => t.subject))).filter(Boolean);
+ const subjects = settings.subjects ?? [];

- {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
+ {subjects.map(s => (
    <SelectItem key={s.name} value={s.name}>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
        <span>{s.name}</span>
      </div>
    </SelectItem>
  ))}

// Update display logic where subject colors are shown
// Example: Line ~208 - selected subject display
{ pom.selectedSubject && (
  <span className="text-xs text-primary mt-1">
    {/* Find color from subject name */}
    {settings.subjects?.find(s => s.name === pom.selectedSubject)?.color && (
      <span className="block h-2 w-2 rounded-full" style={{ background: settings.subjects.find(s => s.name === pom.selectedSubject)?.color }} />
    )}
    {pom.selectedSubject}
  </span>
)}
```

### 3. Calendar Component (`src/pages/Calendar.tsx`)
**To Be Verified:**
- Check if Calendar component has similar subject derivation issues
- If so, apply same fix: derive subjects from `settings.subjects` instead of tasks/sessions

### 4. Subject Color Lookup (Shared Logic)
**Issue:** Components need to display subject colors but now work with subject names (strings)

**Recommended Solution:**
Move `getSubjectColor` function to a shared location:
- **FROM**: `src/pages/Dashboard.tsx` lines 25-31
- **TO**: `src/lib/utils.ts` or `src/lib/store.ts`

**Alternative Solution (per-component):**
```typescript
const getSubjectColorByName = (subjectName: string): string => {
  const subject = settings.subjects?.find(s => s.name === subjectName);
  return subject ? subject.color : "#6B7280"; // fallback to gray
};
```

## Data Flow Summary

### Adding Subjects:
```
[Study Planner / Onboarding] 
       ↓ (User adds subject: {name: "Physics", color": "#3B82F6"})
[settings.subjects] ← Array of {name, color} objects (SOURCE OF TRUTH)
```

### Selecting Subjects:
```
[settings.subjects] 
       ↓ (All components read from here)
[Tasks Autocomplete] ← Shows subject names
[Pomodoro Dropdown] ← Shows subject names + color indicators
[Calendar Subject Picker] ← Shows subject names
```

### Using Subjects:
```
[Component State] 
       ↓ (Only store STRING - subject name)
[task.subject] = "Physics"        // String only
[session.subject] = "Physics"     // String only  
[flashcard.subject] = "Physics"   // String only
```

### Displaying Subjects:
```
[Subject Name] + [settings.subjects] 
       ↓ (Lookup color by name)
[Display: "Physics" with blue background]
```

## Implementation Phases

### Phase 1: Core Fixes
1. Fix Tasks.tsx subject derivation and autocomplete
2. Fix Pomodoro.tsx subject derivation and dropdown display
3. Create/update shared subject color lookup utility

### Phase 2: Verification & Extension
1. Check Calendar.tsx and other components for similar issues
2. Apply same fixes where needed
3. Verify subject color display in all contexts (Dashboard, Pomodoro timer, etc.)

### Phase 3: Testing
1. Fresh start: Add subject in Study Planner → immediately usable in Tasks/Pomodoro
2. Existing data: Verify pre-existing tasks/sessions continue working
3. Edge cases: Empty subject list, special characters, long lists
4. Regression tests: All existing functionality preserved

## Expected Outcome
- ✅ Unified subject management: Study Planner + Onboarding = ONLY sources for adding subjects
- ✅ Immediate availability: New subjects usable everywhere right after creation
- ✅ No chicken-and-egg problem: Select subject before creating first task
- ✅ Consistent UX: Same master subject list in all selection contexts
- ✅ Backward compatibility: All existing tasks/sessions continue working
- ✅ Clean separation: Adding (Study Planner/Onboarding) vs. Selecting (everywhere else) concerns

## Files to Modify
1. `src/pages/Tasks.tsx` - Fix subject derivation and autocomplete
2. `src/pages/Pomodoro.tsx` - Fix subject derivation and dropdown display
3. `src/pages/Calendar.tsx` - Verify and fix if needed
4. `src/lib/utils.ts` or `src/lib/store.ts` - Create shared subject color lookup (recommended)
5. Alternative: Add lookup helpers in each component that needs subject colors

## Testing Strategy
### Test Cases:
1. **Fresh Start Workflow**:
   - Add subject "Chemistry" in Study Planner
   - Immediately select "Chemistry" in Tasks autocomplete → should work
   - Immediately select "Chemistry" in Pomodoro dropdown → should work
   - Color displays correctly in both places

2. **Existing Data Validation**:
   - Pre-existing tasks with subjects continue to display correctly
   - Pre-existing pomodoro sessions continue to work with correct colors
   - Subject colors remain consistent across components

3. **Edge Cases**:
   - Empty subject list handling (show appropriate placeholders)
   - Subject names with special characters, spaces, unicode
   - Performance with large subject lists (50+ subjects)

4. **Regression Tests**:
   - Task creation/editing functionality unchanged
   - Pomodoro timer, session recording, task linking unaffected
   - Study Planner generation from tasks still works correctly
   - Onboarding subject setup and weekly planning unaffected
   - All other UI components (Dashboard, Analytics, etc.) continue working

### Success Criteria:
- [ ] New subjects added in Study Planner appear immediately in Tasks autocomplete
- [ ] New subjects added in Study Planner appear immediately in Pomodoro dropdown
- [ ] Subject colors display correctly based on master list
- [ ] Existing tasks/sessions continue to work without modification
- [ ] No TypeScript errors or build warnings introduced
- [ ] All existing user flows continue to function as expected