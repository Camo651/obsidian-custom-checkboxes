import { type RefObject, useEffect, useRef } from "react";
import { LONG_PRESS_MS } from "../../types";

interface CheckboxInteractionCallbacks {
	/** Plain click */
	onShortClick: (ev: MouseEvent) => void;
	/** Open the variant menu. `dragMode` is true when the gesture began with a long-press. */
	onOpenMenu: (
		ev: MouseEvent | PointerEvent,
		dragMode: boolean,
	) => void;
}

/**
 * Wire native event listeners on a checkbox icon.
 *
 * Uses native `addEventListener` rather than React's synthetic events so we can
 * preempt Obsidian's CodeMirror task-toggle handler before it runs.
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
				cbRef.current.onOpenMenu(ev, true);
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
				cbRef.current.onOpenMenu(ev, false);
				return;
			}
			cbRef.current.onShortClick(ev);
		};

		const onContextMenu = (ev: MouseEvent) => {
			swallow(ev);
			clear();
			cbRef.current.onOpenMenu(ev, false);
		};

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
