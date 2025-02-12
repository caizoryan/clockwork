import {
	Compartment,
	EditorState,
	EditorView,
	esLint,
	javascript,
	keymap,
	Linter,
	linter,
	lintGutter,
	syntaxHighlighting,
	syntaxTree,
	Vim,
	vim,
} from "./codemirror/bundled.js";
import {
	eff_on,
	html,
	mem,
	mounted,
	mut,
	sig,
} from "./solid_monke/solid_monke.js";
import { dracula, trigger_save } from "./script.js";

import {
	autocompletion,
	bracketMatching,
	closeBrackets,
	closeBracketsKeymap,
	completionKeymap,
	crosshairCursor,
	Decoration,
	defaultHighlightStyle,
	defaultKeymap,
	drawSelection,
	dropCursor,
	foldGutter,
	foldKeymap,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSelectionMatches,
	highlightSpecialChars,
	history,
	historyKeymap,
	indentOnInput,
	rectangularSelection,
	searchKeymap,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "./codemirror/bundled.js";

class CheckboxWidget extends WidgetType {
	constructor(checked) {
		super();
		this.checked = checked;
	}

	eq(other) {
		return other.checked == this.checked;
	}

	toDOM() {
		let wrap = document.createElement("span");
		wrap.setAttribute("aria-hidden", "true");
		wrap.className = "cm-boolean-toggle";
		let box = wrap.appendChild(document.createElement("input"));
		box.type = "checkbox";
		box.checked = this.checked;
		return wrap;
	}

	ignoreEvent() {
		return false;
	}
}

function checkboxes(view) {
	let widgets = [];
	for (let { from, to } of view.visibleRanges) {
		syntaxTree(view.state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name == "BooleanLiteral") {
					let isTrue = view.state.doc.sliceString(node.from, node.to) == "true";
					let deco = Decoration.widget({
						widget: new CheckboxWidget(isTrue),
						side: 1,
					});
					widgets.push(deco.range(node.to));
				}
			},
		});
	}
	return Decoration.set(widgets);
}

const checkboxPlugin = ViewPlugin.fromClass(
	class {
		constructor(view) {
			this.decorations = checkboxes(view);
		}

		update(update) {
			if (
				update.docChanged ||
				update.viewportChanged ||
				syntaxTree(update.startState) != syntaxTree(update.state)
			) {
				this.decorations = checkboxes(update.view);
			}
		}
	},
	{
		decorations: (v) => v.decorations,
		eventHandlers: {
			mousedown: (e, view) => {
				let target = e.target;
				if (
					target.nodeName == "INPUT" &&
					target.parentElement?.classList.contains("cm-boolean-toggle")
				) {
					return toggleBoolean(view, view.posAtDOM(target));
				}
			},
		},
	},
);

function toggleBoolean(view, pos) {
	let before = view.state.doc.sliceString(Math.max(0, pos - 5), pos);
	let change;
	if (before == "false") {
		change = { from: pos - 5, to: pos, insert: "true" };
	} else if (before.endsWith("true")) {
		change = { from: pos - 4, to: pos, insert: "false" };
	} else {
		return false;
	}
	view.dispatch({ changes: change });
	return true;
}

class ColorWidget extends WidgetType {}
function color(view) {}
function colorPlugin() {}

let basicSetup = (() => [
	highlightSpecialChars(),
	highlightActiveLine(),
	history(),
	bracketMatching(),
	indentOnInput(),
	drawSelection(),
	closeBrackets(),
	syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
	checkboxPlugin,
	keymap.of([
		...defaultKeymap,
		...historyKeymap,
		...foldKeymap,
	]),
])();

