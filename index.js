/*jshint node: true */
'use strict';

var LINE_ID =     Number(process.env.LINE_ID);
var LINE_SECRET = process.env.LINE_SECRET;
var LINE_MID =    process.env.LINE_MID;

var LINE_API_HOST =           'trialbot-api.line.me';
var LINE_API_SEND_CHANNEL =   1383378250;
var LINE_API_ETYPE_SEND =     '138311608800106203'

var LINE_API_REQUEST_OPTIONS_SEND_MESSAGE = {
    host:    LINE_API_HOST,
    path:    '/v1/events',
    method:  'POST',
    headers: {
        "Content-Type":                 "application/json; charser=UTF-8",
        "X-Line-ChannelID":             LINE_ID,
        "X-Line-ChannelSecret":         LINE_SECRET,
        "X-Line-Trusted-User-With-ACL": LINE_MID,
    },    
};

var LINE_API_REQUEST_BODY_SEND_MESSAGE_TEXT = function (toArray, text) {
    return {
        "to": toArray,
        "toChannel": LINE_API_SEND_CHANNEL,
        "eventType": LINE_API_ETYPE_SEND,
        "content": {
            "contentType": 1,
            "toType": 1,
            "text": text,
        },
    }
}

var LINE_ETYPE_MESSAGE =   '138311609000106303';
var LINE_ETYPE_OPERATION = '138311609100106403';

var LINE_CTYPE_TEXT =     1;
var LINE_CTYPE_IMAGE =    2;
var LINE_CTYPE_VIDEO =    3;
var LINE_CTYPE_AUDIO =    4;
var LINE_CTYPE_LOCATION = 7;
var LINE_CTYPE_STICKER =  8;
var LINE_CTYPE_CONTACT =  10;

var LINE_OTYPE_ADDED =   4;
var LINE_OTYPE_BLOCKED = 8;

var http = require('http');
var https = require('https');
var crypto = require('crypto');

var port = process.env.PORT || 5000;

const server = http.createServer(function (req, res) {

    if (req.method === 'POST') {
        var body = '';

        req.on('data', function (data) {
            body += data;
        });

        req.on('end', function() {
            if (!check_signature(req.headers['x-line-channelsignature'], body)) {
                res.writeHead(403);
                res.end('403 Forbidden');
                return;
            }

            res.writeHead(200);
            res.end('200 OK');

            try {
                body = JSON.parse(body);

                if (Array.isArray(body.result)) {
                    body.result.forEach(function (m) {
                        switch (m.eventType) {
                        case LINE_ETYPE_MESSAGE:
                            process_message(m);
                            break;
                        case LINE_ETYPE_OPERATION:
                            process_operation(m);
                            break;
                        default:
                            console.log('unknown event type:', m.eventType);
                            break;
                        }
                    });
                }
            } catch (e) {
                console.log('error:', e);
            }
        });
    } else {
        res.writeHead(200);
        res.end('200 OK');
    }

});

server.listen(port, function () {
    console.log('listening on %d', port);
});

function check_signature(sign, body) {
    var hash = crypto.createHmac('sha256', LINE_SECRET)
                     .update(body, 'utf8')
                     .digest('base64');

    return sign === hash;
}

function process_message(m) {
    switch (m.content.contentType) {
    case LINE_CTYPE_TEXT:
        console.log('text message (%s) received from (%s)',
                        m.content.text, m.content.from);

        send_a_message(m.content.from, m.content.text);

        break;
    default:
        console.log('unknown content type(%d):',
                        m.content.contentType, m.content);

        send_a_message(m.content.from,
                        'ごめんなさい。何を言っているのかよくわかりません。');

        break;
    }
}

function process_operation(op) {
    switch (op.content.opType) {
    case LINE_OTYPE_ADDED:
        console.log('added by user (%s)', op.content.params[0]);

        send_a_message(op.content.params[0],
                        '友達に追加してくれてありがとう。何か文字を入れたらおうむ返しするよ。');

        break;
    case LINE_OTYPE_BLOCKED:
        console.log('blocked by user (%s)', op.content.params[0]);

        break;
    }
}

function send_a_message(to, text) {
    var body = '';
    var req = https.request(LINE_API_REQUEST_OPTIONS_SEND_MESSAGE, function (res) {

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            console.log('POST request [%d]', res.statusCode);
        });

    }).on('error', function (err) {
        console.log('https request error:', err);
    });

    req.write(JSON.stringify(LINE_API_REQUEST_BODY_SEND_MESSAGE_TEXT([ to ], text)));
    req.end();
}
