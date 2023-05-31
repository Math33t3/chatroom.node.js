/*
module.exports.authorizeUser = (socket, next) => {
    if(! socket.request.session || !socket.request.session.user) {
        console.log("not real user!");
        next(new Error("Authorization failed!"));
    } else {
        socket.user = {...socket.request.session.user};
        next();
    }
}*/