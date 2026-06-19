import { type ReactNode } from "react";

interface SettingItemProps {
	name: string;
	desc?: string;
	children: ReactNode;
}

/** A row in the settings panel, styled to match Obsidian's native settings UI. */
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
