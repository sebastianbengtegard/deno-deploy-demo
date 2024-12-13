import { serveDir, serveFile } from "jsr:@std/http/file-server";

let DOGS = [];

const dogsData = await Deno.readTextFile("./database.json");
DOGS = JSON.parse(dogsData);

async function updateDatabase(dogs) {
    const dogsData = JSON.stringify(dogs);
    await Deno.writeTextFile("./database.json", dogsData);
}

async function handleHTTPRequest(request) {
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith("/static")) {
        return serveDir(request, {
            fsRoot: "assets",
            urlRoot: "static"
        });
    }

    if (pathname == "/api/dogs") {
        const options = {
            headers: { "Content-Type": "application/json" }
        };

        if (request.method == "GET") {
            return new Response(JSON.stringify(DOGS), options);
        }

        if (request.method == "POST") {
            const dog = await request.json();
            dog.id = DOGS.reduce((acc, next) => next.id > acc ? acc = next.id : acc, 0) + 1;
            DOGS.push(dog);
            updateDatabase(DOGS);
            console.log("Welcome to the herd!", dog.name);
            return new Response(JSON.stringify(dog), options);
        }

        if (request.method == "DELETE") {
            const data = await request.json();
            const dog = DOGS.find((dog) => dog.id == data.id);
            // The ID did not exist
            if (dog == undefined) {
                return new Response("", { status: 404 });
            }

            DOGS = DOGS.filter((dog) => dog.id != data.id);
            updateDatabase(DOGS);
            console.log("We're sad to see you leave!", dog.name);
            return new Response(JSON.stringify(dog), options);
        }
    }

    return serveFile(request, "./index.html");
}

let connections = {};
let connectionID = 1;

function handleWebSocket(request) {
    const { socket, response } = Deno.upgradeWebSocket(request);

    let myID = connectionID++;

    socket.addEventListener("open", (event) => {
        console.log(`Connection ${myID} connected!`);
        connections[myID] = socket;
        console.log(connections);
    });

    socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        console.log("Server received", message);

        for (const id in connections) {
            if (id != myID) {
                // connection == socket
                const connection = connections[id];
                connection.send(JSON.stringify(message));
            }
        }
    });

    socket.addEventListener("close", (event) => {
        console.log(`Connection ${myID} disconnected.`);
        delete connections[myID];
    });

    return response;
}

function handleRequest(request) {
    if (request.headers.get("upgrade") == "websocket") {
        return handleWebSocket(request);
    } else {
        return handleHTTPRequest(request);
    }
}

Deno.serve(handleRequest);