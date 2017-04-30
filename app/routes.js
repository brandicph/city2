var express = require('express');
var path = require('path');


module.exports = function(express, app) {
    var apiRoutes = express.Router();
    var clientRoutes = express.Router();


    /**
    * API ROUTES
    **/
    var uploadApi = require('./api/upload')(apiRoutes);

    apiRoutes.get('/conversation/:message', function(req, res){
        res.json({
            code: 200,
            type: 'unknown',
            message: `${req.params.message}`,
            answer: `I don't know...`
        });
    });

    apiRoutes.get('/', function(req, res) {
        res.json({ message: 'Welcome to the coolest API on earth!' });
    });


    /**
    * WEB ROUTES
    **/
    /*
    var publicPath = path.join(__dirname, '../public');

    clientRoutes.get('/', function(req, res) {
        res.sendFile(path.join(publicPath, '/index.html'));
    });

    clientRoutes.get('/camera', function(req, res) {
        res.sendFile(path.join(publicPath, '/camera.html'));
    });
    app.use('/', clientRoutes);
    */

    app.use('/api', apiRoutes);


    return app;
};
