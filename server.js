// =================================================================
// get the packages we need ========================================
// =================================================================
var express = require('express');
var app = express();
var config = require('./config'); // get our config file
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var fs = require('fs');
var http = require('http');
var https = require('https');
/*
var privateKey = fs.readFileSync('sslcert/key-20160923-143528.pem', 'utf8');
var certificate = fs.readFileSync('sslcert/cert-20160923-143528.crt', 'utf8');


var credentials = {
    key: privateKey,
    cert: certificate,
    requestCert: false,
    rejectUnauthorized: false
};
*/

// =================================================================
// configuration ===================================================
// =================================================================
var port = process.env.PORT || 3000; // used to create, sign, and verify tokens

var db = mongoose.connection;

db.on('error', console.error);
db.once('open', function() {
    // Create your schemas and models here.
});

mongoose.connect(config.database); // connect to database
app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

// use morgan to log requests to the console
app.use(morgan('dev'));

//provide static content
app.use(express.static('public'));

// =================================================================
// start the server ================================================
// =================================================================
//app.listen(port);
var routes = require('./app/routes')(express, app);
var httpServer = http.createServer(app);
//var httpsServer = https.createServer(credentials, app);

httpServer.listen(port);
//httpsServer.listen(8443);

require('dns').lookup(require('os').hostname(), function(err, add, fam) {
    console.log('Magic happens at http://' + add + ':' + port);
});

require("express-mongoose-docs")(app, mongoose);
