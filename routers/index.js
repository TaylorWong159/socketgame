const path = require('path');
let socket;
module.exports = (app, db, io) => {
  io.on('connection', (ioSocket) => {
    console.log('Socket Connected');
    socket = ioSocket;
  });
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/home.html'));
  });
  app.get('/getGameList', (req, res) => {
    db.collection('rooms').find().toArray((err, rooms) => {
      if (err) {
        throw err;
      }
      res.send(rooms);
    });
  });
  app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/main.html'));
  });
  app.post('/join', (req, res) => {
    let data = req.body;
    db.collection('rooms').updateOne({ roomId: Number(data.room) }, { $push: { players: { name: data.username } } }, (err, result) => {
      db.collection('rooms').findOne({ roomId: Number(data.room) }, (err, result) => {
        if (err) {
          throw err;
        } else {
          io.emit('player joined', { room: data.room, players: result.players });
          res.send('');
        };
      });
    });
  });
  app.post('/makeGame', (req, res) => {
    let newGame = {
      owner: req.body.owner,
      name: `${req.body.owner}'s Game`,
      players: 0,
      topic: req.body.topic,
      roomId: undefined,
      messages: [],
    };
    db.collection('rooms').find().toArray((err, data) => {
      let rooms = data;
      let ordered = true;
      for (i = 1; i < rooms.length + 1; i++) {
        if (rooms[i - 1].roomId != i && ordered) {
          ordered = false;
          newGame.roomId = i;
        }
      }
      if (ordered) {
        newGame.roomId = rooms.length + 1;
      }
      db.collection('rooms').insertOne(newGame, (err, result) => {
        res.send({room: newGame.roomId});
      });
    });
  });
  app.post('/setName', (req, res) => {
    let data = req.body;

    db.collection('rooms').update({ roomId: Number(data.roomId) }, { $set: { name: data.newName}}, (err, result) => {
      if (err) {
        throw err;
      } else {
        io.emit('change name', data);
        res.send('Success');
      };
    });
  });
  app.post('/leave', (req, res) => {
    db.collection('rooms').updateMany({ roomId: Number(req.body.room) }, { $pull: { players: { name: req.body.name } } }, () => {
      db.collection('rooms').findOne({ roomId: Number(req.body.room) }, (err, result) => {
        if (err) {
          throw err;
        } else {
          io.emit('player joined', { room: req.body.room, players: result.players });
          res.send('');
        };
      });
    });
  });
  app.post('/topicChange', (req, res) => {
    let data = req.body;
    db.collection('rooms').updateOne({ roomId: Number(data.room) }, { $set: { topic: data.newTopic } }, (err, result) => {
      io.emit('change topic', data);
    })
  });
};
