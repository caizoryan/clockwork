import { render, html, mem, mut, eff_on, mounted, sig, h, For, each, store, produce, when, eff, p } from "./solid_monke/solid_monke.js";
import { batch, createStore } from "./solid_monke/mini-solid.js";

import { make_code_mirror, vector, code_element, number_widget, render_editor, wave_tiles } from "./blocks.js";
import {
	EditorState, EditorView, basicSetup, javascript, keymap, esLint, lintGutter,
	linter, Linter, Compartment, syntaxHighlighting, HighlightStyle, t, Vim, vim,
	autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
	searchKeymap, highlightSelectionMatches,
	defaultKeymap, history, historyKeymap,
	highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
	rectangularSelection, crosshairCursor,
	lineNumbers, highlightActiveLineGutter,
	defaultHighlightStyle, indentOnInput, bracketMatching,
	foldGutter, foldKeymap, syntaxTree
} from "./codemirror/bundled.js"

// import { jsPDF, pdfjsLib } from "./jsPdf/jspdf.js";
// import { p5 } from "./p5/p5.js";
// import { createSystem, createVirtualTypeScriptEnvironment, createDefaultMapFromCDN } from "./tsserver/tsserver.js";

let [renderers, set_renderers] = createStore({})

let m = () => document.querySelector("iframe")?.contentDocument.M
let session_name = () => (localStorage.getItem("session_name"))

if (m()?.name) {
	localStorage.setItem("session_name", m()?.name)
}

let moodle = (function load() {
	let name = session_name() ? session_name() : "model"
	if (localStorage.getItem(name)) {
		return JSON.parse(localStorage.getItem(name))
	} else {
		return { blocks: [{ type: "group", output: "", blocks: [] },] }
	}
})()

let [model, set_model] = createStore(moodle, {})
let buffer

let template = {
	// start: `
	// 	<body></body>
	// 	<script type="module">
	//
	// 	import { mem, render, mut, sig, html, eff, eff_on, h} from "./solid_monke/solid_monke.js";
	// 	import { jsPDF, pdfjsLib } from "./jsPdf/jspdf.js";
	// 	import { p5 } from "./p5/p5.js"; import {  createSystem, ts, createDefaultMapFromCDN, createVirtualTypeScriptEnvironment } from "./tsserver/tsserver.js";
	//
	// 	let M = mut({})
	// 	document.M = M
	// 	`,
	start: `
		<body></body>
		<script type="module">
	 	import { mem, render, mut, sig, html, eff, eff_on, h} from "./solid_monke/solid_monke.js";
	 	import { p5 } from "./p5/p5.js";


		let M = mut({})
		document.M = M
		`,
	end: `</script>`
}

let compiled = mem(() => {
	let code = model.blocks.map(block => block.output).join("\n")

	return template.start + code + template.end
})

/**
 * @typedef {Object} Renderer
 *
 * @property {(el) => void} write
 * @property {() => any[] | any} render
 *
 * @property {() => void} [onselect]
 * @property {() => void} [onkeydown]
 * @property {() => void} [onfocus]
 * @property {() => void} [onunfocus]
 */

/**
 * @param {string}  type - type of renderer to be used in process gen.
 * @param {string} renderer - passed as string, to be evaluated at runtime 
 */
let register_renderer = (type, renderer) => {
	set_renderers(type, renderer)

	force_refresh()
}

let force_refresh = () => {
	let copy = [...model.blocks]
	set_model("blocks", [])
	set_model("blocks", copy)
}

/** returns a renderer function
* @param {string} str - code to be evaluated
* @returns {(element: any, index:any, controller:any ) => Renderer }
*/
function return_renderer(str) {
	let fn = eval_code(str)
	if (typeof fn == "function") { return fn }
	else { throw new Error("Invalid renderer") }
}

export function eval_code(code) {
	return eval(`"use strict";(${code})`);
}

let editor_pos = sig({
	x: 0,
	y: 0,
	w: 50,
	h: 100,
})

let frame_pos = sig({
	x: 50,
	y: 0,
	w: 50,
	h: 100,
})

