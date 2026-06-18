import { useRef, useState } from "react";
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
 * interactions to the checkbox + menu services and owns the optimistic
 * character state.
 *
 * Completed-line styling (strikethrough on the surrounding `.cm-line` or
 * `li.task-list-item`) is handled purely in CSS via `:has()` matching on
 * `.ccb-checkbox[aria-checked="true"]`. We deliberately don't toggle a
 * class on the parent line imperatively from here: CodeMirror frequently
 * recreates / moves `.cm-line` nodes when the document or selection
 * changes, which would orphan any class we placed on the old line node
 * and silently strip the strikethrough.
 */
export function Checkbox({ initialChar, target }: CheckboxProps) {
	const [char, setChar] = useState(initialChar);
	const ref = useRef<HTMLSpanElement | null>(null);

	const settings = useSettings();
	const variantMap = useVariantMap();
	const checkboxService = useCheckboxService();
	const menuService = useMenuService();

	const variant = variantMap.get(char);

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
