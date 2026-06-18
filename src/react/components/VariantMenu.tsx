import {
	type CSSProperties,
	forwardRef,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { DEFAULT_SVG_CHECK, DEFAULT_SVG_EMPTY } from "../../types";
import { useSettings } from "../hooks/useSettings";
import { SafeSvg } from "./SafeSvg";

interface VariantMenuProps {
	clientX: number;
	clientY: number;
	currentChar: string;
	onSelect: (char: string) => void;
	onClose: () => void;
}

interface MenuRow {
	char: string;
	label: string;
	svgSource: string;
	color: string;
}

const EMPTY_ROW: MenuRow = {
	char: "",
	label: "Empty",
	svgSource: DEFAULT_SVG_EMPTY,
	color: "",
};

/* -------------------------- styles -------------------------- */

const menuStyle: CSSProperties = {
	position: "fixed",
	zIndex: 1000,
	minWidth: 200,
	maxWidth: 320,
	maxHeight: "min(60vh, 480px)",
	overflowY: "auto",
	padding: 4,
	background: "var(--background-primary)",
	color: "var(--text-normal)",
	border: "1px solid var(--background-modifier-border)",
	borderRadius: "var(--radius-m, 8px)",
	boxShadow: "var(--shadow-s, 0 8px 24px rgba(0, 0, 0, 0.25))",
	fontSize: "var(--font-ui-small, 13px)",
	fontFamily: "var(--font-interface)",
	outline: "none",
	// Keyframes themselves live in styles.css — only the `animation`
	// shorthand is inline.
	animation: "ccb-menu-in 80ms ease-out",
	transformOrigin: "top left",
};

const trapStyle: CSSProperties = {
	position: "absolute",
	opacity: 0,
	pointerEvents: "none",
};

const itemStyle: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1.4em 1.25em 1fr auto 1em",
	alignItems: "center",
	gap: 10,
	padding: "6px 10px",
	borderRadius: "var(--radius-s, 4px)",
	cursor: "pointer",
	userSelect: "none",
	WebkitUserSelect: "none",
	lineHeight: 1.3,
};

const itemFocusedStyle: CSSProperties = {
	background: "var(--background-modifier-hover)",
};

const numberBadgeBase: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: "1.4em",
	height: "1.4em",
	fontFamily: "var(--font-monospace)",
	fontSize: "0.78em",
	fontWeight: 600,
	color: "var(--text-muted)",
	background: "var(--background-modifier-border)",
	borderRadius: "var(--radius-s, 4px)",
	lineHeight: 1,
};

const numberBadgeEmpty: CSSProperties = {
	background: "transparent",
};

const numberBadgeFocused: CSSProperties = {
	color: "var(--text-on-accent, var(--text-normal))",
	background: "var(--interactive-accent, var(--background-modifier-border))",
};

const itemIconStyle: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: "1.25em",
	height: "1.25em",
	color: "var(--text-normal)",
};

const itemLabelStyle: CSSProperties = {
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
};

const itemCharStyle: CSSProperties = {
	fontFamily: "var(--font-monospace)",
	fontSize: "0.82em",
	color: "var(--text-muted)",
	background: "var(--background-modifier-border)",
	padding: "1px 6px",
	borderRadius: 3,
	minWidth: "1.4em",
	textAlign: "center",
	lineHeight: 1.4,
};

const itemCheckBase: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: "1em",
	height: "1em",
	color: "var(--text-accent, var(--interactive-accent))",
	visibility: "hidden",
};

const itemCheckActive: CSSProperties = {
	visibility: "visible",
};

const itemLabelActive: CSSProperties = {
	fontWeight: 600,
};

/* -------------------------- component -------------------------- */

