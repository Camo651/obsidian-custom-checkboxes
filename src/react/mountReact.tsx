import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Providers } from "./Providers";
import type { AppServices } from "./contexts";

export interface MountedRoot {
	unmount(): void;
}

/** Mount a React tree into `container`, wrapped in our standard providers.
 *  Returns a handle so the caller can unmount when the host is disposed. */
export function mountReact(
	container: Element | DocumentFragment,
	services: AppServices,
	children: ReactNode,
): MountedRoot {
	const root: Root = createRoot(container);
	root.render(<Providers services={services}>{children}</Providers>);
	return {
		unmount: () => root.unmount(),
	};
}
