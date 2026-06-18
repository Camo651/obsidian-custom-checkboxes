type Listener = () => void;

export interface MenuRequest {
	clientX: number;
	clientY: number;
	currentChar: string;
	/** True when the menu is being opened mid-gesture (a long-press on the
	 *  checkbox where the user hasn't lifted the pointer yet). The menu
	 *  uses this to enable drag-to-select: pointermove highlights the item
	 *  under the cursor, pointerup selects it. */
	dragMode?: boolean;
	onSelect: (char: string) => void;
}

export interface MenuState {
	open: boolean;
	request: MenuRequest | null;
}

const CLOSED: MenuState = { open: false, request: null };

/**
 * Singleton store for the variant menu. A single `<MenuRoot>` mounted at
 * plugin load subscribes to this service and renders the menu when open.
 * Any number of checkboxes (each in its own React tree) can call `open()`
 * — the service replaces any prior request, so only one menu is on
 * screen at a time.
 */
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

	open = (request: MenuRequest): void => {
		this.state = { open: true, request };
		this.notify();
	};

	close = (): void => {
		if (!this.state.open) return;
		this.state = CLOSED;
		this.notify();
	};

	private notify(): void {
		this.listeners.forEach((l) => l());
	}
}
