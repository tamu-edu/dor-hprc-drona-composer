---
sidebar_position: 10
---

:::caution Old documentation
This page is from the previous version of the documentation and may be out of date. See the [current documentation](/docs/overview/intro).
:::

# Fonts and Text Sizes

Drona defines its fonts, text sizes and weights as CSS variables. Use them in your cards and
viewers so an environment matches the rest of the app. They are optional: literal sizes keep
working, and you can override a variable wherever you need something different.

## Variables

| Variable | Value | Use for |
|---|---|---|
| `--drona-font-sans` | System sans-serif stack | All text |
| `--drona-font-mono` | System monospace stack | Code, paths, logs |
| `--drona-text-caption` | 12px | Uppercase labels, tags, metadata |
| `--drona-text-data` | 13px | Card content, tables |
| `--drona-text-ui` | 14px | Card titles, buttons, tabs |
| `--drona-text-body` | 16px | Regular text at the size of the forms |
| `--drona-text-heading` | 20px | Page titles |
| `--drona-weight-normal` | 400 | Text |
| `--drona-weight-strong` | 600 | Headings, labels, emphasis |

Sizes are defined in `rem`, so they follow the user's browser font-size setting.

## Using them

Variables work in any HTML that Drona renders, including the output of a retriever script, because
the browser resolves them. Inline cards inherit the page's sans-serif font, so you only need to
set the font for monospace text.

```html
<div id="my-report">
  <style>
    #my-report th  { font-size: var(--drona-text-caption, 12px); font-weight: var(--drona-weight-strong, 600); }
    #my-report td  { font-size: var(--drona-text-data, 13px); }
    #my-report pre { font-family: var(--drona-font-mono, monospace); }
  </style>
  ...
</div>
```

The value after the comma is a fallback for versions of Drona that don't define the variable yet.

Start `<style>` selectors with an ID that belongs to your card. A `<style>` tag in a card applies to
the whole page, so a bare `td { ... }` would also change the tables outside your card.

## Overriding

Write a literal value to override a single rule:

```css
#my-report .big-number { font-size: 28px; }
```

Set the variable on your card's root element to override it for the whole card. Everything inside
the card that uses the variable follows:

```css
#my-report { --drona-text-data: 14px; }
```

## DynamicViewer

A `dynamicViewer` runs in a sandboxed iframe that doesn't load the page's styles. Drona adds the same
variables to the iframe and sets `--drona-font-sans` as the default font of its `body`. Your viewer's
code can use the variables and override them in the same way.

```js
container.style.fontSize = "var(--drona-text-data, 13px)";
```
