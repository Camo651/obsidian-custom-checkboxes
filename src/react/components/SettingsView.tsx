import { type CSSProperties } from "react";
import { Notice } from "obsidian";
import {
	DEFAULT_SETTINGS,
	type CheckboxVariant,
	type CustomCheckboxesSettings,
} from "../../types";
import { makeId } from "../../utils";
import { useSettingsStore } from "../contexts";
import { useSettings } from "../hooks/useSettings";
import { CharacterSelect } from "./CharacterSelect";
import { SettingItem } from "./SettingItem";
import { Toggle } from "./Toggle";
import { VariantCard } from "./VariantCard";
import { DEFAULT_SVG_CHECK } from "src/icons";

const variantListStyle: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "0.75rem",
	marginTop: "1rem",
};

const variantActionsStyle: CSSProperties = {
	marginTop: "1rem",
	display: "flex",
	gap: "0.5rem",
	alignItems: "center",
	flexWrap: "wrap",
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

	const resetVariants = () => {
		// Destructive — confirm before nuking the user's customizations.
		// `window.confirm` is sufficient here; a custom Modal would be
		// overkill for a settings panel action.
		const ok = window.confirm(
			"Reset all variants to defaults? Your current variant list will be replaced.",
		);
		if (!ok) return;
		// Shallow-clone each default variant so future edits don't mutate
		// the DEFAULT_SETTINGS constant.
		update((s) => ({
			...s,
			variants: DEFAULT_SETTINGS.variants.map((v) => ({ ...v })),
		}));
		new Notice("Variants reset to defaults.");
	};

	return (
		<div className="ccb-settings">
			<h2>Custom Checkboxes</h2>

			<SettingItem
				name="Next character for empty boxes"
				desc="What an empty checkbox switches to when short-clicked. Each variant below can override its own 'next'."
			>
				<CharacterSelect
					value={settings.defaultCheckedCharacter}
					excludeChar=""
					onChange={(v) =>
						update((s) => ({
							...s,
							defaultCheckedCharacter: v,
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

			<SettingItem
				name="Bounce animation"
				desc="Play a small bounce on the icon whenever a checkbox's character changes."
			>
				<Toggle
					checked={settings.enableBounceAnimation}
					onChange={(v) =>
						update((s) => ({
							...s,
							enableBounceAnimation: v,
						}))
					}
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

			<div style={variantActionsStyle}>
				<button className="mod-cta" onClick={addVariant}>
					Add variant
				</button>
				<button onClick={resetVariants}>
					Reset to defaults
				</button>
			</div>
		</div>
	);
}
