import { EditorState, syntaxHighlighting, EditorView, javascript, keymap, esLint, lintGutter, linter, Linter, Compartment, vim, Vim, syntaxTree } from "./codemirror/bundled.js"
import { html, mem, mounted, sig, } from "./solid_monke/solid_monke.js";
import { dracula, trigger_save } from "./script.js";

import {
	autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
	searchKeymap, highlightSelectionMatches,
	defaultKeymap, history, historyKeymap,
	highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
	rectangularSelection, crosshairCursor,
	highlightActiveLineGutter,
	defaultHighlightStyle, indentOnInput, bracketMatching,
	foldGutter, foldKeymap,
} from "./codemirror/bundled.js";

let basicSetup = (() => [
	highlightSpecialChars(),
	highlightActiveLine(),
	history(),
	indentOnInput(),
	drawSelection(),
	closeBrackets(),
	syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
	keymap.of([
		...defaultKeymap,
		...historyKeymap,
	])
])()

export function number_widget(element, i, controller) {
	let name = sig(element?.name ? element?.name : "variable")
	let num = register_model(name, element?.num ? element?.num : 0)
	let save = (el) => {
		el.num = num()
		el.name = name()
		el.output = `M.${name()} = ${num()}`
	}

	let r = () => html`
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
					name: element.type
				})
			}
		}}]
			.values
				span -- M.
				input [ type=text oninput = ${(e) => { name.set(e.target.value); }} value=${element.name} ]
				span -- = ${num}

			.controls
				input [ type = range oninput=${(e) => num.set(e.target.value)} value=${num} min=0 max=255 step=1]
`
	return ({
		render: r,
		onselect: () => { },
		onediting: () => { },
		write: save

	})
}

export function render_editor(element) {
	let code = mem(() => element?.source ? element?.source : "")
	let name = sig(element?.name ? element?.name : "none")
	let uid = Math.random().toString(36).substring(7)

	let focus, save;

	return ({
		render: () => {

			mounted(() => {
				let editor = make_code_mirror(code(), uid)
				focus = () => setTimeout(() => editor.focus(), 100)

				save = function(el) {
					el.focused = editor.hasFocus
					let text = recursive_fucking_children(editor.state.doc).join("\n");
					el.cursor = editor.state.selection.ranges[0].from

					el.source = text
					el.name = name()
					register_renderer(name(), text)
				}

				setTimeout(() => {
					if (element.cursor && element.focused) {
						editor.focus()
						editor.dispatch({ selection: { anchor: element.cursor, head: element.cursor } })
					}
				}, 50)
			})

			return html`
			div [ class = "editor" ]
				input [ type=text value=${name} oninput=${(e) => name.set(e.target.value)} ]
				div [ class = ${"editor-" + uid} ]
			`},

		onfocus: () => focus(),
		onselect: () => { },
		onediting: () => { },
		write: (...args) => save(...args)

	})
}


export function code_element(element) {

	let code = mem(() => element?.output ? element?.output : "")
	let uid = Math.random().toString(36).substring(7)
	let save, focus

	return ({
		render: () => {
			mounted(() => {
				let editor = make_code_mirror(code(), uid)
				focus = () => setTimeout(() => editor.focus(), 100)

				save = function(el) {
					el.focused = editor.hasFocus
					let text = recursive_fucking_children(editor.state.doc).join("\n");
					el.output = text
					el.cursor = editor.state.selection.ranges[0].from
				}

				setTimeout(() => {
					if (element.cursor && element.focused) {
						editor.focus()
						editor.dispatch({ selection: { anchor: element.cursor, head: element.cursor } })
					}
				}, 10)
			})
			return html`div [ class = ${"editor-" + uid} ]`
		},
		onfocus: () => focus(),
		onselect: () => { },
		onediting: () => { },
		write: (...args) => save(...args)
	})
}


