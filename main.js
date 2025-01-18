import fs from "fs";
import { Hono } from "hono";
import { cors } from 'hono/cors'
import { serve } from "@hono/node-server"
import { serveStatic } from '@hono/node-server/serve-static'
import { title } from "process";


const app = new Hono();
app.use('/api/*', cors())
app.use('/*', serveStatic({ root: './public/' }))

// POST:
// write { title, content }

// GET:
// /api/file/:title

app.get("/api", (c) => c.json({ message: "Hello World" }));

app.get("/api/file", (c) => {
	return c.json({ files: get_files() });
})

app.get("/api/file/:title", (c) => {
	const title = c.req.param('title');


	let file = get_file(title);

	if (file) {
		return c.json({ title, content: file });
	} else {
		return c.json({ message: "File not found" });
	}
});

app.post("/api/file/:title", async (c) => {
	const content = await c.req.json()
	const title = c.req.param('title');

	console.log("content", content);
	write_file(title, content);

	return c.json({ message: "File written", content: get_file(title), title });
});

function get_files() {
	let files = fs.readdirSync('./files');
	console.log("files", files);
	return files;
}

function get_file(title) {
	console.log("title", title);
	console.log("path", './files/' + title + '.json');

	if (!fs.existsSync('./files/' + title + '.json')) return null

	let file = fs.readFileSync('./files/' + title + '.json', 'utf8', function(err, data) {
		if (err) { return null; }
		return JSON.parse(data);
	})

	return file;
}

function write_file(title, content) {
	let file = get_file(title);
	if (file) console.log("file exists");
	console.log("content", content);
	console.log("title", title);

	fs.writeFileSync('./files/' + title + '.json', JSON.stringify(content));
}

serve({
	fetch: app.fetch,
	port: 8888
});

