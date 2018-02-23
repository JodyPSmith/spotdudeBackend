const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const List = new Schema({
    userid: String,
    title: String,
    lat: Number,
    long: Number,
    rad: Number,
    items: Array,
    read: Boolean
})

module.exports = mongoose.model('List', List)