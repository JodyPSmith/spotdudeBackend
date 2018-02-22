const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sd = require('./spotdude'); //spotdude functions
const homepage = './homepage/index.html'

//// DB Connection type - local db or fake files
// Use a local mongodb test database and the schema defined in database/model directory
const mongoose = require('mongoose');
const User = require('./database/model/User');
const List = require('./database/model/List');
mongoose.connect('mongodb://localhost/test');
const db = mongoose.connection;
const MongoStore = require('connect-mongo')(session); //for sessions, cookies

//// Database connection
// Open database connection, leave it open, never close it.
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Database Connection open")
});

// The fake data is in the expected output format and can be used inplace of the database if needed. 
const fakeData = require('./fakedata.json')
const fakeItemMap = require('./fakeItemMap.json')

// Should host a simple download page here to explain and "download the app". This needs to be called before the json and session
// middlewear to avoid breaking it
app.use(express.static('homepage'))

//// Middlewear Section
// required to read JSON
app.use(bodyParser.raw({ type: '*/*' }))

// JSON format check, middlewear for ensuring the data that we get is in a JSON format, if it's not you'll get a bad request. 
app.post('*', (req, res, next) => {
    try {
        console.log(JSON.parse(req.body));
        next();
    } catch (err) {
        console.log("Bad request to " + req.originalUrl)
        res.send("Bad request to " + req.originalUrl)
        next();
    }
  })

// will add session information to all visitors and keep them logged in if a session is present - change PW in prod :)
app.use(session({
    secret: "Jimmy for President",
    name: "spotdude",
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    resave: true,
    saveUninitialized: true
}))

// look up req.session.id, 
app.use((req, res, next) => {
    if(!req.session.userid) {
        console.log("user not logged in")
        next();
    } else {
        console.log("user is logged in")
        next();
    }
})

//// End points ---------------------------------------------------------------------------------------------------------------
//// User Management
//login endpoint, will check if there is a username and password and if there is return success, if not failure.
app.post('/login', (req, res) => {
    let request = JSON.parse(req.body)
    if (request.email && request.password) {
        User.find({ email : request.email }, function(err, user) {
            if (err) {
                res.send({ "res" : false, "err" : err.errmsg });
            } else if (user[0] === undefined) {
                res.send(JSON.stringify({ "res": false, "err": "user does not exist" }))
            } else if (bcrypt.compareSync(request.password, user[0].password)){
                if (user[0].sessionid != req.session.id) {
                    console.log("need to update userdb")
                }
                user[0].sessionid = req.session.id
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
    //double check if the request has an email and password and if so create a new user with hashed password and add sessionid to user
    if (request.email && request.password) {
        let user = new User({
            email: request.email,
            password: bcrypt.hashSync(request.password, 12),
            sessionid: req.session.id,
            lists: []
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
// listReadAll will send the users lists with the title and number of items in each list. 

app.post('/listReadAll', (req, res) => {
    
    List.find({userid : req.session.userid}, 'title items', {lean: true}, function(err, list) {
        if (err) {
            res.send({ "res" : false, "err" : err.errmsg });
        } else if (list[0] === undefined) {
            res.send(JSON.stringify({ "res": false, "err": "no lists" }))
        } else {
            // Right now I get the whole list and then process it to get the number of items instead of
            // the full list, there is an aggregate api that should make this cleaner, but I haven't 
            // figured it out yet and this works regardless.
            console.log(list)
            let response = list.map(obj => {
                let rObj = {};
                rObj.listid = obj._id;
                rObj.title = obj.title;
                rObj.items = obj.items.length;
                return rObj;
            })
            res.send(response);
        }
    })
    
    
    // console.log(req.session.userid)
    // let request = JSON.parse(req.body);
    // req.session.userid ?
    //     res.send(fakeItemMap) :
    //     res.send({ "res": false })
})

app.post('/listCreate', (req, res) => {
    let request = JSON.parse(req.body);

    //double check if the request has necessary list requirements - checking req.session.email is insecure as it could be faked.
    if(req.session.userid) {
        if ( request.title && request.list && request.lat && request.long && request.rad) {
            let list = new List({
                userid: req.session.userid,
                title: request.title,
                lat: request.lat,
                long: request.long,
                rad: request.rad,
                items: request.list
            });
            // This wil save the list to the database and return true if successful, otherwise it will return false with error code
            list.save(function (err) {
                if (err) {
                    console.log("List creation failed")
                    res.send(JSON.stringify({ "res": false, "error": err.errmsg }))
                } else {
                    console.log("list saved ", list)
                    res.send(JSON.stringify({ "res": true }))
                }
            })
        } else {
            res.send({"res": false, "err": "missing object items"})
        }
    } else {
        res.send({"res": false, "err": "not logged in"})
    }
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
