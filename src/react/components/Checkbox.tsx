import { useMemo, useRef, useState } from "react";
import { type IconTarget } from "../../types";
import { useCheckboxService, useMenuService } from "../contexts";
import { useSettings, useVariantMap } from "../hooks/useSettings";
import { useCheckboxInteractions } from "../hooks/useCheckboxInteractions";
import { useWithAnimation } from "../hooks/useWithAnimation";
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

	const persistKey = useMemo(() => {
		if (target.kind !== "live") return undefined;
		const n = target.getLineNumber();
		return n != null ? `live:${n}` : undefined;
	}, [target]);

	const { play: playBounce, WithAnimation } = useWithAnimation(
		"ccb-bounce",
		persistKey,
	);

	const bounce = () => {
		if (settings.enableBounceAnimation){
			playBounce()
		};
	};

	useCheckboxInteractions(ref, {
		onShortClick: async () => {
			const current = await checkboxService.readChar(target);
			if (current == null) return;
			const currentVariant = variantMap.get(current);
			// The empty (" ") variant's `next` is the global "what does empty
			// turn into on click" value. All other variants fall back to ""
			// (i.e. clicking an already-checked box clears it).
			const next = currentVariant?.next ?? "";
			setChar(next);
			bounce();
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
					bounce();
					void checkboxService.writeChar(target, next);
				},
			});
		},
		onQuickPick: (digit) => {
			// Quick-pick rows mirror the variant menu's row order. The empty
			// variant is always present in the variant list, so we can map
			// digits directly onto the variant array.
			const next = settings.variants[digit - 1]?.character;
			if (next === undefined) return;
			setChar(next);
			bounce();
			void checkboxService.writeChar(target, next);
		},
	});

	return (
		<WithAnimation>
			<CheckboxIcon ref={ref} char={char} variant={variant} />
		</WithAnimation>
	);
}
