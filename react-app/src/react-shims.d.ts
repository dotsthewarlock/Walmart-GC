declare module 'react' {
  export const StrictMode: any;
  export function createElement(type: unknown, props: unknown, ...children: unknown[]): unknown;
}

declare module 'react-dom/client' {
  export function createRoot(container: HTMLElement): {
    render(children: unknown): void;
  };
}

declare module 'react/jsx-runtime' {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare module '*.css';

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: unknown;
  }
}