let app = () => {
	let editor_style = mem(() => `
		position: fixed;
		left: ${editor_pos().x}vw;
		top: ${editor_pos().y}vh;
		width: ${editor_pos().w}vw;
		height: ${editor_pos().h}vh;
	`)

	let frame_style = mem(() => `
		position: fixed;
		left: ${frame_pos().x}vw;
		top: ${frame_pos().y}vh;
		width: ${frame_pos().w}vw;
		height: ${frame_pos().h}vh;
	`)

	return h("div.container", [
		// TODO: below is not reactive, have to wrap in a reactive context.. () => 

		h("div.editor", { style: editor_style }, init_editor(model.blocks)),
		h("iframe", { style: frame_style, srcdoc: compiled, width: "98%", height: "98%" })
	])
}

function init_editor(element) {
	if (!element) return
	if (Array.isArray(element)) {
		element = element[0]
	}
	let render = return_renderer(renderers.group)
	let control = {
		set_self: (...args) => set_model("blocks", 0, ...args)
	}
	let c = render(element, () => 0, control)

	set_model("blocks", 0, produce((el) => { el.onkeydown = c.onkeydown; el.write = c.write }))
	return c.render
}

export function trigger_save() {
	let save_queue = model.blocks.map((code) => code.write)
	batch(() =>
		save_queue.forEach((code, i) =>
			"function" == typeof code
				? set_model("blocks", i, produce((el) => code(el)))
				: null)
	)

	if (m()?.name) {
		let s = localStorage.getItem("session_name")
		if (s != m()?.name) localStorage.setItem("session_name", m()?.name)

		console.log(session_name())
	}

	if (session_name()) { localStorage.setItem(session_name(), JSON.stringify(model)) }
	else { localStorage.setItem("model", JSON.stringify(model)) }
}


