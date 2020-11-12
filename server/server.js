// Complete Routing Code

// Essential Imports
const _ = require('lodash')
const express = require('express');
const cors = require('cors');
const bodyparser =  require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const hbs=require('hbs');
const admin = require("firebase-admin");
const serviceAccount = require('../firebase-auth.json');
const passport = require('passport');
const flash=require('connect-flash');
const session=require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const dayjs = require('dayjs');
var customParseFormat = require('dayjs/plugin/customParseFormat')
const otplib=require('otplib');
const { keys } = require('lodash');
const secret_otp='sdiufhsnufhsioiJ235U09TAJH)()*R34B3n';
var counter=0;
var current_otp=[]
// Setting up port.
const port =  process.env.PORT||3000;

// Creating a new application.
var app = express();

//setting view engine.....
app.set('view engine','hbs');
dayjs.extend(customParseFormat)

// Setting middleware 
app.use(bodyparser.urlencoded({extended:false})); // parse data from encoded url.
app.use(bodyparser.json());                       // parse json data and make it available through req.body.
app.use(cors());                                  // allow all domain for resource sharing.
app.use(flash());
app.use(morgan('dev'));                           // for logging onto the terminal.
app.use('/', express.static("public"));           // for static directory.
app.use(session({ secret: 'oijoij7tuytjhgchbvpokp', resave: false, saveUninitialized: false }));
// app.use((req,res,next)=>{                         // maintaining a server log in a file.
//       var now = new Date().toString();
//       var log=`${now}: ${req.method}  ${req.url}`;
//       fs.appendFileSync('server.log',log+'\n');
//       next();
// });
app.use(passport.initialize());
app.use(passport.session());

// For authentication.
passport.use(new LocalStrategy(
      (username, password, done) => {

            if (username=="drstrange" && password=="drstrange"){
                  console.log("Successfully logged in");
                  return done(null,true);
            }
            else{
                  return done(null, false, { message: 'Incorrect Credentials.' });
            }
      }
));

passport.serializeUser(function(username, done) {
      done(null, username);
});
    
passport.deserializeUser(function(username, done) {
      done(null, username);
});


//authorizing firebase admin
admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://proximity-tracing-backend-1234.firebaseio.com"
});

// database instance..
const db=admin.database();

// Private APIs..

app.post('/login',
      passport.authenticate('local', 
      { 
            failureRedirect: '/authenticate.html',
            failureFlash: true,
            session:true
      }),

      (req,res)=>{

            const username=req.body.username;
            req.login(username,(err)=>{
                  if (err) { return next(err); }
                  return res.redirect('/generateCode');
            })
      }
);

app.get('/logout',(req,res)=>{
      req.logout();
      res.redirect('/')
});

app.get('/generateCode',(req,res)=>{

      if(req.isAuthenticated()){
            var otp=otplib.hotp.generate(secret_otp,counter)
            res.render('auth-code.hbs',{ authCode: otp ,username:req.user }); 
            counter++;
            current_otp.push(otp); 
      }
      else{
            res.redirect('/authenticate.html')
      }
});

// Public APIs..

app.get('/testing',(req,res)=>{

      res.send('🤟🏿✌🏾✌🏾✌🏾😎✌🏾✌🏾✌🏾🤟🏿');
});

app.post('/sendkeys',(req,res)=>{
      
      if(current_otp.find(x => x===req.body.auth_code)!=undefined){
            
            var today=dayjs().format('D-MMM-YYYY');

            // writing to database....
            db.ref('SECRET_KEYS/'+today).push({
                  secret_key:req.body.secret_key,
                  timestamp:req.body.timestamp
            },(err)=>{

                  if(err){
                        console.log("Error while writing "+ err)
                        res.send("database error occured");
                  }
                  else{
                        _.remove(current_otp,x => x==req.body.auth_code);
                        res.send("successfully written");
                  }
            });
      }
      else{
            res.send("authentication failed");
      }
});

app.post('/receivekeys',(req,res)=>{
      
      var date=dayjs(req.body.date,'DD-MM-YYYY').format('D-MMM-YYYY');
      var keys=[]
      // reading from database.
      db.ref('SECRET_KEYS/'+date).on("value",
            (snapshot)=>{
                  snapshot.forEach((child)=>{
                        var childKey = child.key;
                        var childData = child.val();
                        keys.push(childData);
                  })
                  console.log(keys)
                  res.send(keys);
            },
            (err)=>{
                  console.log("Error while reading "+err);
                  res.send("database error occured");
            }
      );
});

//  Adding a listener.
app.listen(port,(err)=>{
      if(err){
            console.log(err);
      }
      else{
            console.log(`Server is up at port ${port}`);
      }
});