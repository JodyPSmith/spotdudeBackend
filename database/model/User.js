const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
    email: String,
    password: String,
    sessionid: String,
    lists: Array
})

module.exports = mongoose.model('User', User)