function group_widget(element, i, control) {
	let blocks = element.blocks || []
	let [miniStore, setMiniStore] = createStore({ blocks: [...blocks], })

	let cursor = sig(-1)
	let cursor_next = () => miniStore.blocks.length > cursor() + 1 ? cursor.set(cursor() + 1) : cursor.set(0)
	let cursor_prev = () => cursor() > 0 ? cursor.set(cursor() - 1) : cursor.set(miniStore.blocks.length - 1)

	let move_child = (index, direction) => {
		setMiniStore("blocks", produce((el) => {
			if (!el[index + direction] || !el[index]) return
			let temp = el[index]
			el[index] = el[index + direction]
			el[index + direction] = temp
		}))
	}

	eff_on(cursor, () => {
		batch(() => {
			setMiniStore("blocks", produce((el) => {
				el.forEach((e, ii) => {
					if (ii === cursor()) {
						e.active = true
						let id = "block-" + e.id

						let el = document.getElementById(id)
						let parent = get_scrollabe_parent(el)
						if (parent) {
							let [x, y] = find_offset_to_parent(el, parent)
							parent.scrollTo({ top: y - 50, behavior: "smooth" })
						}

					} else { e.active = false }
				})
			}))
		})
	})


	let add_widget = (type, state) => {
		trigger_save()
		let id = Math.random().toString(36).substring(7)
		setMiniStore("blocks", produce((g) => {
			if (state) g.push({ id, type, ...state })
			else g.push({ id, type, code: "" })
		}))
	}


	let child_widget = (rel, index) => {
		let controller = {
			add_widget: (type, props) => add_widget(type, props),
			set_self: (...args) => setMiniStore("blocks", index(), ...args)
		}

		let render_str = renderers[rel.type]
		let render = return_renderer(render_str)

		if (typeof render == "function") {
			let c = render(rel, index, controller)

			setMiniStore("blocks", index(), produce((el) => {
				Object.entries(c).forEach(([key, value]) => {
					if (key != "render") el[key] = value
				})
			}))

			let style = mem(() => `
				border: ${rel.active && !rel.focus ? "1px solid grey" : null};
				box-shadow: ${rel.focus ? "0 0 25px 5px rgba(0,0,0,.1)" : null};
				`
			)

			return () => h("div.child", {
				id: "block-" + rel.id, style: style,
				onmousedown: (e) => {
					e.stopPropagation()
					e.stopImmediatePropagation()
					cursor.set(index)
				}
			}, c.render)
		}
	}

	let find_focused = mem(() => miniStore.blocks.find((el) => el.focus))
	let find_active = () => miniStore.blocks.find((el) => el.active)

	let remove_block = (index) => setMiniStore("blocks", (e) => e.filter((r, i) => i != index))

	let escape = (e) => {
		if (e.key == "Escape") {
			let focused = find_focused()
			if (focused) {
				let fn = focused.escape
				if (fn && "function" == typeof fn) { fn(e); return }
				else {
					let block = miniStore.blocks.find((el) => el.focus)
					setMiniStore("blocks", (el) => el.focus, "focus", false)
					if (block.onunfocus) { block.onunfocus() }
				}
			}
			else {
				control.set_self("focus", false);
				onunfocus()
			}
		}
	}

	let save = (el) => {
		let save_queue = miniStore.blocks.map((code) => code.write)
		batch(() =>
			save_queue.forEach((code, i) =>
				"function" == typeof code
					? setMiniStore("blocks", i, produce((el) => code(el)))
					: null)
		)

		let output = miniStore.blocks.map((child) => child.output).join("\n")
		el.output = output
		el.blocks = miniStore.blocks
		el.fold = fold()
	}

	let onunfocus = () => {
		setMiniStore("blocks", (el) => el.focus, "focus", false)
		setMiniStore("blocks", (el) => el.active, "active", false)
		cursor.set(-1)
	}


	let onkeydown = (e) => {
		escape(e)
		if (e.key == "Escape") return

		// escape key already handled, so if its escape, we can return
		if (find_focused()) {
			let fn = find_focused()?.onkeydown
			if (fn && "function" == typeof fn) fn(e)
			return
		}

		if (e.key == ":") open_cmd()

		if (!fold()) {
			if (e.key == "y") {
				let active = find_active()
				if (active) {
					let copy = JSON.parse(JSON.stringify(active))
					copy.id = Math.random().toString(36).substring(7)
					//
					// TODO: Make this recursive
					if (copy.blocks) {
						copy.blocks = copy.blocks.map((el) => {
							el.id = Math.random().toString(36).substring(7)
							return el
						})
					}
					buffer = copy
				}
			}

			if (e.key == "p") {
				if (!buffer) return
				setMiniStore("blocks", produce((el) => el.push(buffer)))
			}

			if (e.key == "F") {
				let active = find_active()
				if (active) {
					let fn = active.toggle_fold
					if (fn && "function" == typeof fn) fn()
				}
			}

			if (e.key == "ArrowDown" || e.key == "j") {
				if (e.altKey == true && e.shiftKey == true) move_child(cursor(), 1)
				cursor_next()
			}

			if (e.key == "ArrowUp" || e.key == "k") {
				if (e.altKey == true && e.shiftKey == true) move_child(cursor(), -1)
				cursor_prev()
			}


			if (e.key == "Enter") {
				setMiniStore("blocks", cursor(), produce((el) => el.focus = true))
				let fn = miniStore.blocks[cursor()]?.onfocus
				if (fn && "function" == typeof fn) fn()
			}

			if (e.key == "Backspace" && e.ctrlKey) {
				remove_block(cursor())
			}

			if (e.key == "t" && e.ctrlKey) {
				add_widget("default")
			}

			if (e.key == "n" && e.ctrlKey) {
				add_widget("number")
			}

			if (e.key == "k" && e.ctrlKey) {
				add_widget("vect")
			}

			if (e.key == "w" && e.ctrlKey) {
				add_widget("wave")
			}

			if (e.key == "g" && e.ctrlKey) {
				add_widget("group")
			}
		}
	}

	let fold = sig(element.fold || false)
	let toggle_fold = () => fold.set(!fold())
	let show_which = mem(() => fold()
		? null
		: each(() => miniStore.blocks, (e, i) => child_widget(e, i)))

	let fold_string = mem(() => fold() ? "▶︎" : "▼")

	return {
		render: () => html`
			.group
				p [onclick=${toggle_fold}]
					span.fold -- ${fold_string}
			  div -- ${show_which}`,
		onselect: () => { },
		onfocus: () => {
			if (fold()) toggle_fold()
			cursor.set(0)
		},
		onkeydown,
		escape,
		write: (el) => save(el),
		toggle_fold,
		onunfocus,
	}
}


