# Multi-Tenancy Implementation Guide (Vendure + Next.js App Router)

## 1. Context & Architecture
**Goal:** Build a single Next.js storefront that serves multiple distinct stores (Channels) from one Vendure backend.
**Stack:** Next.js 14+ (App Router), Vendure (GraphQL), Tailwind CSS.
**Mechanism:**
* **Subdomains** determine the store (e.g., `hpm.shop.local` → Home Plan Marketplace, `bhd.shop.local` → Buy Home Designs).
* **Channels:** Each store corresponds to a specific "Channel Token" in Vendure.

---

## 2. The Core Problem
In Next.js App Router, different parts of the application run in isolated contexts. This caused a "Split Brain" issue:

1.  **The Page (`page.tsx`):** Knows the current URL (and thus the Channel), so it displays the correct products.
2.  **Server Actions (`actions.ts`):** Run on the server in isolation. When you clicked "Add to Cart", the action didn't know which subdomain you were on. It defaulted to the "Default Channel," looked for the product ID, and failed because that product didn't exist in the default channel.
    * **Result:** `ENTITY_NOT_FOUND` error.
3.  **Cached Functions (`use cache`):** These create static snapshots of data. If we tried to read `headers()` (to find the subdomain) inside a cached function, Next.js crashed.
    * **Result:** `Error: Route used headers() inside use cache`.

---

## 3. The Solution: "Token Injection Pattern"
We solved this by creating a centralized helper to resolve the Channel Token and explicitly "injecting" (passing) it into every function that needs it.

### A. The "Silver Bullet" Helper
**File:** `apps/storefront/src/lib/channel-helper.ts`

This function is the **only** place allowed to read the request headers to determine the current store.

```typescript
import { cache } from 'react';
import { headers } from 'next/headers';

export const getChannelToken = cache(async () => {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const subdomain = host.split(':')[0].split('.')[0].toLowerCase();

    // Fix for Localhost vs 127.0.0.1 networking issues
    const apiUrl = (process.env.VENDURE_SHOP_API_URL || '[http://127.0.0.1:3000/shop-api').replace('localhost](http://127.0.0.1:3000/shop-api').replace('localhost)', '127.0.0.1');

    // ... fetch logic to get token from Vendure ...
    return token;
});
```

---

## 4. Implementation Guide (How to Fix Files)

If you create a new feature and run into issues, follow these patterns based on the file type.

### Pattern 1: Page Files (The "Source of Truth")
Pages are dynamic. They are allowed to call the helper. They must fetch the token and pass it down.

**File:** `src/app/some-page/page.tsx`
```typescript
import { getChannelToken } from "@/lib/channel-helper";

export default async function Page() {
    // 1. Get the token
    const token = await getChannelToken();

    return (
        // 2. Pass it to your component
        <ProductList channelToken={token} />
    );
}
```

### Pattern 2: Components & Cached Functions
**Rule:** NEVER call `getChannelToken()` (or `headers()`) inside a function marked `'use cache'`. It will crash.
**Fix:** Accept `channelToken` as an argument.

**File:** `src/components/product-list.tsx` OR `src/lib/vendure/cached.ts`
```typescript
// Add channelToken to props/arguments
export async function ProductList({ channelToken }: { channelToken: string }) {
    
    // Pass it manually to the API query
    const data = await query(SomeQuery, {}, { channelToken });
    
    return <div>...</div>;
}
```

### Pattern 3: Server Actions (Add to Cart, Login, etc.)
Server actions are "blind." They must self-identify by calling the helper *before* doing work.

**File:** `src/app/cart/actions.ts`
```typescript
'use server';
import { getChannelToken } from "@/lib/channel-helper";
import { mutate } from '@/lib/vendure/api';
import { AddToCartMutation } from '@/lib/vendure/mutations';

export async function addToCart(variantId: string) {
    // 1. Identify the store
    const token = await getChannelToken();

    // 2. Execute mutation with the token
    await mutate(AddToCartMutation, { variantId }, { 
        channelToken: token 
    });
}
```

---

## 5. Troubleshooting Common Errors

### Error: `ENTITY_NOT_FOUND`
* **Context:** Happens when clicking buttons like "Add to Cart".
* **Cause:** The Server Action is running on the *Default Channel*, but the product ID belongs to the *Subdomain Channel*.
* **Fix:** Open the `actions.ts` file. Import `getChannelToken`, await it, and pass it to the `mutate` function as `{ channelToken: token }`.

### Error: `Route used headers() inside use cache`
* **Context:** Happens when loading a page.
* **Cause:** A function marked with `'use cache'` (in `cached.ts` or a component) tried to call `getChannelToken()`. You cannot read dynamic headers while building a static cache.
* **Fix:**
    1.  Remove `getChannelToken()` from inside the cached function.
    2.  Add `channelToken` as an argument to that function.
    3.  Go to the parent `page.tsx`, fetch the token there, and pass it in.

### Error: `Type '{ channelToken: ... }' is not assignable to type...`
* **Context:** TypeScript error in `page.tsx`.
* **Cause:** You passed `channelToken` to a component (e.g., `<Cart channelToken={token} />`), but that component definition hasn't been updated to accept it yet.
* **Fix:** Go to the component file (`cart.tsx`), add `channelToken` to the Interface/Props, and use it.

### Error: `WebSocket connection failed` / `Blocked cross-origin`
* **Context:** Development console noise.
* **Cause:** `next.config.js` `allowedDevOrigins` doesn't match the exact port/domain.
* **Fix:** Ignore it (it only affects Hot Reload), or update `next.config.js` to explicitly list `subdomain.site.local:3000`.

---

## 6. Critical Files Modified
* `src/lib/channel-helper.ts` (The Brain)
* `src/lib/vendure/api.ts` (The Executor)
* `src/app/product/[slug]/page.tsx` (Product Logic)
* `src/app/product/[slug]/actions.ts` (Add to Cart Logic)
* `src/app/cart/page.tsx` & `cart.tsx` (Cart Logic)
* `src/app/search/page.tsx` (Search Logic)

To get this to work locally you need to modify your etc hosts

127.0.0.1   shop.lesuto.local
127.0.0.1   bhd.shop.lesuto.local
127.0.0.1   hpm.shop.lesuto.local
127.0.0.1   chameleon.shop.lesuto.local
Format
127.0.0.1.  [token].shop.lesuto.local