export function number_widget(element, i, controller) {
	let name = sig(element?.name ? element?.name : "variable");
	let num = register_model(name, element?.num ? element?.num : 0);
	let save = (el) => {
		el.num = num();
		el.name = name();
		el.output = `M.${name()} = ${num()}`;
	};

	let r = () =>
		html`
		style ---

		.number-widget {
			padding: .5em;
			font-family: monospace;
		  
		  display: grid;
			grid-template-columns: 1fr 1fr;
		}

		.number-widget input[type="text"] { margin: 0 .1em; }

		.number-widget input[type="range"] {
			margin: 0 .1em;
			background: #000;
		}


		---
		.number-widget [onclick=${(e) => {
			if (e.shiftKey) {
				controller.add_widget("block_editor", {
					source: renderers[element.type],
					name: element.type,
				});
			}
		}}]
			.values
				span -- M.
				input [ type=text oninput = ${(e) => {
			name.set(e.target.value);
		}} value=${element.name} ]
				span -- = ${num}

			.controls
				input [ type = range oninput=${(e) =>
			num.set(e.target.value)} value=${num} min=0 max=255 step=1]
`;
	return ({
		render: r,
		onselect: () => {},
		onediting: () => {},
		write: save,
	});
}

export function render_editor(element) {
	let code = mem(() => element?.source ? element?.source : "");
	let name = sig(element?.name ? element?.name : "none");
	let uid = Math.random().toString(36).substring(7);

	let focus, save;

	return ({
		render: () => {
			mounted(() => {
				let editor = make_code_mirror(code(), uid);
				focus = () => setTimeout(() => editor.focus(), 100);

				save = function (el) {
					el.focused = editor.hasFocus;
					let text = recursive_fucking_children(editor.state.doc).join("\n");
					el.cursor = editor.state.selection.ranges[0].from;

					el.source = text;
					el.name = name();
					register_renderer(name(), text);
				};

				setTimeout(() => {
					if (element.cursor && element.focused) {
						editor.focus();
						editor.dispatch({
							selection: { anchor: element.cursor, head: element.cursor },
						});
					}
				}, 50);
			});

			return html`
			div [ class = "editor" ]
				input [ type=text value=${name} oninput=${(e) =>
				name.set(e.target.value)} ]
				div [ class = ${"editor-" + uid} ]
			`;
		},

		onfocus: () => focus(),
		onselect: () => {},
		onediting: () => {},
		write: (...args) => save(...args),
	});
}

export function code_element(element) {
	let code = mem(() => element?.output ? element?.output : "");
	let uid = Math.random().toString(36).substring(7);
	let save, focus;

	return ({
		render: () => {
			mounted(() => {
				let editor = make_code_mirror(code(), uid);
				focus = () => setTimeout(() => editor.focus(), 100);

				save = function (el) {
					el.focused = editor.hasFocus;
					let text = recursive_fucking_children(editor.state.doc).join("\n");
					el.output = text;
					el.cursor = editor.state.selection.ranges[0].from;
				};

				setTimeout(() => {
					if (element.cursor && element.focused) {
						editor.focus();
						editor.dispatch({
							selection: { anchor: element.cursor, head: element.cursor },
						});
					}
				}, 10);
			});
			return html`div [ class = ${"editor-" + uid} ]`;
		},
		onfocus: () => focus(),
		write: (...args) => save(...args),
	});
}

