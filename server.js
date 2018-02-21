const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const sd = require('./spotdude');
const bcrypt = require('bcrypt');

//// DB Connection type - local db or fake files
// Use a local mongodb test database and the schema defined in database/mongo.js file
const mongoose = require('mongoose');
const User = require('./database/model/User');
const List = require('./database/model/List');
mongoose.connect('mongodb://localhost/test');
const db = mongoose.connection;

// The fake data is in the expected output format and can be used inplace of the database if needed. 
const fakeData = require('./fakedata.json')
const fakeItemMap = require('./fakeItemMap.json')

//// Middlewear Section
// required to read JSON
app.use(bodyParser.raw({ type: '*/*' }))

// middlewear for ensuring the data that we get is in a JSON format, if it's not you'll get a bad request.
app.use((req, res, next) => {
    try {
        console.log(JSON.parse(req.body));
        next();
    } catch (err) {
        console.log("Bad request to " + req.originalUrl)
        res.send("Bad request to " + req.originalUrl)
        next();
    }
})

// // Test Area comment out anything you don't need
// console.log(sd.locCheck(5,5,8,3,5))
// console.log(sd.locCheck(5,5,9,9,5))
// console.log(mongo.user, mongo.list)

//// Database connection
// Open database connection
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Database Connection open")
});

// Should host a simple download page here to explain and "download the app". Currently broken by the JSON checking middlewear
app.get('/', (req, res) => {
    res.json({ message: "Get Spot buddy now!" });
})

//// User Management
//login endpoint, will check if there is a username and password and if there is return success, if not failure.
app.post('/login', (req, res) => {
    let request = JSON.parse(req.body)

    if (request.email && request.password) {
        User.find({ email : request.email }, function(err, user) {
            if (err) {
                res.send({ "res" : false, "err" : err.errmsg });
            } else if (bcrypt.compareSync(request.password, user[0].password)){
                res.send(JSON.stringify({ sessionid: user[0].sessionid }))  
            } else {
                res.send(JSON.stringify({ "res": false })) 
            }
        });
    } else if (!request.email && !request.password) {
        res.send(JSON.stringify({ "res": false, "err": "missing email & password" }))
    } else if (!request.email) {
        res.send(JSON.stringify({ "res": false, "err": "missing email" }))
    } else if (!request.password) {
        res.send(JSON.stringify({ "res": false, "err": "missing password" }))
    } else {
        res.send(JSON.stringify({ "res": false }))
    }
})

app.post('/signup', (req, res) => {
    let request = JSON.parse(req.body)
    //double check if the request has an email and password and if so create a new user with hashed password
    if (request.email && request.password) {
        let user = new User({
            id: 22,
            email: request.email,
            password: bcrypt.hashSync(request.password, 12),
            sessionid: "123456",
            lists: ["one", "two"]
        });
        // This wil save the user to the database and return true if successful, otherwise it will return false with error code
        user.save(function (err) {
            if (err) {
                console.log("User creation failed")
                res.send(JSON.stringify({ "res": false, "error": err.errmsg }))
            } else {
                res.send(JSON.stringify({ "res": true }))
            }
        })
    }

})

app.post('/logout', (req, res) => {
    let request = JSON.parse(req.body)
    request.sessionid ?
        res.send({ "res": true }) :
        res.send({ "res": false });
})

//// Location check to verify if users location is associated to any of their lists.
app.post('/locCheck', (req, res) => {
    let request = JSON.parse(req.body);
    request.sessionid && request.lat && request.long ?
        res.send(JSON.stringify(fakeData)) :
        res.send(JSON.stringify({ "res": false }))
});

//// Create, Read, Update and Delete user lists (CRUD).

app.post('/listReadAll', (req, res) => {
    let request = JSON.parse(req.body);
    request.sessionid ?
        res.send(fakeItemMap) :
        res.send({ "res": false })
})

app.post('/listCreate', (req, res) => {
    let request = JSON.parse(req.body);
    request.sessionid && request.title && request.list && request.lat && request.long && request.rad ?
        res.send({ "listid": "xyz345" }) :
        res.send({ "res": false })
})

// return the list details of the given listid
app.post('/listRead', (req, res) => {
    let request = JSON.parse(req.body);
    request.sessionid && request.listid ?
        res.send(fakeData[request.listid]) :
        res.send({ "res": false })
})

//this should eb a delete and not a POST!!
app.post('/listDelete', (req, res) => {
    let request = JSON.parse(req.body);
    request.sessionid && request.listid ?
        res.send({ "listid": request.listid }) :
        res.send({ "res": false })

})

// app.post('/listUpdate', (req, res) => {

// })


app.listen(4000, () => {
    console.log("listening at http://localhost:4000")
})
