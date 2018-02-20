const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const user = new Schema({
    id: Number,
    email: String,
    password: String,
    sessionid: Number,
    lists: Array
})

const list = new Schema({
    id: Number,
    title: String,
    lat: Number,
    long: Number,
    items: Array
})

module.exports = {
    user,
    list,
}