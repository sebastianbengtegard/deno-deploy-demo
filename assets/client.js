const dogList = document.querySelector("#dog-list");
const form = document.querySelector("#create-dog");
const socket = new WebSocket("/");

function insertDog(dog) {
    const li = document.createElement("li");
    li.id = dog.id;
    li.innerHTML = `
        ${dog.id}: ${dog.name} (${dog.breed}, ${dog.age}) <button>Delete</button>
    `;

    li.querySelector("button").addEventListener("click", async (event) => {
        const request = new Request("/api/dogs", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: dog.id })
        });

        const response = await fetch(request);

        if (response.ok) {
            li.remove();
            const message = { event: "delete", data: { id: dog.id } };
            socket.send(JSON.stringify(message));
        }
    });

    dogList.appendChild(li);
}

socket.addEventListener("open", (event) => {
    console.log("Connected!");
});

socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    console.info("We received this message:", message);

    if (message.event == "delete") {
        const dogId = message.data.id;

        const listItems = dogList.querySelectorAll("li");
        listItems.forEach((li) => {
            if (li.id == dogId) {
                li.remove();
            }
        });
    } else if (message.event == "created") {
        const dog = message.data;
        insertDog(dog);
    }
});

socket.addEventListener("close", (event) => {
    console.log("Disconnected.");
});


form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const dog = {};
    formData.forEach((value, key) => {
        dog[key] = value;
    });

    const request = new Request("/api/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dog)
    });

    const response = await fetch(request);

    if (response.ok) {
        const data = await response.json();
        insertDog(data);
        const message = { event: "created", data: data };
        socket.send(JSON.stringify(message));
    }

    form.reset();
});

async function fetchAllDoggos() {
    const response = await fetch("/api/dogs");

    if (response.ok) {
        const dogs = await response.json();
        dogs.forEach(insertDog);
    }
}

fetchAllDoggos();