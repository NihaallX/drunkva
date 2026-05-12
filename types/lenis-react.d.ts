declare module "lenis/dist/lenis-react.mjs" {
  import * as React from "react";

  type LenisOptions = Record<string, unknown>;

  interface ReactLenisProps extends React.HTMLAttributes<HTMLDivElement> {
    root?: boolean;
    options?: LenisOptions;
    children?: React.ReactNode;
  }

  const ReactLenis: React.ComponentType<ReactLenisProps>;
  export default ReactLenis;
}
