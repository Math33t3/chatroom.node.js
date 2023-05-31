const express = require("express");
const { Server } = require("socket.io")
const PORT = process.env.PORT || 8080;
const app = express();
const helmet = require("helmet");
const cors = require("cors");
const authRouter = require("./routers/authRouter");
const db = require("./database/connection");
const bcrypt = require("bcrypt");
const { sessionMiddleware, compatibility,authorizeUser, onDisconnect ,addFriend, corsServerConfig } = require("./controllers/serverController");


require("dotenv").config();



const server = require("http").createServer(app);
const io = new Server(server, {
    cors: corsServerConfig,
});

app.use(helmet());
app.use(cors(corsServerConfig));
app.use(express.json());
app.use(sessionMiddleware);

app.use("/auth", authRouter);

app.get("/", (req, res) => {
    res.send(data = { message: "hi" })
});
//const compatibilityMiddleware = compatibility(sessionMiddleware);

io.use(compatibility(sessionMiddleware));
io.use(authorizeUser);
io.on("connect", socket => {
    
    socket.on("addFriend", (friendName, callback) => {addFriend(socket, friendName, callback)});
    socket.on("disconnect", () => onDisconnect(socket))
})

server.listen(PORT, () => {
    console.log("Server is running on port", PORT)
})