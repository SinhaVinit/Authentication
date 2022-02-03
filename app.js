//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// We are going to use it as a passport strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// to use findOrCreate
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://sample-hostname:27017/?maxPoolSize=20&w=majority", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
// Adding the plugin got mongoose-findorcreate
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// this serializeUser and deserializeUser will only work with passport-local-mongoose package So we have to change it to work with any kind of authentication
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

// Google oauth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  // profile will have email, google_id and all the things
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req,res) {
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google", {scope:["profile"]})
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
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
    User.find({"secret": {$ne: null}}, function(err, foundUsers) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("secrets", {usersWithSecrets: foundUsers});
        }
    });
});

app.get("/submit", function(req,res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    }
    else {
        res.redirect("login");
    }
});

app.post("/submit", function(req,res) {
    const submittedSecret = req.body.secret;

    // passport is save user details, because when we initiate a new login sesson it will save that user details in the "req" variable, so we can use it by "req.user".
    // console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            foundUser.secret = submittedSecret;
            foundUser.save(function() {
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req,res) {
   User.register({username: req.body.username}, req.body.password, function(err, user) {
       if (err) {
           console.log(err);
           res.redirect("/register");
       }
       else
       {
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

// For running the code on localport.
app.listen(3000, function() {
    console.log("Server started on port 3000.");
});