const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');


const fakeData = require('./fakedata.json')
const fakeItemMap = require('./fakeItemMap.json')

app.use(bodyParser.raw({ type: '*/*' }))



//// Should host a simple download page here to explain and "download the app"
app.get('/', (req, res) => {
    res.send("Get Spot buddy now!");
})

//// User Management
//login endpoint, will check if there is a username and password and if there is return success, if not failure.
app.post('/login', (req, res) => {
    try {
        let request = JSON.parse(req.body)
        console.log(request.email, request.password)
        request.email && request.password ?
            res.send(JSON.stringify({ "session": "123bac" })) :
            res.send(JSON.stringify({ "res": "failure" }))
    } catch (err) {
        console.log("got bad login info")
        res.send(JSON.stringify("Bad Request"))
    }
})

app.post('/signup', (req, res) => {
    try {
        let request = JSON.parse(req.body)
        let email = req.body.email
        let password = req.body.password
        console.log(email, ' ', password)
        request.email && request.password ?
            res.send(JSON.stringify({ "res": "success" })) :
            res.send(JSON.stringify({ "res": "failure" }))
    } catch (err) {
        console.log("got bad signup info")
        res.send(JSON.stringify("Bad Request"))
    }
})

app.post('/logout', (req, res) => {
    try {
        let request = JSON.parse(req.body)
        request.sessionid ?
            res.send({ "res": "loggedOut" }) :
            res.send({ "res": "failure" });
    } catch (err) {
        console.log("got bad logout info")
        res.send(JSON.stringify("Bad Request"))
    }
})

//// Location check to verify if users locatoin is associated to any of their lists.
app.post('/locCheck', (req, res) => {
    try {
        let request = JSON.parse(req.body);
        request.sessionid && request.lat && request.long ?
            res.send(JSON.stringify(fakeData)) :
            res.send(JSON.stringify({ "res": "none" }))
    } catch (err) {
        console.log('got bad location request')
        res.send(JSON.stringify("Bad Request"))
    }
});

//// Create, Read, Update and Delete user lists (CRUD).

app.post('/listReadAll', (req, res) => {
    try {
        let request = JSON.parse(req.body);
        request.sessionid ?
            res.send(fakeItemMap) :
            res.send({ "res": "failure" })
    } catch (err) {
        console.log(" got bad ListReadAll data")
        res.send(JSON.stringify("Bad Request"))
    }
})

app.post('/listCreate', (req, res) => {
    try {
        let request = JSON.parse(req.body);
        request.sessionid && request.title && request.list && request.lat && request.long && request.rad ?
            res.send({ "listid" : "xyz345"}) :
            res.send({ "res": "failure" })
    } catch (err) {
        console.log(" got bad listCreate data")
        res.send(JSON.stringify("Bad Request"))
    }
})

// return the list details of the given listid
app.post('/listRead', (req, res) => {
    try {
        let request = JSON.parse(req.body);
        request.sessionid && request.listid ?
            res.send(fakeData[request.listid]) :
            res.send({ "res": "failure" })
    } catch (err) {
        console.log(" got bad listRead data")
        res.send(JSON.stringify("Bad Request"))
    }
})

app.post('/listDelete', (req, res) => {
    try {
        let request = JSON.parse(req.body);
        request.sessionid && request.listid ?
            res.send({"res" : "success", "listid" : request.listid}) :
            res.send({ "res": "failure" })
    } catch (err) {
        console.log(" got bad listDelete data")
        res.send(JSON.stringify("Bad Request"))
    }
})

// app.post('/listUpdate', (req, res) => {

// })

app.listen(4000, () => {
    console.log("listening at http://localhost:4000")
})