#!/usr/bin/env node
'use strict';
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs/promises"


console.log("Starting up...")

function startFoundry(){
    console.log("Starting up...")

    console.log("Running entrypoint.sh", process.argv)
    const child = spawn("./entrypoint.sh", process.argv.slice(2))

    child.stdout.on("data", (data) => {
        console.log(data.toString())
    })

    child.stderr.on("data", (data) => {
        console.error(data.toString())
    })

    child.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
    });

    return child;
}

let foundry;

/**
 * @type http.RequestListener
 */
const requestListener = function (req, res) {
    if(req.url === "/"){
        fs.readFile("./adminPage.html").then((content) =>{
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(content);
        }).catch((err)=>{
            res.writeHead(500)
            res.end(err)
        })
        return;
    } else if (req.url === "/ping"){
        res.writeHead(200);
        res.end("pong");
        return;
    } else if (req.url === "/restart" && req.method === "POST") {
        res.writeHead(200);
        res.end("restarting");
        foundry.once("close", () => {
            console.log("Foundry Down restarting")
            foundry = startFoundry()
        })
        treeKill(foundry.pid, "SIGTERM", () => {
            console.log("Foundry killed")
        })
        return;
    } else if (req.url === "/status") {
        res.writeHead(200);
        if (!foundry.killed) {
            res.end("running");
        } else {
            res.end("down");
        }
        return;
    } else if (req.url === "/ps") {
        res.writeHead(200);
        let ret = spawnSync("pstree")
        res.end(ret.stdout);
        return;
    } else {
        res.writeHead(404);
        res.end("Not Found");
        return;
    }
}

const server = http.createServer(requestListener);
console.log('starting server')
server.listen(8080, () => {
    console.log("Server started on port 80");
    foundry = startFoundry()
});

process.on("SIGINT", () => {
    console.log("SIGINT Received cleaning up")
    foundry.kill('SIGTERM')
    server.close()
    process.exit()
});


// Copied from https://github.com/pkrumins/node-tree-kill/blob/master/index.js
// MIT License

// Copyright (c) 2018 Peter Krumins

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const treeKill = function (pid, signal, callback) {
    if (typeof signal === 'function' && callback === undefined) {
        callback = signal;
        signal = undefined;
    }

    pid = parseInt(pid);
    if (Number.isNaN(pid)) {
        if (callback) {
            return callback(new Error("pid must be a number"));
        } else {
            throw new Error("pid must be a number");
        }
    }

    var tree = {};
    var pidsToProcess = {};
    tree[pid] = [];
    pidsToProcess[pid] = 1;

    
    buildProcessTree(pid, tree, pidsToProcess, function (parentPid) {
        return spawn('pgrep', ["-P", parentPid]);
    }, function () {
        killAll(tree, signal, callback);
    });
};

function killAll (tree, signal, callback) {
    var killed = {};
    try {
        Object.keys(tree).forEach(function (pid) {
            tree[pid].forEach(function (pidpid) {
                if (!killed[pidpid]) {
                    killPid(pidpid, signal);
                    killed[pidpid] = 1;
                }
            });
            if (!killed[pid]) {
                killPid(pid, signal);
                killed[pid] = 1;
            }
        });
    } catch (err) {
        if (callback) {
            return callback(err);
        } else {
            throw err;
        }
    }
    if (callback) {
        return callback();
    }
}

function killPid(pid, signal) {
    try {
        console.log("Killing", pid, signal)
        process.kill(parseInt(pid, 10), signal);
    }
    catch (err) {
        if (err.code !== 'ESRCH') throw err;
    }
}

function buildProcessTree (parentPid, tree, pidsToProcess, spawnChildProcessesList, cb) {
    var ps = spawnChildProcessesList(parentPid);
    let allData = '';
    ps.stdout.on('data', function (data) {
        var data = data.toString('ascii');
        allData += data;
    });

    var onClose = function (code) {
        delete pidsToProcess[parentPid];

        if (code != 0) {
            // no more parent processes
            if (Object.keys(pidsToProcess).length == 0) {
                cb();
            }
            return;
        }

        // @ts-ignore
        allData.match(/\d+/g).forEach(function (pids) {
          let pid = parseInt(pids, 10);
          tree[parentPid].push(pid);
          tree[pid] = [];
          pidsToProcess[pid] = 1;
          buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
        });
    };

    ps.on('close', onClose);
}