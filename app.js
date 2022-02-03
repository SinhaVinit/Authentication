//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

///////////////////////////////////////////passport////////////////////////////////////////////////
app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false,
}));

// initialize passport
app.use(passport.initialize());
// use passport to manage our session
app.use(passport.session());
///////////////////////////////////////////passport////////////////////////////////////////////////

mongoose.connect("mongodb+srv://sample-hostname:27017/?maxPoolSize=20&w=majority", {useNewUrlParser: true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

///////////////////////////////////////////passport////////////////////////////////////////////////
// setup userSchema to use passportLocalMongoose as a plugin
userSchema.plugin(passportLocalMongoose);
///////////////////////////////////////////passport////////////////////////////////////////////////

const User = mongoose.model("User", userSchema);
///////// We are using passport-local-mongoose instead of passport-local because of less code writing and simplicity //////////////////////////
// we use passportLocalMongoose to create a local login strategy
passport.use(User.createStrategy());
// Making cookie //
passport.serializeUser(User.serializeUser());
//reading cookie //
passport.deserializeUser(User.deserializeUser());
///////////////////////////////////////////passport////////////////////////////////////////////////

app.get("/", function(req,res) {
    res.render("home");
});

app.get("/register", function(req,res) {
    res.render("register");
});

app.get("/login", function(req,res) {
    if (req.isAuthenticated()) {
        res.redirect("/secrets");
    }
    else {
        res.render("login");
    }
});

app.get("/secrets", function(req,res) {
    if (req.isAuthenticated()) {
        res.render("secrets");
    }
    else {
        res.redirect("login");
    }
});

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req,res) {
    //register method is come from passportLocalMongoose package
   User.register({username: req.body.username}, req.body.password, function(err, user) {
       if (err) {
           console.log(err);
           res.redirect("/register");
       }
       else
       {
           // Type of authenticate is local. And the callback function is only triggered is the authentication was successfull.
           passport.authenticate("local")(req, res, function() {
               res.redirect("/secrets");
           });
       }
   });
});

app.post("/login", function(req,res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err) {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        }
    });
});

app.listen(3000, function() {
    console.log("Server started on port 3000.");
});