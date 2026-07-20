import '@testing-library/jest-dom/vitest'

// VexFlow uses a temporary canvas only to estimate text widths while producing
// its SVG. jsdom does not implement that browser API, so tests provide the
// deterministic measurement needed by the layout snapshot.
HTMLCanvasElement.prototype.getContext = (() => ({
  measureText: (text: string) => ({
    width: text.length * 8,
    actualBoundingBoxAscent: 8,
    actualBoundingBoxDescent: 2,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: text.length * 8,
  }),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext
