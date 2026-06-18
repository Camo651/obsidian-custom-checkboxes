import { type CSSProperties } from "react";
import { Notice } from "obsidian";
import {
	DEFAULT_SVG_CHECK,
	type CheckboxVariant,
	type CustomCheckboxesSettings,
} from "../../types";
import { makeId } from "../../utils";
import { useSettingsStore } from "../contexts";
import { useSettings } from "../hooks/useSettings";
import { SettingItem, Toggle } from "./SettingItem";
import { VariantCard } from "./VariantCard";

const variantListStyle: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "0.75rem",
	marginTop: "1rem",
};

const addButtonWrapStyle: CSSProperties = {
	marginTop: "1rem",
};

/** Top-level settings view. Reads/writes through the SettingsStore so any
 *  changes here propagate to every mounted checkbox automatically. */
export function SettingsView() {
	const settings = useSettings();
	const store = useSettingsStore();

	const update = (
		producer: (s: CustomCheckboxesSettings) => CustomCheckboxesSettings,
	) => store.setState(producer);

	const updateVariant = (
		index: number,
		patch: Partial<CheckboxVariant>,
	) =>
		update((s) => ({
			...s,
			variants: s.variants.map((v, i) =>
				i === index ? { ...v, ...patch } : v,
			),
		}));

	const moveVariant = (index: number, dir: -1 | 1) =>
		update((s) => {
			const variants = s.variants.slice();
			const j = index + dir;
			if (j < 0 || j >= variants.length) return s;
			[variants[index], variants[j]] = [variants[j], variants[index]];
			return { ...s, variants };
		});

	const deleteVariant = (index: number) =>
		update((s) => ({
			...s,
			variants: s.variants.filter((_, i) => i !== index),
		}));

	const addVariant = () =>
		update((s) => ({
			...s,
			variants: [
				...s.variants,
				{
					id: makeId(),
					character: "",
					name: "New variant",
					svgSource: DEFAULT_SVG_CHECK,
					completed: false,
					color: "",
				},
			],
		}));

	return (
		<div className="ccb-settings">
			<h2>Custom Checkboxes</h2>

			<SettingItem
				name="Icon size"
				desc="CSS length for the rendered checkbox icon. Examples: '1.15em', '18px'."
			>
				<input
					type="text"
					value={settings.iconSize}
					onChange={(e) =>
						update((s) => ({
							...s,
							iconSize: e.target.value.trim() || "1.15em",
						}))
					}
				/>
			</SettingItem>

			<SettingItem
				name="Default 'checked' character"
				desc="What an empty checkbox becomes when short-clicked. Default 'x'."
			>
				<input
					type="text"
					value={settings.defaultCheckedCharacter}
					onChange={(e) =>
						update((s) => ({
							...s,
							defaultCheckedCharacter: (
								e.target.value || "x"
							).slice(0, 1),
						}))
					}
				/>
			</SettingItem>

			<SettingItem name="Enable in Reading view">
				<Toggle
					checked={settings.enableReadingView}
					onChange={(v) => {
						update((s) => ({ ...s, enableReadingView: v }));
						new Notice(
							"Reload Obsidian to apply Reading view toggle.",
						);
					}}
				/>
			</SettingItem>

			<SettingItem name="Enable in Live Preview / Source">
				<Toggle
					checked={settings.enableLivePreview}
					onChange={(v) => {
						update((s) => ({ ...s, enableLivePreview: v }));
						new Notice(
							"Reload Obsidian to apply Live Preview toggle.",
						);
					}}
				/>
			</SettingItem>

			<h3>Variants</h3>
			<p className="setting-item-description">
				Configure each character that can appear inside [ ]. Each
				variant gets its own icon. Use a single character per
				variant — Obsidian's task renderer only recognizes
				single-character markers.
			</p>

			<div style={variantListStyle}>
				{settings.variants.map((variant, index) => (
					<VariantCard
						key={variant.id}
						variant={variant}
						index={index}
						total={settings.variants.length}
						onChange={(patch) => updateVariant(index, patch)}
						onMove={(dir) => moveVariant(index, dir)}
						onDelete={() => deleteVariant(index)}
					/>
				))}
			</div>

			<div style={addButtonWrapStyle}>
				<button className="mod-cta" onClick={addVariant}>
					Add variant
				</button>
			</div>
		</div>
	);
}
