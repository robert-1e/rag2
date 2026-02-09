import { serveDir } from "jsr:@std/http/file-server";

// const exists = async (filename) => {
//     try {
//         await Deno.stat(filename);
//         return true;
//     } catch (error) {
//         if (error instanceof Deno.errors.NotFound) {
//             return false;
//         }
//         throw error; // Re-throw unexpected errors
//     }
// };

Deno.serve(async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const filePath = `./dist${pathname}`;

    // if (await exists(filePath)) {
    //     return serveDir(req, { fsRoot: "./dist" });
    // }

    // Serve index.html for all other routes (SPA fallback)
    return serveDir(req, {
        fsRoot: "./dist",
        showDirListing: false,
        quiet: true,
    }).then(async (res) => {
        // If the response would be a 404, serve index.html instead
        if (res.status === 404) {
            const indexFile = await Deno.readFile("./dist/index.html");
            return new Response(indexFile, {
                headers: { "content-type": "text/html; charset=utf-8" },
            });
        }
        return res;
    });
});
