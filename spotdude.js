//// Location check
// If the center is (xc yc) and the point is (xp yp), To determine if a point is within a cicles radius, 
// it is within or on the circle if r2 >= (xp - xc)sq + (yp - yc)sq. 
// and out of the circle if r2 < (xp - xc)sq + (yp - yc)sq. 

locCheck = (clat, clong, plat, plong, rad) => {   
    if ( (Math.pow(plat - clat,2) + (Math.pow(plong -clong,2))) <= Math.pow(rad,2)) {
        console.log("in circle");
        console.log(Math.pow(plat - clat,2) + (Math.pow(plong -clong,2)));
        console.log(Math.pow(rad,2));
        return true;
    } else {
        console.log("out of circle");
        console.log(Math.pow(plat - clat,2) + (Math.pow(plong -clong,2)));
        console.log(Math.pow(rad,2));
        return false;
    }
}

locCheck(5,5,8,3,5); // in circle
locCheck(5,5,9,9,5); // out of circle
locCheck(5,5,10,5,5); // on circle