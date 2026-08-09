# Scroller

The `<Scroller />` component renders a two-column layout with text on the left and a sticky figure on the right. The component passed to `figure` will update as the user scrolls and different sections come into view. Use it by wrapping content split by "---":

```mdx
<Scroller figure={<Visual />} >

// index 0

---

// index 1

---

// index 2

---

// index 3

</Scroller>
```

Each "---" denotes the end of a section. The example above has four sections.

## Determining active section

- Each section is at least 40vh in height
- A section is "active" when the top of its bounding box is between 0 -> 50vh
- There can only be one active section at a time; the last section to cross this threshold is considered the active state.

## Reading active section

The component passed to `figure` will have access to the current active section via the `useActiveSection` hook:

```tsx
useActiveSection(): number; // the index of the active section
```