register_renderer("group", group_widget.toString())
register_renderer("default", code_element.toString())
register_renderer("number", number_widget.toString())
register_renderer("block_editor", render_editor.toString())
register_renderer("vect", vector.toString())
register_renderer("wave", wave_tiles.toString())

window.onload = () => {
	window.onkeydown = (e) => {
		// happens no matter what
		if (e.key == "Enter" && (e.metaKey == true || e.altKey == true)) {
			trigger_save()
		}



		if (e.key == "S" && e.ctrlKey) {
			e.preventDefault()
			trigger_save()
			// make json file and download
			let json = localStorage.getItem("model")
			let blob = new Blob([json], { type: "application/json" })
			let url = URL.createObjectURL(blob)
			let a = document.createElement("a")
			a.href = url
			let n = m() ? m().name ? m().name : "model" : "model"
			a.download = n + ".json"
			a.click()
			a.remove()
		}

		if (e.key == "ArrowDown" || e.key == "ArrowUp") {
			e.preventDefault()
		}

		model.blocks[0].onkeydown(e)
	}
}

// ----------------------------
// UTILITIES
// ----------------------------
// - is scrollable
// - find offset to parent
// - get scrollable parent
// -
// - recursive fucking
// - create theme
// - dracula theme
// -
// - pipe model
// - register model


function open_file(title) {
	fetch("/api/file/" + title)
		.then((res) => res.json())
		.then((res) => {
			let content = res.content
			localStorage.setItem("session_name", title)
			console.log("content", content)
			if (typeof content == "string") {
				localStorage.setItem(title, content)
				window.location.reload()
			}
		})
}

function save_file(title) {
	let body = JSON.stringify(model)
	console.log("saving", body)
	fetch("/api/file/" + title, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body,
	}).then((res) => res.json())
		.then((res) => console.log(res))
}

function add_input() {
	let input = document.createElement("input")

	input.type = "text"
	input.style.position = "fixed"
	input.style.top = "25vh"
	input.style.left = "25vw"
	input.style.width = "50vw"
	input.style.height = "50px"

	document.body.appendChild(input)

	setTimeout(() => input.focus(), 10)

	return input
}

function run_cmd(cmd) {
	if (cmd == "switch") {
		let e = editor_pos()
		let f = frame_pos()

		frame_pos.set(e)
		editor_pos.set(f)
	}

	if (cmd == "reset") {
		editor_pos.set({
			x: 0,
			y: 0,
			w: 50,
			h: 100,
		})

		frame_pos.set({
			x: 50,
			y: 0,
			w: 50,
			h: 100,
		})
	}

	if (cmd == "preview") {
		frame_pos.set({
			x: 0,
			y: 0,
			w: 100,
			h: 100
		})

		editor_pos.set({
			x: 100,
			y: 100,
			w: 10,
			h: 10
		})
	}

	if (cmd == "w") {
		trigger_save()
	}

	if (cmd == "o" || cmd == "open") {
		let input = add_input()

		input.type = "text"
		input.onkeydown = (e) => {
			if (e.key == "Enter") {
				let title = input.value
				open_file(title)
				input.remove()
			}
			if (e.key == "Escape") {
				input.remove()
			}
		}
	}

	if (cmd == "s" || cmd == "save") {
		trigger_save()

		if (session_name()) {
			save_file(session_name())
		} else {
			let input = add_input()
			input.type = "text"
			input.onkeydown = (e) => {
				if (e.key == "Enter") {
					let title = input.value
					save_file(title)
					input.remove()
				}

				if (e.key == "Escape") {
					input.remove()
				}
			}
		}
	}

	if (cmd == "name") {
		let input = add_input()
		input.type = "text"
		input.onkeydown = (e) => {
			if (e.key == "Enter") {
				let title = input.value
				localStorage.setItem("session_name", title)
				localStorage.setItem(title, JSON.stringify(model))
				console.log("sessionname", localStorage.getItem("session_name"))
				input.remove()
			}

			if (e.key == "Escape") {
				input.remove()
			}
		}
	}

}

