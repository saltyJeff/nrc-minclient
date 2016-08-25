var NRC = require("./nrc.js");
var process = require("process");
var readline = require('readline');
var prompt = require("prompt-sync")();

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
    var url = prompt("Enter NRC server URL ", "ws://localhost:8001");
    chat.connect(url);
    chat.bind("connected", function () {
        var option;
        do {
            option = prompt("[L]ogin to or [R]egister an account? ", "L").toUpperCase();
        } while(option != "L" && option != "R");
        var username = prompt("Enter username: ");
        var password = prompt.hide("Enter password: ");
        if (option.toUpperCase() == "L") {
            chat.sendLoginInfo(username, password);
        } else if (option.toUpperCase() == "R") {
            chat.registerAccount(username, password);
        }
        console.log("sending info");
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
    console.log("\n<<<Welcome "+user.username+">>>\n");
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
    rl.setPrompt(user.username + ">");
    rl.prompt();
}
function mainloop(line) {
    switch(line) {
        case "create":
            createGroup();
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
//handle the "groups" view
chat.bind("ingroup", function (groupdata) {
    groups.set(groupdata._id, groupdata);
});
function selectGroup () {
    if(groups.size < 1) {
        console.log("you are in no groups");
        return;
    }
    var keyArray = [];
    for(var id of groups.keys()) { //yeah i know ES6 contamination
        var i = keyArray.push(id);
        console.log("["+i+"] "+groups.get(id).name);
    }
    var index = parseInt(prompt("Select group number: ")) - 1;
    currentGroup = groups.get(keyArray[index]);
    view = "group";
    switchGroup();
}
function createGroup () {
    var name = prompt("Enter the name of the new group: ");
    chat.createGroup(name);
}
//handle "group" view
function grouploop (line) {
    if(line == "//back") {
        view = "menu";
        switchMenu();
        return;
    }
    rl.prompt();
}
function switchGroup() {
    rl.setPrompt(currentGroup.name + ">");
    console.log("Switched to group ["+currentGroup.name+"]\n");
    console.log("type \"//back\" to go back to main menu");
}
function printMsg (msgobj) {
    rl.output.write('\x1b[2K\r');
    var fmt = msgobj.sender;
    if(msgobj.datatype != "text") {
        fmt += " ("+msgobj.datatype+")";
    }
    fmt += "\n";
    fmt += msgobj.data+"\n";
    fmt += new Date(parseInt(msgobj.time)).toLocaleString() +"\n";
    console.log.apply(console, [fmt]);
    rl._refreshLine();
}