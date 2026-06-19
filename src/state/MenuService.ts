type Listener = () => void;

/**
 * A request to open the variant menu.
 */
export interface MenuRequest {
	clientX: number;
	clientY: number;
	/** Character currently in the brackets, used to highlight the active row. */
	currentChar: string;
	/** True when the menu was opened mid-gesture (long-press still down). Enables drag-to-select. */
	dragMode?: boolean;
	onSelect: (char: string) => void;
}

/**
 * Current state of the menu service.
 */
export interface MenuState {
	open: boolean;
	request: MenuRequest | null;
}

const CLOSED: MenuState = { open: false, request: null };

/** Singleton store for the variant menu. Only one menu request is on screen at a time. */
export class MenuService {
	private state: MenuState = CLOSED;
	private listeners = new Set<Listener>();

	getState = (): MenuState => this.state;

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	/** Open the menu, replacing any prior request. */
	open = (request: MenuRequest): void => {
		this.state = { open: true, request };
		this.notify();
	};

	/** Close the menu. No-op if already closed. */
	close = (): void => {
		if (!this.state.open) return;
		this.state = CLOSED;
		this.notify();
	};

	private notify(): void {
		this.listeners.forEach((l) => l());
	}
}
