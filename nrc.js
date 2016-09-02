var MicroEvent = require("microevent");
var ws = require("nodejs-websocket");
//rewritten from original nrc.js
function NRC () {
    this.conn = null;
}
MicroEvent.mixin(NRC);
NRC.prototype.connect = function (url, auth) {
    var theNRC = this;
    theNRC.conn = ws.connect(url);
    theNRC.conn.on("text", function (text) {
        theNRC.switcher(text);
    });
    theNRC.conn.on("connect", function () {
        var passobj = {
            "msgtype": "serverpass",
            "pass": auth
        };
        theNRC.conn.sendText(JSON.stringify(passobj));
        theNRC.trigger("connected");
    });
    theNRC.conn.on("close", function (code, reason) {
        theNRC.trigger("closed");
    });
    theNRC.conn.on = function (evt) {
        theNRC.trigger("disconnected", evt);
    };
};
NRC.prototype.switcher = function (text) {
    var data = JSON.parse(text);
    switch(data.msgtype) { 
        case "loggedin":
            this.trigger("loggedin", data.userdata);
            break;
        case "ingroup":
            this.trigger("ingroup", data.groupdata);
            break;
        case "newmsg":
            this.trigger("newmsg", data.groupid, data.msg);
            break;
        case "useradded":
            this.trigger("useradded", data.groupid, data.newuser);
            break;
        case "userremoved":
            this.trigger("userremoved", data.groupid, data.olduser);
            break;
        case "err":
            this.trigger("nrcerr", data.error, data.reason);
            break; 
        case "newposttype":
            this.trigger("newposttype", data.groupid, data.url);
            break;
        case "createpost":
            this.trigger("createpost", data.groupid, data.posttype, data.postid);
            break;
        case "changepost":
            this.trigger("changepost", data.groupid, data.postid, data.newdata);
        default:
            console.log("unknown message");
            break;
    }
};
NRC.prototype.sendLoginInfo = function (username, password) {
    var loginObj = {
        "msgtype": "login",
        "username": username,
        "password": password,
    };
    this.conn.sendText(JSON.stringify(loginObj));
};
NRC.prototype.registerAccount = function(username, password) {
    var registerObj = {
        "msgtype": "register",
        "username": username,
        "password": password
    };
    this.conn.sendText(JSON.stringify(registerObj));
};
NRC.prototype.createGroup = function (name) {
    var createGroupObj = {
        "msgtype": "creategroup",
        "name": name
    };
    this.conn.sendText(JSON.stringify(createGroupObj));
};
NRC.prototype.sendMsg = function (groupId, datatype, data) {
    var msgObj = {
        "msgtype": "sendmsg",
        "groupid": groupId,
        "msg": {
            "datatype": datatype,
            "data": data
        }
    };
    this.conn.sendText(JSON.stringify(msgObj));
};
NRC.prototype.addToGroup = function (newuser, groupid) {
    var addObj = {
        "msgtype": "addtogroup",
        "groupid": groupid,
        "newuser": newuser
    };
    this.conn.sendText(JSON.stringify(addObj));
};
NRC.prototype.removeUser = function (groupid) {
    var removeObj = {
        "msgtype": "removeuser",
        "groupid": groupid,
        "olduser": user.username
    };
    this.conn.sendText(JSON.stringify(removeObj));
};
NRC.prototype.addPostType = function (groupid, url) {
    var addObj = {
        "msgtype": "addposttype",
        "groupid": groupid,
        "url": url
    }
    this.conn.sendText(JSON.stringify(addObj));
};
NRC.prototype.createPost = function (groupid, type) {
    var createObj = {
        "msgtype": "createpost",
        "groupid": groupid,
        "posttype": type
    };
    this.conn.sendText(JSON.stringify(createObj));
};
NRC.prototype.changePost = function (groupid, postid, newdata) {
    var changeObj = {
        "msgtype": "changepost",
        "groupid": groupid,
        "postid": postid,
        "newdata": newdata
    };
    this.conn.sendText(JSON.stringify(changeObj));
};

module.exports = NRC;