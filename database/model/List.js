const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const List = new Schema({
    id: Number,
    title: String,
    lat: Number,
    long: Number,
    rad: Number,
    items: Array
})

module.exports = mongoose.model('List', List)