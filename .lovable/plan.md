## Changes

### 1. Remove "Exportações de Dados" from sidebar
**File**: `src/components/AppSidebar.tsx` (lines 540-554)

Remove the `isSuperAdmin` conditional block that renders the "Exportações de Dados" menu item. The page remains accessible via `/admin/data-requests` route and the redirect in account settings — it just won't clutter the sidebar.

Also remove the `Package` icon import (line 22) if no longer used.

### 2. Fix build error in `pdfGenerator.ts`
**File**: `src/utils/pdfGenerator.ts` (line 1)

Change `import type jsPDF from 'jspdf'` to `import jsPDF from 'jspdf'` — the `type` keyword prevents using it as a constructor at lines 617 and 699.

### 3. Fix build error in `reportDocxGenerator.ts`
**File**: `src/utils/reportDocxGenerator.ts` (line 56)

Change `const children: (Paragraph | Table)[] = []` to use `InstanceType<typeof Paragraph> | InstanceType<typeof Table>` or simply type it as `any[]`, since `Paragraph` and `Table` are runtime values from a dynamic import, not type-level constructs in this scope.
