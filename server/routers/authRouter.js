const express = require("express");
const router = express.Router();
const Yup = require("yup");
const bodyParser = require("body-parser");
const db = require("../database/connection");
const bcrypt = require("bcrypt");
const {v4: uniqueID} = require("uuid");


router.use(express.json());
router.use(bodyParser.urlencoded({ extended: true }));

const rateLimiter = require("../controllers/rateLimiter");
const formValidationMiddleware = require("./formValidationMiddleware");

router.route("/login")
.get( async (req, res ) => {
    if (req.session.user && req.session.user.username ) {
        //console.log("User logged in already");
        res.json({ loggedIn: true, username: req.session.user.username, userId: req.session.user.userId});
    } else {
        res.json({loggedIn: false});
    }
})
.post( formValidationMiddleware, rateLimiter, async (req, res) => {
    const loginAttempt = await db.users.find({ username: req.body.username }).toArray();

    if (loginAttempt.length > 0) {
        const isValidPassword = await bcrypt.compare(req.body.password, loginAttempt[0].password);

        if (isValidPassword) {
            const userId = loginAttempt[0].userId;
            //login
            req.session.user = {
                username: req.body.username,
                userId: userId
            };
            res.json({ loggedIn: true, username: req.body.username, userId: userId});
        } else {
            //invalid password
            res.json({ loggedIn: false, status: "Invalid user credentials" })
        }
    } else {
        //invalid username
        res.json({ loggedIn: false, status: "Invalid user credentials" })
    };
});


router.post("/register", formValidationMiddleware, rateLimiter, async (req, res) => {
    //const username = req.body.username;
    const existingUsers = await db.users.find().toArray();
    const existingUser = existingUsers.find(user => user.username === req.body.username); //tjekker om username bliver brugt allerede

    if (!existingUser) {
        //register
        const hashedPassword = await bcrypt.hash(req.body.password, 8)
        const newUserID = uniqueID();
        console.log(newUserID);
        await db.users.insertOne({ username: req.body.username, password: hashedPassword , userId: newUserID});
        req.session.user = {
            username: req.body.username,
            userId: newUserID
        };
        res.json({ loggedIn: true, username: req.body.username, message: "account created" });
    } else {
        res.json({ loggedIn: false, status: "Username already taken" });
    };
});







module.exports = router;

/* inden min convertion til middleware
const formSchema = Yup.object({
    username: Yup.string().required("Username needed").min(6, "Username too short").max(30, "Username too long"),
    password: Yup.string().required("Password needed").min(6, "Password too short").max(50, "Password too long")
})

router.post("/login", (req, res) => {
    const formData = req.body;
    formSchema.validate(formData)
        .catch(error => {
            console.log(error.errors);
            return res.status(422).send();
        })
        .then(valid => {
            if (valid) {
                console.log("Form is valid");
                return res.status(200).json({ message: "Form submitted successfully" });
            }
            return res.status(422).send();
        });
});

router.post("/register", (req, res) => {
    const formData = req.body;
    formSchema.validate(formData)
        .catch(error => {
            console.log(error.errors);
            return res.status(422).send();
        })
        .then(valid => {
            if (valid) {
                console.log("Form is valid");
                return res.status(200).json({ message: "Form submitted successfully" });
            }
            return res.status(422).send();
        });
});
*/
