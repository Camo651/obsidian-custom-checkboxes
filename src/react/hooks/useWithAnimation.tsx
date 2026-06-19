import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
} from "react";

interface AnimationHandle {
	/** Re-trigger the CSS animation on the wrapper element. Safe to call repeatedly. */
	play: () => void;
	/** Wrapper component. Render your subtree inside it for `play()` to take effect. */
	WithAnimation: (props: { children: ReactNode }) => ReactElement;
}

/** Pending animations keyed by `persistKey`, used to hand off across React unmount/remount. */
const pendingAnimations = new Map<string, number>();
const PERSIST_TTL_MS = 500;

/**
 * Imperatively trigger a named CSS animation on a wrapping element.
 *
 * If `persistKey` is provided, `play()` also leaves a short-lived flag so a
 * freshly-mounted instance with the same key replays the animation —
 * useful when an external system (CodeMirror, Obsidian's renderer) tears the
 * subtree down between the call to `play()` and the visible repaint.
 */
export function useWithAnimation(
	animationClass: string,
	persistKey?: string,
): AnimationHandle {
	const ref = useRef<HTMLDivElement | null>(null);

	const trigger = useCallback(() => {
		const el = ref.current;
		if (!el || !el.isConnected) return;
		el.classList.remove(animationClass);
		void el.offsetWidth;
		el.classList.add(animationClass);
	}, [animationClass]);

	const play = useCallback(() => {
		trigger();
		if (persistKey) pendingAnimations.set(persistKey, Date.now());
	}, [trigger, persistKey]);

	useEffect(() => {
		if (!persistKey) return;
		const ts = pendingAnimations.get(persistKey);
		if (ts === undefined) return;
		pendingAnimations.delete(persistKey);
		if (Date.now() - ts < PERSIST_TTL_MS) {
			const id = requestAnimationFrame(trigger);
			return () => cancelAnimationFrame(id);
		}
	}, []);

	const WithAnimation = useCallback(
		({ children }: { children: ReactNode }) => (
			<div ref={ref} style={{ display: "inline-block" }}>
				{children}
			</div>
		),
		[],
	);

	return { play, WithAnimation };
}
