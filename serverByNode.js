const http = require("http");
const fs = require("fs");
const EventEmitter = require("events");

const PORT = 3000;
const DATA_FILE = "data.json";

// Create event emitter
const eventEmitter = new EventEmitter();

// Event listener for logging
eventEmitter.on("log", (message) => {
  console.log(`[LOG]: ${message}`);
});

// Read data from file
function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

// Write data to file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generate unique ID
function generateId(data) {
  return data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
}

// Create server
const server = http.createServer((req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    let data = readData();
    res.setHeader("Content-Type", "application/json");

    // GET all items
    if (req.method === "GET" && req.url === "/items") {
      eventEmitter.emit("log", "GET request received");
      res.writeHead(200);
      res.end(JSON.stringify(data));
    }

    // GET single item by ID
    else if (req.method === "GET" && req.url.startsWith("/items/")) {
      const id = parseInt(req.url.split("/")[2]);
      const item = data.find((i) => i.id === id);
      if (!item) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Item not found" }));
      }
      res.writeHead(200);
      res.end(JSON.stringify(item));
    }

    // POST new item
    else if (req.method === "POST" && req.url === "/items") {
      eventEmitter.emit("log", "POST request received");

      let newItem;
      try {
        newItem = JSON.parse(body || "{}");
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }

      if (!newItem.name) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Name is required" }));
      }

      newItem.id = generateId(data);
      data.push(newItem);
      writeData(data);
      res.writeHead(201);
      res.end(JSON.stringify(newItem));
    }

    // PUT update item by ID
    else if (req.method === "PUT" && req.url.startsWith("/items/")) {
      eventEmitter.emit("log", "PUT request received");
      const id = parseInt(req.url.split("/")[2]);
      const index = data.findIndex((i) => i.id === id);

      if (index === -1) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Item not found" }));
      }

      let updatedItem;
      try {
        updatedItem = JSON.parse(body || "{}");
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }

      if (!updatedItem.name) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Name is required" }));
      }

      updatedItem.id = id; // keep same ID
      data[index] = updatedItem;
      writeData(data);
      res.writeHead(200);
      res.end(JSON.stringify(updatedItem));
    }

    // DELETE item by ID
    else if (req.method === "DELETE" && req.url.startsWith("/items/")) {
      eventEmitter.emit("log", "DELETE request received");
      const id = parseInt(req.url.split("/")[2]);
      const index = data.findIndex((i) => i.id === id);

      if (index === -1) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Item not found" }));
      }

      const deletedItem = data.splice(index, 1)[0];
      writeData(data);
      res.writeHead(200);
      res.end(JSON.stringify(deletedItem));
    }

    // Not found
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
