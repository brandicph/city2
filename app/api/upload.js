module.exports = function(app, authenticationToken) {

    app.get('/upload', function(req, res) {
        res.json({
            code: 200,
            message: 'all good in the hood'
        });
    });
};
