import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { DEFAULT_SVG_EMPTY } from "src/icons";
import { useSettings } from "../hooks/useSettings";
import { MenuItem, type MenuRow } from "./MenuItem";

interface VariantMenuProps {
	clientX: number;
	clientY: number;
	/** Character currently in the brackets, used to highlight the active row. */
	currentChar: string;
	/** True when the menu was opened mid long-press; enables drag-to-select. */
	dragMode?: boolean;
	onSelect: (char: string) => void;
	onClose: () => void;
}

const EMPTY_ROW: MenuRow = {
	char: "",
	label: "Empty",
	svgSource: DEFAULT_SVG_EMPTY,
	color: "",
};

/** Floating menu listing all variants, with keyboard, hover, and drag selection. */
export function VariantMenu({
	clientX,
	clientY,
	currentChar,
	dragMode = false,
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

	const rowsRef = useRef(rows);
	rowsRef.current = rows;
	const focusIdxRef = useRef(focusIdx);
	focusIdxRef.current = focusIdx;
	const selectRef = useRef(select);
	selectRef.current = select;

	useEffect(() => {
		if (!dragMode) return;

		const findRowAt = (
			x: number,
			y: number,
		): { idx: number; char: string } | null => {
			const el = document.elementFromPoint(
				x,
				y,
			) as HTMLElement | null;
			const itemEl = el?.closest<HTMLElement>("[data-ccb-menu-idx]");
			if (!itemEl) return null;
			const idx = parseInt(itemEl.dataset.ccbMenuIdx ?? "", 10);
			if (Number.isNaN(idx)) return null;
			const row = rowsRef.current[idx];
			if (!row) return null;
			return { idx, char: row.char };
		};

		const onPointerMove = (e: PointerEvent) => {
			const hit = findRowAt(e.clientX, e.clientY);
			if (hit) setFocusIdx(hit.idx);
		};

		const onPointerUp = (e: PointerEvent) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			const hit = findRowAt(e.clientX, e.clientY);
			if (hit) {
				selectRef.current(hit.char);
			} else {
				onClose();
			}
		};

		document.addEventListener("pointermove", onPointerMove, true);
		document.addEventListener("pointerup", onPointerUp, true);
		return () => {
			document.removeEventListener(
				"pointermove",
				onPointerMove,
				true,
			);
			document.removeEventListener("pointerup", onPointerUp, true);
		};
	}, [dragMode, onClose]);

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
				animation: "ccb-menu-in 80ms ease-out",
				transformOrigin: "top left",
				left: position.left,
				top: position.top,
				visibility: position.visible ? "visible" : "hidden",
			}}
		>
			<div
				ref={trapRef}
				tabIndex={-1}
				style={{
					position: "absolute",
					opacity: 0,
					pointerEvents: "none",
				}}
			/>
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
