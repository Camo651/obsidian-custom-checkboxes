import { type RefObject, useEffect, useRef } from "react";
import { LONG_PRESS_MS } from "../../types";

interface CheckboxInteractionCallbacks {
	onShortClick: (ev: MouseEvent) => void;
	onOpenMenu: (ev: MouseEvent | PointerEvent) => void;
}

/**
 * Native event listeners for a checkbox icon. Encapsulates:
 *  - long-press to open menu
 *  - short click to toggle
 *  - shift-click / right-click / long-press all open the menu
 *  - aggressive event swallowing so Obsidian's CodeMirror task-toggle
 *    handler never sees these events
 *
 * IMPORTANT: must use native `addEventListener` rather than React's
 * synthetic event props. React 17+ delegates events at the root container
 * — by the time React's handlers fire, the native event has already
 * bubbled past `cm-content` where Obsidian's handler lives. Capturing on
 * the icon element itself is the only way to suppress that.
 *
 * Callbacks are read from a ref so updates to them don't tear down
 * listeners on every render.
 */
export function useCheckboxInteractions(
	ref: RefObject<HTMLElement | null>,
	callbacks: CheckboxInteractionCallbacks,
): void {
	const cbRef = useRef(callbacks);
	cbRef.current = callbacks;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		let timer: number | null = null;
		let longPressFired = false;

		const clear = () => {
			if (timer !== null) {
				window.clearTimeout(timer);
				timer = null;
			}
		};

		const swallow = (ev: Event) => {
			ev.preventDefault();
			ev.stopPropagation();
			ev.stopImmediatePropagation();
		};

		const onPointerDown = (ev: PointerEvent) => {
			swallow(ev);
			longPressFired = false;
			if (
				ev.button !== 0 ||
				ev.shiftKey ||
				ev.metaKey ||
				ev.ctrlKey
			) {
				return;
			}
			timer = window.setTimeout(() => {
				longPressFired = true;
				cbRef.current.onOpenMenu(ev);
			}, LONG_PRESS_MS);
		};

		const onPointerUp = (ev: PointerEvent) => {
			swallow(ev);
			clear();
		};

		const onClick = (ev: MouseEvent) => {
			swallow(ev);
			clear();
			if (longPressFired) {
				longPressFired = false;
				return;
			}
			if (ev.shiftKey) {
				cbRef.current.onOpenMenu(ev);
				return;
			}
			cbRef.current.onShortClick(ev);
		};

		const onContextMenu = (ev: MouseEvent) => {
			swallow(ev);
			clear();
			cbRef.current.onOpenMenu(ev);
		};

		// Block any other event Obsidian / CodeMirror might use to toggle
		// the task on the way down.
		const blocking: (keyof HTMLElementEventMap)[] = [
			"mousedown",
			"mouseup",
			"dblclick",
			"touchstart",
			"touchend",
		];
		for (const t of blocking) {
			el.addEventListener(t, swallow as EventListener);
		}
		el.addEventListener("pointerdown", onPointerDown);
		el.addEventListener("pointerup", onPointerUp);
		el.addEventListener("pointerleave", clear);
		el.addEventListener("pointercancel", clear);
		el.addEventListener("click", onClick);
		el.addEventListener("contextmenu", onContextMenu);

		return () => {
			clear();
			for (const t of blocking) {
				el.removeEventListener(t, swallow as EventListener);
			}
			el.removeEventListener("pointerdown", onPointerDown);
			el.removeEventListener("pointerup", onPointerUp);
			el.removeEventListener("pointerleave", clear);
			el.removeEventListener("pointercancel", clear);
			el.removeEventListener("click", onClick);
			el.removeEventListener("contextmenu", onContextMenu);
		};
	}, [ref]);
}
