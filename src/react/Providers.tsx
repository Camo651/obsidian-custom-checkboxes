import { StrictMode, type ReactNode } from "react";
import { type AppServices, ServicesContext } from "./contexts";

interface ProvidersProps {
	services: AppServices;
	children: ReactNode;
}

/** Single entry point for wiring contexts around any React subtree we
 *  mount. Every `mountReact` call wraps its content in this. */
export function Providers({ services, children }: ProvidersProps) {
	return (
		<StrictMode>
			<ServicesContext.Provider value={services}>
				{children}
			</ServicesContext.Provider>
		</StrictMode>
	);
}
