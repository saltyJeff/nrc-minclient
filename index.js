var NRC = require("./nrc.js");
var process = require("process");
var readline = require('readline');
var prompt = require("prompt-sync")();
var colors = require("colors");

colors.setTheme({ //cuz they're fun
    prompt: 'green',
    header: ['cyan', 'bold'],
    menu: "blue",
    other: "white",
    self: "yellow" ,
    timestamp: ["blue", "italic"]
});

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


var chat = new NRC();
var user = null;
var groups = new Map();
var currentGroup = null;
var view = "login";
init();

function init () {
    var url = prompt("Enter NRC server URL ".prompt, "ws://localhost:8001");
    chat.connect(url);
    chat.bind("connected", function () {
        var option;
        do {
            option = prompt("[L]ogin to or [R]egister an account? ".prompt, "L").toUpperCase();
        } while(option != "L" && option != "R");
        var username = prompt("Enter username: ");
        var password = prompt.hide("Enter password: ");
        if (option.toUpperCase() == "L") {
            chat.sendLoginInfo(username, password);
        } else if (option.toUpperCase() == "R") {
            var auth = prompt.hide("Enter server password (if required)");
            chat.registerAccount(username, password, auth);
        }
    });
}

chat.bind("nrcerr", function (error, reason) {
    console.log("ERROR: "+error+"\nREASON: "+reason);
    if(error == "loginfail" || error == "registerfail") {
        init();
    }
});
chat.bind("loggedin", function(userdata) {
    user = userdata;
    console.log(("\n<<<Welcome "+user.username+">>>\n").header);
    view = "menu";
    rl.on("line", function (line) {
        if(view == "menu") {
            mainloop(line.trim());
        }
        else if(view == "group") {
            grouploop(line.trim());
        }
    });
    switchMenu();
});
function switchMenu () {
    view = "menu";
    rl.setPrompt((user.username + ">").prompt);
    rl.prompt();
}
function mainloop(line) {
    switch(line) {
        case "create":
            createGroup();
            break;
        case "help":
            printHelp();
            break;
        case "groups":
            selectGroup();
            break;
        case "exit":
            rl.close();
            chat.conn.close();
            console.log("Goodbye!");
            process.exit(0);
            break;
        default:
            console.log("command not recognized, type \"help\" for a list of commands");
            break;
    }
    rl.prompt();
}
//handle the "menu" view
chat.bind("ingroup", function (groupdata) {
    groups.set(groupdata._id, groupdata);
});
function selectGroup () {
    if(groups.size < 1) {
        console.log("you are in no groups".menu);
        return;
    }
    var keyArray = [];
    for(var id of groups.keys()) { //yeah i know ES6 contamination
        var i = keyArray.push(id);
        console.log("["+i+"] "+groups.get(id).name);
    }
    var index = parseInt(prompt("Select group number: ")) - 1;
    currentGroup = groups.get(keyArray[index]);
    switchGroup();
}
function createGroup () {
    var name = prompt("Enter the name of the new group: ".menu);
    chat.createGroup(name);
}
var helpObj = [];
helpObj[0] = ["groups", "lists out all available groups"];
helpObj[1] = ["create", "create a group"];
helpObj[2] = ["exit", "kinda self explanatory"];
function printHelp () {
    for(var i = 0; i < helpObj.length; i++) {
        console.log(helpObj[i][0]+": "+helpObj[i][1]);
    }
}
//handle "group" view
function grouploop (line) {
    if(line == "//back") {
        view = "menu";
        currentGroup = null;
        switchMenu();
        return;
    }
    else if(line == "//add") {
        var newuser = prompt("Enter the name of the user to add");
        chat.addToGroup(newuser, currentGroup._id);
        return;
    }
    else if(line == "//leave") {
        chat.removeUser(currentGroup._id);
        view = "menu";
        currentGroup = null;
        switchMenu();
        return;
    }
    else if(line == "//list") {
        var str = "Users in group: ";
        currentGroup.users.forEach(function (user) {
            str += user+"; ";
        });
        rl.output.write('\x1b[2K\r');
        console.log.apply(console, [str.substring(0,str.length - 2)]);
        rl._refreshLine();
        return;
    }
    chat.sendMsg(currentGroup._id, "text", line);
    rl.prompt();
}
function switchGroup() {
    view = "group";
    rl.setPrompt((currentGroup.name + ">").prompt);
    console.log(("Switched to group ["+currentGroup.name+"]\n").header);
    console.log("type \"//back\" to go back to main menu");
    console.log("type \"//add\" to add an user");
    console.log("type \"//leave\" to leave this group");
    console.log("type \"//list\" for a list of all users in group");
    currentGroup.messages.forEach(function (message) {
        printMsg(message);
    });
    rl.prompt();
}
chat.bind("newmsg", function (groupid, msg) {
    var msgarray = groups.get(groupid).messages;
    if(msgarray.length == 0 || msg.time > msgarray[msgarray.length-1].time) {
        msgarray.push(msg);
    }
    else if(msgarray.length == 1) {
        if(msgarray[0].time > msg.time) {
            msgarray.splice(0,0,msg);
        }
        else {
            msgarray.push(msg);
        }
    }
    else {
        for(var i = 1; i < msgarray.length; i++) {
            if(msgarray[i-1].time < msg.time && msg.time < msgarray[i].time) {
                msgarray.splice(i,0,msg);
                break;  
            }
        }
    }
    if(groups.get(groupid) == currentGroup) {
        printMsg(msg);
    }
});
function printMsg (msgobj) {
    rl.output.write('\x1b[2K\r');
    var fmt = msgobj.sender+": ";
    if(msgobj.datatype != "text") {
        fmt += "("+msgobj.datatype+") ";
    }
    if(msgobj.sender == user.username) {
        fmt += msgobj.data.self;
    }
    else {
        fmt += msgobj.data.other;
    }
    fmt += " "+new Date(parseInt(msgobj.time)).toLocaleString().timestamp;
    console.log.apply(console, [fmt]);
    rl._refreshLine();
}
chat.bind("useradded", function (groupid, newuser) {
    groups.get(groupid).users.push(newuser);
});
chat.bind("userremoved", function (groupid, user) {
    var arr = groups.get(groupid).users;
    arr.splice(arr.indexOf(newuser), 1);
});

//general stuff
chat.bind("closed", function(code, reason) {
    console.log("connection to server lost");
    console.log("code: "+code);
    console.log("reason: "+reason);
    process.exit();
});