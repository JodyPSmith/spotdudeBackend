const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session'); //session management
const bcrypt = require('bcrypt'); //password encryption
const distance = require('geo-dist-calc'); // used to deal with distance between two points on earth
const helmet = require('helmet');
const homepage = './homepage/index.html'

//// DB Connection type - local db or fake files
// Use a local mongodb test database and the schema defined in database/model directory
const mongoose = require('mongoose');
const User = require('./database/model/User');
const List = require('./database/model/List');
mongoose.connect('mongodb://localhost/spotdude');
const db = mongoose.connection;
const MongoStore = require('connect-mongo')(session); //for sessions, cookies

//// Handle SSL connection and specify cert location
const fs = require('fs');
const https = require('https');

const key = fs.readFileSync('/etc/letsencrypt/live/jodysmith.ca/privkey.pem');
const cert = fs.readFileSync('/etc/letsencrypt/live/jodysmith.ca/fullchain.pem');
const ca = fs.readFileSync('/etc/letsencrypt/live/jodysmith.ca/chain.pem');

const options = {
    key: key,
    cert: cert,
    ca: ca
};


// //// Database connection
// // Open database connection, leave it open, never close it.
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Database Connection open")
});


// Protect against common exploits
app.use(helmet());

// Should host a simple download page here to explain and "download the app". This needs to be called before the json and session
// middlewear to avoid breaking it
app.use(express.static('homepage'))

//// Middlewear Section
// required to read JSON & middlewear for ensuring the data that we get is in a JSON format, if it's not you'll get a bad request.
app.use(bodyParser.raw({ type: '*/*' }))
app.post('*', (req, res, next) => {
    if (req.body) {
        try {
            console.log("recieved from client: ", JSON.parse(req.body));
            next();
        } catch (err) {
            console.log("Bad request to " + req.originalUrl)
            res.send("Bad request to " + req.originalUrl)
            next();
        }
    }
})



// will add session information to all visitors and keep them logged in if a session is present - change PW in prod :)
app.use(session({
    secret: process.env.MY_SESSION_SECRET || "Jimmy for President",
    name: "spotdude",
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    resave: true,
    saveUninitialized: true
}))

// look up req.session.id, not sure i need this since it happens on all connections anyway?
app.use((req, res, next) => {
    if (!req.session.userid) {
        console.log("user is logged out")
        next();
    } else {
        console.log("user is logged in")
        next();
    }
})

//// End points ---------------------------------------------------------------------------------------------------------------
//// User Management
//login endpoint, will check if there is a username and password and if there is return success, if not failure.
app.get('/checkSession', (req, res) => {

    console.log(req.session.id)
    User.find({ sessionid: req.session.id }, function (err, user) {
        if (err) {
            res.send({ res: false });
        } else if (!user[0]) {
            res.send({ res: false });
        } else if (user[0].sessionid === req.session.id) {
            console.log("This user checked login and is true ", user.email)
            res.send({ res: true });
        } else {
            res.send({ res: false });
        }
    })
})

