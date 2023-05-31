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
        console.log(socket.user);
        socket.join(socket.user.userId);
        await redisClient.hset(
            `userid:${socket.user.username}`,
            "userId",
            socket.user.userId
          );
          console.log(socket.user.userId);
          await redisClient.hset(
            `userid:${socket.user.username}`,
            "connected",
            true
          );
        const redisFriendsList = await redisClient.lrange(`friends:${socket.user.username}`, 0, -1)

        const friendsList = await compatibilityFriendsList(redisFriendsList);
        const friendRooms = friendsList.map(friend => friend.userId);

        if (friendRooms.length > 0) {
            socket.to(friendRooms).emit("connected", true, socket.user.username);
        }
        console.log(friendsList);
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
    
    const friend = await redisClient.hgetall(`userid:${friendName}`);
    console.log(friend+ " den her");
    const existingFriends = await redisClient.lrange(`friends:${socket.user.username}`, 0, -1)

    if (!friend.userId) {
        callback({ done: false, errorMessage: "Invalid User" });
        return;
    }
    if (existingFriends && existingFriends.indexOf(friendName) !== -1) {
        callback({ done: false, errorMessage: "You are already friends" });
        return;
    }

    await redisClient.lpush(`friends:${socket.user.username}`, [friendName, friend.userId].join("."));

    const newFriend = {
        username: friendName,
        userId: friend.userId,
        connected: friend.connected,
    };
    callback({ done: true , newFriend});

}

const onDisconnect = async (socket) => {
    await redisClient.hset(
        `userid:${socket.user.username}`,
        "connected", false
    );
    const friendsList = await redisClient.lrange(`friends:${socket.user.username}`, 0, -1);
    const friendRooms = await compatibilityFriendsList(friendsList)
        .then(friends => friends.map(friend => friend.userId));
    socket.to(friendRooms).emit("connected", false, socket.user.username);
}

const compatibilityFriendsList = async friendsList => {
    const newFriendsList = [];
    for (let friend of friendsList) {

        const redisFriend = friend.split(".");
        const connectedStatus = await redisClient.hget(`userid:${redisFriend[0]}`, "connected");
        newFriendsList.push({ username: redisFriend[0], userId: redisFriend[1], connected: connectedStatus });
    }
    return newFriendsList;
}

module.exports = { sessionMiddleware, compatibility, authorizeUser, addFriend, onDisconnect, corsServerConfig };