let M = model

M.channel = { contents: [] }

function load_channel(slug) {
	fetch("https://api.are.na/v2/channels/" + slug)
		.then((res) => res.json())
		.then((res) => M.channel = res)
}

load_channel("jose-aisle")

let App = () => {
	return html`
    h1 -- will it work?
    each of ${() => M.channel.contents} as ${(e) => html`p -- ${e.title}`}
  `
}

render(App, document.body)

function splitAndExtract(str) {
	const splitStrings = [];
	const extractedValues = [];

	let currentValue = '';
	let inBraces = false;

	let assembling_string = ""


	for (let i = 0; i < str.length; i++) {
		const char = str[i];

		let peekNext = () => str[i + 1];

		if (char === "{" && inBraces) { continue }
		if (char === '$' && peekNext() === '{') {
			inBraces = true;
			splitStrings.push(assembling_string);
			assembling_string = ''
		}

		else if (char === '}') {
			inBraces = false;
			if (currentValue.trim() !== '') {
				extractedValues.push(currentValue.trim());
				currentValue = '';
			}
		} else if (inBraces) {
			currentValue += char;
		} else {
			assembling_string += char
		}

		// on last
		if (i === str.length - 1) {
			splitStrings.push(assembling_string);
		}
	}

	console.log("splitStrings", splitStrings)
	return { strings: splitStrings, extracted: extractedValues };
}

/// --------------------
let r = mem(() => model.s * 2)
let f = mem(() => "font-size: " + model.v + "px;" +
	"background-color: " + "rgba(" + model.s * 2 + "," + model.v * 2 + ",255, .7);")
render(() => html`p [style=${f}] -- ${f} ${r}`, document.body)

/// --------------------
let x = mem(() => model.x)
let y = mem(() => model.y)
let z = mem(() => model.z)
let a = mem(() => model.a)



function color_mem(g, b) {
	let style = mem(() => `
padding: ${a() * 2}px;
margin: ${x()}px;
background-color: rgba(${x() * 2}, ${g}, ${b}, ${y() / 100});
font-size: ${z()}px;
`)
	return style

}

render(() => html`
  p [ style=${color_mem(0, 255)}] -- ${x}, ${() => model.y}, ${() => model.z}, ${() => model.a}
  p [ style=${color_mem(255, 0)}] -- ${x}, ${() => model.y}, ${() => model.z}, ${() => model.a}
 `,
	document.body)

/// --------------------
let _style = mem(() =>
	`position: absolute;
top: ${M.vect.y * 8}px;
left: ${M.vect.x * 3}px;
width: 100px;
height: 100px;
padding: 100px;
background: green;`)

render(() => html`div [style=${style}]`, document.body)

M.location = {
	x: 102,
	y: 95
}


let style = mem(() => `
position: absolute;
top: ${M.location?.y * M.b}px;
left: ${M.location?.x * M.b}px;
width: 100px;
height: 100px;
padding: 100px;
background: green;`)



let style2 = mem(() =>
	`position: absolute;
top: ${M.vect2?.y * M.b}px;
left: ${M.vect2?.x * M.b}px;
width: 300px;
height: 300px;
background: pink;`)

setTimeout(() => {
	var c = document.querySelector(".c");
	var ctx = c.getContext("2d");
	requestAnimationFrame(() => draw(ctx))
}, 100)

function draw(ctx) {
	ctx.globalCompositeOperation = "destination-over"; ctx.clearRect(0, 0, 300, 300);
	ctx.moveTo(0, 0)
	ctx.lineTo(M.location.x, M.location.y);
	ctx.stroke();
	requestAnimationFrame(() => draw(ctx))
}



render(() => html`
div [style=${style}]
div [style=${style2}]
  canvas.c [width=300 height=300 ]

`, document.body)

// --------------------------------
M.location = {
	x: 102,
	y: 95
}



let style = mem(() => `
position: absolute;
top: ${M.location?.y * M.b}px;
left: ${M.location?.x * M.b}px;
width: 100px;
height: 100px;
padding: 100px;
background: green;`)



let style2 = mem(() =>
	`position: absolute;
top: ${M.vect2?.y * M.b}px;
left: ${M.vect2?.x * M.b}px;
width: 300px;
height: 300px;
background: pink;`)

setTimeout(() => {
	var c = document.querySelector(".c");
	var ctx = c.getContext("2d");
	requestAnimationFrame(() => draw(ctx))
}, 100)

function draw(ctx) {
	ctx.globalCompositeOperation = "destination-over"; ctx.clearRect(0, 0, 300, 300);
	ctx.moveTo(0, 0)
	ctx.lineTo(M.location.x, M.location.y);
	ctx.stroke();
	ctx.elipse(0, 0, 100, 100, 0, 0, Math.PI * 2)
	requestAnimationFrame(() => draw(ctx))
}



render(() => html`
div [style=${style}]
div [style=${style2}]
  canvas.c [width=300 height=300 ]

`, document.body)
