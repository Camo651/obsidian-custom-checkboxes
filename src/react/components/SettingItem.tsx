import { type CSSProperties, type ReactNode } from "react";

interface SettingItemProps {
	name: string;
	desc?: string;
	children: ReactNode;
}

/** Light-weight stand-in for Obsidian's `new Setting(containerEl)` builder.
 *  Uses the same `setting-item*` class names so the styling stays
 *  consistent with the rest of Obsidian's settings UI — those classes are
 *  provided by the host app, so we don't need to inline them. */
export function SettingItem({ name, desc, children }: SettingItemProps) {
	return (
		<div className="setting-item">
			<div className="setting-item-info">
				<div className="setting-item-name">{name}</div>
				{desc && (
					<div className="setting-item-description">{desc}</div>
				)}
			</div>
			<div className="setting-item-control">{children}</div>
		</div>
	);
}

interface ToggleProps {
	checked: boolean;
	onChange: (next: boolean) => void;
}

const toggleHiddenInput: CSSProperties = { display: "none" };

export function Toggle({ checked, onChange }: ToggleProps) {
	return (
		<div
			className={"checkbox-container" + (checked ? " is-enabled" : "")}
			role="switch"
			aria-checked={checked}
			tabIndex={0}
			onClick={() => onChange(!checked)}
			onKeyDown={(e) => {
				if (e.key === " " || e.key === "Enter") {
					e.preventDefault();
					onChange(!checked);
				}
			}}
		>
			<input
				type="checkbox"
				checked={checked}
				readOnly
				style={toggleHiddenInput}
			/>
		</div>
	);
}
