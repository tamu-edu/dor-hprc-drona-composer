// Drona's fonts, text sizes and weights, as CSS variables. This is the one place to change them.
// Names give the role, not the size, so a value can change without a name becoming wrong.
// Environments rely on these names too (website/docs/environments/styling.md), so keep them stable.
//
// Sizes are in rem so they follow the browser's font-size setting; px is at the default 16px root.
const TOKENS = {
  // Same stacks as Bootstrap's --font-family-*; literal because DynamicViewer iframes don't load Bootstrap
  "--drona-font-sans":
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, ' +
    '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  "--drona-font-mono": 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

  "--drona-text-caption": "0.75rem",   // 12px: uppercase labels, tags, metadata
  "--drona-text-data": "0.8125rem",    // 13px: card content, tables
  "--drona-text-ui": "0.875rem",       // 14px: card titles, app bar, buttons, tabs, editors
  "--drona-text-body": "1rem",         // 16px: forms, start page names (Bootstrap's base)
  "--drona-text-heading": "1.25rem",   // 20px: page titles

  "--drona-weight-normal": "400",
  "--drona-weight-strong": "600",
};

export const TOKENS_CSS = `:root {\n${Object.entries(TOKENS)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join("\n")}\n}`;

if (!document.getElementById("drona-tokens")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "drona-tokens";
  styleSheet.textContent = TOKENS_CSS;
  document.head.appendChild(styleSheet);
}