app.post('/login', (req, res) => {
    let request = JSON.parse(req.body)
    if (request.email && request.password) {
        User.find({ email: request.email.toLowerCase() }, function (err, user) {
            if (err) {
                res.send({ "res": false, "err": err.errmsg });
            } else if (user[0] === undefined) {
                res.send(JSON.stringify({ "res": false, "err": "user does not exist" }))
            } else if (bcrypt.compareSync(request.password, user[0].password)) {
                if (user[0].sessionid != req.session.id) {
                    User.update({ email: request.email.toLowerCase() }, { sessionid: req.session.id }, function (err, raw) {
                        if (err) return handleError(err);
                        console.log(request.email.toLowerCase())
                        console.log('The raw response from Mongo was ', raw);
                    });
                }
                // sync up the session id's if they've changed
                user[0].sessionid = req.session.id
                // add the userid to the session to keep the user logged in. **IMPORTANT** nothing will work without the userid.
                req.session.userid = user[0]._id;
                req.session.save();
                //console.log(user[0].sessionid, req.session.id)
                console.log("user is logged in")
                res.send(JSON.stringify({ sessionid: user[0].sessionid }))
            } else if (!bcrypt.compareSync(request.password, user[0].password)) {
                res.send(JSON.stringify({ "res": false, "err": "Password incorrect" }));
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
            email: request.email.toLowerCase(),
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
    let request = JSON.parse(req.body);
    //set the session userid to empty which prevents access to anything
    // req.session.userid = "";
    // req.session.save();
    // console.log("user is logged out")
    // req.session.userid === "" ?
    //     res.send({ "res": true }) :
    //     res.send({ "res": false });
    req.session.destroy()
    res.send({ "res": true });
})




//// Location check to verify if users location is associated to any of their lists.
app.post('/locCheck', (req, res) => {
    let request = JSON.parse(req.body);
    if (request.lat && request.long) {
        let userloc = { latitude: request.lat, longitude: request.long };

        List.find({ userid: req.session.userid }, function (err, list) {
            if (err) {
                res.send({ "res": false, "err": err.errmsg });
            } else if (req.session.userid) {
                // only return the items that are within the distance/radius specified for the list
                let response = list.filter(obj => {
                    let listloc = { latitude: obj.lat, longitude: obj.long }
                    let nearby = distance.discal(listloc, userloc)
                    return obj.rad > nearby.kilometers * 1000
                })
                console.log("This is the locCheck response to ", req.session.userid, " ", response)
                res.send(response);
            } else {
                res.send(JSON.stringify({ "res": false, "err": "list not found or not your list" }))
            }
        })
    } else {
        res.send(JSON.stringify({ res: false, "err": "missing lat or long" }));
    }
});

//// Create, Read, Update and Delete user lists (CRUD).
// listReadAll will send the users lists with the title and number of items in each list. 

app.post('/listReadAll', (req, res) => {
    List.find({ userid: req.session.userid }, function (err, list) {
        if (err) {
            res.send({ "res": false, "err": err.errmsg });
        } else if (list[0] === undefined) {
            res.send(JSON.stringify({ "res": false, "err": "no lists" }))
        } else {

            //// removed item numbers and changed send back to array as per Jimmy. Need to add items to the list call above to reinstate.
            // let response = list.map(obj => {
            //     let rObj = {};
            //     rObj.listid = obj._id;
            //     rObj.title = obj.title;
            //     rObj.items = obj.items.length;    
            // })

            console.log("This is the listReadAll response to ", req.session.userid, " ", list)
            res.send(list);
            return list;
        }
    })
})

app.post('/listCreate', (req, res) => {
    let request = JSON.parse(req.body);

    //double check if the request has necessary list requirements - checking req.session.email is insecure as it could be faked.
    if (req.session.userid) {
        if (request.title && request.list && request.lat && request.long && request.rad) {
            let list = new List({
                userid: req.session.userid,
                title: request.title,
                lat: request.lat,
                long: request.long,
                rad: request.rad,
                items: request.list,
                read: false
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
            res.send({ "res": false, "err": "missing object items" })
        }
    } else {
        res.send({ "res": false, "err": "not logged in" })
    }
})

// return the list details of the given listid
app.post('/listRead', (req, res) => {
    let request = JSON.parse(req.body);

    if (req.session.userid && request.listid) {
        List.find({ _id: request.listid }, function (err, list) {
            if (err) {
                res.send({ "res": false, "err": err.errmsg });
            } else if (request.listid && list[0].userid === req.session.userid) {
                res.send(list);
            } else {
                res.send(JSON.stringify({ "res": false, "err": "list not found or not your list" }))
            }
        })
    } else {
        res.send(JSON.stringify({ "res": false, "err": "userid not found" }))
    }
});

//this will delete the specified list - the lists owner will be checked before allowing to delete
app.delete('/listDelete', (req, res) => {
    let request = JSON.parse(req.body);
    List.find({ _id: request.listid }, function (err, list) {
        if (list.userid === req.session.userid) {
            List.remove({ _id: request.listid }, function (err, list) {
                if (err) {
                    res.send({ "res": false, "err": err.errmsg });
                } else if (req.session.userid) {
                    res.send({ "res": "success" });
                } else {
                    res.send(JSON.stringify({ "res": false, "err": "list not found or not your list" }))
                }
            })
        } else {
            res.send(JSON.stringify({ "res": false, "err": "not authorized" }))
        }
    })
});

// list update allows the key and the value to be updated.
app.put('/listUpdate', (req, res) => {
    let request = JSON.parse(req.body);
    console.log("request is", request)
    List.find({ _id: request.listid }, function (err, list) {
        console.log(list)
        //so with the data check looking to make sure that request.reqValue is true, if it's value is boolean false, it fails out.
        console.log(request.reqKey, request.reqValue, list[0].userid, req.session.userid)
        if (request.reqKey && request.reqValue && list[0].userid === req.session.userid) {
            List.update({ _id: request.listid }, update = { [request.reqKey]: request.reqValue }, options = { multi: true }, function (err) {
                if (err) {
                    res.send({ "res": false, "err": err });
                } else {
                    let update = "updated: " + request.reqKey + " to " + request.reqValue
                    res.send({ "res": true, "updated": update })
                }
            })
        } else {
            res.send({ "res": false, "err": "not Authorized" })
        }
    })
})

app.listen(5000, () => {
    console.log("listening at http://localhost:5000")
})

https.createServer(options, app).listen(443);


// This closes the db connection on reboot or ctrlc 
process.on('SIGINT', function () { mongoose.connection.close(function () { console.log('Mongoose disconnected on app termination'); process.exit(0); }); });
