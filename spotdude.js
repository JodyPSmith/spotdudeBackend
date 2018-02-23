//// Location check
// If the center is (xc yc) and the point is (xp yp), To determine if a point is within a cicles radius, 
// it is within or on the circle if r2 >= (xp - xc)sq + (yp - yc)sq, and out of the circle if r2 < (xp - xc)sq + (yp - yc)sq. 

//replaced by geo-dist-calc npm
locCheck = (clat, clong, plat, plong, rad) => {   
    if ( (Math.pow(plat - clat,2) + (Math.pow(plong -clong,2))) <= Math.pow(rad,2)) {
        // console.log("in circle");
        // console.log(Math.pow(plat - clat,2) + (Math.pow(plong -clong,2)));
        // console.log(Math.pow(rad,2));
        return true;
    } else {
        // console.log("out of circle");
        // console.log(Math.pow(plat - clat,2) + (Math.pow(plong -clong,2)));
        // console.log(Math.pow(rad,2));
        return false;
    }
}

login = (email, password) => {
    console.log ("need to bring login check here")
}

console.log("NE ",locCheck(5,6,13,7,7));
console.log("Nw ",locCheck(-5,6,-11,7,7));
console.log("se ",locCheck(5,-6,13,-7,7));
console.log("sw ",locCheck(-5,-6,-13,-7,7));

module.exports = {
    locCheck,
    login
}