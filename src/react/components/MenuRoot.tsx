import { useSyncExternalStore } from "react";
import { useMenuService } from "../contexts";
import { VariantMenu } from "./VariantMenu";

/** Single React tree mounted to `document.body` at plugin load.
 *  Subscribes to the MenuService and renders the variant menu whenever
 *  any checkbox (or the editor command) requests it. */
export function MenuRoot() {
	const menu = useMenuService();
	const state = useSyncExternalStore(menu.subscribe, menu.getState);

	if (!state.open || !state.request) return null;

	const { request } = state;
	return (
		<VariantMenu
			clientX={request.clientX}
			clientY={request.clientY}
			currentChar={request.currentChar}
			dragMode={request.dragMode}
			onSelect={request.onSelect}
			onClose={menu.close}
		/>
	);
}
