import { useEffect, useRef, useState } from "react";
import { type IconTarget } from "../../types";
import { useCheckboxService, useMenuService } from "../contexts";
import { useSettings, useVariantMap } from "../hooks/useSettings";
import { useCheckboxInteractions } from "../hooks/useCheckboxInteractions";
import { CheckboxIcon } from "./CheckboxIcon";

interface CheckboxProps {
	/** The bracket character at mount time. */
	initialChar: string;
	target: IconTarget;
}

/**
 * Container component for a single live checkbox. Wires the icon's
 * interactions to the checkbox + menu services, owns the optimistic
 * character state, and keeps the parent task line's completed-line class
 * in sync.
 */
export function Checkbox({ initialChar, target }: CheckboxProps) {
	const [char, setChar] = useState(initialChar);
	const ref = useRef<HTMLSpanElement | null>(null);

	const settings = useSettings();
	const variantMap = useVariantMap();
	const checkboxService = useCheckboxService();
	const menuService = useMenuService();

	const variant = variantMap.get(char);

	// Mirror completed-line styling onto the parent line. In live preview
	// the parent is `.cm-line`; in reading view it's `li.task-list-item`.
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const lineEl =
			target.kind === "live"
				? el.closest<HTMLElement>(".cm-line")
				: el.closest<HTMLElement>("li.task-list-item");
		if (!lineEl) return;
		lineEl.classList.toggle(
			"ccb-completed-line",
			!!variant?.completed,
		);
	}, [variant?.completed, target.kind]);

	useCheckboxInteractions(ref, {
		onShortClick: async () => {
			const current = await checkboxService.readChar(target);
			if (current == null) return;
			const next =
				current === "" ? settings.defaultCheckedCharacter : "";
			setChar(next);
			await checkboxService.writeChar(target, next);
		},
		onOpenMenu: async (ev, dragMode) => {
			const current = await checkboxService.readChar(target);
			if (current == null) return;
			menuService.open({
				clientX: ev.clientX,
				clientY: ev.clientY,
				currentChar: current,
				dragMode,
				onSelect: (next) => {
					setChar(next);
					void checkboxService.writeChar(target, next);
				},
			});
		},
	});

	return <CheckboxIcon ref={ref} char={char} variant={variant} />;
}