export function wave_tiles(element) {
	let editor_save, focus, editor;
	let uid = element.id;

	let name = sig(element?.name || "raw_tiles_");
	let source = sig(element.source || `[]`);
	let code = mem(() => `const ${name()} = ${source()}`);

	let cursor = sig(element.index || 0);
	let editor_showing = sig(element.editor_showing || false);

	let cursor_next = () =>
		cursor() < tiles.data.length - 1 ? cursor.set(cursor() + 1) : cursor.set(0);
	let cursor_prev = () =>
		cursor() > 0 ? cursor.set(cursor() - 1) : cursor.set(tiles.data.length - 1);

	let toggle_editor = () => {
		if (editor_showing()) hide_editor();
		else {
			editor_showing.set(true);
			editor.focus();
		}
	};

	let hide_editor = () => {
		editor.contentDOM.blur();
		editor_showing.set(false);
	};

	let eval_tiles = () => {
		let new_code = `(function(){
			${code()}
			return ${name()}
		})()`;

		let tiles = eval_code(new_code);
		return tiles;
	};

	let tiles = mut({
		data: eval_tiles(),
		hidden: element.hidden ? [...element.hidden] : [],
	});

	let processed_tiles = mem(() =>
		tiles.data.filter((el) => !tiles.hidden.includes(el.src))
	);

	let toggle_tile = (src) => {
		if (tiles.hidden.includes(src)) {
			tiles.hidden = tiles.hidden.filter((str) => str != src);
		} else tiles.hidden.push(src);
	};

	let toggle_processed = () => using_processed.set(!using_processed());

	let processed_code = mem(() =>
		`const ${name()} = ${JSON.stringify(processed_tiles(), null, 2)}`
	);
	let using_processed = sig(element.using_processed ? true : false);

	let current = mem(() => tiles.data[cursor()]);

	const set_socket = (num, value) => {
		if (tiles.data[cursor()]) {
			tiles.data[cursor()].sockets[num] = value;
		}
	};

	let input = (x, y, angle, index) => {
		let style = `
			position: absolute;
			width: 90%;
			background: none;
			color: inherit;
			border: none;
			border-bottom: 1px solid white;
			height: 25px;
			top: ${y}%;
			left: ${x}%;
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			transform: rotate(${angle}deg);
		`;

		let el;
		let value = mem(() => tiles.data[cursor()]?.sockets[index]);
		let letters = ["a", "b", "c", "d"];

		let buttons = mem(() => {
			if (value()) {
				return value().split("").map((el, i) => atom_button(el, letters[i]));
			} else [];
		});

		let processed_value = mem(() => {
			let ret = buttons()?.map((el) => {
				if (el.value && typeof el.value == "function") {
					let val = el.value();
					console.log(val);

					if (val) {
						return (el.value() ? "1" : "0");
					} else return "0";
				} else {
					return "0";
				}
			}).join("");

			return ret;
		});

		eff_on(processed_value, () => {
			set_socket(index, processed_value());
			setTimeout(() => {
				editor.dispatch({
					changes: {
						from: 0,
						to: editor.state.doc.length,
						insert: JSON.stringify(tiles.data, null, 2),
					},
				});
			}, 50);
		});

		return html`
			div [style=${style}]
				each of ${buttons} as ${(el) => el.button}
			`;
	};

	let atom_button = (value, label) => {
		if ("string" == typeof value) value = value == "1" ? true : false;

		let on = sig(value || false);
		let style = mem(() =>
			on() ? "opacity: 1;background: yellow;color:black; " : "opacity: .5;"
		);

		let toggle_on = () => on.set(!on());

		let button = () =>
			html`button [onclick=${toggle_on} style=${style}] -- ${label}`;
		return {
			button,
			value: on,
		};
	};

	let buttons = () => {
		let style = `
			width: 100px;
			display: grid;
			padding: 1px;
			grid-template-columns: 1fr 1fr 1fr;

			`;

		return html`
			div
				button [onclick=${toggle_processed}] -- ${() =>
			using_processed() ? "Disable" : "Enable"}
				div [style = ${style}]
					each of ${tiles.data} as ${button}
			`;
	};

	let button = (item, i) => {
		let enabled = mem(() => !tiles.hidden.includes(item.src));
		let style = mem(() => `
			opacity: ${enabled() ? "1" : ".3"};
			width: 50px;
			border: ${cursor() === i() ? "5px solid yellow" : "none"};
			height: 50px;
			background-image: url(${item.src});
			background-size: contain;`);

		return html`button [style=${style} onclick = ${() =>
			toggle_tile(item.src)}] -- ${i}`;
	};

	let top_input = () => input(0, 0, 0, 0);
	let right_input = () => input(50, 50, 90, 1);
	let bottom_input = () => input(0, 90, 180, 2);
	let left_input = () => input(-40, 50, 270, 3);

	return {
		render: () => {
			mounted(() => {
				editor = make_code_mirror(source(), uid);
				// focus = () => editor_showing() ? setTimeout(() => editor.focus(), 100) : null
				focus = () => console.log("focus disabled");

				editor_save = function (el) {
					el.focused = editor.hasFocus;
					let text = recursive_fucking_children(editor.state.doc).join("\n");
					el.cursor = editor.state.selection.ranges[0].from;
					source.set(text);
				};

				setTimeout(() => {
					if (element.cursor && element.focused) {
						editor.focus();
						editor.dispatch({
							selection: { anchor: element.cursor, head: element.cursor },
						});
					}
				}, 50);
			});

			let editor_style = mem(() =>
				`height:${editor_showing() ? "auto" : "0px"};overflow:hidden;`
			);

			let set_name = (e) => {
				name.set(e.target.value);
			};

			let style = `
				.container-div {
					width: 100%;
					display: grid;
					grid-template-columns: 1fr 1fr;
					grid-gap: 10px;
					padding: 5px

				}

				button {
					background: none;
					color: inherit;
					border: none;
					margin: 0 5px;
				}

				input {
					background: none;
					color: inherit;
					border: none;
					border-bottom: 1px solid white;
					height: 25px;
				}
			`;

			return html`
			style -- ${style}
			div
					.container-div
						div
							.tile [style=padding:50px;position:relative;width:min-content;]
								span -- ${top_input}
								span -- ${right_input}
								span -- ${bottom_input}
								span -- ${left_input}
								img [src=${(mem(() => current()?.src))} style=width:300px]

						div [style=padding:10px]
							button [onclick=${cursor_prev}] -- prev
							span -- (${cursor})
							button [onclick=${cursor_next}] -- next

							p  
								span -- const ->
								input [oninput=${set_name} value=${name}]
								span -- ${name}
							p -- filename: ${() => current()?.src}
							div -- ${buttons} 

					div
						button [ onclick=${toggle_editor} ] -- ${
				mem(() => editor_showing() ? "hide" : "edit")
			}
						div [ class = ${"editor-" + uid} style=${editor_style}]
			`;
		},
		// onfocus: () => focus(),
		onediting: () => {},
		onkeydown: (e) => {
			if (e.key == "ArrowLeft") cursor_prev();
			if (e.key == "ArrowRight") cursor_next();
		},
		write: (el) => {
			editor_save(el);
			tiles.data = eval_tiles();

			el.using_processed = using_processed();
			el.hidden = [...tiles.hidden];
			el.source = source();
			el.output = using_processed() ? processed_code() : code();
			el.index = cursor();
			el.name = name();
			el.editor_showing = editor_showing();
		},
	};
}

