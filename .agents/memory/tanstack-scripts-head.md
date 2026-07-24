---
name: TanStack Router scripts in head()
description: scripts[] property in head() does not inject into DOM in v1.170.x — use useEffect instead
---

## Rule
Never use `scripts: [{ type: "application/ld+json", children: ... }]` inside TanStack Router's `head()` function to inject JSON-LD or any script tag.

**Why:** TanStack Router v1.170.x does not render the `scripts` array into the actual HTML `<head>`. The property is silently ignored — nothing appears in the DOM, Google sees nothing.

**How to apply:** For any per-page `<script>` injection (JSON-LD, analytics snippets, etc.), use `useEffect` directly in the page component:

```tsx
useEffect(() => {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = `schema-${slug}`;
  script.textContent = JSON.stringify(schemaObject);
  document.head.appendChild(script);
  return () => { document.head.removeChild(script); };
}, [slug]);
```

`meta:` in `head()` works fine — only `scripts:` is broken.
