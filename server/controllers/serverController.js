require("dotenv").config();
const express = require('express');
const redis = require("ioredis");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { createClient } = require("ioredis");
const { default: socket } = require("../../client/src/socket");

// Initialize client. fra connect-redis documentation
let redisClient = createClient();
//redisClient.connect().catch(console.error)

// Initialize store.
let redisStore = new RedisStore({
    client: redisClient,
});

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    credentials: true,
    name: "sid",
    store: redisStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        expires: 1000 * 60 * 60 * 24,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }
});

const compatibility = expressMiddleware => (socket, next) =>
    expressMiddleware(socket.request, {}, next);

const corsServerConfig = {
    origin: "http://localhost:3000",
    credentials: true,
};

const authorizeUser = async (socket, next) => {
    if (!socket.request.session || !socket.request.session.user) {
        console.log("not real user!");
        next(new Error("Authorization failed!"));
    } else {
        socket.user = { ...socket.request.session.user };
        await redisClient.hset(
            `userid:${socket.user.username}`,
            "userId",
            socket.user.userId
        );
        const friendsList = await redisClient.lrange(`friends:${socket.user.username}`, 0, -1)
        socket.emit("friends", friendsList);
        
        //console.log("authorized user ",socket.user.userId);
        next();
    };
};

const addFriend = async (socket, friendName, callback) => {
    if (friendName === socket.user.username) {
        callback({ done: false, errorMessage: "Cannot befriend yourself" });
        return;
    }

    const friendUserId = await redisClient.hget(`userid:${friendName}`, "userId");
    const existingFriends = await redisClient.lrange(`friends:${socket.user.username}`, 0, -1)

    if (!friendUserId) {
        callback({ done: false, errorMessage: "Invalid User" });
        return;
    }
    if (existingFriends && existingFriends.indexOf(friendName) !== -1) {
        callback({ done: false, errorMessage: "You are already friends" });
        return;
    }

    await redisClient.lpush(`friends:${socket.user.username}`, friendName);
    callback({ done: true });

}

module.exports = { sessionMiddleware, compatibility, authorizeUser, addFriend, corsServerConfig };