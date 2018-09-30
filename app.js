// 'use strict';
const dns = require('dns');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const shortid = require('shortid');
const validUrl = require('valid-url');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const log = msg => console.log(msg);
const app = express();

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res)=>{
  res.sendFile(process.cwd() + '/public/index.html');
});

app.post("/new/:url(*)", (req,res) => {
  log(`url POSTED is ${req.body.url}`);
  let url = req.body.url;
  
  if(validUrl.isWebUri(url)) {
    // the URL is valid
    log('url is syntactically valid..');
    
    dns.lookup(url.split('//')[1].split('/')[0], (err, addresses, family) => {
    if(err) return log(err); // dns failed
    else {
      // At this point, the URL has been syntax validated and dns validated.  
      console.log(`url: ${url} passes dns lookup`);

      mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true }, (err, db) => {
      if(err) throw err;
      else {
        log(`Connection to ${mongoose.connection.name} database established`);
        // check to see whether url is already in the database
        let query = {originalUrl: url};
        db.collection("urls").findOne(query, (err,result)=> {
          if(err) throw err;
          if(result != null){
            log(`url already in database: ${result.originalUrl}`);
            log(`Shortened url will be:${req.hostname}/${result.shortCode}`);
            res.send({url:`${req.hostname}/${result.shortCode}`});
          } 
          else {
            // result was NOT FOUND IN DATABASE
            log('result not found in database');
            let urlObj = {
              shortCode: shortid.generate(),
              originalUrl: url,
            };
            // need to add result to database
            db.collection("urls").insertOne(urlObj, (err,data) => {
              if(err) throw err;
              console.log("1 document inserted");
              log(`Shortened url will be:${req.hostname}/${urlObj.shortCode}`);
              res.send({url:`${req.hostname}/${urlObj.shortCode}`});
              db.close();
              res.end('document successfully added to database');
            })
          }
        });
      }
      })
    }});
  } else { 
    log('url is syntactically invalid..');
    res.end('url is syntactically invalid..');
  }
})

app.get('/:shortCode(*)', (req,res)=>{
  // redirect requests to the original url from database
  // query database by shortCode route parameters
  let shortCode = req.params.shortCode;
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true }, (err, db) => {
    if(err) throw err
    log(`Connection to ${mongoose.connection.name} database established`);
    let query = {shortCode: shortCode};
    db.collection("urls").findOne(query, (err,result)=> {
      if(err) throw err;
      if(result != null){
        log(`shortCode found in database: ${result.shortCode}`);
        log(`Shortened url will be:${req.hostname}/${result.shortCode}`);
        res.redirect(result.originalUrl);
        res.end(`${shortCode}`)
      } else {
         res.redirect('/');
         res.end('shortCode not found in database');
      }
    });
  });
});
let port = process.env.PORT || 3000;
app.listen(port, () => console.log(`server started on port ${port}`));