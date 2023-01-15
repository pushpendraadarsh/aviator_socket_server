const express = require('express');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const { createServer } = require("http");
const { json } = require('express');
const { stringify } = require('querystring');
const server = http.createServer(app);
const httpServer = createServer(app);
//Mysql Connection
var mysql = require('mysql')
// Let’s make node/socketio listen on port 3000
// Define our db creds
var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'aviator',
    password: ''
});

// Log any errors connected to the db
db.connect(function (err) {
    if (err) console.log(err)
})
//end Mysqli server
const io = require('socket.io')(server, {
    cors: { origin: "*" }
});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/socket_server_front.html');
});
let game_running = 0;
let periodid = 1;
let i = 0;
let userbets = [];
io.on('connection', (socket) => {
    i = i + 1;
    console.log("Player Connected" + i);
    function game() {
        let increament = 1.0;
        db.query('INSERT INTO `gameresults` (`result`) VALUES("pending")', (err, rows) => {
            if (err) throw err;
        });
        db.query('SELECT `id` FROM `gameresults` ORDER BY `id` DESC LIMIT 1', (err, rows) => {
            if (!err) {
                console.log(rows[0].id);
                if (rows) {
                    periodid = rows[0].id;
                } else {
                    periodid = 1;
                }
            }else{
                console.log(err);
            }
        });
        console.log(periodid);
        io.emit("info_data", periodid);
        io.emit("new_game_generated", periodid);
        console.log('Game start');
        setTimeout(() => {
            io.emit("place_all_bets", periodid);
            game_running = 1;
            io.emit("lets_fly_one", periodid);
            io.emit("lets_fly", periodid);
            console.log('Plane Fly');
            let increamentvalue = setInterval(() => {
                increament = parseFloat(increament) + 0.01;
                io.emit('incrementor', parseFloat(increament).toFixed(2));
                if (parseFloat(increament) >= 1.5) {
                    clearInterval(increamentvalue);
                    io.emit("crash_plane", parseFloat(increament).toFixed(2));
                    db.query('UPDATE `gameresults` SET result="' + parseFloat(increament).toFixed(2) + '" WHERE `id`="' + periodid + '"', (err, rows) => {
                        if (err) throw err;
                    });
                    console.log('Plane Crashed');
                    setTimeout(() => {
                        game_running = 0;
                    }, 1000);
                }
            }, 300);
        }, 5000);
    }
    setInterval(() => {
        if (game_running == 0) {
            game_running = 1.5;
            game();
        }
    }, 800);
    socket.on("user_add_bet", (data) => {
        // console.log(data.main_bet_array);
        let main_bet_array = [];
        let extra_bet_array = [];
        if (data.main_bet_array.length > 0) {
            main_bet_array = [{
                'bet_id': '55',
                'bet_amount': data.main_bet_array.bet_amount,
                'section_no': data.main_bet_array.section_no
            }]
        }
        if (data.extra_bet_array.length > 0) {
            extra_bet_array = [{
                'bet_id': '55',
                'bet_amount': data.extra_bet_array.bet_amount,
                'section_no': data.extra_bet_array.section_no
            }];
        }
        let response = {
            'isSuccess': true,
            'data': {
                'wallet_balance': 500
            },
            'main_bet_array': main_bet_array,
            'extra_bet_array': extra_bet_array,
            'message': 'Do not have sufficient amount!'
        };
        socket.emit("user_add_bet_response", response);
    });
    socket.on("new_bet_placed", (data) => {
        console.log(data);
    });
    socket.on("game_status", (data) => {
        if (1 > game_running) {
            socket.emit("game_over_and_start", true);
        }
    });
    socket.on("cashout_user", (data) => {
        let userhistory = '';
        // socket.emit("info_data", userhistory);
    });

    socket.on('disconnect', (socket) => {
        i = i - 1;
        console.log('Player Disconnect' + i);
    });
});

server.listen(3000, () => {
    console.log('Server is running');
});