export function make_code_mirror(code, id) {
	let lin = new Linter()
	const config = {
		globals: {
			"render": "readonly",
			"h": "readonly",
			"M": "readonly",
		},

		parserOptions: { ecmaVersion: 2019, sourceType: "module" },
		env: {
			browser: true, node: true, es6: true,
			es2015: true, es2017: true, es2020: true
		},
		rules: {}
	};

	lin.getRules().forEach((desc, name2) => {
		if (desc.meta.docs.recommended)
			config.rules[name2] = 2;
	});


	Vim.defineEx("write", "w", (e) => {
		trigger_save()
	});

	let top_level_definitions = (editor) => {
		let items = []
		let in_declaration = false
		let found = false
		let declaration_end
		syntaxTree(editor.state).iterate({
			enter: (type) => {
				console.log(type.name, editor.state.sliceDoc(type.from, type.to))
				if (type.name === "VariableDeclaration" || type.name === "FunctionDeclaration") {
					if (found) {
						if (type.from > declaration_end) {
							found = false
							in_declaration = true
							declaration_end = type.to
						}
					} else {

						in_declaration = true
						declaration_end = type.to
					}
				}

				if (type.name === "VariableDefinition") {
					if (in_declaration && !found) {
						items.push({ from: type.from, to: type.to, text: editor.state.sliceDoc(type.from, type.to) })
						in_declaration = false
						found = true
					}
					return false
				}
			},
		})
		console.log(items.map((x) => x.text))
	}

	const top_level_functions = (editor) => {
		let items = []
		let in_declaration = false
		let found = false
		let declaration_end
		syntaxTree(editor.state).iterate({
			enter: (type) => {
				if (type.name === "FunctionDeclaration") {
					if (found) {
						if (type.from > declaration_end) {
							found = false
							in_declaration = true
							declaration_end = type.to
						}
					} else {
						in_declaration = true
						declaration_end = type.to
					}
				}

				if (type.name === "VariableDefinition") {
					if (in_declaration && !found) {
						items.push({ from: type.from, to: type.to, text: editor.state.sliceDoc(type.from, type.to) })
						in_declaration = false
						found = true
					}
					return false
				}
			},
		})
		console.log(items.map((x) => x.text))
	}

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
						key: "Escape", run: () => {
							console.log("variables")
							top_level_definitions(editor)
							console.log("functions")
							top_level_functions(editor)
							editor.contentDOM.blur()
							window.getSelection()?.removeAllRanges();
						},
					},
				])
			]
		})
	})

	return editor
}

export function vector(e) {
	let x = e?.x || 0, y = e?.y || 0
	let recorded = e?.recorded || []
	let name = sig(e?.name || "vect")
	let size = sig(e?.size || 100)


	let vect = register_model(name, { x, y, recorded })
	let recording = sig(true)

	let toggle_recording = () => {
		if (recording()) { }
		else {
			vect.set({ x: vect().x, y: vect().y, recorded: [] })
		}
		recording.set(!recording())
	}

	let onmousemove = (e) => {
		if (recording()) {
			let recorded = vect().recorded
			recorded.push({ x: e.layerX, y: e.layerY })
			vect.set({ x: e.layerX, y: e.layerY, recorded })
		}
	}

	let style = mem(() => `position: absolute; top: 40px; left: 0; width: ${size()}px; height: ${size()}px; background: ${recording() ? "red" : "#ccc"};`)
	let code = mem(() => `M["${name()}"] = { x: ${vect().x}, y: ${vect().y}, recorded: ${JSON.stringify(vect().recorded)} }`)

	return {
		render: () => html`
			div [style=${mem(() => `width:100%;position:relative;height:${size() + 60}px;`)}]
				input [ type=text value=${name} oninput=${(e) => name.set(e.target.value)} ]
				input [ type=range value=${size} oninput=${(e) => size.set(parseFloat(e.target.value))} min=0 max=500 step=1]
				div [ class = widget style=${style} onmousemove=${onmousemove} onclick=${toggle_recording} ]
					p -- ${code}`,
		onselect: () => { },
		onediting: () => { },
		write: (el) => {
			el.output = code();
			el.name = name();
			el.size = size()
			el.x = vect().x;
			el.y = vect().y;
			el.recorded = vect().recorded
		}
	}
}

