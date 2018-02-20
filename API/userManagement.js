let express = require('express');
let app = express();
let bodyParser = require('body-parser');

//login endpoint, will check if there is a username and password and if there is return success, if not failure.
app.post ('/login', (req, res) => {
    let request = JSON.parse(req.body)
    console.log(request.email, request.password)
    request.email && request.password ? 
    res.send(JSON.stringify({"session": "123bac"})) :
    res.send(JSON.stringify("Login Failure"))
})

app.post('/signup', (req, res) => {

})

app.post('/logout', (req, res) => {
    
})