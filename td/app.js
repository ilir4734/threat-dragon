﻿var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var passport = require('passport');
var AzureTablesStore = require('connect-azuretables')(session);
var app = express();

//security headers
require('./config/securityheaders.config')(app);

//static content
app.use('/public', express.static(path.join(__dirname, 'public')));

//sessions
app.use(session({ 
    store: new AzureTablesStore(), 
    secret: process.env.SESSION_SIGNING_KEY, 
    resave: false,
    saveUninitialized: false
}));

require('./config/passport.config')(app);

//routes
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
var routes = require('./config/routes.config');
app.use('/', routes);

//middleware
app.use(logger('dev'));

//parsers
require('./config/parsers.config')(app);

//// catch 404 and forward to error handler
//app.use(function (req, res, next) {
//    var err = new Error('Not Found');
//    err.status = 404;
//    next(err);
//});

//// error handlers

//// development error handler
//// will print stacktrace
//if (app.get('env') === 'development') {
//    app.use(function (err, req, res, next) {
//        res.status(err.status || 500);
//        res.render('error', {
//            message: err.message,
//            error: err
//        });
//    });
//}

//// production error handler
//// no stacktraces leaked to user
//app.use(function (err, req, res, next) {
//    res.status(err.status || 500);
//    res.render('error', {
//        message: err.message,
//        error: {}
//    });
//});


module.exports = app;
