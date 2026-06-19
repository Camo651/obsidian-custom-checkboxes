import { useRef, useState } from "react";
import { type IconTarget } from "../../types";
import { useCheckboxService, useMenuService } from "../contexts";
import { useSettings, useVariantMap } from "../hooks/useSettings";
import { useCheckboxInteractions } from "../hooks/useCheckboxInteractions";
import { CheckboxIcon } from "./CheckboxIcon";

interface CheckboxProps {
	/** The bracket character at mount time. */
	initialChar: string;
	/** Where to read/write the bracketed character. */
	target: IconTarget;
}

/** Container for a single live checkbox: wires interactions to services and owns the optimistic char state. */
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
			const currentVariant = variantMap.get(current);
			const next =
				currentVariant?.next !== undefined
					? currentVariant.next
					: current === ""
					? settings.defaultCheckedCharacter
					: "";
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