function open_cmd() {
	let input = document.createElement("input")
	input.type = "text"
	input.style.position = "fixed"
	input.style.top = "25vh"
	input.style.left = "25vw"
	input.style.width = "50vw"
	input.style.height = "50px"

	let cmd = sig("")

	setTimeout(() => input.focus(), 10)

	input.onkeydown = (e) => {
		if (e.key == "Escape") {
			input.remove()
		}
		if (e.key == "Enter") {
			run_cmd(cmd())
			input.remove()
		}
	}

	input.oninput = (e) => {

		cmd.set(input.value)
	}

	document.body.appendChild(input)
}


function is_scrollable(el) {
	return el.scrollHeight > el.clientHeight
}
function find_offset_to_parent(el, parent) {
	return [(el.offsetLeft - parent.offsetLeft), (el.offsetTop - parent.offsetTop)];
}

function get_scrollabe_parent(el) {
	let found_parent = false
	let element = el

	do {
		element = element.parentElement

		if (!element) return
		if (is_scrollable(element)) { found_parent = true }

	} while (!found_parent && element);

	return element
}


const recursive_fucking_children = (doc) => {
	let text = [];

	if (doc.children) {
		let children = doc.children;
		children.forEach((child) => {
			text = text.concat(recursive_fucking_children(child));
		});
	} else if (doc.text) return doc.text;

	return text;
};


const createTheme = ({ variant, settings, styles }) => {
	const theme = EditorView.theme(
		{
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'&': {
				backgroundColor: settings.background,
				color: settings.foreground,
			},
			'.cm-editor.cm-focused': {
				outline: "none",
			},
			'.cm-content': {
				caretColor: settings.caret,
			},
			'.cm-cursor, .cm-dropCursor': {
				borderLeft: "2px solid" + settings.caret,
			},
			'&.cm-focused .cm-selectionBackgroundm .cm-selectionBackground, .cm-content ::selection':
			{
				backgroundColor: settings.selection,
			},
			'.cm-activeLine': {
				backgroundColor: settings.lineHighlight,
			},
			'.cm-gutters': {
				backgroundColor: settings.gutterBackground,
				color: settings.gutterForeground,
			},
			'.cm-activeLineGutter': {
				backgroundColor: settings.lineHighlight,
			},
		},
		{
			dark: variant === 'dark',
		},
	);

	const highlightStyle = HighlightStyle.define(styles);
	const extension = [theme, syntaxHighlighting(highlightStyle)];

	return extension;
};

// Author: Zeno Rocha
export const dracula = createTheme({
	variant: 'light',
	settings: {
		background: '#f9f9f911',
		foreground: '#5c6166',
		caret: '#ffaa33',
		selection: '#036dd626',
		gutterBackground: '#fcfcfc',
		gutterForeground: '#8a919966',
		lineHighlight: '#8a91991a',
	},
	styles: [
		{
			tag: t.comment,
			color: "black",
			padding: "2px",
			borderRadius: "8px",
			background: "#ffd2ed",
		},
		{
			tag: t.string,
			color: '#86b300',
		},
		{
			tag: t.regexp,
			color: '#4cbf99',
		},
		{
			tag: [t.number, t.bool, t.null],
			color: '#ffaa33',
		},
		{
			tag: t.variableName,
			color: '#5c6166',
		},
		{
			tag: [t.definitionKeyword, t.modifier],
			color: '#fa8d3e',
		},
		{
			tag: [t.keyword, t.special(t.brace)],
			color: '#fa8d3e',
		},
		{
			tag: t.operator,
			color: '#ed9366',
		},
		{
			tag: t.separator,
			color: '#5c6166b3',
		},
		{
			tag: t.punctuation,
			color: '#5c6166',
		},
		{
			tag: [t.definition(t.propertyName), t.function(t.variableName)],
			color: '#f2ae49',
		},
		{
			tag: [t.className, t.definition(t.typeName)],
			color: '#22a4e6',
		},
		{
			tag: [t.tagName, t.typeName, t.self, t.labelName],
			color: '#55b4d4',
		},
		{
			tag: t.angleBracket,
			color: '#55b4d480',
		},
		{
			tag: t.attributeName,
			color: '#f2ae49',
		},
	],
});

function pipe_model(signal, key) {
	eff_on(signal, () => m() ? m()["function" == typeof key ? key() : key] = signal() : null)
}

function register_model(key, signal) {
	let s = sig(signal)
	pipe_model(s, key)
	return s
}

render(app, document.body);