export function make_code_mirror(code, id) {
	let lin = new Linter();
	const config = {
		globals: {
			"render": "readonly",
			"h": "readonly",
			"M": "readonly",
		},

		parserOptions: { ecmaVersion: 2019, sourceType: "module" },
		env: {
			browser: true,
			node: true,
			es6: true,
			es2015: true,
			es2017: true,
			es2020: true,
		},
		rules: {},
	};

	lin.getRules().forEach((desc, name2) => {
		if (desc.meta.docs.recommended) {
			config.rules[name2] = 2;
		}
	});

	Vim.defineEx("write", "w", (e) => {
		trigger_save();
	});

	let top_level_definitions = (editor) => {
		let items = [];
		let in_declaration = false;
		let found = false;
		let declaration_end;
		syntaxTree(editor.state).iterate({
			enter: (type) => {
				console.log(type.name, editor.state.sliceDoc(type.from, type.to));
				if (
					type.name === "VariableDeclaration" ||
					type.name === "FunctionDeclaration"
				) {
					if (found) {
						if (type.from > declaration_end) {
							found = false;
							in_declaration = true;
							declaration_end = type.to;
						}
					} else {
						in_declaration = true;
						declaration_end = type.to;
					}
				}

				if (type.name === "VariableDefinition") {
					if (in_declaration && !found) {
						items.push({
							from: type.from,
							to: type.to,
							text: editor.state.sliceDoc(type.from, type.to),
						});
						in_declaration = false;
						found = true;
					}
					return false;
				}
			},
		});
		console.log(items.map((x) => x.text));
	};

	const top_level_functions = (editor) => {
		let items = [];
		let in_declaration = false;
		let found = false;
		let declaration_end;
		syntaxTree(editor.state).iterate({
			enter: (type) => {
				if (type.name === "FunctionDeclaration") {
					if (found) {
						if (type.from > declaration_end) {
							found = false;
							in_declaration = true;
							declaration_end = type.to;
						}
					} else {
						in_declaration = true;
						declaration_end = type.to;
					}
				}

				if (type.name === "VariableDefinition") {
					if (in_declaration && !found) {
						items.push({
							from: type.from,
							to: type.to,
							text: editor.state.sliceDoc(type.from, type.to),
						});
						in_declaration = false;
						found = true;
					}
					return false;
				}
			},
		});
		console.log(items.map((x) => x.text));
	};

	let editor = new EditorView({
		parent: document.querySelector(".editor-" + id),
		state: EditorState.create({
			doc: code,
			extensions: [
				dracula,
				vim(),
				basicSetup,
				javascript(),
				linter(esLint(lin, config)),

				keymap.of([
					{
						key: "Escape",
						run: () => {
							console.log("variables");
							top_level_definitions(editor);
							console.log("functions");
							top_level_functions(editor);
							editor.contentDOM.blur();
							window.getSelection()?.removeAllRanges();
						},
					},
				]),
			],
		}),
	});

	return editor;
}

