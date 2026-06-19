import { useSettings } from "../hooks/useSettings";

interface CharacterSelectProps {
	/** Currently-selected character. Empty string represents the empty checkbox. */
	value: string;
	onChange: (next: string) => void;
	/** Include "(empty)" as a selectable option. Ignored when `excludeChar === ""`. */
	includeEmpty?: boolean;
	/** Character to omit from the option list (typically the variant being edited). */
	excludeChar?: string;
}

const ERROR_COLOR = "var(--text-error, #e11d48)";

/** Dropdown of all configured variant characters. Highlights the value in red when it's no longer a valid option. */
export function CharacterSelect({
	value,
	onChange,
	includeEmpty = false,
	excludeChar,
}: CharacterSelectProps) {
	const { variants } = useSettings();

	const options: { value: string; label: string }[] = [];
	const seen = new Set<string>();

	if (includeEmpty && excludeChar !== "") {
		options.push({ value: "", label: "(empty)" });
		seen.add("");
	}

	for (const v of variants) {
		if (v.character === excludeChar) continue;
		if (seen.has(v.character)) continue;
		seen.add(v.character);
		const display = v.character === "" ? "(empty)" : `[${v.character}]`;
		options.push({
			value: v.character,
			label: v.name ? `${display} ${v.name}` : display,
		});
	}

	const isValid = options.some((o) => o.value === value);

	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			style={{
				width: "100%",
				boxSizing: "border-box",
				color: isValid ? undefined : ERROR_COLOR,
				borderColor: isValid ? undefined : ERROR_COLOR,
			}}
		>
			{!isValid && (
				<option value={value} style={{ color: ERROR_COLOR }}>
					{value === "" ? "(empty)" : `[${value}]`} — no longer valid
				</option>
			)}
			{options.map((o) => (
				<option key={o.value || "__empty"} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	);
}
