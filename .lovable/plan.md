

## Expanding right panel on signup toggle

### What changes
**File: `src/pages/Auth.tsx`**

The layout uses a two-column flex: left info panel (`lg:w-1/2 xl:w-[55%]`) and right form panel (`lg:w-1/2 xl:w-[45%]`).

When the user toggles to "Criar Conta" (`isLogin = false`), the right panel should grow ~100px wider, and the left panel should shrink accordingly. On "Login", revert.

### Implementation

1. **Convert both column containers to `motion.div`** with `layout` and `transition` props for smooth width animation.

2. **Left panel** (line 828): Change from `<div>` to `<motion.div>` with dynamic className:
   - Login: `lg:w-1/2 xl:w-[55%]` (current)
   - Signup: `lg:w-[45%] xl:w-[50%]` (~100px less)

3. **Right panel** (line 863): Change from `<div>` to `<motion.div>` with dynamic className:
   - Login: `lg:w-1/2 xl:w-[45%]` (current)
   - Signup: `lg:w-[55%] xl:w-[50%]` (~100px more)

4. Both `motion.div` elements get `transition={{ duration: 0.4, ease: 'easeInOut' }}` for a fluid resize.

### Technical detail
- Using `framer-motion` `layout` animation on flex children with Tailwind width classes. The `layout` prop handles interpolating between the two widths smoothly.
- `isLogin` state already exists and controls the toggle — we just wire it to the className.