export function vector(e) {
	let x = e?.x || 0, y = e?.y || 0;
	let recorded = e?.recorded || [];
	let name = sig(e?.name || "vect");
	let size = sig(e?.size || 100);

	let vect = register_model(name, { x, y, recorded });
	let recording = sig(true);

	let toggle_recording = () => {
		if (recording()) {}
		else {
			vect.set({ x: vect().x, y: vect().y, recorded: [] });
		}
		recording.set(!recording());
	};

	let onmousemove = (e) => {
		if (recording()) {
			let recorded = vect().recorded;
			recorded.push({ x: e.layerX, y: e.layerY });
			vect.set({ x: e.layerX, y: e.layerY, recorded });
		}
	};

	let style = mem(() =>
		`position: absolute; top: 40px; left: 0; width: ${size()}px; height: ${size()}px; background: ${
			recording() ? "red" : "#ccc"
		};`
	);
	let ball = mem(() =>
		`position: absolute; top: ${vect().y}px; left: ${vect().x}px; width: 10px; height: 10px; background: yellow;`
	);
	let code = mem(() =>
		`M["${name()}"] = { x: ${vect().x}, y: ${vect().y}, recorded: ${
			JSON.stringify(vect().recorded)
		} }`
	);

	return {
		render: () =>
			html`
			div [style=${
				mem(() => `width:100%;position:relative;height:${size() + 60}px;`)
			}]
				input [ type=text value=${name} oninput=${(e) =>
				name.set(e.target.value)} ]
				input [ type=range value=${size} oninput=${(e) =>
				size.set(parseFloat(e.target.value))} min=0 max=500 step=1]
				div [ class = widget style=${style} onmousemove=${onmousemove} onclick=${toggle_recording} ]
					div [ class = widget style=${ball} onmousemove=${(e) =>
				e.stopImmediatePropagation()} ]
					`,
		onselect: () => {},
		onediting: () => {},
		write: (el) => {
			el.output = code();
			el.name = name();
			el.size = size();
			el.x = vect().x;
			el.y = vect().y;
			el.recorded = vect().recorded;
		},
	};
}