export function VariantMenu({
	clientX,
	clientY,
	currentChar,
	onSelect,
	onClose,
}: VariantMenuProps) {
	const { variants } = useSettings();

	const rows = useMemo<MenuRow[]>(() => {
		const list: MenuRow[] = [EMPTY_ROW];
		for (const v of variants) {
			if (v.character === "") continue;
			list.push({
				char: v.character,
				label: v.name || `[${v.character}]`,
				svgSource: v.svgSource,
				color: v.color,
			});
		}
		return list;
	}, [variants]);

	const [focusIdx, setFocusIdx] = useState(() =>
		Math.max(0, rows.findIndex((r) => r.char === currentChar)),
	);

	const menuRef = useRef<HTMLDivElement | null>(null);
	const trapRef = useRef<HTMLDivElement | null>(null);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [position, setPosition] = useState({
		left: clientX,
		top: clientY,
		visible: false,
	});

	const select = (char: string) => {
		onSelect(char);
		onClose();
	};

	// Position after layout so we can measure dimensions and flip if
	// there's no room below / to the right of the cursor.
	useLayoutEffect(() => {
		const el = menuRef.current;
		if (!el) return;
		const margin = 6;
		const rect = el.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		let x = clientX;
		let y = clientY;
		if (x + rect.width + margin > vw) {
			x = Math.max(margin, vw - rect.width - margin);
		}
		if (y + rect.height + margin > vh) {
			y = Math.max(margin, clientY - rect.height);
		}
		setPosition({ left: x, top: y, visible: true });
	}, [clientX, clientY]);

	useEffect(() => {
		trapRef.current?.focus({ preventScroll: true });
	}, []);

	useEffect(() => {
		itemRefs.current[focusIdx]?.scrollIntoView({ block: "nearest" });
	}, [focusIdx]);

	// Outside-click + window-level dismissal. The mousedown listener is
	// installed on a microtask delay so the gesture that opened the menu
	// doesn't immediately close it.
	useEffect(() => {
		const onDocMouseDown = (e: MouseEvent) => {
			if (!menuRef.current?.contains(e.target as Node)) onClose();
		};
		const id = window.setTimeout(() => {
			document.addEventListener("mousedown", onDocMouseDown, true);
		}, 0);
		const onScroll = () => onClose();
		window.addEventListener("blur", onClose);
		window.addEventListener("resize", onClose);
		window.addEventListener("scroll", onScroll, true);
		return () => {
			window.clearTimeout(id);
			document.removeEventListener("mousedown", onDocMouseDown, true);
			window.removeEventListener("blur", onClose);
			window.removeEventListener("resize", onClose);
			window.removeEventListener("scroll", onScroll, true);
		};
	}, [onClose]);

	// Latest-state refs so the document-level keydown listener can read
	// the current rows / focus index without re-attaching every render.
	const rowsRef = useRef(rows);
	rowsRef.current = rows;
	const focusIdxRef = useRef(focusIdx);
	focusIdxRef.current = focusIdx;
	const selectRef = useRef(select);
	selectRef.current = select;

	/* ----------------------------------------------------------------- *
	 * Keyboard handling.
	 *
	 * Attached at document level with capture so we receive key events
	 * regardless of where focus actually lives. This matters because the
	 * menu often opens while focus is still inside CodeMirror's
	 * contenteditable — a React `onKeyDown` on the menu div would never
	 * fire (the event originates outside our React root and CodeMirror
	 * consumes it on the way down). Capture phase + stopImmediate
	 * Propagation also makes sure neither CodeMirror nor Obsidian's
	 * hotkey scope sees the digit keys we want to claim.
	 * ----------------------------------------------------------------- */
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const rows = rowsRef.current;
			const focusIdx = focusIdxRef.current;
			const select = selectRef.current;

			const claim = () => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			};

			switch (e.key) {
				case "Escape":
					claim();
					onClose();
					return;
				case "ArrowDown":
					claim();
					setFocusIdx((i) => (i + 1) % rows.length);
					return;
				case "ArrowUp":
					claim();
					setFocusIdx(
						(i) => (i - 1 + rows.length) % rows.length,
					);
					return;
				case "Home":
					claim();
					setFocusIdx(0);
					return;
				case "End":
					claim();
					setFocusIdx(rows.length - 1);
					return;
				case "Enter":
				case " ": {
					claim();
					const row = rows[focusIdx];
					if (row) select(row.char);
					return;
				}
			}
			// Digit 1–9 picks the row at that 1-based position. Skip
			// when modifiers are held so the host app's shortcuts
			// (e.g. Cmd-1 to switch tabs) still work.
			if (
				e.key >= "1" &&
				e.key <= "9" &&
				!e.metaKey &&
				!e.ctrlKey &&
				!e.altKey
			) {
				const idx = parseInt(e.key, 10) - 1;
				if (idx < rows.length) {
					claim();
					const row = rows[idx];
					if (row) select(row.char);
				}
			}
		};
		document.addEventListener("keydown", handler, true);
		return () => {
			document.removeEventListener("keydown", handler, true);
		};
	}, [onClose]);

	return (
		<div
			ref={menuRef}
			role="menu"
			style={{
				...menuStyle,
				left: position.left,
				top: position.top,
				visibility: position.visible ? "visible" : "hidden",
			}}
		>
			<div ref={trapRef} tabIndex={-1} style={trapStyle} />
			{rows.map((row, idx) => (
				<MenuItem
					key={`${row.char}-${idx}`}
					ref={(el) => {
						itemRefs.current[idx] = el;
					}}
					row={row}
					index={idx}
					isActive={row.char === currentChar}
					isFocused={idx === focusIdx}
					onHover={() => {
						if (focusIdx !== idx) setFocusIdx(idx);
					}}
					onClick={() => select(row.char)}
				/>
			))}
		</div>
	);
}

interface MenuItemProps {
	row: MenuRow;
	index: number;
	isActive: boolean;
	isFocused: boolean;
	onHover: () => void;
	onClick: () => void;
}

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
	{ row, index, isActive, isFocused, onHover, onClick },
	ref,
) {
	const iconSource =
		row.svgSource || (row.char === "" ? DEFAULT_SVG_EMPTY : "");
	const showNumber = index < 9;

	return (
		<div
			ref={ref}
			role="menuitem"
			tabIndex={-1}
			onMouseMove={onHover}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick();
			}}
			style={{
				...itemStyle,
				...(isFocused ? itemFocusedStyle : null),
			}}
		>
			<span
				style={{
					...numberBadgeBase,
					...(showNumber ? null : numberBadgeEmpty),
					...(isFocused ? numberBadgeFocused : null),
				}}
			>
				{showNumber ? index + 1 : ""}
			</span>
			<span
				style={{
					...itemIconStyle,
					color: row.color || itemIconStyle.color,
				}}
			>
				<SafeSvg source={iconSource} fallback={row.char} />
			</span>
			<span
				style={{
					...itemLabelStyle,
					...(isActive ? itemLabelActive : null),
				}}
			>
				{row.label}
			</span>
			<span style={itemCharStyle}>
				{row.char === "" ? " " : row.char}
			</span>
			<span
				style={{
					...itemCheckBase,
					...(isActive ? itemCheckActive : null),
				}}
			>
				<SafeSvg source={DEFAULT_SVG_CHECK} />
			</span>
		</div>
	);
});
