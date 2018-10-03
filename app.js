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
const port = process.env.port || 3000;

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res)=>{
  res.sendFile(process.cwd() + '/public/index.html');
});

app.post("/new/:url(*)", (req,res) => {
  let url = req.body.url;
  log(`url is ${url}`);

  
  if(validUrl.isWebUri(url)) {
    // the URL is valid
    log('url is syntactically valid..');
    
    dns.lookup(url.split('//')[1].split('/')[0], (err, addresses, family) => {
    if(err) return log(err); 
    else {
      // At this point, the URL has been syntax validated and dns validated.  
      console.log(`url: ${url} passes dns lookup`);
      // database stuff here...
      mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true }, (err, db) => {
      if(err) throw err;
      else {
        log(`Connection to ${mongoose.connection.name} database established`);
        // breaks here!!!!!!!!!!!!!!!!!!!!!!!
        
        // check to see whether url is already in the database
        let query = {originalUrl: url};
        db.collection("urls").findOne(query, (err,result)=> {
          if(err) throw err;
          if(result != null){
            log(`url already in database: ${result.originalUrl}`);
            // res.redirect(result.originalUrl);
            // res.end('redirect should occur here');
            log(`${req.hostname}/${result.shortCode}`);
            res.send({url:`${req.hostname}/${result.shortCode}`});
          } 
          else {
            // result was NOT FOUND IN DATABASE
            // res.redirect("/");
            log('result not found in database');
            // need to add result to database
            let urlObj = {
              shortCode: shortid.generate(),
              originalUrl: url,
            };
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
      }).catch(err=>log(err));
    }});
  } else { 
    log('url is syntactically invalid..');
    res.end("err");
  }
  
})

app.get('/:shortCode(*)', (req,res) => {
  // redirect requests to the original url from database
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
          res.end('shortCode not found in database');
      }
    });
  });
});
app.listen(process.env.PORT, () => console.log(`server started on port ${PORT}`));
